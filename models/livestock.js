require("dotenv").config() // load .env variables
const mongoose = require("mongoose")
const {Schema, model} = require("../DB/connection") // import Schema & model

const livestockSchema = Schema({
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
    contactdetails: {
        type: String,
        required: true
    },
 
 

  });
  
  const Livestock = mongoose.model('Livestock', livestockSchema);
  
  module.exports = Livestock;
  
  
  