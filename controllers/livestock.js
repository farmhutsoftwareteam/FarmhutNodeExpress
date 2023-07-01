const Livestock = require('../models/livestock');

// Create a new livestock entry
exports.createLivestock = async (req, res) => {
  try {
    const { name, description, price, quantity, contactdetails } = req.body;
    const newLivestock = new Livestock({
      name,
      description,
      price,
      quantity,
      contactdetails
    });
    const savedLivestock = await newLivestock.save();
    res.status(201).json(savedLivestock);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create livestock entry' });
  }
};

// Get all livestock entries
exports.getLivestock = async (req, res) => {
  try {
    const livestock = await Livestock.find();
    res.json(livestock);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve livestock entries' });
  }
};

// Get a specific livestock entry by ID
exports.getLivestockById = async (req, res) => {
  try {
    const { id } = req.params;
    const livestock = await Livestock.findById(id);
    if (livestock) {
      res.json(livestock);
    } else {
      res.status(404).json({ error: 'Livestock entry not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve livestock entry' });
  }
};

// Update a specific livestock entry by ID
exports.updateLivestockById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, quantity, contactdetails } = req.body;
    const updatedLivestock = await Livestock.findByIdAndUpdate(
      id,
      {
        name,
        description,
        price,
        quantity,
        contactdetails
      },
      { new: true }
    );
    if (updatedLivestock) {
      res.json(updatedLivestock);
    } else {
      res.status(404).json({ error: 'Livestock entry not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update livestock entry' });
  }
};

// Delete a specific livestock entry by ID
exports.deleteLivestockById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedLivestock = await Livestock.findByIdAndRemove(id);
    if (deletedLivestock) {
      res.json({ message: 'Livestock entry deleted successfully' });
    } else {
      res.status(404).json({ error: 'Livestock entry not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete livestock entry' });
  }
};
