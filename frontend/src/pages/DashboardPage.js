import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { scriptsAPI, authAPI } from '../services/api';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userResponse, dashboardResponse] = await Promise.all([
        authAPI.getProfile(),
        scriptsAPI.getDashboard()
      ]);
      
      setUser(userResponse.data);
      setDashboardData(dashboardResponse.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-dots text-gray-600">
          <span></span><span></span><span></span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              {/* User Profile */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gray-900 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-semibold">{user?.username}</h2>
                <p className="text-sm text-gray-600">{user?.is_pro ? 'Pro Member' : 'Free Member'}</p>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeTab === 'overview' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeTab === 'history' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  History
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeTab === 'settings' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab('billing')}
                  className={`w-full text-left px-4 py-2 rounded-lg ${
                    activeTab === 'billing' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Billing
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'overview' && (
              <>
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h1>
                
                {/* Stats Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {dashboardData?.scripts_generated || 0}
                    </h3>
                    <p className="text-gray-600">Scripts Generated</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {dashboardData?.hours_processed || 0}h
                    </h3>
                    <p className="text-gray-600">Hours Processed</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {dashboardData?.accuracy_rate || 98}%
                    </h3>
                    <p className="text-gray-600">Accuracy Rate</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="flex flex-wrap gap-4">
                    <Link
                      to="/generate"
                      className="bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition duration-200"
                    >
                      Generate New Script
                    </Link>
                    <button className="bg-white text-gray-900 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition duration-200">
                      View History
                    </button>
                    <button className="bg-white text-gray-900 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition duration-200">
                      Manage Billing
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
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
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dashboardData?.recent_scripts?.map((script) => (
                          <tr key={script.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {script.video_title || 'Untitled'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDuration(script.video_duration || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(script.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(script.status)}`}>
                                {script.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'history' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Script History</h2>
                <p className="text-gray-600">Your complete transcription history will appear here.</p>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Settings</h2>
                <p className="text-gray-600">Manage your account settings and preferences.</p>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing</h2>
                <p className="text-gray-600 mb-4">Current Plan: {user?.is_pro ? 'Pro' : 'Free'}</p>
                {!user?.is_pro && (
                  <Link
                    to="/pricing"
                    className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                  >
                    Upgrade to Pro
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;