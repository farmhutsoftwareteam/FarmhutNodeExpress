const express = require('express');
const router = express.Router();
const FarmInput = require('../models/farminputs');
const mixpanel = require('mixpanel');
const jwt = require('jsonwebtoken');

const { SECRET = "secret" } = process.env;
const mixpanelToken = '1d3b3900e364420afd3d3f96c268d88e'
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


// GET all farm inputs
router.get('/farm-inputs/all', async (req, res) => {
  try {
    const farmInputs = await FarmInput.find();
    res.json(farmInputs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET a single farm input
router.get('/farm-inputs/single/:id', getFarmInput, (req, res) => {
  res.json(res.farmInput);
});

// CREATE a new farm input
router.post('/farm-inputs/add',verifyToken , async (req, res) => {
  const farmInput = new FarmInput({
    name: req.body.name,
    description: req.body.description,
    price: req.body.price,
    supplier: req.body.supplier,
    quantity: req.body.quantity,
    createdBy: req.body.createdBy,
  });

  try {
    const newFarmInput = await farmInput.save();
    res.status(201).json(newFarmInput);

    // Track Mixpanel event
    mixpanelClient.track('Farm Input Added', {
      name: req.body.name,
      distinct_id: req.userId,
      
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// DELETE a farm input
router.delete('/farm-inputs/delete/:id', getFarmInput, async (req, res) => {
  try {
    await res.farmInput.remove();
    res.json({ message: 'Farm input deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/farm-inputs/search', verifyToken, async (req, res) => {
  try {
    const query = req.query.q;
    const farmInputs = await FarmInput.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    });

    // Track the search event in Mixpanel
    mixpanelClient.track('Farm Input Search', {
      distinct_id: req.userId,
      query: query,
    });

    res.json(farmInputs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



// Middleware function to get a single farm input by ID
async function getFarmInput(req, res, next) {
  try {
    farmInput = await FarmInput.findById(req.params.id);
    if (farmInput == null) {
      return res.status(404).json({ message: 'Cannot find farm input' });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  res.farmInput = farmInput;
  next();
}

module.exports = router;
 