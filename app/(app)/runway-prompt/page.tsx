'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload04Icon, Download01Icon, Image02Icon, Copy01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/Button';

interface PromptResult {
  filename: string;
  low: string;
  medium: string;
  high: string;
  error?: string;
}

export default function RunwayPromptPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [results, setResults] = useState<PromptResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [error, setError] = useState<string>('');


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

  const handleGeneratePrompts = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setError('');
    setResults([]);
    setProgress(0);
    setCurrentFile(0);
    setTotalFiles(0);

    try {
      if (selectedFiles.length > 1) {
        // Process images one by one to show real-time progress
        setTotalFiles(selectedFiles.length);
        const newResults: PromptResult[] = [];

        for (let i = 0; i < selectedFiles.length; i++) {
          setCurrentFile(i + 1);
          setProgress(Math.round(((i + 1) / selectedFiles.length) * 100));

          const file = selectedFiles[i];
          const formData = new FormData();
          formData.append('image', file);
          formData.append('skipHistory', 'true');

          try {
            const response = await fetch('/api/runway-prompt', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to generate prompt');
            }

            const data = await response.json();
            newResults.push({
              filename: file.name,
              low: data.low,
              medium: data.medium,
              high: data.high,
            });
          } catch (err: unknown) {
            newResults.push({
              filename: file.name,
              low: '',
              medium: '',
              high: '',
              error: err instanceof Error ? err.message : 'Failed to process image',
            });
          }

          setResults([...newResults]);
        }

        // After all processed, create batch file in background (don't wait)
        fetch('/api/runway-prompt/bulk', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ results: newResults }),
        }).catch(err => {
          console.error('Failed to create batch file:', err);
        });
      } else {
        // Use single API for one image
        const file = selectedFiles[0];
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/runway-prompt', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to generate prompt');
        }

        const data = await response.json();
        setResults([
          {
            filename: file.name,
            low: data.low,
            medium: data.medium,
            high: data.high,
          },
        ]);
        setProgress(100);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing images');
    } finally {
      setIsProcessing(false);
      setCurrentFile(0);
      setTotalFiles(0);
      setProgress(0);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportToCSV = () => {
    if (results.length === 0) return;

    const csvContent = [
      ['Filename', 'Low Motion', 'Medium Motion', 'High Motion'],
      ...results.map(r => [
        r.filename,
        r.low || '',
        r.medium || '',
        r.high || ''
      ])
    ].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'runway_prompts.csv';
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
            Runway <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">Video Prompts</span>
          </h1>
          <p className="text-slate-600 text-lg">Generate cinematic Runway ML video prompts with AI</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <HugeiconsIcon icon={Upload04Icon} size={24} className="mr-2 text-blue-600" />
                Upload Images
              </h2>

              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                  }`}
              >
                <input {...getInputProps()} />
                <HugeiconsIcon icon={Image02Icon} size={64} className="mx-auto mb-4 text-slate-400" />
                <p className="text-lg font-medium text-slate-700 mb-2">
                  {isDragActive ? 'Drop your images here' : 'Drag & drop images'}
                </p>
                <p className="text-sm text-slate-500 mb-4">or click to browse</p>
                <p className="text-xs text-slate-400">
                  Supports: JPG, PNG, WEBP &ndash; Max 10MB per file
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

                  <div className="grid grid-cols-4 gap-3">
                    {previewUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Preview of ${selectedFiles[index].name}`}
                          className="w-full h-20 object-cover rounded-lg border border-slate-200"
                        />
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                onClick={handleGeneratePrompts}
                disabled={isProcessing || selectedFiles.length === 0}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {totalFiles > 0 ? `Processing ${currentFile}/${totalFiles}` : 'Processing...'}
                  </>
                ) : (
                  <>
                    <HugeiconsIcon icon={Image02Icon} size={20} className="mr-2" />
                    Generate Runway Prompts
                  </>
                )}
              </Button>

              {results.length > 0 && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={exportToCSV}
                  className="w-full mt-3 border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <HugeiconsIcon icon={Download01Icon} size={20} className="mr-2" />
                  Export to CSV
                </Button>
              )}
            </div>
          </div>

          {/* Results Section */}
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
                    Upload images and click &ldquo;Generate&rdquo; to see prompts
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {results.map((result, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-start gap-4 mb-3">
                        {previewUrls[index] && (
                          <div className="flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewUrls[index]}
                              alt={result.filename}
                              className="w-24 h-24 object-cover rounded-lg border-2 border-slate-300 shadow-sm"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{result.filename}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {selectedFiles[index] && `${(selectedFiles[index].size / 1024).toFixed(1)} KB`}
                          </p>
                        </div>
                      </div>

                      {result.error ? (
                        <p className="text-sm text-red-600">{result.error}</p>
                      ) : (
                        <div className="space-y-3">
                          {[
                            { label: 'Low Motion', value: result.low, color: 'from-blue-500 to-cyan-500' },
                            { label: 'Medium Motion', value: result.medium, color: 'from-indigo-500 to-blue-500' },
                            { label: 'High Motion', value: result.high, color: 'from-cyan-500 to-teal-500' }
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
                              <p className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200">
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
