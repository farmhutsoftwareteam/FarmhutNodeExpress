require("dotenv").config() // load .env variables

const {Schema, model} = require("../DB/connection") // import Schema & model


// Define the schema for the response
const responseSchema = new Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
  },

  results: {
    type: String,
    default: null,
  },
});

// Create the Response model
const SearchRes = model('SearchRes', responseSchema);

module.exports = SearchRes;
