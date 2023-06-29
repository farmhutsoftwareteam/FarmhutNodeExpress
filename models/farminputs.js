require("dotenv").config() // load .env variables
const mongoose = require("mongoose")

const {Schema, model} = require("../DB/connection") // import Schema & model

const FarmInputSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  },
  quantity: {
    type: String,
    required: true
  },
  supplier: {
    type: String,
    required: false
  },
  location : {
      type: String,
      
  },
  contactdetails : {
      type: String,
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const FarmInput = model('FarmInput', FarmInputSchema)

module.exports = FarmInput
