import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show premium loading spinner while fetching profile details
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Verifying authorization...</p>
      </div>
    );
  }

  // Redirect to login if user is not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if role is authorized for the target route
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to home dashboard corresponding to their actual authorized role
    if (user.role === 'STUDENT') {
      return <Navigate to="/student/dashboard" replace />;
    } else if (user.role === 'RECTOR') {
      return <Navigate to="/rector/complaints" replace />;
    } else if (user.role === 'ADMIN') {
      return <Navigate to="/admin/console" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
};

const styles = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#f8fafc',
  },
  spinner: {
    width: '45px',
    height: '45px',
    border: '4px solid #d1e7dd',
    borderTop: '4px solid #0f5132',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    color: '#64748b',
    fontSize: '0.9rem',
    fontWeight: 500,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
};

// Add standard keyframe injection
const styleSheet = document.styleSheets[0];
const spinKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
if (styleSheet) {
  try {
    styleSheet.insertRule(spinKeyframes, styleSheet.cssRules.length);
  } catch (e) {
    console.warn('Could not inject keyframe rule:', e);
  }
}

export default ProtectedRoute;
