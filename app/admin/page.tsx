'use client';

import { useState, useEffect } from 'react';
import AdminAuth from '../components/AdminAuth';
import AdminDashboard from '../components/AdminDashboard';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    // Check if user is already authenticated from session storage
    const adminAuthenticated = sessionStorage.getItem('adminAuthenticated');
    if (adminAuthenticated === 'true') {
      setIsAuthenticated(true);
    }
  }, []);
  
  const handleAuthenticated = () => {
    setIsAuthenticated(true);
  };
  
  return (
    <div className="min-h-screen bg-gray-100">
      {isAuthenticated ? (
        <AdminDashboard />
      ) : (
        <AdminAuth onAuthenticated={handleAuthenticated} />
      )}
    </div>
  );
}
