'use client';

import React, { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon, Download01Icon, Copy01Icon, Clock01Icon, FileIcon, Image02Icon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/ui/Button';

interface HistoryItem {
  id: string;
  filename: string;
  type: 'describe' | 'runway' | 'metadata';
  // Describe fields
  description?: string;
  confidence?: number;
  source?: string;
  // Runway fields
  mode?: string;
  lowMotion?: string;
  mediumMotion?: string;
  highMotion?: string;
  // Metadata fields
  title?: string;
  keywords?: string;
  category?: string;
  // Common fields
  fileSize?: number;
  mimeType?: string;
  fileUrl?: string;  // URL to downloadable file
  createdAt: string;
  // Batch fields
  isBatch?: boolean;
  itemCount?: number;
}

interface HistoryResponse {
  descriptions: HistoryItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const HistoryPage = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [activeTab, setActiveTab] = useState<'all' | 'describe' | 'runway'>('all');

  const fetchHistory = async (page: number = 1, search: string = '', tab: string = 'all') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        type: tab,
        ...(search && { search }),
      });

      const response = await fetch(`/api/history?${params}`);
      if (!response.ok) throw new Error('Failed to fetch history');

      const data: HistoryResponse = await response.json();
      setHistoryItems(data.descriptions);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(currentPage, searchTerm, activeTab);
  }, [currentPage, searchTerm, activeTab]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchHistory(1, searchTerm, activeTab);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, activeTab]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownloadSingle = (item: HistoryItem) => {
    let content = '';
    let filename = item.filename.replace(/\.[^/.]+$/, ''); // Remove extension

    if (item.type === 'describe') {
      content = `Filename: ${item.filename}\n`;
      content += `Description: ${item.description || 'N/A'}\n`;
      content += `Confidence: ${item.confidence || 0}%\n`;
      content += `Source: ${item.source || 'N/A'}\n`;
      content += `Timestamp: ${new Date(item.createdAt).toLocaleString()}\n`;
      filename += '_description.txt';
    } else if (item.type === 'runway') {
      content = `Filename: ${item.filename}\n`;
      content += `Mode: ${item.mode || 'runway'}\n\n`;
      if (item.lowMotion) content += `Low Motion:\n${item.lowMotion}\n\n`;
      if (item.mediumMotion) content += `Medium Motion:\n${item.mediumMotion}\n\n`;
      if (item.highMotion) content += `High Motion:\n${item.highMotion}\n\n`;
      content += `Timestamp: ${new Date(item.createdAt).toLocaleString()}\n`;
      filename += '_runway.txt';
    } else if (item.type === 'metadata') {
      content = `Filename: ${item.filename}\n\n`;
      content += `Title:\n${item.title || 'N/A'}\n\n`;
      content += `Category:\n${item.category || 'N/A'}\n\n`;
      content += `Keywords:\n${item.keywords || 'N/A'}\n\n`;
      content += `Timestamp: ${new Date(item.createdAt).toLocaleString()}\n`;
      filename += '_metadata.txt';
    }

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    if (historyItems.length === 0) return;

    let content = `History Export - ${new Date().toLocaleString()}\n`;
    content += `Total Items: ${historyItems.length}\n`;
    content += `Filter: ${activeTab}\n`;
    content += '='.repeat(80) + '\n\n';

    historyItems.forEach((item, index) => {
      content += `[${index + 1}] ${item.filename}\n`;
      content += `Type: ${item.type.toUpperCase()}\n`;
      content += `Date: ${new Date(item.createdAt).toLocaleString()}\n`;
      content += '-'.repeat(80) + '\n';

      if (item.type === 'describe') {
        content += `Description: ${item.description || 'N/A'}\n`;
        content += `Confidence: ${item.confidence || 0}%\n`;
        content += `Source: ${item.source || 'N/A'}\n`;
      } else if (item.type === 'runway') {
        if (item.lowMotion) content += `Low Motion: ${item.lowMotion}\n`;
        if (item.mediumMotion) content += `Medium Motion: ${item.mediumMotion}\n`;
        if (item.highMotion) content += `High Motion: ${item.highMotion}\n`;
      } else if (item.type === 'metadata') {
        content += `Title: ${item.title || 'N/A'}\n`;
        content += `Category: ${item.category || 'N/A'}\n`;
        content += `Keywords: ${item.keywords || 'N/A'}\n`;
      }

      content += '\n' + '='.repeat(80) + '\n\n';
    });

    // Create and download file
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `history_${activeTab}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleClearHistory = async () => {
    try {
      setClearing(true);
      const response = await fetch('/api/history', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear history');
      }

      const result = await response.json();

      setHistoryItems([]);
      setPagination({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        hasNext: false,
        hasPrev: false,
      });
      setCurrentPage(1);
      setSearchTerm('');

      alert(`Successfully cleared ${result.deletedCount} items from history.`);

    } catch (error) {
      console.error('Error clearing history:', error);
      alert('Failed to clear history. Please try again.');
    } finally {
      setClearing(false);
      setShowClearConfirm(false);
    }
  };

  if (loading && historyItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="w-16 h-16 bg-slate-200 rounded-xl"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">History</h1>
              <p className="text-slate-600 text-lg">View and manage your previous image descriptions</p>
            </div>
            <div className="mt-4 sm:mt-0 flex gap-3">
              <Button
                variant="outline"
                onClick={handleDownloadAll}
                disabled={historyItems.length === 0}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <HugeiconsIcon icon={Download01Icon} size={18} className="mr-2" />
                Download All
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowClearConfirm(true)}
                disabled={historyItems.length === 0}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <HugeiconsIcon icon={Delete02Icon} size={18} className="mr-2" />
                Clear History
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${activeTab === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              All Tools
            </button>
            <button
              onClick={() => setActiveTab('describe')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${activeTab === 'describe'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              Describe
            </button>
            <button
              onClick={() => setActiveTab('runway')}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all ${activeTab === 'runway'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
            >
              Runway Prompt
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200">
          <div className="px-8 py-6 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              {pagination.totalCount} {pagination.totalCount === 1 ? 'Result' : 'Results'}
            </h2>
          </div>

          {loading ? (
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex space-x-4">
                    <div className="w-16 h-16 bg-slate-200 rounded-xl"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="text-center py-20">
              <HugeiconsIcon icon={Image02Icon} size={80} className="mx-auto mb-6 text-slate-300" />
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">No History Yet</h3>
              <p className="text-slate-500 text-lg mb-8">
                {searchTerm ? 'No descriptions found matching your search.' : 'Upload an image to get started!'}
              </p>
              {!searchTerm && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => window.location.href = '/describe'}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  <HugeiconsIcon icon={Image02Icon} size={20} className="mr-2" />
                  Describe Your First Image
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {historyItems.map((item) => (
                <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${item.type === 'describe' ? 'bg-gradient-to-br from-blue-100 to-cyan-100' :
                          item.type === 'runway' ? 'bg-gradient-to-br from-purple-100 to-pink-100' :
                            'bg-gradient-to-br from-green-100 to-emerald-100'
                        }`}>
                        <HugeiconsIcon icon={Image02Icon} size={32} className={
                          item.type === 'describe' ? 'text-blue-600' :
                            item.type === 'runway' ? 'text-purple-600' :
                              'text-green-600'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900 truncate">{item.filename}</h3>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${item.type === 'describe' ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700' :
                              item.type === 'runway' ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700' :
                                'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700'
                            }`}>
                            {item.type === 'describe' ? 'Describe' : item.type === 'runway' ? 'Runway' : 'Metadata'}
                          </span>
                        </div>

                        {/* Describe Content */}
                        {item.type === 'describe' && (
                          <p className="text-slate-700 text-sm leading-relaxed mb-3">{item.description}</p>
                        )}

                        {/* Runway Content */}
                        {item.type === 'runway' && !item.isBatch && (
                          <div className="space-y-2 mb-3">
                            {item.lowMotion && (
                              <div>
                                <span className="text-xs font-bold text-purple-600 uppercase">Low:</span>
                                <p className="text-slate-700 text-sm">{item.lowMotion}</p>
                              </div>
                            )}
                            {item.mediumMotion && (
                              <div>
                                <span className="text-xs font-bold text-pink-600 uppercase">Medium:</span>
                                <p className="text-slate-700 text-sm">{item.mediumMotion}</p>
                              </div>
                            )}
                            {item.highMotion && (
                              <div>
                                <span className="text-xs font-bold text-red-600 uppercase">High:</span>
                                <p className="text-slate-700 text-sm">{item.highMotion}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Batch Content */}
                        {item.isBatch && (
                          <div className="mb-3">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                              <HugeiconsIcon icon={FileIcon} size={16} className="text-blue-600" />
                              <span className="text-sm font-semibold text-blue-900">
                                {item.itemCount} images processed
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Metadata Content */}
                        {item.type === 'metadata' && (
                          <div className="space-y-2 mb-3">
                            <div>
                              <span className="text-xs font-bold text-green-600 uppercase">Title:</span>
                              <p className="text-slate-700 text-sm">{item.title}</p>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-emerald-600 uppercase">Category:</span>
                              <p className="text-slate-700 text-sm">{item.category}</p>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-teal-600 uppercase">Keywords:</span>
                              <p className="text-slate-700 text-sm line-clamp-2">{item.keywords}</p>
                            </div>
                          </div>
                        )}

                        {!item.isBatch && (
                          <div className="flex items-center text-xs text-slate-500 space-x-4">
                            <div className="flex items-center">
                              <HugeiconsIcon icon={Clock01Icon} size={16} className="mr-1" />
                              {new Date(item.createdAt).toLocaleString()}
                            </div>
                            {item.fileSize && (
                              <div className="flex items-center">
                                <HugeiconsIcon icon={FileIcon} size={16} className="mr-1" />
                                {formatFileSize(item.fileSize)}
                              </div>
                            )}
                            {item.mimeType && (
                              <div className="flex items-center">
                                <span className="font-medium">{item.mimeType.split('/')[1].toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {item.isBatch && (
                          <div className="flex items-center text-xs text-slate-500 space-x-4">
                            <div className="flex items-center">
                              <HugeiconsIcon icon={Clock01Icon} size={16} className="mr-1" />
                              {new Date(item.createdAt).toLocaleString()}
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium text-blue-600">
                                TXT FILE
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!item.isBatch && (
                        <button
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                          onClick={() => {
                            const textToCopy = item.type === 'describe' ? item.description :
                              item.type === 'runway' ? `Low: ${item.lowMotion}\nMedium: ${item.mediumMotion}\nHigh: ${item.highMotion}` :
                                `Title: ${item.title}\nKeywords: ${item.keywords}\nCategory: ${item.category}`;
                            navigator.clipboard.writeText(textToCopy || '');
                          }}
                          title="Copy content"
                        >
                          <HugeiconsIcon icon={Copy01Icon} size={18} />
                        </button>
                      )}
                      {item.fileUrl ? (
                        <a
                          href={item.fileUrl}
                          download
                          className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all inline-flex items-center"
                          title={`Download ${item.isBatch ? 'batch ' : ''}${item.type === 'metadata' ? 'CSV' : 'TXT'} file`}
                        >
                          <HugeiconsIcon icon={Download01Icon} size={18} />
                        </a>
                      ) : (
                        !item.isBatch && (
                          <button
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            onClick={() => handleDownloadSingle(item)}
                            title={`Generate and download ${item.type === 'metadata' ? 'CSV' : 'TXT'}`}
                          >
                            <HugeiconsIcon icon={Download01Icon} size={18} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-700">
                Showing <span className="font-semibold">{((pagination.currentPage - 1) * 10) + 1}</span> to{' '}
                <span className="font-semibold">{Math.min(pagination.currentPage * 10, pagination.totalCount)}</span> of{' '}
                <span className="font-semibold">{pagination.totalCount}</span> results
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrev || loading}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Previous
                </Button>
                <span className="px-4 py-2 text-sm text-slate-700 font-medium">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNext || loading}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Clear History Confirmation Dialog */}
        {showClearConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-200">
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Clear All History
              </h3>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Are you sure you want to clear all your description history? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearing}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleClearHistory}
                  disabled={clearing}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                >
                  {clearing ? 'Clearing...' : 'Clear History'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
