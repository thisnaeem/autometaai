'use client';

import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download01Icon, ArrowRight01Icon, ChromeIcon } from '@hugeicons/core-free-icons';

interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'extension' | 'app' | 'script';
  downloadUrl: string;
  icon: string;
  features: string[];
  badge?: string;
}

const TOOLS: Tool[] = [
  {
    id: 'runway-automation-pro',
    name: 'Runway Automation Pro',
    description: 'Automate your Runway ML workflow with this powerful Chrome extension. Batch process videos, manage prompts, and streamline your creative process.',
    type: 'extension',
    downloadUrl: 'https://drive.usercontent.google.com/u/0/uc?id=1S8Zlc7GUoFlQO-yxBCkH4qJYpaPVzQYW&export=download',
    icon: '🚀',
    features: [
      'Batch video generation',
      'Prompt management',
      'Auto-queue processing',
      'Progress tracking',
      'Export results',
    ],
    badge: 'Popular',
  },
  {
    id: 'ideogram-flow',
    name: 'Ideogram Flow',
    description: 'Supercharge your Ideogram AI workflow with automated image generation, batch processing, and seamless prompt management.',
    type: 'extension',
    downloadUrl: 'https://drive.usercontent.google.com/u/0/uc?id=12cG2nIhVKDavCpIFPf7A32uT2VqWe1XC&export=download',
    icon: '🎨',
    features: [
      'Batch image generation',
      'Prompt templates',
      'Auto-download images',
      'Queue management',
      'Style presets',
    ],
    badge: 'New',
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-3">
            Our{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
              Tools
            </span>
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Boost your productivity with our collection of extensions and tools designed for creators and stock contributors.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid gap-6">
          {TOOLS.map((tool) => (
            <div
              key={tool.id}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <div className="p-8">
                <div className="flex items-start gap-6">
                  {/* Icon */}
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-4xl shadow-lg flex-shrink-0">
                    {tool.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h2 className="text-2xl font-bold text-slate-900">{tool.name}</h2>
                      {tool.badge && (
                        <span className={`px-3 py-1 text-white text-xs font-bold rounded-full ${
                          tool.badge === 'New' 
                            ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                            : 'bg-gradient-to-r from-amber-400 to-orange-500'
                        }`}>
                          {tool.badge}
                        </span>
                      )}
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex items-center gap-1">
                        <HugeiconsIcon icon={ChromeIcon} size={12} />
                        Chrome Extension
                      </span>
                    </div>

                    <p className="text-slate-600 mb-4 leading-relaxed">{tool.description}</p>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {tool.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm rounded-lg font-medium"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    {/* Download Button */}
                    <a
                      href={tool.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                    >
                      <HugeiconsIcon icon={Download01Icon} size={20} />
                      Download Extension
                      <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon Section */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-slate-600 text-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            More tools coming soon...
          </div>
        </div>
      </div>
    </div>
  );
}
