'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import UnifiedImageUpload from '@/components/ui/UnifiedImageUpload';
import { Loader2 } from 'lucide-react';

interface ProcessResult {
  success: boolean;
  imageId?: string;
  filename: string;
  description?: string;
  confidence?: number;
  source?: string;
  error?: string;
  index: number;
  remainingCredits?: number;
}

export default function DescribePage() {
  const { user, loading, updateCredits } = useUser();
  const [processedResults, setProcessedResults] = useState<ProcessResult[]>([]);

  const handleCreditsUpdate = (newCredits: number) => {
    // Update credits locally without refreshing the session
    updateCredits(newCredits);
  };

  const handleProcessingComplete = (results: ProcessResult[]) => {
    setProcessedResults(results);
  };

  const downloadAllDescriptions = () => {
    if (processedResults.length === 0) return;

    const successfulResults = processedResults.filter(result => result.success && result.description);

    if (successfulResults.length === 0) {
      alert('No successful descriptions to download.');
      return;
    }

    const textContent = successfulResults
      .map(result => result.description)
      .join('\n\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `image-descriptions-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <UnifiedImageUpload
          userCredits={user?.credits || 0}
          onCreditsUpdate={handleCreditsUpdate}
          onProcessingComplete={handleProcessingComplete}
          showDownloadButton={processedResults.length > 0}
          onDownloadAll={downloadAllDescriptions}
          downloadButtonText="Download All Descriptions"
        />

        {processedResults.length > 0 && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">
                Generated Descriptions ({processedResults.filter(r => r.success).length})
              </h2>
            </div>

            <div className="space-y-4">
              {processedResults
                .filter(result => result.success && result.description)
                .map((result, index) => (
                  <div
                    key={index}
                    className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">
                          {result.filename}
                        </h3>
                        <div className="flex items-center space-x-3 text-sm">
                          <span className="text-emerald-600 font-semibold">
                            {result.confidence}% confidence
                          </span>
                          <span className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                            {result.source}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {result.description}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}