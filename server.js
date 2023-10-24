

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
const UserRouter = require("./controllers/user");
const LivestockRoutes = require("./routes/livestock")
const blogPostRoutes = require('./routes/blogpost');
const pesepay = require('pesepay-js'); // Import the pesepay-js library
const User = require('./models/user')
const { SECRET = "secret" } = process.env;
const swaggerFile = require('./swagger_output.json')
const swaggerUi = require('swagger-ui-express')
const productController = require('./controllers/product');
const inputController = require('./controllers/farminputs')
const { Configuration, OpenAIApi} = require("openai")
const weatherRouter = require('./routes/weather');
const SearchRouter = require('./routes/search');
const ProductRouter = require('./routes/production');
const { indexProducts, indexFarmInput } = require('./algoliaIndexing'); // Adjust the path
const searchRouter = require('./routes/searchRoute'); // Adjust the path
const SurveyRoute = re




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
indexFarmInput();


//global middleware
app.use(cors());
app.use(morgan('tiny'));
app.use(express.json());
app.get('/', (req, res) => {
  res.send('FARMHUT SERVER RUNNING');
});
app.use('/api', searchRouter);

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


const client = new pesepay.PesePayClient('00ccb98b-e7aa-4625-b104-0df4dfa9d0cc', '78648f3416bf492b86ee97ed536d5fd7');
app.post('/initiate-subscription', async (req, res) => {
  try {
    const user = await User.findOne({ phone: req.body.phone }); // Find the user
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const subscriptionType = req.body.subscriptionType; // Assuming you send "monthly" or "halfYearly" in the request body

    // Define subscription amounts and currency code
    let amount, currencyCode;
    if (subscriptionType === 'monthly') {
      amount = 1500;
      currencyCode = 'ZWL';
    } else if (subscriptionType === 'halfYearly') {
      amount = 20000;
      currencyCode = 'ZWL';
    } else {
      return res.status(400).json({ message: 'Invalid subscription type' });
    }

    // Prepare seamless payment details
    const paymentDetails = {
      amountDetails: {
        amount: amount,
        currencyCode: currencyCode,
      },
      merchantReference: `SUB-${user._id}-${subscriptionType}`, // A unique reference for the payment
      reasonForPayment: `Subscription (${subscriptionType})`,
      resultUrl: 'https://my.resulturl.com',
      paymentMethodCode: 'PZW201', // Replace with the appropriate payment method code
      customer: {
        phoneNumber: user.phone,
      },
      paymentMethodRequiredFields: { customerPhoneNumber: user.phone },
    };

    // Make seamless payment
    const response = await client.makeSeamlessPayment(paymentDetails);
    const referenceNumber = response.referenceNumber;

    // Update user's subscription reference number and subscription type
    user.subscriptionReferenceNumber = referenceNumber;
    user.subscriptionType = subscriptionType;
    await user.save();

    return res.status(200).json({ pollUrl: response.pollUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error initiating subscription' });
  }
});

// Route to handle PesePay callback (resultUrl)
app.post('/pese-pay-callback', async (req, res) => {
  try {
    // Parse callback data and update user's payment status
    const referenceNumber = req.body.referenceNumber;
    const user = await User.findOne({ paymentReferenceNumber: referenceNumber });
    if (user) {
      user.isAvailable = true; // Update user's availability or any relevant field
      await user.save();
    }

    return res.status(200).send('Callback received');
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Error handling callback' });
  }
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
  log.green(`Server listening on port ${port}`);
});
