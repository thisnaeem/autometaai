'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload04Icon, Download01Icon, Image02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/Button';

export default function BgRemoverPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setProcessedImageUrl('');
      setError('');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const handleRemoveBackground = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('/api/remove-background', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle insufficient credits error
        if (response.status === 402) {
          throw new Error(errorData.message || 'Insufficient credits. Please purchase more credits to continue.');
        }
        
        throw new Error(errorData.error || 'Failed to remove background');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedImageUrl(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedImageUrl) return;

    const link = document.createElement('a');
    link.href = processedImageUrl;
    link.download = `${selectedFile?.name.split('.')[0]}-no-bg.png` || 'image-no-bg.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setProcessedImageUrl('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Background Remover</h1>
          <p className="text-slate-600">Remove backgrounds from your images instantly with AI</p>
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

              {!selectedFile ? (
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
                    {isDragActive ? 'Drop your image here' : 'Drag & drop an image'}
                  </p>
                  <p className="text-sm text-slate-500 mb-4">or click to browse</p>
                  <p className="text-xs text-slate-400">
                    Supports: JPG, PNG, WEBP &ndash; Max 10MB
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Preview of uploaded image"
                      className="w-full h-auto max-h-96 object-contain bg-slate-50"
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <HugeiconsIcon icon={Image02Icon} size={24} className="text-slate-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <HugeiconsIcon icon={Cancel01Icon} size={16} className="mr-1" />
                      Remove
                    </Button>
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleRemoveBackground}
                    disabled={isProcessing}
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
                        Remove Background
                      </>
                    )}
                  </Button>
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
                  <span>Upload your image (JPG, PNG, or WEBP)</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-6 h-6 bg-blue-600 text-white rounded-full text-center mr-2 flex-shrink-0">2</span>
                  <span>AI automatically detects and removes the background</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-6 h-6 bg-blue-600 text-white rounded-full text-center mr-2 flex-shrink-0">3</span>
                  <span>Download your image with transparent background</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Result Section */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 min-h-[500px]">
              <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center">
                <HugeiconsIcon icon={Image02Icon} size={24} className="mr-2 text-cyan-600" />
                Result
              </h2>

              {processedImageUrl ? (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-[linear-gradient(45deg,#f0f0f0_25%,transparent_25%,transparent_75%,#f0f0f0_75%,#f0f0f0),linear-gradient(45deg,#f0f0f0_25%,transparent_25%,transparent_75%,#f0f0f0_75%,#f0f0f0)] bg-[length:20px_20px] bg-[position:0_0,10px_10px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={processedImageUrl}
                      alt="Processed image with background removed"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleDownload}
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                  >
                    <HugeiconsIcon icon={Download01Icon} size={20} className="mr-2" />
                    Download Image
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-center">
                  <HugeiconsIcon icon={Image02Icon} size={80} className="text-slate-300 mb-4" />
                  <p className="text-slate-500 text-lg font-medium">No result yet</p>
                  <p className="text-slate-400 text-sm mt-2">
                    Upload an image and click &ldquo;Remove Background&rdquo; to see the result
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
