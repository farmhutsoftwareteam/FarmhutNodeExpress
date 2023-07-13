const express = require('express');
const GuideSchema = require('../models/productionguides');
const axios = require('axios');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Configuration, OpenAIApi } = require("openai");
const { PDFDocument, StandardFonts, PageSizes } = require('pdf-lib');

const configuration = new Configuration({
  apiKey: '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',
});

const router = express.Router();

// Function to send weather data to OpenAI for interpretation
async function interpretData(crop, requestId) {
  const prompt = ` ${(crop)}`;

  try {
    const openai = new OpenAIApi(configuration);
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-16k",
      messages: [
        {"role": "system", "content": "You are an AI tool that creates production guides based on the crop a user suggests, you will give the user a fully detailed guide on how to grow the crop the least text is 3000 words please avoid using emojoies and slang."},
        {role: "user", content: prompt}
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

    const pdfPath = `/pdfs/${requestId}.pdf`;

    fs.writeFileSync(pdfPath, pdfBytes);

    const updatedResponse = await GuideSchema.findOneAndUpdate(
      { requestId },
      { interpretation: JSON.stringify(completion.data.choices[0].message.content), pdfUrl: pdfPath },
      { new: true }
    );

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

    if (!crop) {
      return res.status(400).json({ error: 'crop parameter is missing' });
    }

    const requestId = uuidv4();

    // Create a new response document using the GuideSchema model
    const response = new GuideSchema({
      requestId,
      crop,
    });

    // Save the response document to the database
    await response.save();

    const pdfUrl = await interpretData(crop, requestId).catch((error) => {
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
      res.json({ pdfUrl });
    } else {
      res.status(204).send();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
