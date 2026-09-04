import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps any route that requires a logged-in user.
 * Redirects to /auth while loading is still in progress it shows nothing
 * to avoid a flash, then redirects to /auth if not authenticated.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null; // brief — only while localStorage is being read
  if (!user) return <Navigate to="/auth" replace />;

  return children;
}
