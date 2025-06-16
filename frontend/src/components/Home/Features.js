import React from 'react';

const Features = () => {
  const features = [
    {
      icon: '⚡',
      title: 'Lightning Fast',
      description: 'Get your transcript in under 60 seconds with our advanced AI processing.'
    },
    {
      icon: '🎯',
      title: 'Highly Accurate',
      description: '99%+ accuracy with automatic punctuation and intelligent formatting.'
    },
    {
      icon: '📄',
      title: 'Multiple Formats',
      description: 'Export as TXT, JSON, or Excel. Customize to fit your workflow.'
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;