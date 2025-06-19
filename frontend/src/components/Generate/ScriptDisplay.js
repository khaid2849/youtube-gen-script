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
      const textToCopy = script.formatted_script || script.transcript_text || 'No transcript available';
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    } finally {
      setCopying(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Extract video ID from URL
  const getVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  };

  const videoId = getVideoId(script.video_url);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Left side - Video Preview */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          {videoId ? (
            <div className="relative pb-[56.25%] h-0 overflow-hidden">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={script.video_title || 'YouTube video'}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500">Video preview unavailable</p>
            </div>
          )}
          
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {script.video_title || 'Untitled Video'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Duration: {formatDuration(script.video_duration)} • 
              Channel: {script.channel || 'Unknown'} • 
              Views: {script.views || 'N/A'}
            </p>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                Processing: Transcribing audio... (75%)
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Generated Script */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Generated Script</h2>
        </div>

        {/* Format Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('txt')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'txt'
                ? 'text-white bg-gray-900'
                : 'text-gray-600 hover:text-gray-900 bg-gray-50'
            }`}
          >
            TXT
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'json'
                ? 'text-white bg-gray-900'
                : 'text-gray-600 hover:text-gray-900 bg-gray-50'
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => setActiveTab('excel')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'excel'
                ? 'text-white bg-gray-900'
                : 'text-gray-600 hover:text-gray-900 bg-gray-50'
            }`}
          >
            Excel
          </button>
        </div>

        {/* Script Content */}
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
              {script.formatted_script || script.transcript_text || (
                <span className="text-gray-400 italic">
                  Transcription in progress... More content will appear here.
                </span>
              )}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t">
          <div className="flex gap-4">
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
    </div>
  );
};

export default ScriptDisplay;