const express = require('express');
const Survey = require('../models/Survey'); // Assuming you have your Mongoose model

// Create an Express router
const router = express.Router();

// Route to create a new survey response
router.post('/responses', async (req, res) => {
  try {
    const response = new Survey(req.body);
    await response.save();
    res.status(201).send(response);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Route to get all survey responses
router.get('/responses', async (req, res) => {
  try {
    const responses = await Survey.find();
    res.status(200).send(responses);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Route to calculate overall satisfaction and count of completed surveys
router.get('/survey-stats', async (req, res) => {
  try {
    const totalResponses = await Survey.countDocuments();
    const satisfiedResponses = await Survey.countDocuments({ helpingServices: 'Yes' });

    const satisfactionRate = (satisfiedResponses / totalResponses) * 100;

    res.status(200).json({
      totalResponses,
      satisfactionRate,
    });
  } catch (error) {
    res.status(500).send(error);
  }
});

module.exports = router;
