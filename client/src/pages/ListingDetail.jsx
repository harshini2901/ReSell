import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchListing = async () => {
      try {
        const { data } = await api.get(`/api/listings/${id}`);
        setListing(data.listing);
      } catch (err) {
        setError('Failed to load listing');
      } finally {
        setLoading(false);
      }
    };
    fetchListing();
  }, [id]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>{error}</div>;
  if (!listing) return null;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem', paddingBottom: '80px' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ background: 'none', color: '#646cff', padding: '0 0 1rem 0', fontWeight: 'bold' }}
      >
        ← Back
      </button>

      <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <img 
          src={listing.images[0] || 'https://via.placeholder.com/600x400'} 
          alt={listing.title} 
          style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }} 
        />
        
        <div style={{ padding: '1.5rem' }}>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>{listing.title}</h2>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#646cff', margin: '0 0 1rem 0' }}>
            ₹{listing.price.toFixed(2)}
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#555' }}>
            <span><strong>Condition:</strong> {listing.condition}</span>
            <span><strong>Category:</strong> {listing.category}</span>
            {listing.yearOfPurchase && <span><strong>Year:</strong> {listing.yearOfPurchase}</span>}
          </div>

          <p style={{ lineHeight: '1.6', color: '#333', marginBottom: '1.5rem' }}>
            {listing.description}
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #eee', marginBottom: '1rem' }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold' }}>Seller: {listing.sellerId?.name || 'Unknown'}</p>
              {listing.location && <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>📍 {listing.location}</p>}
            </div>
            
            <button style={{ background: '#646cff', color: 'white', padding: '0.7rem 1.5rem' }}>
              Message Seller
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
