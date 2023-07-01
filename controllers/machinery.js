const Machinery = require('../models/machinery');

// Create a new machinery entry
exports.createMachinery = async (req, res) => {
  try {
    const { name, description, price, quantity, supplier, location, contactdetails } = req.body;
    const newMachinery = new Machinery({
      name,
      description,
      price,
      quantity,
      supplier,
      location,
      contactdetails
    });
    const savedMachinery = await newMachinery.save();
    res.status(201).json(savedMachinery);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create machinery entry' });
  }
};

// Get all machinery entries
exports.getMachinery = async (req, res) => {
  try {
    const machinery = await Machinery.find();
    res.json(machinery);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve machinery entries' });
  }
};

// Get a specific machinery entry by ID
exports.getMachineryById = async (req, res) => {
  try {
    const { id } = req.params;
    const machinery = await Machinery.findById(id);
    if (machinery) {
      res.json(machinery);
    } else {
      res.status(404).json({ error: 'Machinery entry not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve machinery entry' });
  }
};

// Update a specific machinery entry by ID
exports.updateMachineryById = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, quantity, supplier, location, contactdetails } = req.body;
    const updatedMachinery = await Machinery.findByIdAndUpdate(
      id,
      {
        name,
        description,
        price,
        quantity,
        supplier,
        location,
        contactdetails
      },
      { new: true }
    );
    if (updatedMachinery) {
      res.json(updatedMachinery);
    } else {
      res.status(404).json({ error: 'Machinery entry not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update machinery entry' });
  }
};

// Delete a specific machinery entry by ID
exports.deleteMachineryById = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMachinery = await Machinery.findByIdAndRemove(id);
    if (deletedMachinery) {
      res.json({ message: 'Machinery entry deleted successfully' });
    } else {
      res.status(404).json({ error: 'Machinery entry not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete machinery entry' });
  }
};
