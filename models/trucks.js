const mongoose = require('mongoose');
const {Schema, model} = require("../db/connection") // import Schema & model


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
    enum: ['yes', 'no'],
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
