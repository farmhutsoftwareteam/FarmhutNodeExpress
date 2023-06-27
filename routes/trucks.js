const express = require('express');
const router = express.Router();
const truckController = require('../controllers/trucks');

// POST /trucks - create a new truck
router.post('/trucks/new', truckController.createTruck);

// GET /trucks - get all trucks
router.get('/trucks/all', truckController.getAllTrucks);

// GET /trucks/search?address= - search for trucks by address
router.get('/trucks/search', truckController.searchTrucks);

module.exports = router;
