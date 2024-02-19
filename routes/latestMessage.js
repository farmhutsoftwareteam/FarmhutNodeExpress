const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_AI_KEY });
const User = require('../models/user'); // Assuming this is your user model

router.get('/thread/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ phone: userId });

        if (!user || !user.openaiThreadId) {
            return res.status(404).send({ error: 'Thread not found' });
        }

        const threadId = user.openaiThreadId;
        const messagesResponse = await openai.beta.threads.messages.list(threadId);
        const messages = messagesResponse.data;

        const assistantMessages = messages.filter(msg => msg.role === 'assistant');
        console.log(assistantMessages);

        let latestAssistantMessage = "No messages from assistant found.";
        if (assistantMessages.length > 0) {
            const firstMessageContent = assistantMessages[0].content;
            if (Array.isArray(firstMessageContent) && firstMessageContent.length > 0 && firstMessageContent[0].text) {
                latestAssistantMessage = firstMessageContent[0].text.value;
            } else if (typeof firstMessageContent === 'object' && firstMessageContent.text) {
                // Fallback for different structure
                latestAssistantMessage = firstMessageContent.text.value;
            }
        }

        res.send({ latestMessage: latestAssistantMessage });
    } catch (error) {
        console.error(`Error in getting thread: ${error}`);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});



module.exports = router;
