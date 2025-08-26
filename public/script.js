// script.js
// This script manages all frontend interactivity for the Poetry Camera application.

// --- DOM Element Selection ---
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

// Output display states
const initialState = document.getElementById('initialState');
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const errorMessage = document.getElementById('errorMessage');
const poemDisplay = document.getElementById('poemDisplay');
const poemText = document.querySelector('.poem-text');
const poemAuthor = document.querySelector('.poem-author');

// Creative Controls and Action Buttons
const creativeControls = document.getElementById('creativeControls');
const keywordInput = document.getElementById('keywordInput');
const poetStyleInput = document.getElementById('poetStyleInput');
const poemLengthSelect = document.getElementById('poemLengthSelect'); // New select element
const customPoemLengthInput = document.getElementById('customPoemLengthInput'); // New custom input
const instructionsInput = document.getElementById('instructionsInput');
const retryPoem = document.getElementById('retryPoem');
const copyPoem = document.getElementById('copyPoem');

// --- Global Variables ---
let imageCapture = null; // Stores the base64 data URL of the captured/uploaded image
let activeTab = 'camera'; // To track which tab is active
let cameraStream = null; // Holds the active camera stream object
let currentFacingMode = 'environment'; // 'environment' for back camera, 'user' for front

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        initCamera();
    } else {
        document.getElementById('upload-tab').click();
        document.getElementById('camera-tab').classList.add('d-none');
        showError('Camera access is not available on your device or browser. Please use the upload option.');
    }
    addCameraEffects();
    document.documentElement.style.scrollBehavior = 'smooth';
});

// --- Event Listeners ---

// Tab switching
document.getElementById('camera-tab').addEventListener('click', () => {
    activeTab = 'camera';
    initCamera();
});
document.getElementById('upload-tab').addEventListener('click', () => {
    activeTab = 'upload';
    stopCamera();
});

// Camera controls
switchCamera.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    stopCamera();
    initCamera();
    video.classList.add('switching');
    setTimeout(() => video.classList.remove('switching'), 500);
});

snap.addEventListener('click', () => {
    playShutterSound();
    video.classList.add('flash');
    setTimeout(() => video.classList.remove('flash'), 300);

    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // FIX: Handle mirroring for front camera
    if (currentFacingMode === 'user') {
        // For front camera, flip the captured image to match what user sees
        context.save();
        context.scale(-1, 1);
        context.translate(-canvas.width, 0);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.restore();
    } else {
        // For back camera, draw normally
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    video.classList.add('d-none');
    canvas.classList.remove('d-none');
    snap.classList.add('d-none');
    retake.classList.remove('d-none');
    switchCamera.classList.add('d-none');
    
    imageCapture = canvas.toDataURL('image/jpeg');
    showCreativeControls();
});

// Upload controls
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, e => {
        e.preventDefault();
        e.stopPropagation();
        if (['dragenter', 'dragover'].includes(eventName)) {
            dropArea.classList.add('active');
        } else {
            dropArea.classList.remove('active');
        }
    }, false);
});
dropArea.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));
dropArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
removeUpload.addEventListener('click', () => {
    imageCapture = null;
    fileInput.value = '';
    uploadPreview.classList.add('d-none');
    dropArea.classList.remove('d-none');
    hideCreativeControls();
});

// --- Poem Length Custom Input Logic ---
poemLengthSelect.addEventListener('change', () => {
    if (poemLengthSelect.value === 'custom') {
        customPoemLengthInput.classList.remove('d-none');
        customPoemLengthInput.focus();
    } else {
        customPoemLengthInput.classList.add('d-none');
    }
});

// Main action buttons
generatePoem.addEventListener('click', () => triggerPoemGeneration());
retryPoem.addEventListener('click', () => triggerPoemGeneration());
copyPoem.addEventListener('click', () => {
    const fullText = `${poemText.innerText}\n${poemAuthor.innerText}`;
    navigator.clipboard.writeText(fullText).then(() => {
        const originalText = copyPoem.innerHTML;
        copyPoem.innerHTML = `<i class="fas fa-check"></i> Copied!`;
        setTimeout(() => {
            copyPoem.innerHTML = originalText;
        }, 2000);
    }).catch(err => console.error('Failed to copy text: ', err));
});

window.addEventListener('beforeunload', stopCamera);

// --- Core Functions ---

async function initCamera() {
    try {
        if (cameraStream) stopCamera();
        const constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: currentFacingMode } };
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) constraints.video.facingMode = { exact: currentFacingMode };
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = cameraStream;

        // --- MIRROR FIX ---
        // Add or remove the 'mirrored' class based on the camera's facing mode
        if (currentFacingMode === 'user') {
            video.classList.add('mirrored');
        } else {
            video.classList.remove('mirrored');
        }

        video.classList.remove('d-none');
        canvas.classList.add('d-none');
        snap.classList.remove('d-none');
        retake.classList.add('d-none');
        switchCamera.classList.remove('d-none');
    } catch (error) {
        console.error('Error accessing camera:', error);
        showError('Could not access the camera. Please ensure permissions are granted.');
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

function handleFile(file) {
    if (!file || !file.type.match('image.*')) {
        showError('Please select a valid image file.');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showError('Please select an image smaller than 10MB.');
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        imageCapture = e.target.result;
        uploadPreview.classList.remove('d-none');
        dropArea.classList.add('d-none');
        showCreativeControls();
    };
    reader.readAsDataURL(file);
}

async function triggerPoemGeneration() {
    if (!imageCapture) {
        showError('Please capture or upload an image first.');
        return;
    }

    generatePoem.disabled = true;
    generatePoem.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Creating...`;
    setOutputState('loading');

    try {
        const imageBlob = await dataURLToBlob(imageCapture);
        const formData = new FormData();
        
        let poemLengthValue = poemLengthSelect.value;
        if (poemLengthValue === 'custom') {
            poemLengthValue = customPoemLengthInput.value.trim();
        }

        formData.append('image', imageBlob, 'capture.jpg');
        formData.append('keyword', keywordInput.value.trim());
        formData.append('poetStyle', poetStyleInput.value.trim());
        formData.append('poemLength', poemLengthValue);
        formData.append('instructions', instructionsInput.value.trim());

        const response = await fetch('/api/generate-poetry', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || `Server error: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.poem) {
            const processedPoemData = processPoem(data.poem);
            typeWriterEffect(processedPoemData.poem, processedPoemData.author);
        } else {
            throw new Error('Invalid response from the server.');
        }

    } catch (error) {
        console.error('Error generating poetry:', error);
        showError(error.message);
    } finally {
        generatePoem.disabled = false;
        generatePoem.innerHTML = `<i class="fas fa-star"></i> Create Poetry For K`;
    }
}

function typeWriterEffect(poem, author) {
    setOutputState('display');
    poemText.textContent = '';
    poemAuthor.textContent = '';
    
    const typingSpeed = Math.max(20, Math.min(60, 4000 / poem.length));
    let charIndex = 0;
    
    function typePoemText() {
        if (charIndex < poem.length) {
            poemText.textContent += poem.charAt(charIndex);
            charIndex++;
            setTimeout(typePoemText, typingSpeed);
        } else {
            setTimeout(() => {
                if (author) typeAuthorText(author);
                else {
                    generatePoem.disabled = false;
                    generatePoem.innerHTML = `<i class="fas fa-star"></i> Create Poetry For K`;
                }
            }, 300);
        }
    }
    
    function typeAuthorText(author) {
        let authorIndex = 0;
        function typeAuthor() {
            if (authorIndex < author.length) {
                poemAuthor.textContent += author.charAt(authorIndex);
                authorIndex++;
                setTimeout(typeAuthor, typingSpeed * 1.5);
            } else {
                generatePoem.disabled = false;
                generatePoem.innerHTML = `<i class="fas fa-star"></i> Create Poetry For K`;
            }
        }
        typeAuthor();
    }
    
    typePoemText();
}

function processPoem(fullPoemText) {
    const authorRegex = /[-—~]\s*(by)?\s*([A-Za-z\s\.]+)$/;
    const match = fullPoemText.match(authorRegex);
    let poem = fullPoemText;
    let author = "A Poet's Echo";
    if (match) {
        poem = fullPoemText.replace(match[0], '').trim();
        author = `— ${match[2] ? match[2].trim() : match[0].replace(/[-—~]/g, '').trim()}`;
    }
    return { poem, author };
}

// --- UI State Management & Utilities ---

function showCreativeControls() {
    // Remove d-none class and add visible class
    generatePoem.classList.remove('d-none');
    creativeControls.classList.remove('d-none');
    creativeControls.classList.add('visible');
    
    // Force visibility with inline styles as backup
    creativeControls.style.display = 'block';
    creativeControls.style.visibility = 'visible';
    creativeControls.style.opacity = '1';
    
    // Scroll to creative controls for better UX
    setTimeout(() => {
        creativeControls.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }, 300);
    
    // Focus on first input for better accessibility
    setTimeout(() => {
        const firstInput = creativeControls.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }, 500);
}

// UPDATED hideCreativeControls function
function hideCreativeControls() {
    generatePoem.classList.add('d-none');
    creativeControls.classList.add('d-none');
    creativeControls.classList.remove('visible');
    
    // Clear inline styles
    creativeControls.style.display = '';
    creativeControls.style.visibility = '';
    creativeControls.style.opacity = '';
}

function setOutputState(state) {
    [initialState, loadingState, errorState, poemDisplay].forEach(el => el.classList.add('d-none'));
    const elementToShow = {
        'initial': initialState, 'loading': loadingState, 'error': errorState, 'display': poemDisplay,
    }[state];
    if (elementToShow) elementToShow.classList.remove('d-none');
}

function showError(message) {
    errorMessage.textContent = message;
    setOutputState('error');
}

async function dataURLToBlob(dataURL) {
    const res = await fetch(dataURL);
    return await res.blob();
}

function playShutterSound() {
    try {
        const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAASAAAeMwAUFBQUFCIiIiIiIjAwMDAwPj4+Pj4+TExMTExZWVlZWVlnZ2dnZ2d1dXV1dXWIiIiIiIiWlpaWlpaioqKioqKwsLCwsLC+vr6+vr7Ly8vLy8vY2NjY2Njm5ubm5ubz8/Pz8/P///////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAQKAAAAAAAAHjOZTf9/AAAAAAAAAAAAAAAAAAAAAP/7kGQAAANUMEoFPeACNQV40KEYABEY41g5vAAA9RjpZxRwAImU+W8eshaFpAQgALAAYALATx/nYDYCMJ0HITQYYA7AH4c7MoGsnCMU5pnW+OQnBcDrQ9Xx7w37/D+PimYavV8elKUpT5fqx5VjV6vZ38eJR48eRKa9KUp7v396UgPHkQwMAAAAAA//8MAOp39CECAAhlIEEIIECBAgTT1oj///tEQYT0wgEIYxgDC09aIiE7u7u7uIiIz+LtoIQGE/+XAGYLjpTAIOGYYy0ZACgDgSNFxC7YYiINocwERjAEDhIy0mRoGwAE7lOTBsGhj1qrXNCU9GrgwSPr80jj0dIpT9DRUNHKJbRxiWSiifVHuD2b0EbjLkOUzSXztP3uE1JpHzV6NPq+f3P5T0/f/lNH7lWTavQ5Xz1yLVe653///qf93B7f/vMdaKJAAJAMAIwIMAHMpzDkoYwD8CR717zVb8/p54P3MikXGCEWhQOEAOAdP6v8b8oNL/EzdnROC8Zo+z+71O8VVAGIKFEglKbidkoLam0mAFiwo0ZoVExf/7kmQLgAEZknHcEAAA9JCNwAIgABWCVVQQQwAi2AqiUgqAAAdDFBYXLaTgzRmjVG0utCCmmtBsXMxnJmktE5P2lz3rrCz2a2Q/Z/tdYX/8/p5/l/227rz9l/5/S/8Jipr/KGS5r/xAkEiKnH///EJ3rp/3CDMc36K6MjEQsXv999wAD5ZF2EhABeF82MFAyv/g6vBJ1enP6ijo8Z1f4QCKN9POmnZ65fB7PJpNSGv/g8YHz7x8ya2ePTM0etyMZ/9FJir0vEndHd5ZzT97z2rz72pcCQc/e1njz7PRFDLfrZ51FY6OzrY90M3em9Lnq4d12XpGlKdLay5kMZD3ax12Wa5dbTb7Thrh17Yc_YYSids8vOC6mFSk+2y/huLS7jhhZmab7HmRs8j33OrwdTib3//JRnaz74zr/9FrsNSEAAFt0CAeFOkdnpzwKoIAlV/pzVqqn1A0jQ5Xn6hhjydR6nQYJH5YumfXQ4GkKdx6nU+746dHsdubX5nCrHsxXN4lDLnYWvQzHVfGNXK1KibmcLX5kMVpqRVjTUtx6hKk1pqenTv0lS76PJ//9X+Z3Vyz11E//+45W3MML//// SANIAAADQAsgoG5AACD/+5JkC4ABSJQy/whAAB7Shn/BDAAEwlFMAGQAIJ2KKVGMgAT8DJB4USgFgIFUfOvn4QDgADqQDrVmWDTNMzDBhZqDAoVWWIyGF0OBwqBhNLDhc+Z/t3aFnJUZLJSaE/CvM0tI1lXKPQtLQuImE0X63DLnKHRdMsDgcTigMJA4mFQsMe8qukigNLW8XP8OSuQY8lw9/+6Keqti93JhOCApwBEHAAmBQQAD4MwbAVAS7XwuIKFBtuThuW6WgAFn4v5yL5cMIgV8vlMvl8x4NeKnMfe8GBwMBgTB4UweDzJ0x4MGmTDg1ycNmTCriJk1c+9GlTVmTGW2lzpj023tdal1tJqS2lBYGD6ewaDQmFjGlTrqZTrpiep1WT2lDYaD9L31JbTpzbdYm1rUfpdsMB9K317aWlttKDQMHy73u13trQdrCdMHK7Md7u0ICl9LvaxHpYWF4oFl///EiBPAAAIAAIBQbBFJxcAAMAHSaBgRBqG4RCCLE6iCpyBVrKuJpnAFGcTwNz6BUzgVDcXxVJAFgwEhQIAVG0RiseR1I4FRJGkVifes5xTGkVxnOJ2JY3iSQBINwlkcZxfHETx1I4FRVFsMjmR4qjKSY8i6PYljeJo6jSOZJkqT5Tk2WJIlCTpUlaVZTlmXpel6B0qiAWA0mASh8MBIPAIDAPjmFAYCIOAeGgJnULhkCAsCwJggHgLmOJAJL///7kmQMgAI6UdlJ4lwAmGo6Jj0jwAY1Udi5/WAAyK7FSuvYAJqiggfFxHXhq9EQQNIkAiJgghYNYEAQFXhFBQiBQEyJAoiZEgTREiYNImRMqEVKhLkVMqJFSolVKibuqoIqoVUxBTUUzLjk4LjOqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq');
    } catch (error) {
        console.error('Error playing shutter sound:', error);
    }
}

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
