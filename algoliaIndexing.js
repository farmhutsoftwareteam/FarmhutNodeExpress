const algoliasearch = require('algoliasearch');
const Product = require('./models/product'); // Adjust the path

const algoliaClient = algoliasearch('N9RZ87TQR5', '7a9610bebde9b32d61a6cba8e7b11873');
const productIndex = algoliaClient.initIndex('products');

// Function to index products
async function indexProducts() {
  const products = await Product.find(); // Fetch products from MongoDB
  const productObjects = products.map(product => ({
    objectID: product._id.toString(),
    name: product.name,
    description: product.description,
    price: product.price,
    quantity: product.quantity,
    contactdetails: product.contactdetails,
    location: product.location,


    // Add other attributes you want to index
  }));

  await productIndex.saveObjects(productObjects);
}

module.exports = { indexProducts };
