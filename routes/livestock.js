const express = require('express');
const router = express.Router();
const livestockController = require('../controllers/livestock');

// Create a new livestock entry
router.post('/', livestockController.createLivestock);

// Get all livestock entries
router.get('/', livestockController.getLivestock);

// Get a specific livestock entry by ID
router.get('/:id', livestockController.getLivestockById);

// Update a specific livestock entry by ID
router.put('/:id', livestockController.updateLivestockById);

// Delete a specific livestock entry by ID
router.delete('/:id', livestockController.deleteLivestockById);

module.exports = router;
