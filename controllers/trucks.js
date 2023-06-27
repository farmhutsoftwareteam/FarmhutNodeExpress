const Truck = require('../models/trucks');
const { SECRET = "secret" } = process.env;
const jwt = require('jsonwebtoken');

// POST /trucks - create a new truck
exports.createTruck = (req, res) => {
  const newTruck = new Truck({
    truckNumber: req.body.truckNumber,
    driverName: req.body.driverName,
    availability: req.body.availability,
    address: req.body.address,
    contactDetails: req.body.contactDetails
  });

  newTruck.save()
    .then(truck => {
      res.status(201).json(truck);
    })
    .catch(err => {
      res.status(400).json({ message: err.message });
    });
};

// GET /trucks - get all trucks
exports.getAllTrucks = (req, res) => {
  Truck.find()
    .then(trucks => {
      res.json(trucks);
    })
    .catch(err => {
      res.status(500).json({ message: err.message });
    });
};

// GET /trucks/search?address= - search for trucks by address
exports.searchTrucks = (req, res) => {
  const address = req.query.address;

  Truck.find({
    address: { $regex: address, $options: 'i' }
  })
    .then(trucks => {
      res.json(trucks);
    })
    .catch(err => {
      res.status(500).json({ message: err.message });
    });
};
