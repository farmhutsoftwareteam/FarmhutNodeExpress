require("dotenv").config() // load .env variables

const {Schema, model} = require("../DB/connection") // import Schema & model


// Define the schema for the response
const guidesSchema = new Schema({
  requestId: {
    type: String,
    required: true,
    unique: true,
  },
  crop : {
    type: String,
    required: true,
    },

  pdfUrl: {
    type: String,
    default: null,
    }
});

// Create the Response model
const GuideSchema = model('GuideSchema', guidesSchema);

module.exports = GuideSchema;
