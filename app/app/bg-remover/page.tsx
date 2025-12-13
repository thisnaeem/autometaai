'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload04Icon, Download01Icon, Image02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/hooks/useUser';
import JSZip from 'jszip';

interface ProcessedImage {
  filename: string;
  url: string;
  success: boolean;
  error?: string;
}

export default function BgRemoverPage() {
  const { user, updateBgCredits } = useUser();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFiles(acceptedFiles);
      setProcessedImages([]);
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024,
  });

  const handleRemoveBackground = async () => {
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setError('');
    setProgress({ current: 0, total: selectedFiles.length });

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/remove-background-bulk', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 402) {
          throw new Error(errorData.message || 'Insufficient credits.');
        }
        
        throw new Error(errorData.error || 'Failed to remove backgrounds');
      }

      const data = await response.json();
      
      if (data.remainingBgCredits !== undefined) {
        updateBgCredits(data.remainingBgCredits);
      }

      const processed: ProcessedImage[] = data.results.map((result: any) => ({
        filename: result.filename,
        url: result.success ? `data:image/png;base64,${result.imageData}` : '',
        success: result.success,
        error: result.error
      }));

      setProcessedImages(processed);
      setProgress({ current: data.successCount, total: selectedFiles.length });

      if (data.successCount === 0) {
        setError('All images failed to process. Please try again.');
      } else if (data.successCount < selectedFiles.length) {
        setError(`${data.successCount} of ${selectedFiles.length} images processed successfully.`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAll = async () => {
    const successfulImages = processedImages.filter(img => img.success);
    
    if (successfulImages.length === 0) return;

    if (successfulImages.length === 1) {
      const link = document.createElement('a');
      link.href = successfulImages[0].url;
      link.download = `${successfulImages[0].filename.split('.')[0]}-no-bg.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const zip = new JSZip();
    
    for (const img of successfulImages) {
      const base64Data = img.url.split(',')[1];
      zip.file(`${img.filename.split('.')[0]}-no-bg.png`, base64Data, { base64: true });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bg-removed-images-${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setProcessedImages([]);
    setError('');
    setProgress({ current: 0, total: 0 });
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Bulk Background Remover</h1>
          <p className="text-slate-600">Remove backgrounds from multiple images at once with AI</p>
          {user && (
            <div className="mt-3 flex gap-4 text-sm">
              <p className="text-slate-500">
                BG Removal Credits: <span className="font-semibold text-purple-600">{user.bgRemovalCredits}</span>
              </p>
              <p className="text-slate-500">
                General Credits: <span className="font-semibold text-blue-600">{user.credits}</span>
              </p>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <HugeiconsIcon icon={Upload04Icon} size={24} className="mr-2 text-blue-600" />
                Upload Image
              </h2>

              {selectedFiles.length === 0 ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <HugeiconsIcon icon={Image02Icon} size={64} className="mx-auto mb-4 text-slate-400" />
                  <p className="text-lg font-medium text-slate-700 mb-2">
                    {isDragActive ? 'Drop your images here' : 'Drag & drop images'}
                  </p>
                  <p className="text-sm text-slate-500 mb-4">or click to browse (multiple files supported)</p>
                  <p className="text-xs text-slate-400">
                    Supports: JPG, PNG, WEBP &ndash; Max 10MB per file
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <HugeiconsIcon icon={Image02Icon} size={20} className="text-slate-600" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{file.name}</p>
                            <p className="text-xs text-slate-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleReset}
                      className="flex-1"
                    >
                      Clear All
                    </Button>
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleRemoveBackground}
                      disabled={isProcessing || (user?.bgRemovalCredits || 0) < selectedFiles.length}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Processing {progress.current}/{progress.total}
                        </>
                      ) : (
                        <>
                          <HugeiconsIcon icon={Image02Icon} size={20} className="mr-2" />
                          Remove Backgrounds ({selectedFiles.length})
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {(user?.bgRemovalCredits || 0) < selectedFiles.length && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-sm text-amber-700">
                        Insufficient BG removal credits. You need {selectedFiles.length} credits but have {user?.bgRemovalCredits || 0}.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">How it works</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start">
                  <span className="inline-block w-6 h-6 bg-blue-600 text-white rounded-full text-center mr-2 flex-shrink-0">1</span>
                  <span>Upload multiple images (JPG, PNG, or WEBP)</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-6 h-6 bg-blue-600 text-white rounded-full text-center mr-2 flex-shrink-0">2</span>
                  <span>AI processes all images and removes backgrounds</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-6 h-6 bg-blue-600 text-white rounded-full text-center mr-2 flex-shrink-0">3</span>
                  <span>Download all results as a ZIP file</span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-700">
                  💡 <strong>Tip:</strong> Each image costs 1 BG removal credit. Failed images won&apos;t be charged.
                </p>
              </div>
            </div>
          </div>

          {/* Result Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 min-h-[500px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-slate-900 flex items-center">
                  <HugeiconsIcon icon={Image02Icon} size={24} className="mr-2 text-cyan-600" />
                  Results {processedImages.length > 0 && `(${processedImages.filter(img => img.success).length}/${processedImages.length})`}
                </h2>
                {processedImages.some(img => img.success) && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleDownloadAll}
                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                  >
                    <HugeiconsIcon icon={Download01Icon} size={16} className="mr-2" />
                    Download {processedImages.filter(img => img.success).length > 1 ? 'as ZIP' : ''}
                  </Button>
                )}
              </div>

              {processedImages.length > 0 ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {processedImages.map((img, index) => (
                    <div key={index} className={`rounded-xl border p-4 ${img.success ? 'border-slate-200 bg-slate-50' : 'border-red-200 bg-red-50'}`}>
                      {img.success ? (
                        <div className="space-y-3">
                          <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%,transparent_75%,#f0f0f0_75%,#f0f0f0),linear-gradient(45deg,#f0f0f0_25%,transparent_25%,transparent_75%,#f0f0f0_75%,#f0f0f0)] bg-[length:20px_20px] bg-[position:0_0,10px_10px]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={img.url}
                              alt={`Processed ${img.filename}`}
                              className="w-full h-auto max-h-48 object-contain"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900 truncate">{img.filename}</p>
                            <span className="text-xs text-emerald-600 font-semibold">✓ Success</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-slate-900 truncate">{img.filename}</p>
                          <p className="text-xs text-red-600">{img.error || 'Failed'}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                  <HugeiconsIcon icon={Image02Icon} size={80} className="text-slate-300 mb-4" />
                  <p className="text-slate-500 text-lg font-medium">No results yet</p>
                  <p className="text-slate-400 text-sm mt-2">
                    Upload images and click &ldquo;Remove Backgrounds&rdquo; to see results
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
