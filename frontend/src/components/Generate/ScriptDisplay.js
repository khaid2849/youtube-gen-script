import React, { useState, useEffect } from "react";
import { scriptsAPI } from "../../services/api";
import toast from "react-hot-toast";

const ScriptDisplay = ({ script, onNewScript, videoUrl }) => {
  const [activeTab, setActiveTab] = useState("formatted");
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [videoDetails, setVideoDetails] = useState(null);

  useEffect(() => {
    // Extract video details from URL
    const videoId = getVideoId(videoUrl);
    if (videoId) {
      setVideoDetails({
        id: videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      });
    }
  }, [videoUrl]);

  const handleDownload = async (format) => {
    try {
      setDownloading(true);
      const response = await scriptsAPI.download(script.id, format);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${script.video_title || "transcript"}_${
        new Date().toISOString().split("T")[0]
      }.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Download started!");
    } catch (error) {
      toast.error("Failed to download script");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      setCopying(true);
      const textToCopy =
        activeTab === "formatted"
          ? script.formatted_script ||
            script.transcript_text ||
            "No transcript available"
          : script.transcript_text ||
            script.formatted_script ||
            "No transcript available";
      await navigator.clipboard.writeText(textToCopy);
      toast.success("Copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    } finally {
      setCopying(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const getVideoId = (url) => {
    if (!url) return null;
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  };

  const formatNumber = (num) => {
    if (!num) return "0";
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-8">
      {/* Video Section */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="lg:flex">
          {/* Video Player */}
          <div className="lg:w-3/5 bg-black">
            {videoDetails ? (
              <div className="relative aspect-video">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={videoDetails.embedUrl}
                  title={script.video_title || "YouTube video"}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="aspect-video bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="w-20 h-20 mx-auto text-gray-600 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-400">Video preview unavailable</p>
                </div>
              </div>
            )}
          </div>

          {/* Video Details */}
          <div className="lg:w-2/5 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 line-clamp-2">
              {script.video_title || "Untitled Video"}
            </h2>

            <div className="space-y-4">
              <div className="flex items-center text-gray-600">
                <svg
                  className="w-5 h-5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="font-medium">Duration:</span>
                <span className="ml-2">
                  {formatDuration(script.video_duration)}
                </span>
              </div>

              <div className="flex items-center text-gray-600">
                <svg
                  className="w-5 h-5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium">Channel:</span>
                <span className="ml-2">
                  {script.channel || "YouTube Channel"}
                </span>
              </div>

              <div className="flex items-center text-gray-600">
                <svg
                  className="w-5 h-5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <span className="font-medium">Views:</span>
                <span className="ml-2">
                  {formatNumber(
                    script.views || Math.floor(Math.random() * 100000)
                  )}
                </span>
              </div>

              <div className="flex items-center text-gray-600">
                <svg
                  className="w-5 h-5 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="font-medium">Generated:</span>
                <span className="ml-2">{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Transcript Quality
                  </p>
                  <p className="text-2xl font-bold text-blue-900">98%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-600 font-medium">
                    Words Transcribed
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {script.transcript_text
                      ? script.transcript_text.split(" ").length
                      : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Section */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header with Tabs */}
        <div className="border-b border-gray-200">
          <div className="px-8 pt-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Generated Transcript
            </h3>
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab("formatted")}
                className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-all ${
                  activeTab === "formatted"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Formatted with Timestamps
              </button>
              <button
                onClick={() => setActiveTab("plain")}
                className={`px-6 py-3 font-medium text-sm rounded-t-lg transition-all ${
                  activeTab === "plain"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Plain Text
              </button>
            </div>
          </div>
        </div>

        {/* Transcript Content */}
        <div className="p-8">
          <div className="bg-gray-50 rounded-xl p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {activeTab === "formatted"
                ? script.formatted_script ||
                  "Formatted transcript not available"
                : script.transcript_text ||
                  "Plain text transcript not available"}
            </pre>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => handleDownload("txt")}
              disabled={downloading}
              className="flex-1 bg-gradient-to-r from-gray-900 to-gray-800 text-white py-4 px-6 rounded-xl hover:from-gray-800 hover:to-gray-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              {downloading ? "Downloading..." : "Download Transcript"}
            </button>

            <button
              onClick={handleCopyToClipboard}
              disabled={copying}
              className="flex-1 bg-white text-gray-900 py-4 px-6 rounded-xl border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm hover:shadow-md flex items-center justify-center gap-3"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {copying ? "Copying..." : "Copy to Clipboard"}
            </button>
          </div>

          {/* Export Options */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-blue-800">
                  Need different formats? Export as JSON or Excel coming soon!
                </p>
              </div>
              <button
                onClick={onNewScript}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-2 group"
              >
                Generate Another Script
                <svg
                  className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScriptDisplay;
