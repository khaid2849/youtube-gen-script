import React, { useState } from 'react';

const URLInput = ({ initialUrl = '', onSubmit }) => {
  const [url, setUrl] = useState(initialUrl);
  const [isValid, setIsValid] = useState(true);

  const validateYouTubeUrl = (url) => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]+/;
    return pattern.test(url);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateYouTubeUrl(url)) {
      setIsValid(false);
      return;
    }
    
    setIsValid(true);
    onSubmit(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            YouTube URL
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setIsValid(true);
            }}
            placeholder="https://youtube.com/watch?v=example"
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
              isValid 
                ? 'border-gray-300 focus:ring-blue-500' 
                : 'border-red-500 focus:ring-red-500'
            }`}
            required
          />
          {!isValid && (
            <p className="mt-2 text-sm text-red-600">
              Please enter a valid YouTube URL
            </p>
          )}
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Make sure the video is publicly accessible and not age-restricted.
          </p>
        </div>
        
        <button
          type="submit"
          className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition duration-200 font-medium"
        >
          Generate Script
        </button>
      </form>
    </div>
  );
};

export default URLInput;