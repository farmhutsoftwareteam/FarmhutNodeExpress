const express = require('express');
const axios = require('axios');
const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
  apiKey: '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',
});

const router = express.Router();

// Function to search the database using OpenAI
async function searchDatabase(prompt, databaseType) {
  try {
    const openai = new OpenAIApi(configuration);
  

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-16k',
      messages : [
        {"role": "system", "content" : `You are a search engine you will crawl this database ${databaseType} you will give a user the following details about a truck from the database above drivername, availability contact details and location, please make sure that the location matches what the user asks`},
        {"role" : "user", "content": prompt }
      ],
    });

    const searchResults = completion.data.choices[0].message.content;
    return searchResults;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to search the database using OpenAI');
  }
}

// Retrieve the databases and search using OpenAI
async function searchDatabases(databaseType) {
  try {
    let database;
    switch (databaseType) {
      case 'products':
        database = await getProductDatabase();
        break;
      case 'machinery':
        database = await getMachineryDatabase();
        break;
      case 'farmInputs':
        database = await getFarmInputDatabase();
        break;
      case 'trucks':
        database = await getTrucksDatabase();
        break;
      case 'livestock':
        database = await getLivestockDatabase();
        break;
      default:
        throw new Error('Invalid database type');
    }

    // Convert the JSON object to a string
    const prompt = JSON.stringify(database);

    // Search the specified database using OpenAI
    const searchResults = await searchDatabase(prompt, databaseType);
    return searchResults;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to search the databases using OpenAI');
  }
}

// Retrieve the product database
async function getProductDatabase() {
  try {
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://goldfish-app-d5n57.ondigitalocean.app/products/all',
      headers: {},
    };

    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to retrieve the product database');
  }
}

// Retrieve the machinery database
async function getMachineryDatabase() {
  try {
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://goldfish-app-d5n57.ondigitalocean.app/machinery/',
      headers: {},
    };

    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to retrieve the machinery database');
  }
}

// Retrieve the farm input database
async function getFarmInputDatabase() {
  try {
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://goldfish-app-d5n57.ondigitalocean.app/farm-inputs/all',
      headers: {},
    };

    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to retrieve the farm input database');
  }
}

// Retrieve the trucks database
async function getTrucksDatabase() {
  try {
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://goldfish-app-d5n57.ondigitalocean.app/logistics/trucks/all',
      headers: {},
    };

    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to retrieve the trucks database');
  }
}

// Retrieve the livestock database
async function getLivestockDatabase() {
  try {
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://goldfish-app-d5n57.ondigitalocean.app/livestock/',
      headers: {},
    };

    const response = await axios.request(config);
    return response.data;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to retrieve the livestock database');
  }
}

// Route to search the specified database using OpenAI
router.get('/search/:databaseType', async (req, res) => {
  try {
    const { databaseType } = req.params;
    const  prompt = req.body.prompt;
    if (!prompt) {
        return res.status(400).json({ error : 'Search query is missing'});
    }
    const searchResults = await searchDatabases(databaseType, prompt);
    res.json({ results: searchResults });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
