import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  scriptsAPI,
  authAPI,
  downloadBlob,
  getFilenameFromResponse,
} from "../services/api";
import toast from "react-hot-toast";

const DashboardPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileData, setProfileData] = useState({
    username: "",
    email: "",
    bio: "",
    company: "",
    location: "",
    website: "",
  });

  // History tab states
  const [scripts, setScripts] = useState([]);
  const [totalScripts, setTotalScripts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [selectedScripts, setSelectedScripts] = useState([]);

  // Settings tab states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // User stats
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchScripts();
    }
  }, [activeTab, currentPage, searchTerm, statusFilter]);

  const fetchData = async () => {
    try {
      const [userResponse, dashboardResponse, statsResponse] =
        await Promise.all([
          authAPI.getProfile(),
          scriptsAPI.getDashboard(),
          authAPI.getStats(),
        ]);

      setUser(userResponse.data);
      setDashboardData(dashboardResponse.data);
      setUserStats(statsResponse.data);
      setProfileData({
        username: userResponse.data.username || "",
        email: userResponse.data.email || "",
        bio: userResponse.data.bio || "",
        company: userResponse.data.company || "",
        location: userResponse.data.location || "",
        website: userResponse.data.website || "",
      });
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchScripts = async () => {
    setLoadingScripts(true);
    try {
      const params = {
        skip: (currentPage - 1) * 10,
        limit: 10,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        sort_by: "created_at",
        sort_order: "desc",
      };

      const response = await scriptsAPI.getList(params);
      setScripts(response.data.scripts);
      setTotalScripts(response.data.total);
      setTotalPages(response.data.pages);
    } catch (error) {
      toast.error("Failed to load scripts");
    } finally {
      setLoadingScripts(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      await authAPI.updateProfile(profileData);
      toast.success("Profile updated successfully");
      setProfileEdit(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update profile");
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    try {
      await authAPI.changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });
      toast.success("Password changed successfully");
      setShowPasswordModal(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to change password");
    }
  };

  const handleExportData = async () => {
    try {
      const format = prompt(
        "Select export format: json, csv, excel, txt",
        "json"
      );
      if (!format) return;

      const response = await scriptsAPI.export({
        format: format,
        script_ids: selectedScripts.length > 0 ? selectedScripts : null,
      });

      const filename = getFilenameFromResponse(response) || `export.${format}`;
      downloadBlob(response.data, filename);
      toast.success("Export started successfully");
    } catch (error) {
      toast.error("Failed to export data");
    }
  };

  const handleViewAllScripts = () => {
    setActiveTab("history");
  };

  const handleDownloadScript = async (scriptId, format = "txt") => {
    try {
      const response = await scriptsAPI.download(scriptId, format);
      const filename =
        getFilenameFromResponse(response) || `script_${scriptId}.${format}`;
      downloadBlob(response.data, filename);
      toast.success("Download started");
    } catch (error) {
      toast.error("Failed to download script");
    }
  };

  const handleDeleteScript = async (scriptId) => {
    if (!window.confirm("Are you sure you want to delete this script?")) return;

    try {
      await scriptsAPI.delete(scriptId);
      toast.success("Script deleted successfully");
      fetchScripts();
      fetchData(); // Refresh dashboard stats
    } catch (error) {
      toast.error("Failed to delete script");
    }
  };

  const handleRegenerateScript = async (scriptId) => {
    try {
      const response = await scriptsAPI.regenerate(scriptId);
      toast.success("Script queued for regeneration");
      fetchScripts();
    } catch (error) {
      toast.error("Failed to regenerate script");
    }
  };

  const handleSelectScript = (scriptId) => {
    setSelectedScripts((prev) =>
      prev.includes(scriptId)
        ? prev.filter((id) => id !== scriptId)
        : [...prev, scriptId]
    );
  };

  const handleSelectAllScripts = () => {
    if (selectedScripts.length === scripts.length) {
      setSelectedScripts([]);
    } else {
      setSelectedScripts(scripts.map((s) => s.id));
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: "bg-green-100 text-green-800",
      processing: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
      pending: "bg-gray-100 text-gray-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-dots text-gray-600">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Enhanced Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              {/* User Profile */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold shadow-lg">
                    {user?.username.charAt(0).toUpperCase()}
                  </div>
                  {user?.is_pro && (
                    <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-gray-900 rounded-full p-1">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {user?.username}
                </h2>
                <p className="text-sm text-gray-600">{user?.email}</p>
                <p className="text-sm font-medium mt-2">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-xs ${
                      user?.is_pro
                        ? "bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {user?.is_pro ? "⭐ Pro Member" : "Free Member"}
                  </span>
                </p>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === "overview"
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    className="mr-3 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === "history"
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    className="mr-3 h-5 w-5"
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
                  History
                </button>
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === "profile"
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    className="mr-3 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Profile
                </button>
                <button
                  onClick={() => setActiveTab("settings")}
                  className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === "settings"
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    className="mr-3 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab("billing")}
                  className={`w-full flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    activeTab === "billing"
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <svg
                    className="mr-3 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  Billing
                </button>
              </nav>

              {/* Quick Stats */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Daily Limit</span>
                    <span className="font-medium text-gray-900">
                      {user?.is_pro
                        ? "∞"
                        : `${dashboardData?.videos_processed_today || 0}/5`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Storage Used</span>
                    <span className="font-medium text-gray-900">
                      {dashboardData?.storage_used_gb || 0} GB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === "overview" && (
              <>
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome back, {user?.username}!
                  </h1>
                  <p className="text-gray-600">
                    Here's what's happening with your transcriptions today.
                  </p>
                </div>

                {/* Enhanced Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Total Scripts
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {dashboardData?.scripts_generated || 0}
                        </p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <svg
                          className="w-6 h-6 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {userStats?.success_rate || 0}% success rate
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Hours Processed
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {dashboardData?.hours_processed || 0}h
                        </p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <svg
                          className="w-6 h-6 text-purple-600"
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
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {userStats?.total_duration_hours || 0} hours total
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Accuracy Rate
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {dashboardData?.accuracy_rate || 98}%
                        </p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <svg
                          className="w-6 h-6 text-green-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Industry leading
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          Time Saved
                        </p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {Math.round(dashboardData?.time_saved_hours || 0)}h
                        </p>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <svg
                          className="w-6 h-6 text-yellow-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Compared to manual
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Quick Actions
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                      to="/generate"
                      className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 shadow-md"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Generate New Script
                    </Link>
                    <button
                      onClick={handleViewAllScripts}
                      className="flex items-center justify-center px-4 py-3 bg-white text-gray-700 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      View All Scripts
                    </button>
                    <button
                      onClick={handleExportData}
                      className="flex items-center justify-center px-4 py-3 bg-white text-gray-700 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Export Data
                    </button>
                  </div>
                </div>

                {/* Recent Activity with Charts */}
                <div className="grid lg:grid-cols-3 gap-8 mb-8">
                  <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-6 py-4 border-b flex justify-between items-center">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Recent Scripts
                      </h2>
                      <button
                        onClick={handleViewAllScripts}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        View all →
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Video Title
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Duration
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Created
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {dashboardData?.recent_scripts?.map((script) => (
                            <tr key={script.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {script.video_title || "Untitled"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDuration(script.video_duration || 0)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(
                                  script.created_at
                                ).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                                    script.status
                                  )}`}
                                >
                                  {script.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <button
                                  onClick={() =>
                                    navigate(`/scripts/${script.id}`)
                                  }
                                  className="text-blue-600 hover:text-blue-900 mr-3"
                                >
                                  View
                                </button>
                                {script.status === "completed" && (
                                  <button
                                    onClick={() =>
                                      handleDownloadScript(script.id)
                                    }
                                    className="text-gray-600 hover:text-gray-900"
                                  >
                                    Download
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Usage Overview
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Daily Usage</span>
                          <span className="font-medium">
                            {user?.is_pro
                              ? "Unlimited"
                              : `${
                                  dashboardData?.videos_processed_today || 0
                                }/5`}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: user?.is_pro
                                ? "100%"
                                : `${
                                    ((dashboardData?.videos_processed_today ||
                                      0) /
                                      5) *
                                    100
                                  }%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Storage</span>
                          <span className="font-medium">
                            {dashboardData?.storage_used_gb || 0}/10 GB
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                            style={{
                              width: `${
                                ((dashboardData?.storage_used_gb || 0) / 10) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">
                          Monthly Trend
                        </h4>
                        {userStats?.monthly_stats?.map((stat, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between text-sm mb-2"
                          >
                            <span className="text-gray-600">{stat.month}</span>
                            <span className="font-medium">
                              {stat.count} scripts
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "history" && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Script History
                  </h2>
                </div>
                <div className="p-6">
                  <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col sm:flex-row gap-4 flex-1">
                      <input
                        type="text"
                        placeholder="Search scripts..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="processing">Processing</option>
                        <option value="failed">Failed</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                    <button
                      onClick={handleExportData}
                      disabled={selectedScripts.length === 0}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Export{" "}
                      {selectedScripts.length > 0
                        ? `(${selectedScripts.length})`
                        : "All"}
                    </button>
                  </div>

                  {loadingScripts ? (
                    <div className="text-center py-8">
                      <div className="loading-dots text-gray-600">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  ) : scripts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No scripts found
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left">
                                <input
                                  type="checkbox"
                                  checked={
                                    selectedScripts.length === scripts.length &&
                                    scripts.length > 0
                                  }
                                  onChange={handleSelectAllScripts}
                                  className="rounded border-gray-300"
                                />
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Video Title
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Duration
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Created
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {scripts.map((script) => (
                              <tr key={script.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                  <input
                                    type="checkbox"
                                    checked={selectedScripts.includes(
                                      script.id
                                    )}
                                    onChange={() =>
                                      handleSelectScript(script.id)
                                    }
                                    className="rounded border-gray-300"
                                  />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {script.video_title || "Untitled"}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {script.video_url}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatDuration(script.video_duration || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(
                                    script.created_at
                                  ).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                                      script.status
                                    )}`}
                                  >
                                    {script.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() =>
                                        navigate(`/scripts/${script.id}`)
                                      }
                                      className="text-blue-600 hover:text-blue-900"
                                    >
                                      View
                                    </button>
                                    {script.status === "completed" && (
                                      <button
                                        onClick={() =>
                                          handleDownloadScript(script.id)
                                        }
                                        className="text-gray-600 hover:text-gray-900"
                                      >
                                        Download
                                      </button>
                                    )}
                                    {script.status === "failed" && (
                                      <button
                                        onClick={() =>
                                          handleRegenerateScript(script.id)
                                        }
                                        className="text-yellow-600 hover:text-yellow-900"
                                      >
                                        Retry
                                      </button>
                                    )}
                                    <button
                                      onClick={() =>
                                        handleDeleteScript(script.id)
                                      }
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      <div className="mt-4 flex justify-between items-center">
                        <div className="text-sm text-gray-700">
                          Showing {(currentPage - 1) * 10 + 1} to{" "}
                          {Math.min(currentPage * 10, totalScripts)} of{" "}
                          {totalScripts} results
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() =>
                              setCurrentPage((prev) => Math.max(1, prev - 1))
                            }
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Previous
                          </button>
                          <span className="px-3 py-1">
                            Page {currentPage} of {totalPages}
                          </span>
                          <button
                            onClick={() =>
                              setCurrentPage((prev) =>
                                Math.min(totalPages, prev + 1)
                              )
                            }
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Profile Information
                  </h2>
                  <button
                    onClick={() => setProfileEdit(!profileEdit)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {profileEdit ? "Cancel" : "Edit Profile"}
                  </button>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            username: e.target.value,
                          })
                        }
                        disabled={!profileEdit}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            email: e.target.value,
                          })
                        }
                        disabled={!profileEdit}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company
                      </label>
                      <input
                        type="text"
                        value={profileData.company}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            company: e.target.value,
                          })
                        }
                        disabled={!profileEdit}
                        placeholder="Your company"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={profileData.location}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            location: e.target.value,
                          })
                        }
                        disabled={!profileEdit}
                        placeholder="City, Country"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={profileData.bio}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            bio: e.target.value,
                          })
                        }
                        disabled={!profileEdit}
                        rows="4"
                        placeholder="Tell us about yourself..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={profileData.website}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            website: e.target.value,
                          })
                        }
                        disabled={!profileEdit}
                        placeholder="https://yourwebsite.com"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                      />
                    </div>
                  </div>
                  {profileEdit && (
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleProfileUpdate}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                      >
                        Save Changes
                      </button>
                    </div>
                  )}

                  <div className="mt-8 pt-8 border-t">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Account Statistics
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Member Since</p>
                        <p className="text-lg font-medium text-gray-900">
                          {userStats?.member_since}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Account Type</p>
                        <p className="text-lg font-medium text-gray-900">
                          {userStats?.account_type}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Total Scripts</p>
                        <p className="text-lg font-medium text-gray-900">
                          {userStats?.total_scripts}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="text-lg font-medium text-gray-900">
                          {userStats?.success_rate}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Account Settings
                    </h2>
                  </div>
                  <div className="p-6 space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Preferences
                      </h3>
                      <div className="space-y-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            defaultChecked
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Email notifications for completed transcriptions
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            defaultChecked
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Weekly usage summary
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Product updates and announcements
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="pt-6 border-t">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Default Export Settings
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Default Format
                          </label>
                          <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option>TXT</option>
                            <option>JSON</option>
                            <option>Excel</option>
                            <option>CSV</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Timestamp Format
                          </label>
                          <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option>[HH:MM:SS]</option>
                            <option>[MM:SS]</option>
                            <option>Custom</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Security
                      </h3>
                      <div className="space-y-4">
                        <button
                          onClick={() => setShowPasswordModal(true)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Change Password
                        </button>
                        <div>
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                            Enable Two-Factor Authentication
                          </button>
                          <p className="text-xs text-gray-500 mt-1">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-red-900 mb-2">
                    Danger Zone
                  </h3>
                  <p className="text-sm text-red-700 mb-4">
                    Once you delete your account, there is no going back. Please
                    be certain.
                  </p>
                  <button
                    onClick={() => {
                      const password = prompt(
                        "Please enter your password to confirm account deletion:"
                      );
                      if (password) {
                        authAPI
                          .deleteAccount(password)
                          .then(() => {
                            toast.success("Account deleted successfully");
                            localStorage.removeItem("token");
                            navigate("/");
                          })
                          .catch((error) => {
                            toast.error(
                              error.response?.data?.detail ||
                                "Failed to delete account"
                            );
                          });
                      }
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-200 text-sm"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Billing & Subscription
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Current Plan
                      </h3>
                      <div
                        className={`p-6 rounded-lg border-2 ${
                          user?.is_pro
                            ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-400"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-xl font-bold text-gray-900">
                              {user?.is_pro ? "⭐ Pro Plan" : "Free Plan"}
                            </h4>
                            <p className="text-gray-600 mt-1">
                              {user?.is_pro
                                ? "Unlimited transcriptions with priority processing"
                                : "Limited to 5 transcriptions per day"}
                            </p>
                            <p className="text-2xl font-bold mt-4">
                              {user?.is_pro ? "$19/month" : "$0/month"}
                            </p>
                          </div>
                          {!user?.is_pro && (
                            <Link
                              to="/pricing"
                              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                            >
                              Upgrade to Pro
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {user?.is_pro && (
                      <>
                        <div className="mb-6">
                          <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Billing Details
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between py-2">
                              <span className="text-gray-600">
                                Next billing date
                              </span>
                              <span className="font-medium">July 20, 2025</span>
                            </div>
                            <div className="flex justify-between py-2">
                              <span className="text-gray-600">
                                Payment method
                              </span>
                              <span className="font-medium">•••• 4242</span>
                            </div>
                            <div className="flex justify-between py-2">
                              <span className="text-gray-600">
                                Member since
                              </span>
                              <span className="font-medium">
                                {userStats?.member_since}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex space-x-4">
                          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition duration-200">
                            Update Payment Method
                          </button>
                          <button className="text-red-600 hover:text-red-700 px-4 py-2">
                            Cancel Subscription
                          </button>
                        </div>
                      </>
                    )}

                    <div className="mt-8 pt-8 border-t">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Features Comparison
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <th className="pb-3">Feature</th>
                              <th className="pb-3">Free</th>
                              <th className="pb-3">Pro</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            <tr>
                              <td className="py-3 text-sm text-gray-900">
                                Daily Transcriptions
                              </td>
                              <td className="py-3 text-sm text-gray-600">5</td>
                              <td className="py-3 text-sm text-gray-600">
                                Unlimited
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3 text-sm text-gray-900">
                                Export Formats
                              </td>
                              <td className="py-3 text-sm text-gray-600">
                                TXT only
                              </td>
                              <td className="py-3 text-sm text-gray-600">
                                All formats
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3 text-sm text-gray-900">
                                Processing Speed
                              </td>
                              <td className="py-3 text-sm text-gray-600">
                                Standard
                              </td>
                              <td className="py-3 text-sm text-gray-600">
                                Priority
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3 text-sm text-gray-900">
                                Storage
                              </td>
                              <td className="py-3 text-sm text-gray-600">
                                1 GB
                              </td>
                              <td className="py-3 text-sm text-gray-600">
                                10 GB
                              </td>
                            </tr>
                            <tr>
                              <td className="py-3 text-sm text-gray-900">
                                Support
                              </td>
                              <td className="py-3 text-sm text-gray-600">
                                Community
                              </td>
                              <td className="py-3 text-sm text-gray-600">
                                Priority Email
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Change Password
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      currentPassword: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      newPassword: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({
                      ...passwordData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
