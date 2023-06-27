require("dotenv").config() // load .env variables
const mongoose = require("mongoose")
const {Schema, model} = require("../DB/connection") // import Schema & model

const productSchema = Schema({
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
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    profile_picture : {
        type: String,
        default: "https://res.cloudinary.com/vambo/image/upload/v1679050917/images_aptta9.jpg",
    },

  });
  
  const Product = mongoose.model('Product', productSchema);
  
  module.exports = Product;
  
  