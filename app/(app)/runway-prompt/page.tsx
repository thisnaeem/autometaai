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
  const [shouldStop, setShouldStop] = useState(false);
  const [processingImages, setProcessingImages] = useState<Set<string>>(new Set());
  const [, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState(0); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [totalFiles, setTotalFiles] = useState(0); // eslint-disable-line @typescript-eslint/no-unused-vars
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
    maxSize: 25 * 1024 * 1024,
  });

  const removeFile = (index: number) => {
    const fileToRemove = selectedFiles[index];
    
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    
    // Remove from results if it exists
    setResults(prev => prev.filter(result => result.filename !== fileToRemove.name));
    
    // Remove from processing set if it's being processed
    setProcessingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileToRemove.name);
      return newSet;
    });
  };

  const handleGeneratePrompts = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setShouldStop(false);
    setError('');
    setResults([]);
    setProcessingImages(new Set());
    setProgress(0);
    setCurrentFile(0);
    setTotalFiles(selectedFiles.length);

    try {
      // Process images in batches of 10
      const batchSize = 10;
      const allResults: PromptResult[] = [];
      
      for (let i = 0; i < selectedFiles.length; i += batchSize) {
        // Check if user wants to stop
        if (shouldStop) {
          break;
        }

        const batch = selectedFiles.slice(i, i + batchSize);
        setCurrentFile(i + 1);
        
        // Mark current batch images as processing
        const currentBatchNames = new Set(batch.map(file => file.name));
        setProcessingImages(currentBatchNames);
        
        // Create FormData for batch processing
        const formData = new FormData();
        batch.forEach((file, index) => {
          formData.append(`image_${index}`, file);
        });

        try {
          const response = await fetch('/api/runway-prompt/batch', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate prompts');
          }

          const data = await response.json();
          
          interface ApiResult {
            filename: string;
            low?: string;
            medium?: string;
            high?: string;
            error?: string;
          }
          
          // Convert batch results to our format
          const batchResults: PromptResult[] = data.results.map((result: ApiResult) => ({
            filename: result.filename,
            low: result.low || '',
            medium: result.medium || '',
            high: result.high || '',
            error: result.error
          }));

          allResults.push(...batchResults);
          setResults([...allResults]);
          
          // Update progress
          const processedCount = Math.min(i + batchSize, selectedFiles.length);
          setProgress(Math.round((processedCount / selectedFiles.length) * 100));
          
        } catch (err: unknown) {
          // If batch fails, add error results for all files in the batch
          const errorResults: PromptResult[] = batch.map(file => ({
            filename: file.name,
            low: '',
            medium: '',
            high: '',
            error: err instanceof Error ? err.message : 'Failed to process batch',
          }));
          
          allResults.push(...errorResults);
          setResults([...allResults]);
        }
        
        // Clear processing status for this batch
        setProcessingImages(new Set());
      }

      // Create final batch history record only if we have results
      if (allResults.length > 0) {
        try {
          await fetch('/api/runway-prompt/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ results: allResults }),
          });
        } catch (err) {
          console.error('Failed to create batch file:', err);
        }
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing images');
    } finally {
      setIsProcessing(false);
      setShouldStop(false);
      setProcessingImages(new Set());
      setCurrentFile(0);
      setTotalFiles(0);
      setProgress(0);
    }
  };

  const handleStopProcessing = () => {
    setShouldStop(true);
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
                  Supports: JPG, PNG, WEBP &ndash; Max 25MB per file
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
                        const isProcessingThisImage = processingImages.has(file.name);
                        const hasResult = results.find(r => r.filename === file.name);
                        const hasError = hasResult?.error;
                        
                        return (
                          <div key={index} className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={url}
                              alt={`Preview of ${file.name}`}
                              className={`w-full h-20 object-cover rounded-lg border transition-all ${
                                hasError 
                                  ? 'border-red-300 opacity-60' 
                                  : hasResult 
                                    ? 'border-green-300' 
                                    : 'border-slate-200'
                              }`}
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

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleGeneratePrompts}
                  disabled={isProcessing || selectedFiles.length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={Image02Icon} size={20} className="mr-2" />
                      Generate Runway Prompts
                    </>
                  )}
                </Button>

                {isProcessing && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleStopProcessing}
                    className="w-full border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Stop Processing
                  </Button>
                )}

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
