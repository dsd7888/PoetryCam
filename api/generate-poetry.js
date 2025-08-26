// server.js
// This file sets up the backend server using Express.js.
// It handles image uploads in memory, constructs a dynamic prompt for the Gemini API,
// and returns the generated poetry to the frontend.

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

// Load environment variables from a .env file
dotenv.config();

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware Setup ---

// Enable Cross-Origin Resource Sharing (CORS) for all routes
app.use(cors());

// Serve static files (like index.html, style.css, script.js) from the 'public' directory
app.use(express.static('public'));

// Configure multer for handling file uploads.
// We use memoryStorage to temporarily hold the file in RAM instead of saving it to disk.
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // Set a 10MB file size limit
});

// --- Gemini API Initialization ---

// Check for the API key and initialize the GoogleGenerativeAI client
if (!process.env.GEMINI_API_KEY) {
    console.error("FATAL ERROR: GEMINI_API_KEY is not defined in the environment variables.");
    process.exit(1); // Exit the process if the key is missing
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Helper Function ---

/**
 * Converts a file buffer into a format suitable for the Gemini API.
 * @param {Buffer} buffer The image file buffer.
 * @param {string} mimeType The MIME type of the image (e.g., 'image/jpeg').
 * @returns {object} An object with inlineData for the Gemini API request.
 */
function bufferToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString('base64'),
            mimeType
        }
    };
}

// --- Core API Logic Handler ---

/**
 * Handles the poetry generation request.
 * This function contains the main logic and can be used by different route handlers.
 * @param {object} req The Express request object.
 * @param {object} res The Express response object.
 */
async function handlePoetryGeneration(req, res) {
    try {
        // Validate that a file was actually uploaded
        if (!req.file) {
            return res.status(400).json({ error: 'No image file provided.' });
        }

        // Extract creative controls data from the request body, including the new poemLength
        const { keyword, poetStyle, instructions, poemLength } = req.body;

        // Set a default length if the user doesn't provide one
        const lengthConstraint = poemLength || "10-16 lines";

        const imageBuffer = req.file.buffer;
        const mimeType = req.file.mimetype;

        // Select the Gemini model
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // --- Dynamic Prompt Engineering ---
        // The prompt is built dynamically based on user input for better results.
        let prompt = `
          You are a literary scholar and celebrated poet. Your task is to create an original, evocative poem inspired by the provided image.

          PRIMARY GOAL: Write a sophisticated and emotionally resonant poem of approximately ${lengthConstraint}. Use vivid, nuanced vocabulary, rich sensory language, and complex metaphors. 

          The poem's structure, line breaks, and stanza arrangements should be deliberate, realistic and meaningful(Just like how a real world poet writes).
        `;
        
        // Conditionally add user-provided constraints to the prompt
        if (keyword) {
            prompt += `\n\nCONSTRAINT 1: You MUST include the word "${keyword}" in the poem. Weave it in naturally and powerfully.`;
        }

        if (poetStyle) {
            prompt += `\n\nCONSTRAINT 2: For the style, tone, and structure, draw inspiration from the works of ${poetStyle}. DO NOT copy their work or words. Instead, capture their *essence*—their characteristic rhythm, thematic concerns, and unique use of language. The final poem must be an original creation.`;
        }
        
        if (instructions) {
            prompt += `\n\nCONSTRAINT 3: Adhere to these specific user instructions: "${instructions}".`;
        }

        prompt += `\n\nAfter writing the poem, suggest a fitting pen name for the fictional poet that reflects the poem's style. Format this on a new line after the poem, like this: "— [Poet Name]". The final output should be only the poem and the author line.`;
        
        const imagePart = bufferToGenerativePart(imageBuffer, mimeType);
        
        // Send the request to the Gemini API
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Send the successful response back to the frontend
        res.json({ poem: text });

    } catch (error) {
        console.error('Error in handlePoetryGeneration:', error);
        res.status(500).json({ error: 'Failed to generate poetry', details: error.message });
    }
}

// --- API Endpoint Definition ---

// This endpoint listens for POST requests.
// 'upload.single('image')' is the multer middleware that processes the uploaded file.
// The file must be sent with the field name 'image'.
app.post('/api/generate-poetry', upload.single('image'), handlePoetryGeneration);

// --- Server Initialization ---

// Start the Express server
app.listen(PORT, () => {
    console.log(`Poetry Camera server running on http://localhost:${PORT}`);
});

// Export the app for serverless environments like Vercel
module.exports = app;