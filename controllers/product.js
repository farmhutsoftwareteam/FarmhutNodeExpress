const express = require('express');
const router = express.Router();
const mixpanel = require('mixpanel');
const { SECRET = "secret" } = process.env;
const jwt = require('jsonwebtoken');

const Product = require('../models/product');
const mixpanelToken = '1d3b3900e364420afd3d3f96c268d88e';
const mixpanelClient = mixpanel.init(mixpanelToken);
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.userId = decoded.id;
    next();
  });
}


// GET all products
router.get('/products/all', async (req, res) => {
    try {
      const products = await Product.find();
      res.json(products);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });
  
  // GET a single product
  router.get('/products/single/:id', getProduct, (req, res) => {
    res.json(res.product);
  });
  
        // CREATE a new product
        router.post('/products/add',verifyToken, async (req, res) => {
          const product = new Product({
            name: req.body.name,
            description: req.body.description,
            
            price: req.body.price,
            quantity: req.body.quantity,
              contactdetails: req.body.contactdetails,
            createdBy: req.body.createdBy,
          });
        
          try {
            const newProduct = await product.save();
            res.status(201).json(newProduct);
            // Track Mixpanel event
    mixpanelClient.track('Product Added', {
      distinct_id: req.userId,
      name: req.body.name,
      createdBy: req.body.createdBy,
      

    });
          } catch (err) {
            res.status(400).json({ message: err.message });
          }
        });
  
  // UPDATE a product
  router.patch('/products/update/:id', getProduct, async (req, res) => {
    if (req.body.name != null) {
      res.product.name = req.body.name;
    }
    if (req.body.description != null) {
      res.product.description = req.body.description;
    }
    
    if (req.body.price != null) {
      res.product.price = req.body.price;
    }
    if (req.body.quantity != null) {
      res.product.quantity = req.body.quantity;
    }
    if (req.body.contactdetails != null) {
        res.product.contactdetails = req.body.contactdetails;
        }
    if (req.body.createdBy != null) {
      res.product.createdBy = req.body.createdBy;
    }
    try {
      const updatedProduct = await res.product.save();
      res.json(updatedProduct);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });
  
// SEARCH for products
router.get('/products/search', verifyToken , async (req, res) => {
  const searchTerm = req.query.searchTerm;
  try {
    const products = await Product.find({ name: { $regex: searchTerm, $options: 'i' } }).limit(10);

    // Track Mixpanel event
    mixpanelClient.track('Product Searched', {
      search_query: searchTerm,
      results_count: products.length,
      distinct_id: req.userId
    });


// Create an empty array of length 10 and fill it with empty objects
const filledProducts = Array.from({ length: 10 }, (_, i) => i < products.length ? products[i] : {});
res.json(filledProducts);
    //res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



  // DELETE a product
  router.delete('/products/delete/:id', getProduct, async (req, res) => {
    try {
      await res.product.remove();
      res.json({ message: 'Product deleted' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });





  
  // Middleware function to get a single product by ID
  async function getProduct(req, res, next) {
    try {
      product = await Product.findById(req.params.id);
      if (product == null) {
        return res.status(404).json({ message: 'Cannot find product' });
      }
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  
    res.product = product;
    next();
  }

  module.exports = router;
