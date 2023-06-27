const express = require('express');
const axios = require('axios');
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
    apiKey: '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',
  });
  const openai = new OpenAIApi(configuration);

const router = express.Router();


// Route to get weather and OpenAI interpretation
router.get('/', async (req, res) => {
  try {
    const location = req.query.location; // Extract the location from the query parameter
    if (!location) {
      return res.status(400).json({ error: 'Location parameter is missing' });
    }

    const weatherData = await getWeatherData(location); // Pass the location to the getWeatherData function
    const interpretation = await interpretData(weatherData); // Function to send weather data to OpenAI for interpretation
    const response = formatResponse(interpretation); // Function to format OpenAI response into a user-friendly message

    res.json({ message: response });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to retrieve weather data from the weather API
async function getWeatherData(location) {
  const options = {
    method: 'GET',
    url: 'https://weatherapi-com.p.rapidapi.com/current.json',
    params: { q: location }, // Use the location parameter dynamically
    headers: {
      'X-RapidAPI-Key': '84f83a1ed4msh09697c818512d9ap19821bjsnec4fab6279da',
      'X-RapidAPI-Host': 'weatherapi-com.p.rapidapi.com',
    },
  };

  const response = await axios.request(options);
  console.log(response)

  
  const jsonString = JSON.stringify(response.data);
  const weatherData = jsonString;
  return response.data;
   
}

// Function to send weather data to OpenAI for interpretation
async function interpretData(weatherData) {
   
    const prompt = `Given the weather data ${axios.formToJSON(weatherData)}, what action should the user take?`;
  
    try {
      const response = await openai.createCompletion({
        model: 'text-davinci-003',
        prompt,
        maxTokens: 3000,
        temperature: 0.7,
       
        top_p: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        
      });
  
      return response.data.choices[0].text;
    } catch (error) {
      console.error(error);
      throw new Error('Failed to interpret data using OpenAI');
    }
  }

// Function to format OpenAI response into a user-friendly message
function formatResponse(interpretation) {
  // Format the interpretation as desired
  return `Based on the weather, you should ${interpretation}.`;
}

module.exports = router;
