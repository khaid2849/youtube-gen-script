import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout
import Layout from './components/Layout/Layout';

// Pages
import HomePage from './pages/HomePage';
import GeneratePage from './pages/GeneratePage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            style: {
              background: '#059669',
            },
          },
          error: {
            style: {
              background: '#DC2626',
            },
          },
        }}
      />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* Routes with Layout */}
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/generate" element={<Layout><GeneratePage /></Layout>} />
        <Route path="/pricing" element={<Layout><PricingPage /></Layout>} />
        <Route path="/contact" element={<Layout><ContactPage /></Layout>} />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Layout><DashboardPage /></Layout>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;