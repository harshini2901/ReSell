const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['Cars', 'Bikes', 'Properties', 'Electronics & Appliances', 'Mobiles', 'Fashion', 'Furniture', 'Books', 'Sports & Hobbies', 'Services'],
    },
    condition: {
      type: String,
      required: [true, 'Condition is required'],
      enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'],
    },
    yearOfPurchase: {
      type: Number,
      min: [1900, 'Invalid year'],
      max: [new Date().getFullYear(), 'Year cannot be in the future'],
    },
    images: {
      type: [String],
      validate: [v => v.length > 0, 'At least one image is required'],
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'sold', 'deleted'],
      default: 'active',
    },
    location: {
      type: String, // E.g., 'New York, NY' - later phase will add geocoding coords
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Listing', listingSchema);
