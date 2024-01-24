const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const SearchRes = require('../models/search');
const fs = require('fs');
require('dotenv').config();


const OpenAI = require('openai');
const openai = new OpenAI( { apiKey :process.env.OPEN_AI_KEY })

const router = express.Router();

// Function to search the database using OpenAI
// Function to search the database using OpenAI
async function searchDatabase(prompt, databaseType, requestId) {
  try {
    console.log(prompt)
    console.log(databaseType);
    

    // Retrieve the appropriate database based on the databaseType
    let database;
    switch (databaseType) {
      case 'products':
        database = await getProductDatabase();
        break;
      case 'machinery':
        database = await getMachineryDatabase();
        break;
      case 'farm-inputs':
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

    // Remove _id and __v properties from each object in the database
    const cleanedDatabase = database.map((item) => {
      const { _id, __v, ...cleanedItem } = item;
      return cleanedItem;
    });
    console.log(cleanedDatabase)
    const systemMessage = {
      role: 'system',
      content: `You are a search engine that is based on the following database: ${JSON.stringify(
        cleanedDatabase)}. You will answer the following question: ${prompt}. Only return responses that directly answer the user's question.`,
    };
    console.dir(systemMessage.content);
    const content = systemMessage.content;
    
    fs.writeFile('log.txt', content, (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      } else {
        console.log('Content logged to file successfully.');
      }
    });
    


    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-16k',
      messages: [systemMessage],
    });

    await SearchRes.findOneAndUpdate(
      { requestId },
      { results: JSON.stringify(completion.data.choices[0].message.content) },
      { upsert: true }
    );

    return completion.data.choices[0].message.content;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to search the database using OpenAI');
  }
}


// Retrieve the product database
async function getProductDatabase() {
  try {
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://farmhut.azurewebsites.net/products/all',
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
      url: 'https://farmhut.azurewebsites.net/machinery/',
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
      url: 'https://farmhut.azurewebsites.net/farm-inputs/all',
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
      url: 'https://farmhut.azurewebsites.net/logistics/trucks/all',
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
      url: 'https://farmhut.azurewebsites.net//livestock/',
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
router.post('/search/:databaseType', async (req, res) => {
  try {
    const { databaseType } = req.params;
    const prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).json({ error: 'Search query is missing' });
    }

    const requestId = uuidv4();
    // Process the OpenAI search in the background
    searchDatabase(prompt, databaseType, requestId);

    // Respond immediately with the requestId
    res.json({ requestId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/searchreq/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    const response = await SearchRes.findOne({ requestId });
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    if (response.results) {
      return res.json({ results: JSON.parse(response.results) });
    } else {
      res.status(204).send();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
