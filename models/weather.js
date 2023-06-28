require("dotenv").config() // load .env variables

const {Schema, model} = require("../DB/connection") // import Schema & model


// Define the schema for the response
const responseSchema = new Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
  },
  location: {
    type: String,
    required: true,
  },
  interpretation: {
    type: String,
    default: null,
  },
});

// Create the Response model
const Response = model('Response', responseSchema);

module.exports = Response;
