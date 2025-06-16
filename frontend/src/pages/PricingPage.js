import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const PricingPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setIsLoading(true);
      await authAPI.upgradeToPro();
      toast.success('Successfully upgraded to Pro!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to upgrade. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const faqs = [
    {
      question: "What's included in the Free plan?",
      answer: "The Free plan includes 5 video transcriptions per month, basic timestamps, TXT format export, and community support."
    },
    {
      question: "Can I upgrade or downgrade anytime?",
      answer: "Yes! You can upgrade to Pro anytime and your billing will be prorated. Downgrading takes effect at the end of your billing cycle."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, debit cards, and PayPal. All payments are processed securely through Stripe."
    },
    {
      question: "Is there a free trial for the Pro plan?",
      answer: "Yes! You get a 7-day free trial when you sign up for Pro. You can cancel anytime during the trial period."
    },
    {
      question: "How accurate is the transcription?",
      answer: "Our AI-powered transcription achieves 98%+ accuracy for clear audio. Accuracy may vary based on audio quality, accents, and background noise."
    }
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">
            Start free, upgrade when you need more. All plans include our core transcription features.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Free</h2>
            <div className="mb-6">
              <span className="text-5xl font-bold">$0</span>
              <span className="text-gray-600 ml-2">Forever free</span>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">5 videos per month</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">TXT format export</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Basic timestamps</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Community support</span>
              </li>
            </ul>
            
            <Link
              to="/signup"
              className="block w-full text-center bg-gray-100 text-gray-900 py-3 rounded-lg hover:bg-gray-200 transition duration-200 font-medium"
            >
              Get Started
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-blue-500 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pro</h2>
            <div className="mb-6">
              <span className="text-5xl font-bold">$19</span>
              <span className="text-gray-600 ml-2">per month</span>
            </div>
            
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Unlimited videos</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">All export formats</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Speaker identification</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Priority processing</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-700">Email support</span>
              </li>
            </ul>
            
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="block w-full text-center bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition duration-200 font-medium disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Start Free Trial'}
            </button>
          </div>
        </div>
      </div>

      {/* FAQs */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {faq.question}
              </h3>
              <p className="text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;