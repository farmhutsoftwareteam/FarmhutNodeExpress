const express = require('express');
const router = express.Router();
const algoliasearch = require('algoliasearch');
const { indexProducts } = require('../algoliaIndexing'); // Adjust the path
const Product = require('../models/product'); // Adjust the path

const algoliaClient = algoliasearch('N9RZ87TQR5', '7a9610bebde9b32d61a6cba8e7b11873');
const productIndex = algoliaClient.initIndex('products');

indexProducts();

router.get('/search', async (req, res) => {
    const query = req.query.q; // Search query from client
  
    try {
      const searchResults = await productIndex.search(query);
  
      const formattedResults = searchResults.hits.map(result => (
        `Name: ${result.name}\nDescription: ${result.description}\nPrice: ${result.price}\nQuantity: ${result.quantity}\n\n`
      )).join('');
  
      const responseObject = {
        results: formattedResults,
      };
  
      res.setHeader('Content-Type', 'application/json');
      res.json(responseObject);
    } catch (error) {
      console.error('Algolia search error:', error);
      res.status(500).json({ message: 'Search error occurred' });
    }
  });
  
  
  
  
  
module.exports = router;
