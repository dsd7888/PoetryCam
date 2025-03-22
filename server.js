// Poetry Camera - Backend Server
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS
app.use(cors());

// Serve static files from public directory
app.use(express.static('public'));

// Configure multer to store files in memory instead of disk
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function to convert buffer to GenerativePart
function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType
    }
  };
}

// API endpoint for generating poetry from an image
app.post('/generate-poetry', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Get image data from memory (no file system operations)
    const imageBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;

    // Get the Gemini model with vision support
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Create prompt for image analysis
    const prompt = `
      Analyze this image and create a beautiful, unique poem inspired by what you see.
      The poem should be thoughtful, evocative, and feel like it was written by a skilled poet.
      Please structure it in clear stanzas with line breaks.
      The poem should reflect the mood, colors, subjects, and emotional tone of the image.
      Be creative with metaphors and imagery that connect to what's visible in the picture.
      The poem should be 8-12 lines long.
      Also suggest a poetic name for the author that reflects the style of the poem.
    `;

    // Prepare the image for the API - use buffer directly instead of file path
    const imagePart = bufferToGenerativePart(imageBuffer, mimeType);

    // Generate the poetry
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Return the generated poetry
    res.json({ poem: text });
  } catch (error) {
    console.error('Error generating poetry:', error);
    res.status(500).json({ error: 'Failed to generate poetry', details: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

// For Vercel serverless environment, we need to export the app
module.exports = app;

// Start the server only in non-Vercel environments
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Poetry Camera server running on http://localhost:${PORT}`);
  });
}