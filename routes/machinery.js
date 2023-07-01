const express = require('express');
const router = express.Router();
const machineryController = require('../controllers/machineryController');

// Create a new machinery entry
router.post('/', machineryController.createMachinery);

// Get all machinery entries
router.get('/', machineryController.getMachinery);

// Get a specific machinery entry by ID
router.get('/:id', machineryController.getMachineryById);

// Update a specific machinery entry by ID
router.put('/:id', machineryController.updateMachineryById);

// Delete a specific machinery entry by ID
router.delete('/:id', machineryController.deleteMachineryById);

module.exports = router;
