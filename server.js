

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
const weatherRouter = require('./routes/weather');
const SearchRouter = require('./routes/search');
const ProductRouter = require('./routes/production');
const { indexProducts } = require('./algoliaIndexing'); // Adjust the path




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


///websocket for ai agronomist this ufnciton is not working
const http = require('http');
const WebSocket = require('ws');
indexProducts();


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
app.use('/search', SearchRouter);

app.use('/production', ProductRouter);
app.post('/api/assistant', async (req, res) => {
  const { userId, prompt } = req.body;

   // Check if the user's conversation history exists, otherwise initialize it as an empty array
   if (!userConversations[userId]) {
    // Pre-fill conversation history with a system message
    userConversations[userId] = [
      {
        "role": "system",
        "content": "You are uMudhumeni, an AI assistant designed by Farmhut Africa, your goal is to assist farmers and make sure that their productivity increases,make the messages interactive and friendly. "
      }
    ];
  }
console.log(userConversations)
  
  
  // Add the user's message to their conversation history
  userConversations[userId].push({
    "role": "user",
    "content": prompt
  });
   // Track user message event in Mixpanel
   mixpanelClient.track('User Message', {
    distinct_id: userId, // Assuming userId is available in the request body
    message: prompt
  });
  console.log('Request body:', req.body);
  const gptResponse = await openai.createChatCompletion({
    model: "gpt-3.5-turbo-16k",
 

    messages: userConversations[userId] // Use the user's conversation history
  });
  
  console.log('gptResponse: ', gptResponse); // Log the entire response
  console.log('gptResponse.data.choices[0]: ', gptResponse.data.choices[0]); // Log the first choice

  // Check if choices and message exist in the response
  if (gptResponse && gptResponse.data && gptResponse.data.choices && gptResponse.data.choices[0] && gptResponse.data.choices[0].message) {
    const assistantReply = gptResponse.data.choices[0].message.content;
  
    // Add the assistant's reply to the user's conversation history
    userConversations[userId].push({
      "role": "assistant",
      "content": assistantReply
    });
// Track assistant reply event in Mixpanel
mixpanelClient.track('Assistant Reply', {
  distinct_id: userId, // Assuming userId is available in the request body
  message: assistantReply
});
    res.send({ 'botresponse': assistantReply });
  } else {
    res.status(500).send({ 'error': 'Unexpected response from OpenAI API' });
  }
});

// Set up WebSocket server
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });




const port = process.env.PORT || 4000;
server.listen(port, () => {
  log.green(`Server listening on port ${port}`);
});
