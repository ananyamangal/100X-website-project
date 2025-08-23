// Migration script to update existing products from single badge to badges array
// Run this script to migrate your existing database

const { MongoClient } = require('mongodb');

async function migrateBadges() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const productsCollection = db.collection('products');

    // Find all products that have a single badge field
    const products = await productsCollection.find({ badge: { $exists: true } }).toArray();
    
    console.log(`Found ${products.length} products to migrate`);

    for (const product of products) {
      // Convert single badge to badges array
      const badges = product.badge ? [product.badge] : [];
      
      // Update the product
      await productsCollection.updateOne(
        { _id: product._id },
        { 
          $set: { badges: badges },
          $unset: { badge: "" } // Remove the old badge field
        }
      );
      
      console.log(`Migrated product: ${product.name} - Badge: "${product.badge}" -> Badges: [${badges.join(', ')}]`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

// Run the migration
migrateBadges().catch(console.error);
