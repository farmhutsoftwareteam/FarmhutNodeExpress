const express = require('express');
const Response = require('../models/weather'); // Update the path based on your file structure
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: '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',
});

const router = express.Router();

// Function to retrieve weather data from the weather API
async function getWeatherData(location) {
  const options = {
    method: 'GET',
    url: 'https://weatherapi-com.p.rapidapi.com/current.json',
    params: { q: location },
    headers: {
      'X-RapidAPI-Key': '84f83a1ed4msh09697c818512d9ap19821bjsnec4fab6279da',
      'X-RapidAPI-Host': 'weatherapi-com.p.rapidapi.com',
    },
  };

  try {
    const response = await axios.request(options);

    const weatherData = JSON.stringify(response.data);
    
    return weatherData;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch weather data');
  }
}

// Function to send weather data to OpenAI for interpretation
async function interpretData(weatherData, requestId) {
    const prompt = ` ${(weatherData)}`;
  
    try {
      const openai = new OpenAIApi(configuration);
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {"role": "system", "content": "The user will provide you with data for a certain region, you will help this farmer make a good decision about their agriculture business, you will also give them the weather report in a nice and readable manner, add emojies where possible to describe things like hot or cold, windy or sunny.Emojies are very important as they make the report friendly. I also want you to think about the region where the farmer is from and create a unique tip that will benefit their farming business in line with the weather make it extensive by suggesting crops and also outlining the best way to avoid diseases, pests, droughts and other hazards related to their location. Please only use metric units"},
          {role: "user", content: prompt}
        ],
      });
  
      const updatedResponse = await new Promise((resolve, reject) => {
        Response.findOneAndUpdate(
          { requestId },
          { interpretation: JSON.stringify(completion.data.choices[0].message.content) },
          { new: true },
          (error, response) => {
            if (error) {
              reject(error);
            } else {
              resolve(response);
            }
          }
        );
      });

    } catch (error) {
      console.error(error);
      throw new Error('Failed to interpret data using OpenAI');
    }
  }
  

// Route to get weather and return the response ID
router.get('/', async (req, res) => {
  try {
    const location = req.query.location;

    if (!location) {
      return res.status(400).json({ error: 'Location parameter is missing' });
    }

    const requestId = uuidv4();

    // Create a new response document using the Response model
    const response = new Response({
      requestId,
      location,
    });

    // Save the response document to the database
    await response.save();

    const weatherData = await getWeatherData(location);
    interpretData(weatherData, requestId).catch((error) => {
      console.error(error);
    });

    res.json({ requestId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to retrieve the response using the request ID
router.get('/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    // Find the response document by the requestId using the Response model
    const response = await Response.findOne({ requestId });

    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    if (response.interpretation) {
      res.json({ messagewe: response.interpretation });
    } else {
      res.status(204).send();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
