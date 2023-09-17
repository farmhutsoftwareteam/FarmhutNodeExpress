const express = require('express');
const GuideSchema = require('../models/productionguides');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Configuration, OpenAIApi } = require("openai");
const { PDFDocument, StandardFonts, PageSizes, Image } = require('pdf-lib');
const { font } = require('pdfkit');

const configuration = new Configuration({
  apiKey: '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',
});

const router = express.Router();

// Function to send weather data to OpenAI for interpretation
async function interpretData(crop, topic, requestId) {
  const prompt = ` ${(crop)} ${(topic)}`;
  console.time('PDF Generation'); // Start timer

  try {
    const openai = new OpenAIApi(configuration);
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-16k",
      messages: [
        {"role": "system", "content": `You are an AI tool that will create a production guide for ${crop} under the topic ${topic}.The user desired to know indepth about the crop and under the specific topic, please be fully descriptive. Please do not use emojies juts use text`}
       
      ],
    });

    const pdfDoc = await PDFDocument.create();
    const customFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    const lineHeight = fontSize + 5; // Adjust the line height as needed

    let page = pdfDoc.addPage(PageSizes.A4);
    page.setFont(customFont);
    page.setFontSize(fontSize);

    const lines = completion.data.choices[0].message.content.split('\n');
    const margin = 50;
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();
    const usableWidth = pageWidth - 2 * margin;
    const usableHeight = pageHeight - 2 * margin;

//add header here
const logoUrl = 'https://res.cloudinary.com/vambo/image/upload/v1678962963/image_x6jgwf.png';
const logoImageBytes = await axios.get(logoUrl, { responseType: 'arraybuffer' });
const logoImage = await pdfDoc.embedPng(logoImageBytes.data);
const logoDims = logoImage.scale(0.1);
const logoX = pageWidth - margin - logoDims.width - 50;
page.drawImage(logoImage, {
  x: logoX,
  y: pageHeight - margin - logoDims.height - 10,
  width: logoDims.width,
  height: logoDims.height,
});
//footer nyama takuisa panapa
const footerText = 'farmhutafrica.com';
page.drawText(footerText, {
  x: margin,
  y: margin -fontSize,
  size: fontSize,
});

    let currentY = pageHeight - margin;
    let currentLine = '';

    for (const line of lines) {
      const words = line.split(' ');

      for (const word of words) {
        const testLine = currentLine === '' ? word : `${currentLine} ${word}`;
        const testLineSize = customFont.widthOfTextAtSize(testLine, fontSize);

        if (testLineSize > usableWidth) {
          page.drawText(currentLine, {
            x: margin,
            y: currentY,
            size: fontSize,
          });
          currentLine = word;
          currentY -= lineHeight;
        } else {
          currentLine = testLine;
        }

        if (currentY < margin) {
          page = pdfDoc.addPage(PageSizes.A4);
          page.setFont(customFont);
          page.setFontSize(fontSize);
          currentY = pageHeight - margin;
        }
      }

      page.drawText(currentLine, {
        x: margin,
        y: currentY,
        size: fontSize,
      });
      currentLine = '';
      currentY -= lineHeight;

      if (currentY < margin) {
        page = pdfDoc.addPage(PageSizes.A4);
        page.setFont(customFont);
        page.setFontSize(fontSize);
        currentY = pageHeight - margin;
      }
    }

    const pdfBytes = await pdfDoc.save();

    const pdfPath = `public/pdfs/${requestId}.pdf`;

    fs.writeFileSync(pdfPath, pdfBytes);

    const updatedResponse = await GuideSchema.findOneAndUpdate(
      { requestId },
      { interpretation: JSON.stringify(completion.data.choices[0].message.content), pdfUrl: pdfPath },
      { new: true }
    );

    console.timeEnd('PDF Generation'); // End timer and print the elapsed time to the console
    const webhookUrl = 'https://flows.messagebird.com/flows/invocations/webhooks/0871de4c-69ad-4924-b136-d406bc8a87e4'; // Replace with your webhook URL
    
    await axios.post(`${webhookUrl}?identifier=productionguides`, data);

    console.log('Webhook has been sent'); // Log that the webhook has been sent

    return updatedResponse.pdfUrl;

  } catch (error) {
    console.error(error);
    throw new Error('Failed to interpret data using OpenAI');
  }
}

// Route to create the request for data from OpenAI
router.get('/', async (req, res) => {
  try {
    const crop = req.query.crop;
    const topic = req.query.topic;

    if (!crop || !topic) {
      return res.status(400).json({ error: 'crop and topic parameters are required' });
    }

    
    const requestId = uuidv4();

    // Create a new response document using the GuideSchema model
    const response = new GuideSchema({
      requestId,
      crop,
      topic,
    });

    // Save the response document to the database
    await response.save();

    // Process the PDF in the background
    interpretData(crop, topic, requestId).catch((error) => {
      console.error(error);
    });

    res.json({ requestId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route to retrieve the response using the request ID
router.get('/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;

    // Find the response document by the requestId using the GuideSchema model
    const response = await GuideSchema.findOne({ requestId });

    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    if (response.pdfUrl) {
      // Construct the full URL to the PDF file using the req object
      const pdfUrl = `${req.protocol}://${req.get('host')}/${response.pdfUrl}`;
      const thePdf =  `${req.protocol}://${req.get('host')}/pdfs/${requestId}.pdf`;
      res.json({ thePdf });
    } else {
      res.status(204).send();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
