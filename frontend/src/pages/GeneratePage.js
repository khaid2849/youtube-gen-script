import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import URLInput from '../components/Generate/URLInput';
import ProcessingStatus from '../components/Generate/ProcessingStatus';
import ScriptDisplay from '../components/Generate/ScriptDisplay';
import { transcriptionAPI, scriptsAPI } from '../services/api';
import toast from 'react-hot-toast';

const GeneratePage = () => {
  const location = useLocation();
  const [url, setUrl] = useState(location.state?.url || '');
  const [status, setStatus] = useState('idle');
  const [taskId, setTaskId] = useState(null);
  const [scriptId, setScriptId] = useState(null);
  const [scriptData, setScriptData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (taskId && status === 'processing') {
      const interval = setInterval(() => {
        checkStatus();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [taskId, status]);

  const handleSubmit = async (videoUrl) => {
    try {
      setStatus('processing');
      setProgress(0);
      setStatusMessage('Starting transcription...');
      setUrl(videoUrl);
      
      const response = await transcriptionAPI.create({ video_url: videoUrl });
      setTaskId(response.data.task_id);
      
      if (response.data.script_id) {
        setScriptId(response.data.script_id);
      }
      
    } catch (error) {
      setStatus('failed');
      toast.error(error.response?.data?.detail || 'Failed to start transcription');
    }
  };

  const checkStatus = async () => {
    try {
      const response = await transcriptionAPI.getStatus(taskId);
      const data = response.data;
      
      setProgress(data.progress);
      setStatusMessage(data.message);
      
      if (data.script_id && !scriptId) {
        setScriptId(data.script_id);
      }
      
      if (data.status === 'completed') {
        const finalScriptId = data.script_id || scriptId;
        
        if (!finalScriptId) {
          console.error('Script ID is missing from response');
          toast.error('Script generation completed but ID is missing');
          setStatus('failed');
          return;
        }
        
        setStatus('completed');
        await fetchScript(finalScriptId);
        toast.success('Script generated successfully!');
      } else if (data.status === 'failed') {
        setStatus('failed');
        toast.error(data.message || 'Transcription failed');
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  const fetchScript = async (id) => {
    try {
      const response = await scriptsAPI.getById(id);
      setScriptData(response.data);
    } catch (error) {
      console.error('Error fetching script:', error);
      toast.error('Failed to fetch script');
      
      if (scriptId) {
        setScriptData({
          id: scriptId,
          video_url: url,
          status: 'completed',
          formatted_script: 'Script generation completed. Please refresh to see the content.',
          video_title: 'Processing Complete'
        });
      }
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setTaskId(null);
    setScriptId(null);
    setScriptData(null);
    setProgress(0);
    setStatusMessage('');
    setUrl('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {status === 'completed' ? 'Your Script is Ready!' : 'Generate Your Script'}
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              {status === 'completed' 
                ? 'Your video has been successfully transcribed. Download or copy your script below.'
                : 'Transform any YouTube video into a professionally formatted transcript with timestamps.'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {status === 'idle' && (
          <div className="max-w-3xl mx-auto">
            <URLInput 
              initialUrl={url}
              onSubmit={handleSubmit}
            />
          </div>
        )}

        {status === 'processing' && (
          <div className="max-w-3xl mx-auto">
            <ProcessingStatus 
              progress={progress}
              message={statusMessage}
            />
          </div>
        )}

        {status === 'completed' && scriptData && (
          <ScriptDisplay 
            script={scriptData}
            onNewScript={handleReset}
            videoUrl={url}
          />
        )}

        {status === 'failed' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Transcription Failed
              </h3>
              <p className="text-gray-600 mb-8">{statusMessage || 'Something went wrong. Please try again.'}</p>
              <button
                onClick={handleReset}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneratePage;