"use client"

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ApiKeys {
  IDEOGRAM_API_KEY: string;
  OPENAI_API_KEY: string;
  GEMINI_API_KEY: string;
  PHOTOROOM_API_KEY: string;
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    IDEOGRAM_API_KEY: '',
    OPENAI_API_KEY: '',
    GEMINI_API_KEY: '',
    PHOTOROOM_API_KEY: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (response.ok) {
        const data = await response.json();
        const settings = data.settings;

        // Load existing API keys
        const newKeys: ApiKeys = {
          IDEOGRAM_API_KEY: '',
          OPENAI_API_KEY: '',
          GEMINI_API_KEY: '',
          PHOTOROOM_API_KEY: ''
        };

        settings.forEach((setting: { key: string; value: string }) => {
          if (setting.key in newKeys) {
            newKeys[setting.key as keyof ApiKeys] = setting.value;
          }
        });

        setApiKeys(newKeys);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMessage(null);

    try {
      // Save all three API keys
      const promises = Object.entries(apiKeys).map(([key, value]) => {
        if (!value) return Promise.resolve(); // Skip empty values

        return fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value, category: 'API' })
        });
      });

      await Promise.all(promises);
      setMessage({ type: 'success', text: 'All API keys saved successfully!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Failed to save API keys' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">API Keys Management</h1>
        <p className="text-gray-600 mt-2">Configure your API keys</p>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Smart Fallback:</strong> API keys saved here are stored in the database and will be used even if .env keys are deleted. The app checks database first, then falls back to .env variables.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Ideogram API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="ideogram" className="text-base font-semibold text-gray-900">
              Ideogram API Key
            </Label>
            {apiKeys.IDEOGRAM_API_KEY && (
              <span className="text-xs text-green-600 font-medium">✓ Saved</span>
            )}
          </div>
          <Input
            id="ideogram"
            type="password"
            value={apiKeys.IDEOGRAM_API_KEY}
            onChange={(e) => setApiKeys({ ...apiKeys, IDEOGRAM_API_KEY: e.target.value })}
            placeholder="Enter your Ideogram API key"
            className="font-mono"
          />
        </div>

        {/* OpenAI API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="openai" className="text-base font-semibold text-gray-900">
              OpenAI API Key
            </Label>
            {apiKeys.OPENAI_API_KEY && (
              <span className="text-xs text-green-600 font-medium">✓ Saved</span>
            )}
          </div>
          <Input
            id="openai"
            type="password"
            value={apiKeys.OPENAI_API_KEY}
            onChange={(e) => setApiKeys({ ...apiKeys, OPENAI_API_KEY: e.target.value })}
            placeholder="Enter your OpenAI API key"
            className="font-mono"
          />
        </div>

        {/* Gemini API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="gemini" className="text-base font-semibold text-gray-900">
              Gemini API Key
            </Label>
            {apiKeys.GEMINI_API_KEY && (
              <span className="text-xs text-green-600 font-medium">✓ Saved</span>
            )}
          </div>
          <Input
            id="gemini"
            type="password"
            value={apiKeys.GEMINI_API_KEY}
            onChange={(e) => setApiKeys({ ...apiKeys, GEMINI_API_KEY: e.target.value })}
            placeholder="Enter your Gemini API key"
            className="font-mono"
          />
        </div>

        {/* PhotoRoom API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="photoroom" className="text-base font-semibold text-gray-900">
              PhotoRoom API Key
            </Label>
            {apiKeys.PHOTOROOM_API_KEY && (
              <span className="text-xs text-green-600 font-medium">✓ Saved</span>
            )}
          </div>
          <Input
            id="photoroom"
            type="password"
            value={apiKeys.PHOTOROOM_API_KEY}
            onChange={(e) => setApiKeys({ ...apiKeys, PHOTOROOM_API_KEY: e.target.value })}
            placeholder="Enter your PhotoRoom API key"
            className="font-mono"
          />
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSaveAll}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="lg"
        >
          {saving ? 'Saving...' : 'Save All API Keys'}
        </Button>
      </div>
    </div>
  );
}