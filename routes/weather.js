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

// Function to submit tool outputs for a run that requires action
async function submitToolOutputs(threadId, runId, toolOutputs) {
  try {
    const response = await axios.post(`${process.env.AZURE_OPENAI_ENDPOINT}/openai/threads/${threadId}/runs/${runId}/submit_tool_outputs?api-version=2024-02-15-preview`, {
      tool_outputs: toolOutputs,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.AZURE_OPENAI_KEY,
      }
    });
  return response.data
    console.log("Tool outputs submitted:", response.data);
  } catch (error) {
    console.error("Failed to submit tool outputs:", error);
    throw error;
  }
}

// Function to run a thread
async function runThread(threadId, assistantId) {
  try {
    const response = await axios.post(`${process.env.AZURE_OPENAI_ENDPOINT}/openai/threads/${threadId}/runs?api-version=2024-02-15-preview`, {
      assistant_id: assistantId,
      instructions: "Please give the user a response on the weather and how they can plan their season"
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

// Updated interpretData function to include required action handling
async function interpretData(location, requestId) {
  try {
    // Create an Assistant
    const assistantId = await createAssistant();

    // Create a Thread for the Assistant
    const threadId = await createThread();

    // Define the message to be processed by the Assistant
    const messagePayload = {
      "role": "user",
      "content": `What is the weather in ${location}?`
    };

    // Send the message to the Assistant's thread
    await axios.post(`${process.env.AZURE_OPENAI_ENDPOINT}/openai/threads/${threadId}/messages?api-version=2024-02-15-preview`, messagePayload, {
      headers: {
        'api-key': process.env.AZURE_OPENAI_KEY,
        'Content-Type': 'application/json'
      }
    });

    // Initiate a run on the thread
    const runResponse = await runThread(threadId, assistantId);

    // Check if the run requires action
    if (runResponse.status === 'requires_action') {
      // Assume we have the tool outputs from external functions (e.g., getWeatherData)
      // This part should be dynamic based on the actual required actions from the runResponse
      const weatherData = await getWeatherData(location);
      const toolOutputs = [{
        tool_call_id: runResponse.required_action.submit_tool_outputs.tool_calls[0].id,
        output: weatherData
      }];
console.log(weatherData)
      // Submit tool outputs for the run
      await submitToolOutputs(threadId, runResponse.id, toolOutputs);
      console.log('tool  outputs submitted')
    }

  

    // Update the database with the interpretation result
    await Response.findOneAndUpdate(
      { requestId },
  
      { new: true }
    );

    return {
      threadId: threadId,
      runStatus: runResponse.status // Assuming runResponse includes status
    };

  } catch (error) {
    console.error("Failed to interpret data using Azure OpenAI Assistants:", error);
    throw new Error('Failed to interpret data using Azure OpenAI Assistants');
  }
}

// Note: This function assumes that the necessary auxiliary functions such as createAssistant, createThread, runThread, fetchThreadMessages, getWeatherData, and submitToolOutputs are implemented properly.
// The `getWeatherData` function should be implemented to fetch weather data from an external API and format it as required by your tool.
// The `submitToolOutputs` function should be implemented to submit the tool outputs to Azure OpenAI as shown in the previous example.


// Router setup
router.get('/', async (req, res) => {
  try {
    const location = req.query.location;
    if (!location) {
      return res.status(400).json({ error: 'Location parameter is missing' });
    }

    const requestId = uuidv4();
    await new Response({ requestId, location }).save();

    const { threadId, runStatus } = await interpretData(location, requestId);

    // Respond with thread ID and run status if it's in progress
    res.json({  threadId, runStatus });
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
