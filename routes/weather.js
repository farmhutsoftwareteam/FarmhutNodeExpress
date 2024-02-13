const express = require('express');
const Response = require('../models/weather'); // Update the path based on your file structure
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config(); // Ensure this is included if you're using dotenv for your environment variables
const User = require('../models/user')

const router = express.Router();




// Function to retrieve weather data from the weather API
async function getWeatherData(location) {
  const options = {
    method: 'GET',
    url: 'https://weatherapi-com.p.rapidapi.com/current.json',
    params: { q: location },
    headers: {
      'X-RapidAPI-Key': '84f83a1ed4msh09697c818512d9ap19821bjsnec4fab6279da', // Ensure you replace this with your actual API key
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

const tools = [ {
"type" : "function",
"function" : {
  "name" : "getWeatherData",
  "description" : "Get weather data in a location",
  "parameters" : {},
  "required" : ["location"]
}

}]

async function getStoredThreadId(userId) {
  try{
    const user = await User.findOne( { phone : userId });
    return user ? user.azureThreadId : null;
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to fetch users thread ID : ${error}`);
  }
}

async function storeThreadId(userId, threadId) {
  try {
    await User.findOneAndUpdate({ phone: userId }, { azureThreadId: threadId } ,{new : true});
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to store thread ID for user: ${error}`);
  }
}
async function createAssistant() {
  const payload = {
    "name": "Farmhut",
    "instructions": "You are an assistant to help me answer weather questions.",
    "model": "munyaradzi",
    "tools" : tools // Update this to a valid model for your Azure OpenAI service
  };

  try {
    const response = await axios.post(`${process.env.AZURE_OPENAI_ENDPOINT}/openai/assistants?api-version=2024-02-15-preview`, payload, {
      headers: {
        'api-key': `${process.env.AZURE_OPENAI_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log("Assistant created:", response.data);
    const assistant_id = response.data.id
    return assistant_id
  } catch (error) {
    console.error("Failed to create assistant:", error);
    throw error;
  }
}
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
async function addMessageToThread(userQuery, threadId) {
  console.log(`Attempting to add message to thread: ${threadId} with query: ${userQuery}`);
  const payload = {
      "role": "user",
      "content": userQuery
  };

  try {
      const response = await axios.post(`https://farmhut-ai.openai.azure.com/openai/threads/${threadId}/messages?api-version=2024-02-15-preview`, payload, {
          headers: {
              'api-key': process.env.AZURE_OPENAI_KEY,
              'Content-Type': 'application/json'
          }
      });

      console.log("Message added to thread:", response.data);
      return response.data;
  } catch (error) {
      console.error(`Failed to add message to thread ${threadId}:`, error.response.data);
      throw error;
  }
}



async function processUserQuery(userQuery, userId){
  let threadId = await getStoredThreadId(userId);
if (!threadId) {
  threadId = await createThread()
  await storeThreadId(userId, threadId)
}



  try {
    

    const assistantId = await createAssistant();
    console.log(`Assistant ID : ${assistantId}`)
    console.log(`Using threadId: ${threadId} for userId: ${userId}`);


    await addMessageToThread(userQuery, threadId);

    const runResponse = await runThread(threadId, assistantId);
    console.log(runResponse); // Log the response to verify its structure
    const runId = runResponse; // Make sure this is the correct way to get the runId from the response
    


    let statusResult;
    do{
      statusResult = await checkStatusAndPrintMessages(threadId ,runId);
      if (["requires_action", "in_progress"].includes(statusResult.status)) {
        await new Promise(resolve => setTimeout( resolve ,5000))
      }
    } while (statusResult.status !== "completed");
 } catch(error) {
  console.error(`Error in processing user quesry : ${error}`)
  if(threadId && runId) {
    await cancelRun(threadId, runId).catch(cancelError => console.error(`Error cancelling run : ${cancelError}`))
  }
 }


}

async function checkStatusAndPrintMessages(threadId, runId) {
  if (!threadId || !runId) {
    console.error(`checkStatusAndPrintMessages called with undefined threadId: ${threadId} or runId: ${runId}`);
    return; // Exit early if threadId or runId is undefined
  }

  try {
    const runStatus = await retrieveRun(threadId, runId);
    console.log(`Run status for threadId: ${threadId}, runId: ${runId}:`, runStatus);

    if (runStatus.status === "completed") {
      // Assuming you have a function to fetch messages and it returns a properly structured object
      const messages = await fetchThreadMessages(threadId);
      console.log(`Messages for threadId: ${threadId}:`, messages);
      return {
        status: "completed",
        messages: messages.data.map(msg => ({
          role: msg.role,
          content: msg.content[0].text.value
        }))
      };
    } else if (runStatus.status === "requires_action") {
      const toolsOutput = await performRequiredActions(runStatus.required_action.submit_tool_outputs.tool_calls);
      await submitToolOutputs(threadId, runId, toolsOutput);
      return { status: "requires_action" };
    } else {
      console.log(`Run ${runId} in progress, waiting for completion`);
      return { status: "in_progress" };
    }
  } catch (error) {
    console.error(`Error in checkStatusAndPrintMessages for threadId: ${threadId}, runId: ${runId}:`, error);
  }
}



async function performRequiredActions ( requiredActions ,req) {
  let toolsOutput = []
for ( const action of requiredActions) {
  const funcName = action.function.name;
  const functionArguments = JSON.parse(action.function.arguments)

  if (funcName === "getWeatherData" ) {
    try {
      const output =await getWeatherData(functionArguments);
      toolsOutput.push({
        tool_call_id: action.id,
        output: JSON.stringify(output)
      })
    }catch (error) {
      console.error(`Error in getWeatherData`);
    }
  }else {
    console.error(`unknown funtion name : ${funcName}`)
  }
}
return toolsOutput
}

async function submitToolOutputs(threadId, runId, toolsOutput) {
  if (toolsOutput.length > 0) {
    try {
      console.log(`Thread ID: ${threadId}, Run ID: ${runId}`);
      const response = await axios.post(`https://${process.env.AZURE_OPENAI_ENDPOINT}/openai/threads/${threadId}/runs/${runId}/submit_tool_outputs?api-version=2024-02-15-preview`, 
      {
        tool_outputs: toolsOutput
      }, 
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.AZURE_OPENAI_KEY // Ensure your API key is stored in environment variables
        }
      });

      console.log("Tool outputs submitted:", response.data);
      return response.data; // You might want to return something specific from the response
    } catch (error) {
      console.error("Failed to submit tool outputs:");
      // Rethrow the error for the caller to handle
    }
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







// Function to submit tool outputs for a run that requires action


async function runThread(threadId, assistantId) {
  const instructions = "Please give the user a response on the weather and how they can plan their season";
  console.log(`Running thread with ID ${threadId} using Assistant ID ${assistantId} with instructions: ${instructions}`); // Log the run initiation details

  try {
    const response = await axios.post(`${process.env.AZURE_OPENAI_ENDPOINT}/openai/threads/${threadId}/runs?api-version=2024-02-15-preview`, {
      assistant_id: assistantId,
      instructions: instructions
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
   
  }
}

async function retrieveRun(threadId, runId) {
  if (!threadId || !runId) {
    throw new Error('threadId or runId is undefined');
  }
  try {
    const response = await axios.get(`https://farmhut-ai.openai.azure.com/openai/threads/${threadId}/runs/${runId}`, {
      headers: {
        'api-key': process.env.AZURE_OPENAI_KEY ,
        "Content-Type" : 'application/json'// Ensure your API key is stored in environment variables
      }
    });

    // Return the status from the response data
    return response.data;
  } catch (error) {
    console.error(`Failed to retrieve run status: ${error}`);
    // Rethrow the error for the caller to handle
  }
}






// Router setup
router.post('/', async (req, res) => {
  try {
    const userQuery = req.body.query;
    const userId = req.body.userId;
    if (!userQuery || !userId) {
      return res.status(400).json({ error: 'Query or userId is missing' });
    }

    // Retrieve or create a thread ID for the user
    let threadId = await getStoredThreadId(userId);
    if (!threadId) {
      threadId = await createThread();
      await storeThreadId(userId, threadId);
    }

    
    // Note: Errors and processing inside this won't block or affect the response
    processUserQuery(userQuery, userId).catch(error => {
      console.error(`Background task error for user ${userId}:`, error);
      // Handle background task error, e.g., logging or secondary error handling
      // Since this is a background process, consider how to communicate any issues back to the user, if necessary
    });

    // Return the thread ID immediately without waiting for processUserQuery to finish
    res.json({ threadId: threadId });
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
