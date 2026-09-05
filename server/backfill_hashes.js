require('dotenv').config();
const mongoose = require('mongoose');
const { Jimp } = require('jimp');
const Listing = require('./models/Listing');

async function backfill() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Fix old category names that violate the new enum
    await Listing.collection.updateMany(
      { category: 'Electronics' },
      { $set: { category: 'Electronics & Appliances' } }
    );

    const listings = await Listing.find({ 
      $or: [
        { imageHashes: { $exists: false } },
        { imageHashes: { $size: 0 } }
      ]
    });

    console.log(`Found ${listings.length} listings missing hashes.`);

    for (const listing of listings) {
      console.log(`Processing listing: ${listing.title} (${listing._id})`);
      const hashes = [];
      for (const url of listing.images) {
        try {
          const image = await Jimp.read(url);
          const hash = image.hash(2);
          hashes.push(hash);
        } catch (err) {
          console.error(`Error hashing ${url}:`, err.message);
        }
      }
      listing.imageHashes = hashes;
      await listing.save();
      console.log(`Saved hashes for: ${listing.title}`);
    }

    console.log('Backfill complete!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

backfill();
