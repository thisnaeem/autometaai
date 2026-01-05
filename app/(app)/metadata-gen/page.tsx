'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Upload04Icon,
  Download01Icon,
  Image02Icon,
  Copy01Icon,
  Settings02Icon,
  Video01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/Button';

interface MetadataResult {
  filename: string;
  title: string;
  keywords: string;
  category: string;
  error?: string;
}

interface FileItem {
  id: string;
  file: File;
  originalName: string;
  isVideo: boolean;
  isSvg: boolean;
  size: number;
}

const STOCK_PLATFORMS = [
  {
    id: 'adobe',
    name: 'Adobe Stock',
    icon: '/adobe.png',
    headers: ['Filename', 'Title', 'Keywords', 'Category'],
    getRow: (r: MetadataResult) => [r.filename, r.title, r.keywords, r.category],
  },
  {
    id: 'shutterstock',
    name: 'Shutterstock',
    icon: '/shutterstock.png',
    headers: ['Filename', 'Description', 'Keywords'],
    getRow: (r: MetadataResult) => [r.filename, r.title, r.keywords],
  },
  {
    id: 'istock',
    name: 'iStock',
    icon: '/istock.png',
    headers: ['File name', 'Description', 'Country', 'Title', 'Keywords'],
    getRow: (r: MetadataResult) => [r.filename, r.title, '', r.title, r.keywords],
  },
  {
    id: 'freepik',
    name: 'Freepik',
    icon: '/freepik.png',
    headers: ['File name', 'Title', 'Keywords'],
    getRow: (r: MetadataResult) => [r.filename, r.title, r.keywords],
  },
];

// Virtual scroll config - optimized for performance
const ITEM_SIZE = 80;
const GRID_GAP = 12;
const ITEMS_PER_ROW = 4;
const ROW_HEIGHT = ITEM_SIZE + GRID_GAP;
const CONTAINER_HEIGHT = 320;
const VISIBLE_ROWS = Math.ceil(CONTAINER_HEIGHT / ROW_HEIGHT) + 2;

// Concurrency limits
const MAX_CONCURRENT_THUMBNAILS = 2;
const THUMBNAIL_QUEUE_DELAY = 50;

let idCounter = 0;
const generateId = () => `f${++idCounter}`;

export default function MetadataGenPage() {
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [results, setResults] = useState<MetadataResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingImages, setProcessingImages] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Scroll state for virtualization
  const [scrollTop, setScrollTop] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Thumbnail cache - only for images, NOT videos
  const thumbnailCache = useRef<Map<string, string>>(new Map());
  const thumbnailQueue = useRef<Set<string>>(new Set());
  const activeLoads = useRef(0);

  // Settings state
  const [titleLength, setTitleLength] = useState(150);
  const [keywordCount, setKeywordCount] = useState(45);
  const [singleWordKeywords, setSingleWordKeywords] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSilhouette, setIsSilhouette] = useState(false);
  const [customPromptEnabled, setCustomPromptEnabled] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [whiteBackground, setWhiteBackground] = useState(false);
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [prohibitedWordsEnabled, setProhibitedWordsEnabled] = useState(false);
  const [prohibitedWords, setProhibitedWords] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('adobe');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      thumbnailCache.current.forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, []);

  // Calculate visible range for virtual scroll
  const virtualData = useMemo(() => {
    const totalRows = Math.ceil(fileItems.length / ITEMS_PER_ROW);
    const totalHeight = totalRows * ROW_HEIGHT;
    const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 1);
    const endRow = Math.min(totalRows, startRow + VISIBLE_ROWS + 1);
    const startIdx = startRow * ITEMS_PER_ROW;
    const endIdx = Math.min(fileItems.length, endRow * ITEMS_PER_ROW);
    const offsetY = startRow * ROW_HEIGHT;

    return {
      totalHeight,
      offsetY,
      visibleItems: fileItems.slice(startIdx, endIdx),
      startIdx,
    };
  }, [fileItems, scrollTop]);

  // Optimized drop handler - just store references, no processing
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const total = acceptedFiles.length;
    setUploadProgress({ current: 0, total });

    // Process in microtasks to avoid blocking
    const BATCH = 100;
    let processed = 0;

    const processBatch = () => {
      const batch = acceptedFiles.slice(processed, processed + BATCH);
      const newItems: FileItem[] = batch.map((file) => ({
        id: generateId(),
        file,
        originalName: file.name,
        isVideo: file.type.startsWith('video/'),
        isSvg: file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg'),
        size: file.size,
      }));

      setFileItems((prev) => [...prev, ...newItems]);
      processed += batch.length;
      setUploadProgress({ current: processed, total });

      if (processed < total) {
        setTimeout(processBatch, 0);
      } else {
        setUploadProgress(null);
        setError('');
      }
    };

    processBatch();
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm'],
    },
    maxSize: 150 * 1024 * 1024,
  });

  const removeFile = useCallback((id: string) => {
    const url = thumbnailCache.current.get(id);
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    thumbnailCache.current.delete(id);
    setFileItems((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    thumbnailCache.current.forEach((url) => {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    });
    thumbnailCache.current.clear();
    thumbnailQueue.current.clear();
    setFileItems([]);
    setResults([]);
  }, []);

  // Compress for API - done only when generating metadata
  const compressForApi = async (item: FileItem): Promise<File> => {
    if (item.isSvg) return item.file;

    return new Promise((resolve) => {
      if (item.isVideo) {
        const video = document.createElement('video');
        const url = URL.createObjectURL(item.file);
        video.src = url;
        video.muted = true;
        video.currentTime = 1;

        const timeout = setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve(item.file);
        }, 8000);

        video.onseeked = () => {
          clearTimeout(timeout);
          const canvas = document.createElement('canvas');
          const scale = Math.min(800 / video.videoWidth, 800 / video.videoHeight, 1);
          canvas.width = video.videoWidth * scale;
          canvas.height = video.videoHeight * scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (blob) => {
                URL.revokeObjectURL(url);
                resolve(blob ? new File([blob], `${item.originalName}.jpg`, { type: 'image/jpeg' }) : item.file);
              },
              'image/jpeg',
              0.7
            );
          } else {
            URL.revokeObjectURL(url);
            resolve(item.file);
          }
        };

        video.onerror = () => {
          clearTimeout(timeout);
          URL.revokeObjectURL(url);
          resolve(item.file);
        };
      } else {
        const img = new Image();
        const url = URL.createObjectURL(item.file);

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(800 / img.width, 800 / img.height, 1);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (blob) => {
                URL.revokeObjectURL(url);
                resolve(blob ? new File([blob], item.originalName, { type: 'image/jpeg' }) : item.file);
              },
              'image/jpeg',
              0.7
            );
          } else {
            URL.revokeObjectURL(url);
            resolve(item.file);
          }
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(item.file);
        };

        img.src = url;
      }
    });
  };

  const handleGenerate = async () => {
    if (fileItems.length === 0) return;

    setIsProcessing(true);
    setError('');
    setResults([]);

    const batchSize = 10;
    const allResults: MetadataResult[] = [];

    try {
      for (let i = 0; i < fileItems.length; i += batchSize) {
        const batch = fileItems.slice(i, i + batchSize);
        setProcessingImages(new Set(batch.map((f) => f.originalName)));

        const formData = new FormData();

        // Compress sequentially to avoid memory spikes
        for (let j = 0; j < batch.length; j++) {
          const compressed = await compressForApi(batch[j]);
          formData.append(`image_${j}`, compressed);
          formData.append(`originalName_${j}`, batch[j].originalName);
        }

        formData.append('titleLength', titleLength.toString());
        formData.append('keywordCount', keywordCount.toString());
        formData.append('singleWordKeywords', singleWordKeywords.toString());
        formData.append('isSilhouette', isSilhouette.toString());
        formData.append('customPrompt', customPromptEnabled ? customPrompt : '');
        formData.append('whiteBackground', whiteBackground.toString());
        formData.append('transparentBackground', transparentBackground.toString());
        formData.append('prohibitedWords', prohibitedWordsEnabled ? prohibitedWords : '');

        try {
          const res = await fetch('/api/generate-metadata/batch', { method: 'POST', body: formData });
          if (!res.ok) throw new Error((await res.json()).error || 'Failed');

          const data = await res.json();
          const batchResults = data.results.map((r: { filename: string; title?: string; keywords?: string; category?: string; error?: string }) => ({
            filename: r.filename,
            title: r.title || '',
            keywords: r.keywords || '',
            category: r.category || '',
            error: r.error,
          }));

          allResults.push(...batchResults);
          setResults([...allResults]);
        } catch (err) {
          allResults.push(
            ...batch.map((f) => ({
              filename: f.originalName,
              title: '',
              keywords: '',
              category: '',
              error: err instanceof Error ? err.message : 'Failed',
            }))
          );
          setResults([...allResults]);
        }

        setProcessingImages(new Set());
        await new Promise((r) => setTimeout(r, 100));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error occurred');
    } finally {
      setIsProcessing(false);
      setProcessingImages(new Set());
    }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const exportToCSV = () => {
    if (results.length === 0) return;

    const platform = STOCK_PLATFORMS.find(p => p.id === selectedPlatform) || STOCK_PLATFORMS[0];
    const csv = [
      platform.headers,
      ...results.map((r) => platform.getRow(r)),
    ]
      .map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${platform.id}_metadata.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Lightweight thumbnail component - NO video thumbnails
  const FileThumb = React.memo(({ item }: { item: FileItem }) => {
    const [thumb, setThumb] = useState<string | null>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
      mountedRef.current = true;

      // Videos: NO thumbnail generation - just show icon
      if (item.isVideo) {
        return;
      }

      // Check cache
      const cached = thumbnailCache.current.get(item.id);
      if (cached) {
        setThumb(cached);
        return;
      }

      // Skip if already queued
      if (thumbnailQueue.current.has(item.id)) return;

      // Queue thumbnail generation with concurrency limit
      const loadThumb = async () => {
        if (activeLoads.current >= MAX_CONCURRENT_THUMBNAILS) {
          setTimeout(loadThumb, THUMBNAIL_QUEUE_DELAY);
          return;
        }

        thumbnailQueue.current.add(item.id);
        activeLoads.current++;

        try {
          const url = URL.createObjectURL(item.file);

          if (item.isSvg) {
            thumbnailCache.current.set(item.id, url);
            if (mountedRef.current) setThumb(url);
          } else {
            // Create tiny thumbnail for images only
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const scale = Math.min(80 / img.width, 80 / img.height, 1);
              canvas.width = Math.max(1, img.width * scale);
              canvas.height = Math.max(1, img.height * scale);
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                  (blob) => {
                    URL.revokeObjectURL(url);
                    if (blob && mountedRef.current) {
                      const thumbUrl = URL.createObjectURL(blob);
                      thumbnailCache.current.set(item.id, thumbUrl);
                      setThumb(thumbUrl);
                    }
                  },
                  'image/jpeg',
                  0.5
                );
              } else {
                URL.revokeObjectURL(url);
              }
            };
            img.onerror = () => URL.revokeObjectURL(url);
            img.src = url;
          }
        } finally {
          activeLoads.current--;
          thumbnailQueue.current.delete(item.id);
        }
      };

      loadThumb();

      return () => {
        mountedRef.current = false;
      };
    }, [item]);

    const isProc = processingImages.has(item.originalName);
    const result = results.find((r) => r.filename === item.originalName);
    const hasErr = result?.error;

    return (
      <div className="relative group" style={{ width: ITEM_SIZE, height: ITEM_SIZE }}>
        <div
          className={`w-full h-full rounded-lg border-2 flex items-center justify-center overflow-hidden ${hasErr ? 'border-red-400 bg-red-50' : result ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-slate-100'
            }`}
        >
          {item.isVideo ? (
            <div className="flex flex-col items-center justify-center text-slate-400">
              <HugeiconsIcon icon={Video01Icon} size={28} />
              <span className="text-[9px] mt-1 font-medium">VIDEO</span>
            </div>
          ) : thumb ? (
            <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div className="w-5 h-5 border-2 border-slate-300 border-t-cyan-500 rounded-full animate-spin" />
          )}
        </div>

        {isProc && (
          <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {result && !hasErr && (
          <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {hasErr && (
          <div className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        )}

        {item.isSvg && (
          <div className="absolute bottom-1 right-1 bg-purple-600 text-white text-[8px] px-1 rounded font-bold">SVG</div>
        )}

        <button
          onClick={() => removeFile(item.id)}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs z-10"
        >
          ×
        </button>
      </div>
    );
  });

  FileThumb.displayName = 'FileThumb';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-2">
            Generate <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">Metadata</span>
          </h1>
          <p className="text-slate-600 text-lg">AI-Powered Titles, Keywords & Categories for Stock Assets</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <HugeiconsIcon icon={Upload04Icon} size={24} className="mr-2 text-cyan-600" />
                Upload Files
              </h2>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${isDragActive ? 'border-cyan-500 bg-cyan-50' : 'border-slate-300 hover:border-cyan-400'
                  }`}
              >
                <input {...getInputProps()} />
                <HugeiconsIcon icon={Image02Icon} size={48} className="mx-auto mb-3 text-slate-400" />
                <p className="text-lg font-medium text-slate-700">{isDragActive ? 'Drop files here' : 'Drag & drop files'}</p>
                <p className="text-sm text-slate-500">or click to browse</p>
                <p className="text-xs text-slate-400 mt-2">JPG, PNG, WEBP, SVG, MP4, MOV, AVI, WEBM</p>
              </div>

              {uploadProgress && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-slate-600 mb-1">
                    <span>Adding files...</span>
                    <span>{uploadProgress.current}/{uploadProgress.total}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {fileItems.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-700">{fileItems.length} files selected</p>
                    <button onClick={clearAll} className="text-sm text-red-600 hover:text-red-700 font-medium">
                      Clear All
                    </button>
                  </div>

                  {/* Virtualized grid */}
                  <div
                    ref={scrollContainerRef}
                    className="border border-slate-200 rounded-lg bg-slate-50 overflow-auto"
                    style={{ height: CONTAINER_HEIGHT }}
                    onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                  >
                    <div style={{ height: virtualData.totalHeight, position: 'relative' }}>
                      <div
                        className="absolute left-0 right-0 p-3"
                        style={{ transform: `translateY(${virtualData.offsetY}px)` }}
                      >
                        <div className="grid grid-cols-4 gap-3">
                          {virtualData.visibleItems.map((item) => (
                            <FileThumb key={item.id} item={item} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full px-6 py-4 bg-slate-100 text-slate-700 font-medium text-sm flex items-center justify-between hover:bg-slate-200"
              >
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={Settings02Icon} size={20} />
                  Settings
                </span>
                <svg className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showSettings && (
                <div className="p-6 space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700">Title Length</label>
                      <span className="text-sm font-semibold text-cyan-600">{titleLength}</span>
                    </div>
                    <input type="range" min="50" max="200" step="10" value={titleLength} onChange={(e) => setTitleLength(+e.target.value)} className="w-full accent-cyan-600" />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium text-slate-700">Keywords Count</label>
                      <span className="text-sm font-semibold text-cyan-600">{keywordCount}</span>
                    </div>
                    <input type="range" min="10" max="50" step="5" value={keywordCount} onChange={(e) => setKeywordCount(+e.target.value)} className="w-full accent-cyan-600" />
                  </div>

                  {[
                    { label: 'Silhouette', state: isSilhouette, setter: setIsSilhouette },
                    { label: 'White Background', state: whiteBackground, setter: setWhiteBackground },
                    { label: 'Transparent Background', state: transparentBackground, setter: setTransparentBackground },
                    { label: 'Single Word Keywords', state: singleWordKeywords, setter: setSingleWordKeywords },
                  ].map(({ label, state, setter }) => (
                    <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100">
                      <span className="text-sm font-medium text-slate-700">{label}</span>
                      <button
                        onClick={() => setter(!state)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${state ? 'bg-cyan-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${state ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                  ))}

                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Custom Prompt</span>
                      <button
                        onClick={() => setCustomPromptEnabled(!customPromptEnabled)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${customPromptEnabled ? 'bg-cyan-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${customPromptEnabled ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                    {customPromptEnabled && (
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Custom instructions..."
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none"
                        rows={2}
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Prohibited Words</span>
                      <button
                        onClick={() => setProhibitedWordsEnabled(!prohibitedWordsEnabled)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${prohibitedWordsEnabled ? 'bg-cyan-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${prohibitedWordsEnabled ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                    {prohibitedWordsEnabled && (
                      <textarea
                        value={prohibitedWords}
                        onChange={(e) => setProhibitedWords(e.target.value)}
                        placeholder="Words to exclude (comma separated)..."
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none"
                        rows={2}
                      />
                    )}
                  </div>

                  {/* Stock Platforms inside Settings */}
                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-800 mb-3">Stock Platform</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {STOCK_PLATFORMS.map((platform) => (
                        <button
                          key={platform.id}
                          onClick={() => setSelectedPlatform(platform.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all ${selectedPlatform === platform.id
                              ? 'border-cyan-500 bg-cyan-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={platform.icon}
                            alt={platform.name}
                            className="w-6 h-6 object-contain"
                          />
                          <span className="text-xs font-medium text-slate-700">{platform.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleGenerate} disabled={fileItems.length === 0 || isProcessing} className="w-full py-4 text-lg font-semibold">
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing {results.length}/{fileItems.length}...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <HugeiconsIcon icon={Image02Icon} size={20} />
                  Generate Metadata
                </span>
              )}
            </Button>

            {error && <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
          </div>

          {/* Results */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                <HugeiconsIcon icon={Image02Icon} size={24} className="mr-2 text-cyan-600" />
                Results ({results.length})
              </h2>
              {results.length > 0 && (
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <HugeiconsIcon icon={Download01Icon} size={16} className="mr-2" />
                  Export CSV
                </Button>
              )}
            </div>

            {results.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <HugeiconsIcon icon={Image02Icon} size={64} className="mx-auto mb-4 opacity-50" />
                <p>No results yet</p>
                <p className="text-sm">Upload files and click Generate</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {results.map((r, i) => (
                  <div key={i} className={`p-4 rounded-lg border ${r.error ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-900 truncate max-w-[200px]">{r.filename}</h3>
                      {r.error && <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">Error</span>}
                    </div>

                    {r.error ? (
                      <p className="text-sm text-red-600">{r.error}</p>
                    ) : (
                      <div className="space-y-2">
                        {[
                          { label: 'Title', value: r.title },
                          { label: 'Keywords', value: r.keywords },
                          { label: 'Category', value: r.category },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-500 uppercase">{label}</span>
                              <button onClick={() => copyToClipboard(value)} className="text-slate-400 hover:text-cyan-600">
                                <HugeiconsIcon icon={Copy01Icon} size={14} />
                              </button>
                            </div>
                            <p className="text-sm text-slate-700 line-clamp-2">{value}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
