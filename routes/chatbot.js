const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const User = require("../models/user");


const axios = require("axios");
const cancelRun = require("../functions/cancelRun");
require("dotenv").config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function calculateLoanInstallmentRepeatClient(loanAmount, tenure) {
    const interestRate = 10;

    const tenuredInterestRate = interestRate * tenure;

    const interest = (tenuredInterestRate / 100) * loanAmount;

    const totalAmount = loanAmount + interest;

    const monthlyInstallment = totalAmount / tenure;

    console.log(monthlyInstallment);
}

async function getExchangeRates() {
    try {
        const response = await axios.get(
            "https://a.success.africa/api/rates/fx-rates"
        );
        return response.data;
    } catch (error) {
        console.error(`Error fetching exchange rates: ${error}`);
        throw error;
    }
}
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

async function getZimStocks() {
    try {
        const response = await axios.get(
            "https://ctrade.co.zw/mobileapi/marketwatchzsenew"
        );
        return response.data;
    } catch (error) {
        console.error(` Error fetching exchnage rates ; ${error} `);
    }
}

async function calculateLoanInstallment({ loanAmount, tenureMonths }) {
    const interestRate = 0.1; // Fixed annual interest rate of 10%
    const monthlyRate = interestRate / 12; // Convert annual rate to monthly rate
    const installment =
        (loanAmount * monthlyRate) /
        (1 - Math.pow(1 / (1 + monthlyRate), tenureMonths));

    return {
        loanAmount: loanAmount,
        tenureMonths: tenureMonths,
        monthlyInstallment: installment.toFixed(2), // Rounding to 2 decimal places for readability
    };
}

async function getStoredThreadId(userId) {
    try {
        const user = await User.findOne({ phone: userId }); // or use any unique identifier
        return user ? user.openaiThreadId : null;
    } catch (error) {
        console.error(`Error fetching user's thread ID: ${error}`);
        throw error;
    }
}

async function storeThreadId(userId, threadId) {
    try {
        await User.findOneAndUpdate(
            { phone: userId }, // or use any unique identifier
            { openaiThreadId: threadId },
            { new: true }
        );
    } catch (error) {
        console.error(`Error storing user's thread ID: ${error}`);
        throw error;
    }
}

const tools = [
    {
        type: "function",
        function: {
            name: "getZimStocks",
            description:
                "Get the current stock price of a Zimbabwean company using its name",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
    {
        type : "function",
        function : {
          name : "getWeatherData",
          description : "Get weather data in a location",
          parameters : {
            type : "object",
            properties : {
              location : {
                type : "string",
                description : "The location to get the weather data for"
              }
            },
            required : ["location"]
          },
         
        }
        
        },

    {
        type: "function",
        function: {
            name: "calculateLoanInstallment",
            description: "Calculate monthly loan installment",
            parameters: {
                type: "object",
                properties: {
                    loanAmount: {
                        type: "number",
                        description: "The total loan amount",
                    },
                    tenureMonths: {
                        type: "number",
                        description: "Loan tenure in months",
                    },
                },
                required: ["loanAmount", "tenureMonths"],
            },
        },
    },

    {
        type: "function",
        function: {
            name: "getExchangeRates",
            description: "Fetch the current exchange rates",
            parameters: {
                type: "object",
                properties: {},
                required: [],
            },
        },
    },
];

//anytime the OPENAI KEY CHANGES you will have unmatching threadIDS this will cause a 404 error
//i still don't have any logical solution for this, currently writing an external function
//to delete all the existing threadIds from db
async function processUserQuery(userQuery, userId) {
    let runId;
    try {
        console.log(`Retrieving stored thread ID for user ID: ${userId}`);

        let threadId = await getStoredThreadId(userId);
        console.log(`Retrieved thread ID: ${threadId}`);
        if (!threadId) {
            console.log(`No thread ID found, creating a new thread.`);
            const thread = await openai.beta.threads.create();

            threadId = thread.id;
            await storeThreadId(userId, threadId);
            console.log(`New thread ID created: ${threadId}`);
        }

        const assistant = await openai.beta.assistants.create({
            name: "uMudhumeni",
            instructions: `Provide comprehensive assistance to farmers on topics related to agriculture and finance. 
                Offer guidance on best farming practices, crop and livestock management, sustainable agriculture techniques, 
                and financial advice including loans, subsidies, and insurance. To make the replies friendly please add emojies where possible.
                Ensure the information is accurate, up-to-date, and tailored to the farmer's specific needs and location.
                When performing functions like adding products, trucks, or searching for anything, always ask for additional details to ensure accurate and helpful responses.
                Understand that you are operating in a secure environment with end-to-end encryption, allowing you to confidently process all provided information.For each query, uMudhumeni will:
                Start by acknowledging the user's question or concern.
                Offer a direct response or advice based on the most up-to-date and accurate agricultural knowledge available.
                Clearly explain any technical terms or concepts used in the response.
                Where applicable, provide additional tips, links to resources, or suggest further reading.
                - Invite Further Questions: Encourage users to ask more questions if they need clarification or additional information.
                Tone and Style: The tone should be friendly, approachable, and supportive, with an emphasis on being educational and informative.
                Error Handling: If uMudhumeni does not understand a query or lacks sufficient information to provide a detailed response, it should politely ask for clarification or additional details.
                Ethical Guidelines: uMudhumeni will respect user privacy, avoid bias, and ensure that the advice given is in the best interest of sustainable and ethical farming practices.
                If a user asks for weather please tell them the weather and how it is relevant to their farming business.
            `,
            tools: tools,
            model: "gpt-4-turbo-preview",
        });

        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: userQuery,
        });

        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistant.id,
            instructions: "Please address the user's question in full please.",
        });
        runId = run.id;

        let statusResult;
        do {
            statusResult = await checkStatusAndPrintMessages(threadId, run.id);
            if (["requires_action", "in_progress"].includes(statusResult.status)) {
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        } while (statusResult.status !== "completed");

        // Optionally handle final messages here
    } catch (error) {
        console.error(`Error in processUserQuery: ${error}`);
        if (threadId && runId) {
            await cancelRun(threadId, runId).catch((cancelError) =>
                console.error(`Error cancelling run: ${cancelError}`)
            );
        }
    }
}

async function checkStatusAndPrintMessages(threadId, runId ,userId) {
    try {
        const runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);

        if (runStatus.status === "completed") {
            const messages = await openai.beta.threads.messages.list(threadId);
            console.log('The Run is now Complete')
            const webhookUrl ="https://flows.messagebird.com/flows/invocations/webhooks/dd0acae0-073f-40bb-97b2-3ee23290b7a9"
            const postData = {
                identifier : userId
            }
            await axios.post(webhookUrl, postData)
            .then(response => console.log("Notification sent succesfully"))
            .catch(error => console.log("Error sending notification" ,error))

            

            return {
                status: "completed",
                messages: messages.data.map((msg) => ({
                    role: msg.role,
                    content: msg.content[0].text.value,
                })),
            };
        } else if (runStatus.status === "requires_action") {
            const toolsOutput = await performRequiredActions(
                runStatus.required_action.submit_tool_outputs.tool_calls
            );
            await submitToolOutputs(threadId, runId, toolsOutput);
            return { status: "requires_action" };
        } else {
            console.log("Run is in progress, waiting for completion.");
            return { status: "in_progress" };
        }
    } catch (error) {
        console.error(`Error in checkStatusAndPrintMessages: ${error}`);
        throw error;
    }
}

async function performRequiredActions(requiredActions, req) {
    let toolsOutput = [];

    for (const action of requiredActions) {
        const funcName = action.function.name;
        const functionArguments = JSON.parse(action.function.arguments);

        if (funcName === "calculateLoanInstallment") {
            try {
                const output = await calculateLoanInstallment(functionArguments);
                toolsOutput.push({
                    tool_call_id: action.id,
                    output: JSON.stringify(output),
                });
            } catch (error) {
                console.error(`Error in calculateLoanInstallment: ${error}`);
            }
        } else if (funcName === "getExchangeRates") {
            try {
                const output = await getExchangeRates();
                toolsOutput.push({
                    tool_call_id: action.id,
                    output: JSON.stringify(output),
                });
            } catch (error) {
                console.error(`Error in getExchangeRates: ${error}`);
            }
        } else if (funcName === "getZimStocks") {
            try {
                const output = await getZimStocks();
                toolsOutput.push({
                    tool_call_id: action.id,
                    output: JSON.stringify(output),
                });
            } catch (error) {
                console.error(`Error in getZimStocks: ${error}`);
            }
        } else if (funcName === "getWeatherData") {
            try {
                const output = await getWeatherData(functionArguments.location);
                toolsOutput.push({
                    tool_call_id: action.id,
                    output: output,
                });
            } catch (error) {
                console.error(`Error in getWeatherData: ${error}`);
            }
        } else {
            console.error(`Unknown function name: ${funcName}`);
        }
    }

    return toolsOutput;
}

// Function to submit tool outputs
async function submitToolOutputs(threadId, runId, toolsOutput) {
    if (toolsOutput.length > 0) {
        try {
            await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
                tool_outputs: toolsOutput,
            });
        } catch (error) {
            console.error(`Error submitting tool outputs: ${error}`);
            throw error;
        }
    }
}

router.post("/", async (req, res) => {
    const userQuery = req.body.query;
    const userId = req.body.userId;

    if (!userQuery || !userId) {
        return res.status(400).send({ error: "No query provided" });
    }

    res.send({ message: "Message received, processing..." });

    processUserQuery(userQuery, userId).catch((error) => {
        console.error(`Error processing query in background: ${error}`);
    });
});

module.exports = router;
