const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const SearchRes = require('../models/search');
const { Configuration, OpenAIApi } = require('openai');
const configuration = new Configuration({
  apiKey: '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',
});

const router = express.Router();

// Function to search the database using OpenAI
async function searchDatabase(prompt, databaseType, requestId) {
  try {
    const openai = new OpenAIApi(configuration);

    const completion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo-16k',
      messages: [
        {
          role: 'system',
          content: `You are a search engine. You will crawl the ${databaseType} database and answer the following question: ${prompt}. Only return responses that directly answer the user's question.`,
        },
      ],
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
