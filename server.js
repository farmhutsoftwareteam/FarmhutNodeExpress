

let conversationHistory = [];

require("dotenv").config();
const machineryRoutes = require('./routes/machinery');
const mixpanel = require('mixpanel');
const jwt = require('jsonwebtoken');
const truckRoutes = require('./routes/trucks');
const express = require('express');
const app = express();
const mixpanelToken = '1d3b3900e364420afd3d3f96c268d88e'
const mixpanelClient = mixpanel.init(mixpanelToken);
const { log} = require("mercedlogger");
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const UserRouter = require("./controllers/user");
const LivestockRoutes = require("./routes/livestock")
const blogPostRoutes = require('./routes/blogpost');
const { SECRET = "secret" } = process.env;
const swaggerFile = require('./swagger_output.json')
const swaggerUi = require('swagger-ui-express')
const productController = require('./controllers/product');
const inputController = require('./controllers/farminputs')
const { Configuration, OpenAIApi} = require("openai")
const conversationHistories = {};
const weatherRouter = require('./routes/weather');




const configuration = new Configuration({
    apiKey: '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'
})
const openai = new OpenAIApi(configuration);
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.userId = decoded.id; // add user ID to request object
    next();
  });
}


///websocket for ai agronomist
const http = require('http');
const WebSocket = require('ws');









//global middleware
app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());
app.get('/', (req, res) => {
  res.send('FARMHUT SERVER RUNNING');
});
app.use("/user", UserRouter) // send all "/user" requests to UserRouter for routing
app.use(express.static('public'));
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile))
app.use('/', productController);
app.use("/blog", blogPostRoutes)
app.use('/logistics', truckRoutes);
app.use('/', inputController);
app.use('/weather', weatherRouter);
app.use('/livestock', LivestockRoutes);
app.use('/machinery', machineryRoutes);
app.post('/conversation', verifyToken, async (req, res) => {
  const { input } = req.body;
  const userId = req.userId;

  // Create a new conversation history for this user if it doesn't exist
  if (!conversationHistories[userId]) {
    conversationHistories[userId] = [];
  }
  console.log(...conversationHistories[userId])

  // Add user message to this user's conversation history
  conversationHistories[userId].push({
    role: "user",
    content: input,
  });

  // Construct messages array using this user's conversation history
  const messages = [
    
    
    ...conversationHistories[userId],
  ];
  
console.log(messages)
  

  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: messages,
    
  });

  const aiResponse =   response.choices && response.choices.length > 0 ? response.choices[0].text.trim() : "Sorry, I didn't understand that.";
 
  // Add AI response to this user's conversation history
  conversationHistories[userId].push({
    role: "assistant",
    content: aiResponse,
  });

  // Track the conversation event in Mixpanel
  mixpanelClient.track('Conversation', {
    distinct_id: userId,
    conversation_history: conversationHistories[userId],
  });

  res.send({ response: aiResponse, userId: userId });
});

// Set up WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws) {
  console.log('WebSocket connected');

  ws.on('message', async function incoming(message) {
    console.log('Received message:', message);

    //add user messafe to history
    conversationHistory.push({
      speaker: "human",
      message: message,
    })

    // Send the user's message to OpenAI API and receive a response
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `The following is a conversation with an AI assistant. The assistant is helpful and provides answers to agriculture questions and renewable energyk\n\n${conversationHistory.map(entry => entry.speaker + ": " + entry.message).join("\n")}\nAI:`,
      temperature: 0.9,
      max_tokens: 3000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0.6,
      stop: [" Human:", " AI:"],
     
    });

    const aiResponse = response.data.choices[0].text;

    //add ai response to history
    conversationHistory.push({
      speaker: "ai",
      message: aiResponse,
    })

    // Determine the author type of the message
    const authorType = message.authorType || "contact"; // Use "contact" as the default author type if not specified

    // Send the AI response back to the WebSocket client
     // Send the response and author type back to the WebSocket client
     ws.send(JSON.stringify({ response: aiResponse, authorType }));
  });

  ws.on('close', function close() {
    console.log('WebSocket disconnected');
  });
});


const port = process.env.PORT || 4000;
server.listen(port, () => {
  log.green(`Server listening on port ${port}`);
});
