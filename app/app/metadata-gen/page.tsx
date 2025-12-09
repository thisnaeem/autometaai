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

const STOCK_PLATFORMS = [
  { id: 'adobe', name: 'Adobe Stock', selected: true },
  { id: 'shutterstock', name: 'Shutterstock', locked: true },
  { id: 'istock', name: 'iStock', locked: true },
  { id: 'getty', name: 'Getty Images', locked: true },
];

export default function MetadataGenPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [results, setResults] = useState<MetadataResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');

  // Settings
  const [titleLength, setTitleLength] = useState(150);
  const [keywordCount, setKeywordCount] = useState(45);
  const [singleWordKeywords, setSingleWordKeywords] = useState(false);

  // Advanced Settings
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isSilhouette, setIsSilhouette] = useState(false);
  const [customPromptEnabled, setCustomPromptEnabled] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [whiteBackground, setWhiteBackground] = useState(false);
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [prohibitedWordsEnabled, setProhibitedWordsEnabled] = useState(false);
  const [prohibitedWords, setProhibitedWords] = useState('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(prev => [...prev, ...acceptedFiles]);

    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxSize: 10 * 1024 * 1024,
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
    setProgress(0);

    try {
      const newResults: MetadataResult[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('image', file);
        formData.append('titleLength', titleLength.toString());
        formData.append('keywordCount', keywordCount.toString());
        formData.append('singleWordKeywords', singleWordKeywords.toString());
        formData.append('isSilhouette', isSilhouette.toString());
        formData.append('customPrompt', customPromptEnabled ? customPrompt : '');
        formData.append('whiteBackground', whiteBackground.toString());
        formData.append('transparentBackground', transparentBackground.toString());
        formData.append('prohibitedWords', prohibitedWordsEnabled ? prohibitedWords : '');

        try {
          const response = await fetch('/api/generate-metadata', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate metadata');
          }

          const data = await response.json();
          newResults.push({
            filename: file.name,
            title: data.title,
            keywords: data.keywords,
            category: data.category,
          });
        } catch (err: unknown) {
          newResults.push({
            filename: file.name,
            title: '',
            keywords: '',
            category: '',
            error: err instanceof Error ? err.message : 'Failed to process image',
          });
        }

        setProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
        setResults([...newResults]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing images');
    } finally {
      setIsProcessing(false);
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
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-50 border border-cyan-200 rounded-full mb-4">
            <span className="w-2 h-2 bg-cyan-600 rounded-full animate-pulse"></span>
            <span className="text-sm text-cyan-900 font-medium">Stock Intelligence</span>
          </div>
          <h1 className="text-5xl font-bold text-slate-900 mb-2">
            Generate <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600">Metadata</span>
          </h1>
          <p className="text-slate-600 text-lg">AI-Powered Titles, Keywords & Categories for Stock Assets</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload & Settings */}
          <div className="lg:col-span-2 space-y-6">
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
                  Supports: JPG, PNG, WEBP (Max 10MB per file)
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

                  <div className="grid grid-cols-6 gap-3">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Preview of ${selectedFiles[index].name}`}
                          className="w-full h-16 object-cover rounded-lg border border-slate-200"
                        />
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Core Parameters */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Core Parameters</h3>

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

            {/* Advanced Settings Dropdown */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm flex items-center justify-between hover:from-orange-600 hover:to-red-600 transition-all shadow-lg"
              >
                <span className="flex items-center gap-2">
                  <HugeiconsIcon icon={Settings02Icon} size={20} />
                  SETTINGS
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              <div className={`transition-all duration-300 overflow-hidden ${showAdvancedSettings ? 'max-h-[800px]' : 'max-h-0'}`}>
                <div className="p-6 space-y-4 border-t border-slate-200">
                  {/* Silhouette */}
                  <div className="flex items-center justify-between py-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">SILHOUETTE</span>
                      <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-slate-400" />
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
                  <div className="border-b border-slate-200 pb-4">
                    <div className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">CUSTOM PROMPT</span>
                        <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-slate-400" />
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
                  <div className="flex items-center justify-between py-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">WHITE BACKGROUND</span>
                      <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-slate-400" />
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
                  <div className="flex items-center justify-between py-4 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">TRANSPARENT BACKGROUND</span>
                      <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-slate-400" />
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

                  {/* Prohibited Words */}
                  <div className="border-b border-slate-200 pb-4">
                    <div className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">PROHIBITED WORDS</span>
                        <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-slate-400" />
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
                        placeholder="e.g. text, watermark, blur..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-2"
                      />
                    )}
                  </div>

                  {/* Single Word Keywords */}
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 uppercase tracking-wide">SINGLE WORD KEYWORDS</span>
                      <HugeiconsIcon icon={InformationCircleIcon} size={16} className="text-slate-400" />
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
                </div>
              </div>
            </div>

            {/* Platform Selection */}
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Export Platform</h3>
              <div className="grid grid-cols-2 gap-3">
                {STOCK_PLATFORMS.map((platform) => (
                  <div
                    key={platform.id}
                    className={`p-4 rounded-xl border-2 text-center ${platform.selected
                      ? 'border-cyan-500 bg-gradient-to-br from-cyan-50 to-blue-50'
                      : 'border-slate-200 bg-slate-50 opacity-50'
                      } ${platform.locked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{platform.name}</p>
                    {platform.locked && (
                      <p className="text-xs text-slate-500 mt-1">Coming Soon</p>
                    )}
                  </div>
                ))}
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
                  Processing... {progress}%
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
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 min-h-[600px]">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <HugeiconsIcon icon={Image02Icon} size={24} className="mr-2 text-cyan-600" />
                Results ({results.length})
              </h2>

              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                  <HugeiconsIcon icon={Image02Icon} size={80} className="text-slate-300 mb-4" />
                  <p className="text-slate-500 text-lg font-medium">No results yet</p>
                  <p className="text-slate-400 text-sm mt-2">
                    Upload images and generate metadata
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[800px] overflow-y-auto">
                  {results.map((result, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-sm font-semibold text-slate-900 mb-3">{result.filename}</p>

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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
