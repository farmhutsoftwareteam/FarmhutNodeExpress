const express = require('express');
const Response = require('../models/weather'); // Update the path based on your file structure
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config(); // Ensure this is included if you're using dotenv for your environment variables

const router = express.Router();

const tools = 
  
  [
    {
      "type": "function",
      "name": "getWeatherData",
      "parameters" : {
        "type" : "object" ,
        "properties" : {
          "location" : {
            "type" : "string" , "description" : "The location where the user wants to know the weather e.g Lusaka "
          },
          "required" : ["location"]
        }
      }
    }
  ]


// Function to retrieve weather data from the weather API
async function getWeatherData(location) {
  const options = {
    method: 'GET',
    url: 'https://weatherapi-com.p.rapidapi.com/current.json',
    params: { q: location },
    headers: {
      'X-RapidAPI-Key': 'YOUR_RAPIDAPI_KEY_HERE', // Ensure you replace this with your actual API key
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

// Function to fetch messages from a given thread in Azure OpenAI
async function fetchThreadMessages(threadId) {
  try {
    const response = await axios.get(`${process.env.AZURE_OPENAI_ENDPOINT}/openai/threads/${threadId}/messages?api-version=2024-02-15-preview`, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_KEY,
      },
    });

    console.log("Messages fetched:", response.data);
    return response.data; // Return the fetched messages
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    throw error; // Rethrow the error for caller to handle
  }
}
// Function to create an assistant
async function createAssistant() {
  const payload = {
    "name": "Farmhut",
    "instructions": "You are an assistant to help me answer weather questions.",
    "model": "munyaradzi",
    "tools" : [
    {
      "type" : "function",
      "function" : {
        "name" : "getWeatherData",
        "description" : "Get weather data in a location",
        "parameters" : {},
        "required" : ["location"]
      }
    }
    ] // Update this to a valid model for your Azure OpenAI service
  };

  try {
    const response = await axios.post(`${process.env.AZURE_OPENAI_ENDPOINT}/openai/assistants?api-version=2024-02-15-preview`, payload, {
      headers: {
        'api-key': `${process.env.AZURE_OPENAI_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Assistant created:", response.data);
    return response.data.id;
  } catch (error) {
    console.error("Failed to create assistant:", error);
    throw error;
  }
}

// Function to create a thread
async function createThread() {
  try {
    // Note: No need to pass the assistant ID in the body for thread creation
    const response = await axios.post(`${process.env.AZURE_OPENAI_ENDPOINT}/openai/threads?api-version=2024-02-15-preview`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': `${process.env.AZURE_OPENAI_KEY}`, // Use the API key directly without 'Bearer'
      }
    });

    console.log("Thread created:", response.data);
    return response.data.id; // Returns the created thread ID for further use
  } catch (error) {
    console.error("Failed to create thread:", error);
    throw error;
  }
}

// Function to run a thread
async function runThread(threadId, assistantId) {
  try {
    const response = await axios.post(`${process.env.AZURE_OPENAI_ENDPOINT}/openai/threads/${threadId}/runs?api-version=2024-02-15-preview`, {
      assistant_id: assistantId,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_KEY,
      }
    });

    console.log("Run initiated:", response.data);
    return response.data.id; // Returns the run ID for further use
  } catch (error) {
    console.error("Failed to run thread:", error);
    throw error;
  }
}

// Function to interpret data using Azure OpenAI Assistants
async function interpretData(location, requestId) {
  try {
    // Create an Assistant
    const assistantId = await createAssistant();

    // Create a Thread for the Assistant
    const threadId = await createThread(assistantId);

    // Define the message to be processed by the Assistant
    const messagePayload = {
      "role": "user",
      "content": `I need to solve the equation for the weather in ${location}.`
    };

    // Send the message to the Assistant's thread
    const response = await axios.post(`https://farmhut-ai.openai.azure.com/openai/threads/${threadId}/messages?api-version=2024-02-15-preview`, messagePayload, {
      headers: {
        'api-key': `${process.env.AZURE_OPENAI_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log("Assistant's response:", response.data);
    const runId = await runThread(threadId, assistantId);
    console.log("Run ID:", runId);
    
    await Response.findOneAndUpdate(
      { requestId },
      { interpretation: JSON.stringify(response.data) },
      { new: true }
    );
    return threadId

  } catch (error) {
    console.error(error);
    throw new Error('Failed to interpret data using Azure OpenAI Assistants');
  }
}

// Router setup
router.get('/', async (req, res) => {
  try {
    const location = req.query.location;
    if (!location) {
      return res.status(400).json({ error: 'Location parameter is missing' });
    }

    const requestId = uuidv4();
    const response = new Response({ requestId, location });
    await response.save();

    const threadId = await interpretData(location, requestId);


    res.json({ requestId , threadId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    // Assuming requestId is used to identify the threadId. Adjust as necessary.
    const messages = await fetchThreadMessages(threadId);

    if (!messages) {
      return res.status(404).json({ error: 'Messages not found for the given thread ID' });
    }

    res.json({ messages: messages }); // Send the fetched messages as response
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
