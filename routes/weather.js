const express = require('express');
const axios = require('axios');
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
    console.log(weatherData);
    return weatherData;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch weather data');
  }
}

// Function to send weather data to OpenAI for interpretation
async function interpretData(weatherData) {
  const prompt = ` ${(weatherData)}`;

  try {
    const openai = new OpenAIApi(configuration);
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {"role": "system", "content": "The user will provide you with data for a certain region, you will help this farmer make a good decision about their agriculture business, you will also give them the weather report in a nice and readable manner, add emojies where possible to describe things like hot or cold, windy or sunny.Emojies are very important as they make the report friendly. I also want you to think about the region where the farmer is from and create a unique tip that will benefit their farming business in line with the weather make it extensive by suggesting crops and also outlining the best way to avoid diseases,pests,droughts and other hazards related to their location.Please only use metric units"},
        {role: "user", content: prompt}
      ],
    });

    return completion.data.choices[0].message.content; // Return the completed message content
  } catch (error) {
    console.error(error);
    throw new Error('Failed to interpret data using OpenAI');
  }
}

// Route to get weather and OpenAI interpretation
router.get('/', async (req, res) => {
  try {
    const location = req.query.location; // Extract the location from the query parameter
    if (!location) {
      return res.status(400).json({ error: 'Location parameter is missing' });
    }

    const weatherData = await getWeatherData(location); // Pass the location to the getWeatherData function
    const interpretation = await interpretData(weatherData); // Function to send weather data to OpenAI for interpretation

    res.json({ message: interpretation }); // Return the completed data
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
