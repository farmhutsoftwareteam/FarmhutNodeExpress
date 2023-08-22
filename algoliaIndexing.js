const algoliasearch = require('algoliasearch');
const Product = require('./models/product'); // Adjust the path
const FarmInputs = require('./models/farminputs')

const algoliaClient = algoliasearch('N9RZ87TQR5', '7a9610bebde9b32d61a6cba8e7b11873');
const productIndex = algoliaClient.initIndex('products');
const farmInputIndex = algoliaClient.initIndex('farminputs');

//function to index farm inouts
async function indexFarmInput() {
    const farminputs = await FarmInputs.find(); // Fetch products from MongoDB
    const farminputsObjects = farminputs.map(farminput => ({
      objectID: farminput._id.toString(),
      name: farminput.name,
      description: farminput.description,
      price: farminput.price,
      quantity: farminput.quantity,
      contactdetails: farminput.contactdetails,
      location: farminput.location,
  
  
      // Add other attributes you want to index
    }));
  
    await farmInputIndex.saveObjects(farminputsObjects);
  }

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

module.exports = { indexProducts, indexFarmInput };
