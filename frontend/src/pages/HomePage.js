import React from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Home/Hero';
import Features from '../components/Home/Features';

const HomePage = () => {
  return (
    <div className="bg-gray-50">
      <Hero />
      <Features />
      
      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Generate Your First Script?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of content creators who save hours with our AI-powered transcription
          </p>
          <Link
            to="/generate"
            className="inline-block bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition duration-200"
          >
            Start for Free
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;