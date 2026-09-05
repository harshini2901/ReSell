import { useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

export default function SellPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'Electronics & Appliances',
    condition: 'Good',
    location: '',
    yearOfPurchase: ''
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setImageFiles([...e.target.files]);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Use OpenStreetMap Nominatim for free reverse geocoding
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.address) {
            // Build a readable location string (e.g., "City, State")
            const city = data.address.city || data.address.town || data.address.village || '';
            const state = data.address.state || '';
            const locationString = [city, state].filter(Boolean).join(', ');
            setFormData(prev => ({ ...prev, location: locationString || data.display_name }));
          }
        } catch (err) {
          console.error(err);
          alert('Failed to detect location address');
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        console.error(err);
        alert('Failed to get your location. Please ensure location permissions are granted.');
        setDetectingLocation(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setDuplicateWarning(null);
    
    if (imageFiles.length === 0) {
      setError('Please select at least one image.');
      return;
    }

    setLoading(true);
    
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('price', formData.price);
      data.append('category', formData.category);
      data.append('condition', formData.condition);
      data.append('location', formData.location);
      if (formData.yearOfPurchase) {
        data.append('yearOfPurchase', formData.yearOfPurchase);
      }
      
      imageFiles.forEach(file => {
        data.append('images', file);
      });

      // Token is injected via api interceptor
      await api.post('/api/listings', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      navigate('/my-listings');
    } catch (err) {
      if (err.response?.status === 409) {
        setError(err.response.data.message);
        setDuplicateWarning({
          title: err.response.data.duplicateTitle,
          image: err.response.data.duplicateImage
        });
      } else {
        setError(err.response?.data?.message || 'Failed to create listing');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sell-page" style={{ padding: '1rem', maxWidth: '700px', margin: '0 auto', paddingBottom: '80px' }}>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '2rem' }}>List an Item</h2>
      <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Title</label>
          <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
        </div>
        
        <div>
          <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Description</label>
          <textarea required rows="4" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Price (₹)</label>
            <input type="number" min="0" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
          </div>
          
          <div>
            <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Category</label>
            <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
              <option value="Cars">Cars</option>
              <option value="Bikes">Bikes</option>
              <option value="Properties">Properties</option>
              <option value="Electronics & Appliances">Electronics & Appliances</option>
              <option value="Mobiles">Mobiles</option>
              <option value="Fashion">Fashion</option>
              <option value="Furniture">Furniture</option>
              <option value="Books">Books</option>
              <option value="Sports & Hobbies">Sports & Hobbies</option>
              <option value="Services">Services</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Condition</label>
            <select value={formData.condition} onChange={e => setFormData({...formData, condition: e.target.value})}>
              <option value="New">New</option>
              <option value="Like New">Like New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', marginBottom: '0.5rem' }}>
              Location
              <button type="button" onClick={handleDetectLocation} disabled={detectingLocation} style={{ background: 'none', color: 'var(--primary)', padding: 0, fontSize: '0.85rem', boxShadow: 'none' }}>
                {detectingLocation ? 'Detecting...' : '📍 Auto Detect'}
              </button>
            </label>
            <input type="text" placeholder="e.g. North Campus" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
          </div>
          
          <div>
            <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Year of Purchase</label>
            <input type="number" placeholder="e.g. 2023" min="1900" max={new Date().getFullYear()} value={formData.yearOfPurchase} onChange={e => setFormData({...formData, yearOfPurchase: e.target.value})} />
          </div>
        </div>

        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px dashed rgba(0,0,0,0.1)' }}>
          <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Images</label>
          <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }} />
        </div>

        {error && <p style={{ color: '#ef4444', background: '#fef2f2', padding: '1rem', borderRadius: '12px' }}>{error}</p>}
        
        {duplicateWarning && (
          <div style={{ padding: '1rem', background: 'var(--surface-solid)', border: '1px solid #ef4444', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <img src={duplicateWarning.image} alt="Duplicate" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px' }} />
            <div>
              <strong style={{ color: '#ef4444' }}>Matched Listing:</strong>
              <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-main)' }}>{duplicateWarning.title}</p>
            </div>
          </div>
        )}
        
        <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '1rem', padding: '1.2rem', fontSize: '1.1rem' }}>
          {loading ? 'Uploading...' : 'Create Listing'}
        </button>
      </form>
    </div>
  );
}
