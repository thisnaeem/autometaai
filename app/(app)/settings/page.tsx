'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/lib/auth-client';
import { Button } from '@/components/ui/Button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Settings02Icon } from '@hugeicons/core-free-icons';

type AIProvider = 'openai' | 'gemini';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [aiProvider, setAiProvider] = useState<AIProvider>('openai');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch('/api/user/settings');
            if (response.ok) {
                const data = await response.json();
                setAiProvider(data.aiProvider || 'openai');
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);

        try {
            const response = await fetch('/api/user/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aiProvider }),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-8">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg">
                            <HugeiconsIcon icon={Settings02Icon} size={24} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
                    </div>
                    <p className="text-slate-600">Configure your AI provider preferences</p>
                </div>

                {/* Message */}
                {message && (
                    <div
                        className={`p-4 rounded-xl mb-6 ${message.type === 'success'
                                ? 'bg-green-50 border border-green-200 text-green-800'
                                : 'bg-red-50 border border-red-200 text-red-800'
                            }`}
                    >
                        {message.text}
                    </div>
                )}

                {/* AI Provider Selection */}
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900 mb-2">AI Provider</h2>
                        <p className="text-slate-600 text-sm mb-6">
                            Choose which AI provider to use for Describe, Runway Prompt, and Metadata Gen tools.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {/* OpenAI Option */}
                        <div
                            onClick={() => setAiProvider('openai')}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${aiProvider === 'openai'
                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${aiProvider === 'openai' ? 'border-blue-500' : 'border-slate-300'
                                        }`}
                                >
                                    {aiProvider === 'openai' && (
                                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-900">OpenAI</h3>
                                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                            GPT-4o-mini
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">
                                        Uses OpenAI&apos;s GPT-4o-mini for metadata, runway prompts, and Ideogram for descriptions.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Gemini Option */}
                        <div
                            onClick={() => setAiProvider('gemini')}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${aiProvider === 'gemini'
                                    ? 'border-purple-500 bg-purple-50 shadow-md'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${aiProvider === 'gemini' ? 'border-purple-500' : 'border-slate-300'
                                        }`}
                                >
                                    {aiProvider === 'gemini' && (
                                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-900">Google Gemini</h3>
                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                            Gemini 2.0 Flash
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">
                                        Uses Google&apos;s Gemini 2.0 Flash for all AI features including descriptions, metadata, and prompts.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                        size="lg"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>

                {/* Info Box */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-blue-800">
                        <strong>💡 Note:</strong> The selected AI provider will be used for all tools that support it.
                        Some tools may have specific API requirements.
                    </p>
                </div>
            </div>
        </div>
    );
}
