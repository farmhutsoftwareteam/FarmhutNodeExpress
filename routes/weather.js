const express = require('express');
const Response = require('../models/weather'); // Update the path based on your file structure
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
const openai = new OpenAI( {apiKey :process.env.OPEN_AI_KEY })
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

    console.log(weatherData)
    
    return weatherData;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch weather data');
  }
}

async function createAssistant() {
  const payload = {
    tools: [],
    name: "Farmhut",
    instructions: "You are an assistant to help me",
    model: "munyaradzi", // Ensure this is a valid model for your Azure OpenAI service
    file_ids: []
  };

  try {
    const response = await axios.post(`${process.env.AZURE_OPENAI_ENDPOINT}/openai/assistants`, payload, {
      headers: {
        'Authorization': `Bearer ${process.env.AZURE_OPENAI_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Assistant created:", response.data);
    const assistantId = response.data.id;
    return assistantId
   
  } catch (error) {
    console.error("Failed to create assistant:", error);
  }
}

createAssistant();

async function interpretData(weatherData, requestId, assistantId) {
  try {
      // Create a Thread for the conversation
      const thread = await openai.beta.threads.create();

      // Define the function to be called by the Assistant
      const functionCall = {
          type: "code_interpreter",
          code: `getWeatherData("${weatherData}")`, // Calling getWeatherData function
      };

      // Run the Assistant on the Thread with function calling
      const run = await openai.beta.threads.runs.create({
          thread_id: thread.id,
          assistant_id: assistantId,
          tools: [functionCall]
      });

      // Retrieve the Assistant's response
      const messages = await openai.beta.threads.messages.list({
          thread_id: thread.id
      });

      // Update the database with the Assistant's response
      const updatedResponse = await new Promise((resolve, reject) => {
          Response.findOneAndUpdate(
              { requestId },
              { interpretation: JSON.stringify(messages) },
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


  
const tools = [
  {
    type: "function",
    function: {
      name: "getWeatherData",
      description: "Retrieves weather data for a specific location",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "Location to retrieve weather for" }
        },
        required: ["location"]
      }
    }
  }
];



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
      res.json({ messagewe: JSON.parse(response.interpretation) });
    } else {
      res.status(204).send();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
