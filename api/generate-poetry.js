// Import required modules
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
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

// Process the multer upload
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

// API Handler for Vercel
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('Processing incoming request to generate-poetry endpoint');
    
    // Run the multer middleware
    await runMiddleware(req, res, upload.single('image'));
    
    if (!req.file) {
      console.log('No image file found in request');
      return res.status(400).json({ error: 'No image provided' });
    }
    
    console.log('Image received successfully, size:', req.file.size, 'bytes');
    
    // Get image data from memory
    const imageBuffer = req.file.buffer;
    const mimeType = req.file.mimetype;
    
    // Get the Gemini model with vision support
    console.log('Initializing Gemini model...');
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
    const imagePart = bufferToGenerativePart(imageBuffer, mimeType);
    
    // Generate the poetry
    console.log('Requesting poem from Gemini API...');
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    console.log('Poem generated successfully');
    
    // Return the generated poetry
    return res.status(200).json({ poem: text });
  } catch (error) {
    console.error('Error generating poetry:', error);
    return res.status(500).json({ 
      error: 'Failed to generate poetry', 
      details: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
}; 