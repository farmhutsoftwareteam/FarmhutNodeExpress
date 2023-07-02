const express = require('express')
const axios = require('axios');
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: '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',
});

const router = express.Router();

//function to retrieve databases for all products

async function getProductDatabase() {
    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://goldfish-app-d5n57.ondigitalocean.app/products/all',
        headers: {}
    };

    axios.request(config).then((response) => {console.log(JSON.stringify(response.data))}).catch((error) => {console.log(error)});
}

async function getMachineryDatabase () {
    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://goldfish-app-d5n57.ondigitalocean.app/machinery/',
        headers: {}
    };

    axios.request(config).then((response) => {console.log(JSON.stringify(response.data))}).catch((error) => {console.log(error)});
}

async function getFarmInputDatabase () { 
    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://goldfish-app-d5n57.ondigitalocean.app/farm-inputs/all',
        headers: {}
    };

    axios.request(config).then((response) => {console.log(JSON.stringify(response.data))}).catch((error) => {console.log(error)});
}

async function getTrucksDatabase () { 
    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://goldfish-app-d5n57.ondigitalocean.app/logistics/trucks/all',
        headers: {}
    };

    axios.request(config).then((response) => {console.log(JSON.stringify(response.data))}).catch((error) => {console.log(error)});
}

async function getLivestockDatabase () { 
    const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: 'https://goldfish-app-d5n57.ondigitalocean.app/livestock/',
        headers: {}
    };

    axios.request(config).then((response) => {console.log(JSON.stringify(response.data))}).catch((error) => {console.log(error)});
}




