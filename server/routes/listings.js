const express = require('express');
const Listing = require('../models/Listing');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// ── GET /api/listings ────────────────────────────────────────────────────────
// Public — fetches active listings with search, filter, and pagination
router.get('/', async (req, res) => {
  try {
    const { category, condition, minPrice, maxPrice, keyword, page = 1, limit = 10 } = req.query;
    
    // Base query: only active listings
    const query = { status: 'active' };

    // 1. Keyword search (title or description)
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } }
      ];
    }

    // 2. Category filter
    if (category && category !== 'All') {
      query.category = category;
    }

    // 3. Condition filter
    if (condition && condition !== 'All') {
      query.condition = condition;
    }

    // 4. Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Pagination setup
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const totalCount = await Listing.countDocuments(query);
    const listings = await Listing.find(query)
      .populate('sellerId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({ 
      listings,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
        currentPage: pageNum,
        limit: limitNum
      }
    });
  } catch (err) {
    console.error('Error fetching listings:', err);
    res.status(500).json({ message: 'Server error fetching listings' });
  }
});

// ── GET /api/listings/mine ───────────────────────────────────────────────────
// Protected — fetches listings owned by logged-in user
router.get('/mine', protect, async (req, res) => {
  try {
    const listings = await Listing.find({ sellerId: req.user._id }).sort({ createdAt: -1 });
    res.json({ listings });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching your listings' });
  }
});

// ── GET /api/listings/:id ────────────────────────────────────────────────────
// Public — fetches single listing
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('sellerId', 'name createdAt');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json({ listing });
  } catch (err) {
    res.status(500).json({ message: 'Server error fetching listing' });
  }
});

// ── POST /api/listings ───────────────────────────────────────────────────────
// Protected — create a new listing with images
router.post('/', protect, upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, price, category, condition, location, yearOfPurchase } = req.body;
    
    // Uploaded files via multer-storage-cloudinary have a .path containing the URL
    const imageUrls = req.files ? req.files.map(file => file.path) : [];

    if (!imageUrls.length) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    const listing = await Listing.create({
      title,
      description,
      price: Number(price),
      category,
      condition,
      location,
      yearOfPurchase: yearOfPurchase ? Number(yearOfPurchase) : undefined,
      images: imageUrls,
      sellerId: req.user._id,
    });

    res.status(201).json({ listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error creating listing' });
  }
});

// ── PUT /api/listings/:id ────────────────────────────────────────────────────
// Protected — update a listing (owner only)
router.put('/:id', protect, upload.array('images', 5), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (listing.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this listing' });
    }

    const { title, description, price, category, condition, location, yearOfPurchase, existingImages } = req.body;
    
    // Existing images passed as JSON string or array, new ones via req.files
    let finalImages = [];
    if (existingImages) {
      finalImages = Array.isArray(existingImages) ? existingImages : JSON.parse(existingImages);
    }
    
    if (req.files && req.files.length > 0) {
      const newImageUrls = req.files.map(file => file.path);
      finalImages = [...finalImages, ...newImageUrls];
    }

    if (!finalImages.length) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    listing.title = title || listing.title;
    listing.description = description || listing.description;
    listing.price = price !== undefined ? Number(price) : listing.price;
    listing.category = category || listing.category;
    listing.condition = condition || listing.condition;
    listing.location = location || listing.location;
    listing.yearOfPurchase = yearOfPurchase ? Number(yearOfPurchase) : listing.yearOfPurchase;
    listing.images = finalImages;

    await listing.save();
    res.json({ listing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating listing' });
  }
});

// ── DELETE /api/listings/:id ─────────────────────────────────────────────────
// Protected — delete a listing (owner only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (listing.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this listing' });
    }

    await listing.deleteOne();
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error deleting listing' });
  }
});

module.exports = router;
