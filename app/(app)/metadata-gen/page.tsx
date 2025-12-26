'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload04Icon, Download01Icon, Image02Icon, Copy01Icon, InformationCircleIcon, Settings02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/Button';

interface MetadataResult {
  filename: string;
  title: string;
  keywords: string;
  category: string;
  error?: string;
}

interface FileWithPreview extends File {
  preview?: string;
  isVideo?: boolean;
  isSvg?: boolean;
  originalName?: string;
}

const STOCK_PLATFORMS = [
  { id: 'adobe', name: 'Adobe Stock', selected: true, icon: '/adobe.png' },
  { id: 'shutterstock', name: 'Shutterstock', locked: true, icon: '/shutterstock.png' },
  { id: 'istock', name: 'iStock', locked: true, icon: '/istock.png' },
  { id: 'freepik', name: 'Freepik', locked: true, icon: '/freepik.png' },
];

export default function MetadataGenPage() {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [results, setResults] = useState<MetadataResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingImages, setProcessingImages] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>('');

  // Settings
  const [titleLength, setTitleLength] = useState(150);
  const [keywordCount, setKeywordCount] = useState(45);
  const [singleWordKeywords, setSingleWordKeywords] = useState(false);

  // Advanced Settings
  const [showSettings, setShowSettings] = useState(false);
  const [isSilhouette, setIsSilhouette] = useState(false);
  const [customPromptEnabled, setCustomPromptEnabled] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [whiteBackground, setWhiteBackground] = useState(false);
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [prohibitedWordsEnabled, setProhibitedWordsEnabled] = useState(false);
  const [prohibitedWords, setProhibitedWords] = useState('');

  const extractVideoFrame = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.playsInline = true;
      video.currentTime = 1.0;

      video.onseeked = () => {
        const canvas = document.createElement('canvas');

        // Set canvas size - limit to reasonable dimensions for compression
        const maxWidth = 1280;
        const maxHeight = 720;

        let { videoWidth, videoHeight } = video;

        // Calculate aspect ratio and resize if needed
        if (videoWidth > maxWidth || videoHeight > maxHeight) {
          const aspectRatio = videoWidth / videoHeight;
          if (videoWidth > videoHeight) {
            videoWidth = maxWidth;
            videoHeight = maxWidth / aspectRatio;
          } else {
            videoHeight = maxHeight;
            videoWidth = maxHeight * aspectRatio;
          }
        }

        canvas.width = videoWidth;
        canvas.height = videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, videoWidth, videoHeight);

          // Convert to compressed JPEG with quality setting
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% quality

          // Check compressed size and further reduce if needed
          const base64Data = compressedDataUrl.split(',')[1];
          const sizeInKB = (base64Data.length * 3) / 4 / 1024; // Approximate size in KB

          if (sizeInKB > 500) { // If still larger than 500KB, compress more
            const furtherCompressed = canvas.toDataURL('image/jpeg', 0.5); // 50% quality
            resolve(furtherCompressed);
          } else {
            resolve(compressedDataUrl);
          }
        } else {
          reject(new Error('Failed to get canvas context'));
        }
        URL.revokeObjectURL(video.src);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video'));
        URL.revokeObjectURL(video.src);
      };

      video.load();
    });
  };

  // Convert data URL to File object
  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Compress image to target size (20-30KB)
  const compressImage = useCallback((file: File): Promise<{ compressedFile: File; preview: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      img.onload = () => {
        // Calculate dimensions to maintain aspect ratio
        const maxDimension = 800; // Start with reasonable max dimension
        let { width, height } = img;

        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Function to try different quality levels
        const tryCompress = (quality: number): string => {
          return canvas.toDataURL('image/jpeg', quality);
        };

        // Binary search for optimal quality to achieve 20-30KB
        let minQuality = 0.1;
        let maxQuality = 0.9;
        let bestDataUrl = '';
        let bestSize = 0;
        const targetMinSize = 15 * 1024; // 15KB minimum
        const targetMaxSize = 35 * 1024; // 35KB maximum

        // Try different quality levels
        for (let i = 0; i < 10; i++) {
          const currentQuality = (minQuality + maxQuality) / 2;
          const dataUrl = tryCompress(currentQuality);
          const base64Data = dataUrl.split(',')[1];
          const sizeInBytes = (base64Data.length * 3) / 4;

          if (sizeInBytes >= targetMinSize && sizeInBytes <= targetMaxSize) {
            bestDataUrl = dataUrl;
            bestSize = sizeInBytes;
            break;
          } else if (sizeInBytes > targetMaxSize) {
            maxQuality = currentQuality;
          } else {
            minQuality = currentQuality;
          }

          // Keep track of the best attempt
          if (!bestDataUrl || Math.abs(sizeInBytes - 25 * 1024) < Math.abs(bestSize - 25 * 1024)) {
            bestDataUrl = dataUrl;
            bestSize = sizeInBytes;
          }
        }

        // If still too large, reduce dimensions
        if (bestSize > targetMaxSize) {
          const scaleFactor = Math.sqrt(targetMaxSize / bestSize);
          canvas.width = Math.floor(width * scaleFactor);
          canvas.height = Math.floor(height * scaleFactor);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          bestDataUrl = tryCompress(0.8);
        }

        // Create compressed file
        const compressedFileName = file.name.replace(/\.[^/.]+$/, '') + '_compressed.jpg';
        const compressedFile = dataURLtoFile(bestDataUrl, compressedFileName);

        resolve({
          compressedFile,
          preview: bestDataUrl
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };

      // Load the image
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const filesWithMeta: FileWithPreview[] = [];
    const previews: string[] = [];

    for (const file of acceptedFiles) {
      const isVideo = file.type.startsWith('video/');
      const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');

      let preview = '';
      let processedFile = file;

      try {
        if (isVideo) {
          // For videos, extract frame and compress it
          const frameDataUrl = await extractVideoFrame(file);
          const frameFile = dataURLtoFile(frameDataUrl, `${file.name}_frame.jpg`);
          const compressed = await compressImage(frameFile);
          processedFile = compressed.compressedFile;
          preview = compressed.preview;
        } else if (isSvg) {
          // For SVG files, don't compress, just read as data URL
          preview = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          // Keep original SVG file
          processedFile = file;
        } else {
          // For regular images, compress them
          const compressed = await compressImage(file);
          processedFile = compressed.compressedFile;
          preview = compressed.preview;
        }
      } catch (err) {
        console.error('Error processing file:', err);
        // Fallback to original file and basic preview
        processedFile = file;
        try {
          preview = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } catch (previewErr) {
          console.error('Error creating preview:', previewErr);
          preview = '';
        }
      }

      const fileWithMeta = Object.assign(processedFile, {
        preview,
        isVideo,
        isSvg,
        originalName: file.name // Keep track of original filename
      });

      filesWithMeta.push(fileWithMeta);
      previews.push(preview);
    }

    setSelectedFiles(prev => [...prev, ...filesWithMeta]);
    setPreviewUrls(prev => [...prev, ...previews]);
    setError('');
  }, [compressImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.svg'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm']
    },
    maxSize: 150 * 1024 * 1024, // 150MB for videos
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateMetadata = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setError('');
    setResults([]);
    setProcessingImages(new Set());

    try {
      // Process images in batches of 10
      const batchSize = 10;
      const allResults: MetadataResult[] = [];

      for (let i = 0; i < selectedFiles.length; i += batchSize) {
        const batch = selectedFiles.slice(i, i + batchSize);

        // Mark current batch images as processing
        const currentBatchNames = new Set(batch.map(file => file.originalName || file.name));
        setProcessingImages(currentBatchNames);

        // Create FormData for batch processing
        const formData = new FormData();

        // Process video frames for the batch
        for (let j = 0; j < batch.length; j++) {
          const file = batch[j];
          const fileToSend = file;

          // For videos, the file is already processed (compressed frame)
          // For images, the file is already compressed
          // Just send the processed file directly
          formData.append(`image_${j}`, fileToSend);

          // Also send the original filename for proper result mapping
          formData.append(`originalName_${j}`, file.originalName || file.name);
        }

        // Add settings to formData
        formData.append('titleLength', titleLength.toString());
        formData.append('keywordCount', keywordCount.toString());
        formData.append('singleWordKeywords', singleWordKeywords.toString());
        formData.append('isSilhouette', isSilhouette.toString());
        formData.append('customPrompt', customPromptEnabled ? customPrompt : '');
        formData.append('whiteBackground', whiteBackground.toString());
        formData.append('transparentBackground', transparentBackground.toString());
        formData.append('prohibitedWords', prohibitedWordsEnabled ? prohibitedWords : '');

        try {
          const response = await fetch('/api/generate-metadata/batch', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate metadata');
          }

          const data = await response.json();

          interface ApiMetadataResult {
            filename: string;
            title?: string;
            keywords?: string;
            category?: string;
            error?: string;
          }

          // Convert batch results to our format
          const batchResults: MetadataResult[] = data.results.map((result: ApiMetadataResult) => ({
            filename: result.filename,
            title: result.title || '',
            keywords: result.keywords || '',
            category: result.category || '',
            error: result.error
          }));

          allResults.push(...batchResults);
          setResults([...allResults]);

        } catch (err: unknown) {
          // If batch fails, add error results for all files in the batch
          const errorResults: MetadataResult[] = batch.map(file => ({
            filename: file.originalName || file.name,
            title: '',
            keywords: '',
            category: '',
            error: err instanceof Error ? err.message : 'Failed to process batch',
          }));

          allResults.push(...errorResults);
          setResults([...allResults]);
        }

        // Clear processing status for this batch
        setProcessingImages(new Set());
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing images');
    } finally {
      setIsProcessing(false);
      setProcessingImages(new Set());
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const csvContent = [
      ['Filename', 'Title', 'Keywords', 'Category'],
      ...results.map(r => [
        r.filename,
        r.title || '',
        r.keywords || '',
        r.category || ''
      ])
    ].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'adobe_stock_metadata.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-2">
            Generate <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">Metadata</span>
          </h1>
          <p className="text-slate-600 text-lg">AI-Powered Titles, Keywords & Categories for Stock Assets</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload & Settings */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <HugeiconsIcon icon={Upload04Icon} size={24} className="mr-2 text-cyan-600" />
                Upload Images
              </h2>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${isDragActive
                  ? 'border-cyan-500 bg-cyan-50'
                  : 'border-slate-300 hover:border-cyan-400 hover:bg-slate-50'
                  }`}
              >
                <input {...getInputProps()} />
                <HugeiconsIcon icon={Image02Icon} size={64} className="mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-medium text-slate-700 mb-2">
                  {isDragActive ? 'Drop your images here' : 'Drag & drop images'}
                </p>
                <p className="text-sm text-slate-500 mb-4">or click to browse</p>
                <p className="text-xs text-slate-400">
                  Supports: JPG, PNG, WEBP, SVG, MP4, MOV, AVI, WEBM (Max 150MB per file)
                </p>
              </div>
              {selectedFiles.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      {selectedFiles.length} {selectedFiles.length === 1 ? 'image' : 'images'} selected
                    </p>
                    <button
                      onClick={() => {
                        setSelectedFiles([]);
                        setPreviewUrls([]);
                        setResults([]);
                      }}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <div className="grid grid-cols-4 gap-3">
                      {previewUrls.map((url, index) => {
                        const file = selectedFiles[index];
                        const isVideo = file?.isVideo;
                        const isSvg = file?.isSvg;
                        const displayName = file?.originalName || file?.name;
                        const isProcessingThisImage = processingImages.has(displayName || '');
                        const hasResult = results.find(r => r.filename === displayName);
                        const hasError = hasResult?.error;

                        return (
                          <div key={index} className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Preview of ${displayName}`}
                              className={`w-full h-20 object-cover rounded-lg border transition-all ${hasError
                                ? 'border-red-300 opacity-60'
                                : hasResult
                                  ? 'border-green-300'
                                  : 'border-slate-200'
                                } ${isSvg ? 'bg-white p-1' : ''}`}
                            />

                            {/* Processing Loader Overlay */}
                            {isProcessingThisImage && (
                              <div className="absolute inset-0 rounded-lg flex items-center justify-center">
                                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin shadow-lg"></div>
                              </div>
                            )}

                            {/* Success Indicator */}
                            {hasResult && !hasError && (
                              <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}

                            {/* Error Indicator */}
                            {hasError && (
                              <div className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}

                            {/* Video Badge */}
                            {isVideo && (
                              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[8px] px-1 py-0.5 rounded font-bold">
                                VIDEO
                              </div>
                            )}

                            {/* SVG Badge */}
                            {isSvg && (
                              <div className="absolute bottom-1 right-1 bg-purple-600 text-white text-[8px] px-1 py-0.5 rounded font-bold">
                                SVG
                              </div>
                            )}

                            {/* Remove Button */}
                            <button
                              onClick={() => removeFile(index)}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                              disabled={isProcessingThisImage}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Settings Panel */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full px-6 py-4 bg-slate-100 text-slate-700 font-medium text-sm flex items-center justify-between hover:bg-slate-200 transition-all"
              >
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={Settings02Icon} size={20} />
                  Settings
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <div className={`transition-all duration-300 ${showSettings ? 'max-h-[1000px]' : 'max-h-0 overflow-hidden'}`}>
                <div className="p-6">
                  {/* Core Parameters */}
                  <div className="mb-8">
                    <h4 className="text-md font-semibold text-slate-800 mb-4">Core Parameters</h4>
                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium text-slate-700">Title Length</label>
                          <span className="text-sm font-semibold text-cyan-600">{titleLength} chars</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="200"
                          step="10"
                          value={titleLength}
                          onChange={(e) => setTitleLength(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                          suppressHydrationWarning
                        />
                      </div>

                      <div>
                        <div className="flex justify-between mb-2">
                          <label className="text-sm font-medium text-slate-700">Keywords Count</label>
                          <span className="text-sm font-semibold text-cyan-600">{keywordCount} keywords</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="50"
                          step="5"
                          value={keywordCount}
                          onChange={(e) => setKeywordCount(parseInt(e.target.value))}
                          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                          suppressHydrationWarning
                        />
                      </div>
                    </div>
                  </div>

                  {/* Advanced Settings */}
                  <div className="mb-8">
                    <h4 className="text-md font-semibold text-slate-800 mb-4">Advanced Settings</h4>
                    <div className="space-y-4">
                      {/* Silhouette */}
                      <div className="flex items-center justify-between py-3 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">SILHOUETTE</span>
                          <div className="relative group">
                            <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-slate-400 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-[9999]">
                              <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                              Enable this if your image is a silhouette (solid shape with no internal details). This helps AI generate more accurate metadata.
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setIsSilhouette(!isSilhouette)}
                          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isSilhouette ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-slate-300'
                            }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${isSilhouette ? 'translate-x-5' : ''
                              }`}
                          />
                        </button>
                      </div>

                      {/* Custom Prompt */}
                      <div className="border-b border-slate-200 pb-4 relative">
                        <div className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">CUSTOM PROMPT</span>
                            <div className="relative group">
                              <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-slate-400 cursor-help" />
                              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-[9999]">
                                <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                                Add custom instructions to guide the AI. For example: &ldquo;Focus on mood and atmosphere&rdquo; or &ldquo;Emphasize technical details&rdquo;.
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setCustomPromptEnabled(!customPromptEnabled)}
                            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${customPromptEnabled ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-slate-300'
                              }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${customPromptEnabled ? 'translate-x-5' : ''
                                }`}
                            />
                          </button>
                        </div>
                        {customPromptEnabled && (
                          <input
                            type="text"
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="e.g. Focus on mood..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-2"
                          />
                        )}
                      </div>

                      {/* White Background */}
                      <div className="flex items-center justify-between py-4 border-b border-slate-200 relative">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">WHITE BACKGROUND</span>
                          <div className="relative group">
                            <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-slate-400 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-[9999]">
                              <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                              Enable if your image has a white or light-colored background. This helps generate appropriate keywords and descriptions.
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setWhiteBackground(!whiteBackground)}
                          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${whiteBackground ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-slate-300'
                            }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${whiteBackground ? 'translate-x-5' : ''
                              }`}
                          />
                        </button>
                      </div>

                      {/* Transparent Background */}
                      <div className="flex items-center justify-between py-4 border-b border-slate-200 relative">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">TRANSPARENT BACKGROUND</span>
                          <div className="relative group">
                            <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-slate-400 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-[9999]">
                              <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                              Enable if your image has a transparent background. This helps generate appropriate keywords and descriptions.
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setTransparentBackground(!transparentBackground)}
                          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${transparentBackground ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-slate-300'
                            }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${transparentBackground ? 'translate-x-5' : ''
                              }`}
                          />
                        </button>
                      </div>

                      {/* Single Word Keywords */}
                      <div className="flex items-center justify-between py-4 border-b border-slate-200 relative">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">SINGLE WORD KEYWORDS</span>
                          <div className="relative group">
                            <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-slate-400 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-[9999]">
                              <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                              Generate only single-word keywords instead of phrases. Useful for certain stock platforms.
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setSingleWordKeywords(!singleWordKeywords)}
                          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${singleWordKeywords ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-slate-300'
                            }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${singleWordKeywords ? 'translate-x-5' : ''
                              }`}
                          />
                        </button>
                      </div>

                      {/* Prohibited Words */}
                      <div className="border-b border-slate-200 pb-4 relative">
                        <div className="flex items-center justify-between py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">PROHIBITED WORDS</span>
                            <div className="relative group">
                              <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-slate-400 cursor-help" />
                              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-slate-900 text-white text-xs rounded-lg shadow-xl z-[9999]">
                                <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
                                List words to avoid in keywords and titles. Separate with commas.
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setProhibitedWordsEnabled(!prohibitedWordsEnabled)}
                            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${prohibitedWordsEnabled ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-slate-300'
                              }`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${prohibitedWordsEnabled ? 'translate-x-5' : ''
                                }`}
                            />
                          </button>
                        </div>
                        {prohibitedWordsEnabled && (
                          <input
                            type="text"
                            value={prohibitedWords}
                            onChange={(e) => setProhibitedWords(e.target.value)}
                            placeholder="e.g. brand, logo, trademark"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-2"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stock Platforms */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-slate-800 mb-4">Stock Platforms</h4>
                    <div className="flex gap-3">
                      {STOCK_PLATFORMS.map((platform) => (
                        <div
                          key={platform.id}
                          className={`flex-1 p-3 rounded-lg border transition-all ${platform.selected
                            ? 'border-cyan-500 bg-cyan-50'
                            : platform.locked
                              ? 'border-slate-200 bg-slate-50 opacity-50'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Platform Icon */}
                            <div className="w-6 h-6 flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={platform.icon}
                                alt={`${platform.name} logo`}
                                className="w-full h-full object-contain"
                              />
                            </div>

                            <div className="flex-1 flex items-center justify-between">
                              <span className={`text-xs font-medium ${platform.locked ? 'text-slate-400' : 'text-slate-700'
                                }`}>
                                {platform.name}
                              </span>
                              {platform.locked && (
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-medium">
                                  Soon
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              onClick={handleGenerateMetadata}
              disabled={isProcessing || selectedFiles.length === 0}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Image02Icon} size={20} className="mr-2" />
                  Generate Metadata
                </>
              )}
            </Button>

            {results.length > 0 && (
              <Button
                variant="outline"
                size="lg"
                onClick={exportToCSV}
                className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <HugeiconsIcon icon={Download01Icon} size={20} className="mr-2" />
                Export to CSV
              </Button>
            )}
          </div>

          {/* Results */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 min-h-[500px]">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <HugeiconsIcon icon={Image02Icon} size={24} className="mr-2 text-cyan-600" />
                Results ({results.length})
              </h2>

              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                  <HugeiconsIcon icon={Image02Icon} size={80} className="text-slate-300 mb-4" />
                  <p className="text-slate-500 text-lg font-medium">No results yet</p>
                  <p className="text-slate-400 text-sm mt-2">
                    Upload images and click &ldquo;Generate&rdquo; to see metadata
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {results.map((result, index) => {
                    const file = selectedFiles[index];
                    const isVideo = file?.isVideo;
                    const isSvg = file?.isSvg;

                    return (
                      <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                          <p className="text-sm font-semibold text-slate-900 flex-1">{result.filename}</p>
                          {isVideo && (
                            <span className="text-[10px] font-bold bg-black text-white px-2 py-1 rounded">
                              VIDEO
                            </span>
                          )}
                          {isSvg && (
                            <span className="text-[10px] font-bold bg-purple-600 text-white px-2 py-1 rounded">
                              SVG
                            </span>
                          )}
                        </div>

                        {result.error ? (
                          <p className="text-sm text-red-600">{result.error}</p>
                        ) : (
                          <div className="space-y-3">
                            {[
                              { label: 'Title', value: result.title, color: 'from-cyan-500 to-blue-500' },
                              { label: 'Category', value: result.category, color: 'from-blue-500 to-indigo-500' },
                              { label: 'Keywords', value: result.keywords, color: 'from-indigo-500 to-purple-500' }
                            ].map((item, i) => (
                              <div key={i}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-xs font-bold uppercase bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                                    {item.label}
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(item.value)}
                                    className="p-1 hover:bg-slate-200 rounded transition-colors"
                                    title="Copy"
                                  >
                                    <HugeiconsIcon icon={Copy01Icon} size={14} className="text-slate-500" />
                                  </button>
                                </div>
                                <p className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200 break-words">
                                  {item.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}