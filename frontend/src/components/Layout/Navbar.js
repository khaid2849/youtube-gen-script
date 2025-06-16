import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../services/api';

const Navbar = () => {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await authAPI.getProfile();
        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch profile');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/');
  };

  const isActiveLink = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-gray-900">
              ScriptGen
            </Link>
            
            <div className="hidden md:flex ml-10 space-x-8">
              <Link
                to="/"
                className={`${
                  isActiveLink('/') ? 'text-blue-600' : 'text-gray-500'
                } hover:text-gray-900 px-3 py-2 text-sm font-medium`}
              >
                Home
              </Link>
              <Link
                to="/generate"
                className={`${
                  isActiveLink('/generate') ? 'text-blue-600' : 'text-gray-500'
                } hover:text-gray-900 px-3 py-2 text-sm font-medium`}
              >
                Generate
              </Link>
              <Link
                to="/pricing"
                className={`${
                  isActiveLink('/pricing') ? 'text-blue-600' : 'text-gray-500'
                } hover:text-gray-900 px-3 py-2 text-sm font-medium`}
              >
                Pricing
              </Link>
              <Link
                to="/contact"
                className={`${
                  isActiveLink('/contact') ? 'text-blue-600' : 'text-gray-500'
                } hover:text-gray-900 px-3 py-2 text-sm font-medium`}
              >
                Contact
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/dashboard"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
                  >
                    <div className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  </button>
                  
                  {isMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                      <div className="px-4 py-2 text-sm text-gray-700 border-b">
                        {user.email}
                      </div>
                      <Link
                        to="/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="bg-gray-900 text-white hover:bg-gray-800 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;