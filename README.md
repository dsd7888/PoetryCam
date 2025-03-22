# Poetry Camera

A web application that captures or uploads images and uses Google's Gemini AI to generate beautiful, unique poetry inspired by those images.

## Features

- Take photos directly using your device's camera
- Upload existing images from your device
- Generate AI poetry based on the visual content of images
- Responsive design that works on mobile and desktop

## Technologies Used

- **Frontend:** HTML5, CSS3, JavaScript, Bootstrap 5
- **Backend:** Node.js, Express.js
- **API Integration:** Google Gemini API (Pro Vision model)
- **Image Handling:** MediaDevices API (for camera access), Multer (for file uploads)

## Setup & Installation

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/poetry-camera.git
   cd poetry-camera
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Set up environment variables**
   - Create a `.env` file in the root directory
   - Add your Google Gemini API key:
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     ```
   - Optional: Specify a different port (default is 3000):
     ```
     PORT=5000
     ```

4. **Start the application**
   ```
   npm start
   ```

5. **Access the application**
   - Open your browser and go to: `http://localhost:3000` (or the port you specified)

## How to Use

1. **Camera Mode**
   - Grant camera permissions when prompted
   - Click the "Capture" button to take a photo
   - Use the "Retake" button if you're not satisfied with the captured image
   - Click "Generate Poetry" to create a poem based on your image

2. **Upload Mode**
   - Click the upload area or drag and drop an image file
   - Select an image file from your device
   - Click "Generate Poetry" to create a poem based on your image

3. **View Poetry**
   - The generated poem will appear in the poetry display section
   - The AI will also suggest a fictional poet name that matches the style of the poem

## Project Structure

```
poetry-camera/
├── .env                 # Environment variables (GEMINI_API_KEY)
├── .gitignore          # Git ignore file
├── package.json        # Node.js package file
├── server.js           # Main server file with Express and Gemini API integration
└── public/             # Frontend files
    ├── index.html      # Main HTML file with responsive UI
    ├── style.css       # CSS styles
    └── script.js       # Frontend JavaScript functionality
```

## Requirements

- Node.js (v14 or higher)
- Google Gemini API key
- Modern web browser with camera access capabilities (for camera functionality)

## License

ISC

## Credits

- Uses Google's Gemini Pro Vision model for AI image analysis and poetry generation
- Built with Bootstrap 5 for responsive design # PoetryCam
