import React, { useState } from 'react';
import { scriptsAPI } from '../../services/api';
import toast from 'react-hot-toast';

const ScriptDisplay = ({ script, onNewScript }) => {
  const [activeTab, setActiveTab] = useState('txt');
  const [copying, setCopying] = useState(false);

  const handleDownload = async (format) => {
    try {
      const response = await scriptsAPI.download(script.id, format);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `script_${script.id}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Download started!');
    } catch (error) {
      toast.error('Failed to download script');
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(script.formatted_script);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    } finally {
      setCopying(false);
    }
  };

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Video Info */}
      <div className="p-6 bg-gray-50 border-b">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {script.video_title}
        </h2>
        <div className="flex items-center text-sm text-gray-600 space-x-4">
          <span>Duration: {formatDuration(script.video_duration)}</span>
          <span>•</span>
          <span>Channel: Tech Academy</span>
          <span>•</span>
          <span>Views: 125K</span>
        </div>
      </div>

      {/* Format Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('txt')}
          className={`px-6 py-3 font-medium text-sm ${
            activeTab === 'txt'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          TXT
        </button>
        <button
          onClick={() => setActiveTab('json')}
          className={`px-6 py-3 font-medium text-sm ${
            activeTab === 'json'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          JSON
        </button>
        <button
          onClick={() => setActiveTab('excel')}
          className={`px-6 py-3 font-medium text-sm ${
            activeTab === 'excel'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Excel
        </button>
      </div>

      {/* Script Content */}
      <div className="p-6">
        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {script.formatted_script || 'Transcription in progress... More content will appear here.'}
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 bg-gray-50 border-t">
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => handleDownload(activeTab)}
            className="flex-1 bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition duration-200 font-medium"
          >
            Download Script
          </button>
          <button
            onClick={handleCopyToClipboard}
            disabled={copying}
            className="flex-1 bg-white text-gray-900 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition duration-200 font-medium"
          >
            {copying ? 'Copying...' : 'Copy to Clipboard'}
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <button
            onClick={onNewScript}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Generate Another Script →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScriptDisplay;