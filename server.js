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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

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

// Helper function to convert image to base64
function fileToGenerativePart(filePath, mimeType) {
  const fileBuffer = fs.readFileSync(filePath);
  return {
    inlineData: {
      data: fileBuffer.toString('base64'),
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

    const imagePath = req.file.path;
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

    // Prepare the image for the API
    const imagePart = fileToGenerativePart(imagePath, mimeType);

    // Generate the poetry
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Clean up uploaded file after processing
    fs.unlinkSync(imagePath);

    // Return the generated poetry
    res.json({ poem: text });
  } catch (error) {
    console.error('Error generating poetry:', error);
    
    // Clean up the uploaded file if it exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
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

// Start the server
app.listen(PORT, () => {
  console.log(`Poetry Camera server running on http://localhost:${PORT}`);
}); 