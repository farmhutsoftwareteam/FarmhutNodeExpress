const mongoose = require('mongoose');
const { Schema, model } = require('../DB/connection');

const surveySchema = new Schema({
  usedFarmhutServices: {
    type: String,
    enum: ['Yes', 'No'],
    required: true,
  },
  incomeIncrease: {
    type: String,
    enum: ['Yes', 'No'],
    required: true,
  },
  helpingServices: {
    type: String,
    enum: ['Yes', 'No'],
    required: true,
  },
});

const Survey = model('Survey', surveySchema);

module.exports = Survey;
