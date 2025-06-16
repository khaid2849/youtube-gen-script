import React from 'react';

const ProcessingStatus = ({ progress, message }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full animate-pulse">
            <svg className="w-10 h-10 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Processing Your Video
        </h3>
        
        <p className="text-gray-600 mb-6">{message}</p>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <p className="text-sm text-gray-500">
          {progress}% Complete
        </p>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>This may take a few minutes depending on the video length.</p>
          <p className="loading-dots mt-2">
            Processing<span></span><span></span><span></span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProcessingStatus;