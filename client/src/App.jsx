import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import CallModal from './components/CallModal';
import ProtectedRoute from './components/ProtectedRoute';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import SellPage from './pages/SellPage';
import MyListings from './pages/MyListings';
import ListingDetail from './pages/ListingDetail';
import SettingsPage from './pages/SettingsPage';
import ChatPage from './pages/ChatPage';
import './App.css';

function Navbar() {
  const { user } = useAuth();
  return (
    <nav className="navbar top-nav">
      <Link to="/" className="navbar-brand">ReSell</Link>
      <div className="navbar-links">
        {user ? (
          <Link to="/profile" className="nav-profile-btn">
            {user.name.charAt(0).toUpperCase()}
          </Link>
        ) : (
          <Link to="/auth">Sign in</Link>
        )}
      </div>
    </nav>
  );
}

function BottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  if (!user) return null;

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
        <span className="icon">🏠</span>
        <span>Home</span>
      </Link>
      <Link to="/chat" className={`nav-item ${pathname === '/chat' ? 'active' : ''}`}>
        <span className="icon">💬</span>
        <span>Chat</span>
      </Link>
      <Link to="/sell" className={`nav-item ${pathname === '/sell' ? 'active' : ''}`}>
        <span className="icon sell-icon">➕</span>
        <span>Sell</span>
      </Link>
      <Link to="/my-listings" className={`nav-item ${pathname === '/my-listings' ? 'active' : ''}`}>
        <span className="icon">📦</span>
        <span>My Listings</span>
      </Link>
      <Link to="/settings" className={`nav-item ${pathname === '/settings' ? 'active' : ''}`}>
        <span className="icon">⚙️</span>
        <span>Settings</span>
      </Link>
    </nav>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/sell" element={<ProtectedRoute><SellPage /></ProtectedRoute>} />
          <Route path="/my-listings" element={<ProtectedRoute><MyListings /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <CallModal />
          <AppRoutes />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
