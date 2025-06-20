import React from "react";

const ProcessingStatus = ({ progress, message }) => {
  const steps = [
    { threshold: 0, label: "Initializing", icon: "🚀" },
    { threshold: 20, label: "Downloading Audio", icon: "⬇️" },
    { threshold: 50, label: "Transcribing", icon: "🎯" },
    { threshold: 80, label: "Formatting", icon: "📝" },
    { threshold: 95, label: "Finalizing", icon: "✨" },
  ];

  const currentStep = steps.reduce(
    (acc, step) => (progress >= step.threshold ? step : acc),
    steps[0]
  );

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
      <div className="text-center">
        {/* Animated Icon */}
        <div className="mb-8">
          <div className="relative inline-flex">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-5xl animate-bounce">
                {currentStep.icon}
              </span>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          {currentStep.label}
        </h3>

        <p className="text-gray-600 mb-8">{message}</p>

        {/* Progress Bar */}
        <div className="relative">
          <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          <p className="text-sm font-medium text-gray-700">
            {progress}% Complete
          </p>
        </div>

        {/* Steps Indicator */}
        <div className="mt-8 flex justify-between items-center max-w-md mx-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex flex-col items-center ${
                progress >= step.threshold ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  progress >= step.threshold ? "bg-blue-100" : "bg-gray-100"
                }`}
              >
                {step.icon}
              </div>
              <span className="text-xs mt-2 hidden sm:block">{step.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>This may take a few minutes depending on the video length.</p>
          <p className="mt-2">Please don't close this tab.</p>
        </div>
      </div>
    </div>
  );
};

export default ProcessingStatus;
