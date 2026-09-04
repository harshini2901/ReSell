import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

const CATEGORIES = [
  'All',
  'Cars',
  'Bikes',
  'Properties',
  'Electronics & Appliances',
  'Mobiles',
  'Fashion',
  'Furniture',
  'Books',
  'Sports & Hobbies',
  'Services'
];

const CONDITIONS = ['All', 'New', 'Like New', 'Good', 'Fair', 'Poor'];

export default function HomePage() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [condition, setCondition] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Track applied filters to prevent excessive API calls
  const [appliedFilters, setAppliedFilters] = useState({
    keyword: '',
    category: 'All',
    condition: 'All',
    minPrice: '',
    maxPrice: ''
  });

  const fetchListings = async (currentPage, filters) => {
    setLoading(true);
    try {
      // Build query string
      const params = new URLSearchParams({
        page: currentPage,
        limit,
        ...(filters.keyword && { keyword: filters.keyword }),
        ...(filters.category !== 'All' && { category: filters.category }),
        ...(filters.condition !== 'All' && { condition: filters.condition }),
        ...(filters.minPrice && { minPrice: filters.minPrice }),
        ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
      });

      const { data } = await api.get(`/api/listings?${params}`);
      setListings(data.listings);
      setTotalPages(data.pagination.totalPages || 1);
    } catch (err) {
      setError('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  // Fetch when page or appliedFilters change
  useEffect(() => {
    fetchListings(page, appliedFilters);
  }, [page, appliedFilters]);

  // Handle Category click directly
  const handleCategoryClick = (cat) => {
    setCategory(cat);
    setPage(1);
    setAppliedFilters(prev => ({ ...prev, category: cat }));
  };

  // Handle Search Input Enter
  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      applyFilters();
    }
  };

  // Apply all explicit filters
  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({
      keyword: searchQuery,
      category,
      condition,
      minPrice,
      maxPrice
    });
  };

  return (
    <div className="home-page" style={{ paddingTop: '1rem' }}>
      {/* Search Section */}
      <div className="search-section" style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Search marketplace..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleSearchKeyPress}
          style={{ marginBottom: 0, flex: 1, padding: '1rem 1.5rem', borderRadius: '50px', fontSize: '1.1rem', boxShadow: 'var(--shadow-sm)' }}
        />
        <button className="btn-primary" onClick={applyFilters} style={{ borderRadius: '50px', padding: '0 2rem' }}>
          Search
        </button>
      </div>

      {/* Categories Section */}
      <div className="categories-scroll">
        {CATEGORIES.map(cat => (
          <div 
            key={cat} 
            className={`category-pill ${category === cat ? 'active' : ''}`}
            onClick={() => handleCategoryClick(cat)}
          >
            {cat}
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '1.2rem', display: 'flex', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '1rem' }}>
        <select value={condition} onChange={e => setCondition(e.target.value)} style={{ flex: 1, minWidth: '150px', margin: 0, border: 'none' }}>
          {CONDITIONS.map(cond => <option key={cond} value={cond}>{cond === 'All' ? 'Any Condition' : cond}</option>)}
        </select>
        
        <input type="number" placeholder="Min ₹" value={minPrice} onChange={e => setMinPrice(e.target.value)} style={{ flex: 1, minWidth: '100px', margin: 0, border: 'none' }} />
        <input type="number" placeholder="Max ₹" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} style={{ flex: 1, minWidth: '100px', margin: 0, border: 'none' }} />

        <button className="btn-secondary" onClick={applyFilters} style={{ padding: '0.8rem 1.5rem' }}>
          Apply Filters
        </button>
      </div>

      {/* Items on Market */}
      <div className="items-section">
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.8rem' }}>🔥</span> Trending Items
        </h2>
        
        {loading && <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', textAlign: 'center', margin: '3rem 0' }}>Discovering treasures...</p>}
        {error && <p style={{ color: '#ef4444', textAlign: 'center', background: '#fef2f2', padding: '1rem', borderRadius: '12px' }}>{error}</p>}
        
        {!loading && !error && listings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--surface)', borderRadius: '24px', border: '1px dashed var(--text-muted)' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>No items found</h3>
            <p style={{ color: 'var(--text-muted)' }}>Try adjusting your filters or search query.</p>
          </div>
        )}

        <div className="products-grid">
          {listings.map(listing => (
            <Link to={`/listings/${listing._id}`} key={listing._id} className="product-card">
              <div className="product-image-container">
                <img src={listing.images[0] || 'https://via.placeholder.com/300x200?text=No+Image'} alt={listing.title} className="product-image" />
                <span className="product-condition">{listing.condition}</span>
              </div>
              <div className="product-info">
                <h4>{listing.title}</h4>
                <p className="product-price">₹{listing.price.toLocaleString()}</p>
                {listing.location && <p className="product-location">📍 {listing.location}</p>}
              </div>
            </Link>
          ))}
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '3rem', paddingBottom: '2rem' }}>
            <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ borderRadius: '50px' }}>
              ← Prev
            </button>
            <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button className="btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={{ borderRadius: '50px' }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
