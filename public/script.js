// Poetry Camera - Frontend JavaScript

// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const snap = document.getElementById('snap');
const retake = document.getElementById('retake');
const switchCamera = document.getElementById('switchCamera');
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
let currentFacingMode = 'environment'; // Default to back camera ('environment' or 'user')

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if camera is available
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        initCamera();
    } else {
        // If camera is not available, switch to upload tab
        document.getElementById('upload-tab').click();
        // Hide camera tab as it's not supported
        document.getElementById('camera-tab').classList.add('d-none');
        showError('Camera access is not available on your device or browser. Please use the upload option.');
    }
    
    // Apply smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
});

// Tab switching event handlers
document.getElementById('camera-tab').addEventListener('click', () => {
    activeTab = 'camera';
    initCamera();
});

document.getElementById('upload-tab').addEventListener('click', () => {
    activeTab = 'upload';
    stopCamera();
});

// Switch camera between front and back
switchCamera.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    stopCamera();
    initCamera();
    
    // Add animation effect when switching
    video.classList.add('switching');
    setTimeout(() => {
        video.classList.remove('switching');
    }, 500);
});

// Initialize camera
async function initCamera() {
    try {
        // Reset canvas and buttons
        canvas.classList.add('d-none');
        snap.classList.remove('d-none');
        retake.classList.add('d-none');
        switchCamera.classList.remove('d-none');
        
        // Request camera access
        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: currentFacingMode
            }
        };
        
        // Check for iOS devices to handle their quirks
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            constraints.video.facingMode = { exact: currentFacingMode };
        }
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = cameraStream;
        video.classList.remove('d-none');
        
        // Wait for video to be ready
        video.onloadedmetadata = () => {
            video.play();
        };
        
        // Show the generate button only if a capture is taken
        generatePoem.classList.add('d-none');
    } catch (error) {
        console.error('Error accessing camera:', error);
        
        // If facing mode exact constraint fails, try without 'exact'
        if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            try {
                const constraints = {
                    video: {
                        facingMode: currentFacingMode === 'environment' ? 'user' : 'environment'
                    }
                };
                currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
                cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
                video.srcObject = cameraStream;
                video.classList.remove('d-none');
                return;
            } catch (fallbackError) {
                console.error('Fallback camera access failed:', fallbackError);
            }
        }
        
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
    // Play shutter sound
    playShutterSound();
    
    // Add capture effect
    video.classList.add('flash');
    setTimeout(() => video.classList.remove('flash'), 300);
    
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
    switchCamera.classList.add('d-none');
    
    // Show generate button
    generatePoem.classList.remove('d-none');
    
    // Create an in-memory copy of the image
    imageCapture = canvas.toDataURL('image/jpeg');
});

// Play a camera shutter sound
function playShutterSound() {
    try {
        const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAASAAAeMwAUFBQUFCIiIiIiIjAwMDAwPj4+Pj4+TExMTExZWVlZWVlnZ2dnZ2d1dXV1dXWIiIiIiIiWlpaWlpaioqKioqKwsLCwsLC+vr6+vr7Ly8vLy8vY2NjY2Njm5ubm5ubz8/Pz8/P///////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAQKAAAAAAAAHjOZTf9/AAAAAAAAAAAAAAAAAAAAAP/7kGQAAANUMEoFPeACNQV40KEYABEY41g5vAAA9RjpZxRwAImU+W8eshaFpAQgALAAYALATx/nYDYCMJ0HITQYYA7AH4c7MoGsnCMU5pnW+OQnBcDrQ9Xx7w37/D+PimYavV8elKUpT5fqx5VjV6vZ38eJR48eRKa9KUp7v396UgPHkQwMAAAAAA//8MAOp39CECAAhlIEEIIECBAgTT1oj///tEQYT0wgEIYxgDC09aIiE7u7u7uIiIz+LtoIQGE/+XAGYLjpTAIOGYYy0ZACgDgSNFxC7YYiINocwERjAEDhIy0mRoGwAE7lOTBsGhj1qrXNCU9GrgwSPr80jj0dIpT9DRUNHKJbRxiWSiifVHuD2b0EbjLkOUzSXztP3uE1JpHzV6NPq+f3P5T0/f/lNH7lWTavQ5Xz1yLVe653///qf93B7f/vMdaKJAAJAMAIwIMAHMpzDkoYwD8CR717zVb8/p54P3MikXGCEWhQOEAOAdP6v8b8oNL/EzdnROC8Zo+z+71O8VVAGIKFEglKbidkoLam0mAFiwo0ZoVExf/7kmQLgAEZknHcEAAA9JCNwAIgABWCVVQQQwAi2AqiUgqAAAdDFBYXLaTgzRmjVG0utCCmmtBsXMxnJmktE5P2lz3rrCz2a2Q/Z/tdYX/8/p5/l/227rz9l/5/S/8Jipr/KGS5r/xAkEiKnH///EJ3rp/3CDMc36K6MjEQsXv999wAD5ZF2EhABeF82MFAyv/g6vBJ1enP6ijo8Z1f4QCKN9POmnZ65fB7PJpNSGv/g8YHz7x8ya2ePTM0etyMZ/9FJir0vEndHd5ZzT97z2rz72pcCQc/e1njz7PRFDLfrZ51FY6OzrY90M3em9Lnq4d12XpGlKdLay5kMZD3ax12Wa5dbTb7Thrh17Yc4YSids8vOC6mFSk+2y/huLS7jhhZmab7HmRs8j33OrwdTib3//JRnaz74zr/9FrsNSEAAFt0CAeFOkdnpzwKoIAlV/pzVqqn1A0jQ5Xn6hhjydR6nQYJH5YumfXQ4GkKdx6nU+746dHsdubX5nCrHsxXN4lDLnYWvQzHVfGNXK1KibmcLX5kMVpqRVjTUtx6hKk1pqenTv0lS76PJ//9X+Z3Vyz11E//+45W3MML//// SANIAAADQAsgoG5AACD/+5JkC4ABSJQy/whAAB7Shn/BDAAEwlFMAGQAIJ2KKVGMgAT8DJB4USgFgIFUfOvn4QDgADqQDrVmWDTNMzDBhZqDAoVWWIyGF0OBwqBhNLDhc+Z/t3aFnJUZLJSaE/CvM0tI1lXKPQtLQuImE0X63DLnKHRdMsDgcTigMJA4mFQsMe8qukigNLW8XP8OSuQY8lw9/+6Keqti93JhOCApwBEHAAmBQQAD4MwbAVAS7XwuIKFBtuThuW6WgAFn4v5yL5cMIgV8vlMvl8x4NeKnMfe8GBwMBgTB4UweDzJ0x4MGmTDg1ycNmTCriJk1c+9GlTVmTGW2lzpj023tdal1tJqS2lBYGD6ewaDQmFjGlTrqZTrpiep1WT2lDYaD9L31JbTpzbdYm1rUfpdsMB9K317aWlttKDQMHy73u13trQdrCdMHK7Md7u0ICl9LvaxHpYWF4oFl///EiBPAAAIAAIBQbBFJxcAAMAHSaBgRBqG4RCCLE6iCpyBVrKuJpnAFGcTwNz6BUzgVDcXxVJAFgwEhQIAVG0RiseR1I4FRJGkVifes5xTGkVxnOJ2JY3iSQBINwlkcZxfHETx1I4FRVFsMjmR4qjKSY8i6PYljeJo6jSOZJkqT5Tk2WJIlCTpUlaVZTlmXpel6B0qiAWA0mASh8MBIPAIDAPjmFAYCIOAeGgJnULhkCAsCwJggHgLmOJAJL///7kmQMgAI6UdlJ4lwAmGo6Jj0jwAY1Udi5/WAAyK7FSuvYAJqiggfFxHXhq9EQQNIkAiJgghYNYEAQFXhFBQiBQEyJAoiZEgTREiYNImRMqEVKhLkVMqJFSolVKibuqoIqoVUxBTUUzLjk4LjOqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
        audio.play();
    } catch (error) {
        console.error('Error playing shutter sound:', error);
    }
}

// Retake photo
retake.addEventListener('click', () => {
    // Hide canvas, show video and capture button
    canvas.classList.add('d-none');
    video.classList.remove('d-none');
    snap.classList.remove('d-none');
    retake.classList.add('d-none');
    switchCamera.classList.remove('d-none');
    
    // Hide generate button
    generatePoem.classList.add('d-none');
    
    // Clear the image data
    imageCapture = null;
});

// Prevent defaults for drag and drop events
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Add event listeners for drag and drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

// Handle highlight class when dragging over the drop area
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

// Handle file drop
dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files && files.length > 0) {
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
    // Validate file type
    if (!file.type.match('image.*')) {
        showError('Please select an image file (JPEG, PNG, etc.)');
        return;
    }
    
    // Validate file size
    if (file.size > 5 * 1024 * 1024) { // 5MB
        showError('Please select an image smaller than 5MB');
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
    
    // Disable generate button during processing
    generatePoem.disabled = true;
    generatePoem.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Creating poetry for K...';
    
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
            
            // Display the poem with a typewriter effect
            typeWriterEffect(processedPoemData.poem, processedPoemData.author);
        } else {
            throw new Error('Invalid response from the server');
        }
    } catch (error) {
        console.error('Error generating poetry:', error);
        showError(`Failed to generate poetry: ${error.message}`);
        
        // Re-enable generate button
        generatePoem.disabled = false;
        generatePoem.innerHTML = '<i class="fas fa-star"></i> Create Poetry For K';
    }
});

// Type writer effect for displaying the poem
function typeWriterEffect(poem, author) {
    // Show poem display with empty content first
    setOutputState('display');
    poemText.textContent = '';
    poemAuthor.textContent = '';
    
    // Calculate typing speed based on poem length
    const typingSpeed = Math.max(30, Math.min(80, 5000 / poem.length));
    
    let charIndex = 0;
    
    // Type the poem text
    function typePoemText() {
        if (charIndex < poem.length) {
            poemText.textContent += poem.charAt(charIndex);
            charIndex++;
            setTimeout(typePoemText, typingSpeed);
        } else {
            // When poem is done, type the author
            setTimeout(() => {
                if (author) {
                    typeAuthorText(author);
                } else {
                    // Re-enable generate button
                    generatePoem.disabled = false;
                    generatePoem.innerHTML = '<i class="fas fa-star"></i> Create Poetry For K';
                }
            }, 300);
        }
    }
    
    // Type the author text
    function typeAuthorText(author) {
        let authorIndex = 0;
        
        function typeAuthor() {
            if (authorIndex < author.length) {
                poemAuthor.textContent += author.charAt(authorIndex);
                authorIndex++;
                setTimeout(typeAuthor, typingSpeed * 1.5);
            } else {
                // Add a special attribution if K is not already mentioned
                if (!author.includes("K")) {
                    poemAuthor.textContent += " (for K)";
                }
                
                // Re-enable generate button when done
                generatePoem.disabled = false;
                generatePoem.innerHTML = '<i class="fas fa-star"></i> Create Poetry For K';
            }
        }
        
        typeAuthor();
    }
    
    // Start typing effect
    typePoemText();
}

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

// Add CSS styling for camera effects
function addCameraEffects() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes flash {
            0% { opacity: 1; }
            50% { opacity: 0.2; }
            100% { opacity: 1; }
        }
        
        @keyframes switching {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(1); opacity: 1; }
        }
        
        .flash {
            animation: flash 0.3s ease;
        }
        
        .switching {
            animation: switching 0.5s ease;
        }
    `;
    document.head.appendChild(style);
}

// Call function to add camera effects
addCameraEffects();

// Clean up camera when leaving the page
window.addEventListener('beforeunload', stopCamera); 