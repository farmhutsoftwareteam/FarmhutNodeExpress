const mongoose = require('mongoose');
const { Schema, model } = require('../DB/connection');



const truckSchema = new mongoose.Schema({
  truckNumber: {
    type: String,
    required: true
  },
  driverName: {
    type: String,
    required: true
  },
  availability: {
    type: String,
    
    default: 'yes'
  },
  address: {
    type: String,
    required: true
  },
  contactDetails: {
    type: String,
    required: true
  }
});

const Truck = mongoose.model('Truck', truckSchema);

module.exports = Truck;
