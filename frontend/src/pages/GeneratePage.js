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
  const [status, setStatus] = useState('idle'); // idle, processing, completed, failed
  const [taskId, setTaskId] = useState(null);
  const [scriptId, setScriptId] = useState(null);
  const [scriptData, setScriptData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (taskId && status === 'processing') {
      const interval = setInterval(() => {
        checkStatus();
      }, 2000); // Check every 2 seconds

      return () => clearInterval(interval);
    }
  }, [taskId, status]);

  const handleSubmit = async (videoUrl) => {
    try {
      setStatus('processing');
      setProgress(0);
      setStatusMessage('Starting transcription...');
      
      const response = await transcriptionAPI.create({ video_url: videoUrl });
      setTaskId(response.data.task_id);
      
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
      
      if (data.status === 'completed') {
        setStatus('completed');
        setScriptId(data.script_id);
        await fetchScript(data.script_id);
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
      toast.error('Failed to fetch script');
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
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Generate Your Script</h1>
          <p className="mt-2 text-gray-600">
            Processing your YouTube video with AI-powered transcription
          </p>
        </div>

        {status === 'idle' && (
          <URLInput 
            initialUrl={url}
            onSubmit={handleSubmit}
          />
        )}

        {status === 'processing' && (
          <ProcessingStatus 
            progress={progress}
            message={statusMessage}
          />
        )}

        {status === 'completed' && scriptData && (
          <ScriptDisplay 
            script={scriptData}
            onNewScript={handleReset}
          />
        )}

        {status === 'failed' && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-red-500 text-5xl mb-4">❌</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Transcription Failed
            </h3>
            <p className="text-gray-600 mb-6">{statusMessage}</p>
            <button
              onClick={handleReset}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeneratePage;