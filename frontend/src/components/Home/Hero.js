import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      navigate('/generate', { state: { url } });
    }
  };

  return (
    <section className="relative py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Turn YouTube Videos<br />
            Into Perfect Scripts
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            AI-powered transcription that converts any YouTube video into 
            timestamped, searchable text in seconds. Perfect for content creators, 
            students, and researchers.
          </p>
          
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=example"
                className="flex-1 px-6 py-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                className="bg-gray-900 text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition duration-200 font-medium"
              >
                Generate Script for Free
              </button>
            </div>
          </form>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-0 right-0 -z-10 transform translate-x-1/2 -translate-y-1/2">
        <div className="w-96 h-96 bg-blue-100 rounded-full opacity-20 blur-3xl"></div>
      </div>
    </section>
  );
};

export default Hero;