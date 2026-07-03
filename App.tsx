import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import Login from './components/Login';
import ResetPassword from './components/ResetPassword';
import Dashboard from './pages/Dashboard';

const ProtectedRoute = ({ children, requireActive = true }: { children: React.ReactNode, requireActive?: boolean }) => {
  const { user, token } = useAuth();
  
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // If user is inactive, they should not be able to login at all, but if they reach here, block them?
  // Wait, if is_active means "banned/disabled", we should clear token and redirect to login
  if (!user.is_active) {
    return <Navigate to="/login" replace />; // Or a special blocked page
  }

  // force_reset check
  if (requireActive && user.force_reset) {
    return <Navigate to="/reset-password" replace />;
  }

  // If going to reset password but already active, redirect to home
  if (!requireActive && !user.force_reset) {
      return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={
        <ProtectedRoute requireActive={false}>
          <ResetPassword />
        </ProtectedRoute>
      } />
      <Route path="/*" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ModalProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ModalProvider>
    </AuthProvider>
  );
};

export default App;
