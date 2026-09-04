import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [location, setLocation] = useState(user?.location || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Keep local state in sync with global user state
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setLocation(user.location || '');
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ name, phone, location });
      setIsEditing(false);
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(user.name || '');
    setPhone(user.phone || '');
    setLocation(user.location || '');
    setError('');
    setIsEditing(false);
  };

  if (!user) return null;

  return (
    <div className="profile-page">
      <h1>Your Profile</h1>
      <div className="profile-card">
        {!isEditing ? (
          <>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            {user.phone && <p><strong>Phone:</strong> {user.phone}</p>}
            {user.location && <p><strong>Location:</strong> {user.location}</p>}
            <p><strong>Member since:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
            <button onClick={() => setIsEditing(true)} className="btn-edit" style={{ marginTop: '1rem', width: '100%' }}>
              Edit Profile
            </button>
          </>
        ) : (
          <form onSubmit={handleSave} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem' }}>Full Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
            
            <div>
              <label htmlFor="phone" style={{ display: 'block', marginBottom: '0.5rem' }}>Phone</label>
              <input
                id="phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
            
            <div>
              <label htmlFor="location" style={{ display: 'block', marginBottom: '0.5rem' }}>Location</label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
              />
            </div>
            
            {error && <p className="auth-error" style={{ color: 'red' }}>{error}</p>}
            
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" disabled={loading} style={{ flex: 1, padding: '0.5rem' }}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button type="button" onClick={handleCancel} disabled={loading} style={{ flex: 1, padding: '0.5rem', background: '#ccc', color: '#333' }}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
      <button onClick={handleLogout} className="btn-logout" style={{ marginTop: '2rem', width: '100%', padding: '0.5rem', background: '#ff4d4f', color: '#fff' }}>
        Log out
      </button>
    </div>
  );
}
