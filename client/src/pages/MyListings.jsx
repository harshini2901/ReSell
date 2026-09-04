import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import api from '../api/axios'; // using the interceptor to send token

export default function MyListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchListings = async () => {
    try {
      const { data } = await api.get('/api/listings/mine');
      setListings(data.listings);
    } catch (err) {
      setError('Failed to load your listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await api.delete(`/api/listings/${id}`);
      setListings(listings.filter(l => l._id !== id));
    } catch (err) {
      alert('Failed to delete listing');
    }
  };

  return (
    <div style={{ padding: '1rem', paddingBottom: '80px' }}>
      <h2>My Listings</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {!loading && listings.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p>You have no active listings.</p>
          <Link to="/sell" style={{ color: '#646cff', fontWeight: 'bold' }}>Create your first listing</Link>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
        {listings.map(listing => (
          <div key={listing._id} style={{ display: 'flex', gap: '1rem', background: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <img 
              src={listing.images[0] || 'https://via.placeholder.com/100'} 
              alt={listing.title} 
              style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} 
            />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>{listing.title}</h4>
              <p style={{ margin: '0 0 0.2rem 0', color: '#646cff', fontWeight: 'bold' }}>₹{listing.price.toFixed(2)}</p>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#666' }}>Status: {listing.status}</p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link to={`/listings/${listing._id}`} style={{ fontSize: '0.85rem', color: 'blue' }}>View</Link>
                <button 
                  onClick={() => handleDelete(listing._id)} 
                  style={{ fontSize: '0.85rem', color: 'red', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
