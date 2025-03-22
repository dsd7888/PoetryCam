// Poetry Camera - Frontend JavaScript

// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const snap = document.getElementById('snap');
const retake = document.getElementById('retake');
const generatePoem = document.getElementById('generatePoem');
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const uploadPreview = document.getElementById('uploadPreview');
const previewImage = document.getElementById('previewImage');
const removeUpload = document.getElementById('removeUpload');
const initialState = document.getElementById('initialState');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const poemDisplay = document.getElementById('poemDisplay');
const poemText = document.querySelector('.poem-text');
const poemAuthor = document.querySelector('.poem-author');

// Global variables
let imageCapture = null; // For captured/uploaded image
let activeTab = 'camera'; // To track which tab is active
let cameraStream = null;

// Initialize camera when page loads
document.addEventListener('DOMContentLoaded', initCamera);

// Tab switching event handlers
document.getElementById('camera-tab').addEventListener('click', () => {
    activeTab = 'camera';
    initCamera();
});

document.getElementById('upload-tab').addEventListener('click', () => {
    activeTab = 'upload';
    stopCamera();
});

// Initialize camera
async function initCamera() {
    try {
        // Reset canvas and buttons
        canvas.classList.add('d-none');
        snap.classList.remove('d-none');
        retake.classList.add('d-none');
        
        // Request camera access
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'environment' // Use the rear camera if available
            }
        };
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = cameraStream;
        video.classList.remove('d-none');
        
        // Show the generate button only if a capture is taken
        generatePoem.classList.add('d-none');
    } catch (error) {
        console.error('Error accessing camera:', error);
        showError('Could not access the camera. Please ensure you have granted camera permissions or try using the upload option.');
    }
}

// Stop camera
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// Capture photo from camera
snap.addEventListener('click', () => {
    // Get canvas context
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Hide video, show canvas and retake button
    video.classList.add('d-none');
    canvas.classList.remove('d-none');
    snap.classList.add('d-none');
    retake.classList.remove('d-none');
    
    // Show generate button
    generatePoem.classList.remove('d-none');
    
    // Create an in-memory copy of the image
    imageCapture = canvas.toDataURL('image/jpeg');
});

// Retake photo
retake.addEventListener('click', () => {
    // Hide canvas, show video
    canvas.classList.add('d-none');
    video.classList.remove('d-none');
    
    // Show snap button, hide retake
    snap.classList.remove('d-none');
    retake.classList.add('d-none');
    
    // Hide generate button
    generatePoem.classList.add('d-none');
    
    // Clear the captured image
    imageCapture = null;
});

// Handle drag and drop file uploads
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight drop area when dragging over it
['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
        dropArea.classList.add('active');
    }, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => {
        dropArea.classList.remove('active');
    }, false);
});

// Handle dropped files
dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        handleFile(files[0]);
    }
}, false);

// Handle click to browse files
dropArea.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Handle file input
function handleFile(file) {
    if (!file.type.match('image.*')) {
        showError('Please select an image file (JPEG, PNG, etc.)');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
        // Set the preview image source
        previewImage.src = e.target.result;
        
        // Store the image data
        imageCapture = e.target.result;
        
        // Show preview, hide drop area
        uploadPreview.classList.remove('d-none');
        dropArea.classList.add('d-none');
        
        // Show generate button
        generatePoem.classList.remove('d-none');
    };
    
    reader.onerror = () => {
        showError('Error reading the file. Please try another image.');
    };
    
    reader.readAsDataURL(file);
}

// Remove upload
removeUpload.addEventListener('click', () => {
    // Clear file input
    fileInput.value = '';
    
    // Hide preview, show drop area
    uploadPreview.classList.add('d-none');
    dropArea.classList.remove('d-none');
    
    // Hide generate button
    generatePoem.classList.add('d-none');
    
    // Clear the image data
    imageCapture = null;
});

// Generate poetry
generatePoem.addEventListener('click', async () => {
    if (!imageCapture) {
        showError('Please capture an image or upload a file first.');
        return;
    }
    
    // Show loading state
    setOutputState('loading');
    
    try {
        // Convert data URL to Blob
        const blob = await dataURLToBlob(imageCapture);
        
        // Create form data for the API request
        const formData = new FormData();
        formData.append('image', blob, 'poetry_image.jpg');
        
        // Make API request to the proper endpoint
        const apiEndpoint = '/generate-poetry';
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.poem) {
            // Process the poem text to separate the poem from author attribution
            const processedPoemData = processPoem(data.poem);
            
            // Display the poem
            poemText.textContent = processedPoemData.poem;
            poemAuthor.textContent = processedPoemData.author ? processedPoemData.author : '';
            
            // Show poem display state
            setOutputState('display');
        } else {
            throw new Error('Invalid response from the server');
        }
    } catch (error) {
        console.error('Error generating poetry:', error);
        showError(`Failed to generate poetry: ${error.message}`);
    }
});

// Helper function to process the poem text
function processPoem(poemText) {
    // Look for author attribution at the end, usually preceded by a dash or similar
    const authorRegex = /[-—~]\s*(by)?\s*([A-Za-z\s\.]+)$/;
    const authorMatch = poemText.match(authorRegex);
    
    let poem = poemText;
    let author = '';
    
    if (authorMatch) {
        // Remove the author attribution from the poem text
        poem = poemText.replace(authorMatch[0], '').trim();
        // Get the author name
        author = authorMatch[2] ? authorMatch[2].trim() : (authorMatch[0].replace(/[-—~]/g, '').trim());
    }
    
    return { poem, author };
}

// Convert Data URL to Blob
async function dataURLToBlob(dataURL) {
    const res = await fetch(dataURL);
    return await res.blob();
}

// Set the output state
function setOutputState(state) {
    // Hide all states
    initialState.classList.add('d-none');
    loadingState.classList.add('d-none');
    errorState.classList.add('d-none');
    poemDisplay.classList.add('d-none');
    
    // Show the requested state
    switch (state) {
        case 'initial':
            initialState.classList.remove('d-none');
            break;
        case 'loading':
            loadingState.classList.remove('d-none');
            break;
        case 'error':
            errorState.classList.remove('d-none');
            break;
        case 'display':
            poemDisplay.classList.remove('d-none');
            break;
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    setOutputState('error');
}

// Clean up camera when leaving the page
window.addEventListener('beforeunload', stopCamera); 