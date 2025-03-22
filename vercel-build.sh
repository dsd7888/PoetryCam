#!/bin/bash

# Display current directory
echo "Current directory: $(pwd)"

# Create output directories
mkdir -p .vercel/output/static
mkdir -p .vercel/output/functions/api

# Copy static files
echo "Copying static files to .vercel/output/static"
cp -r public/* .vercel/output/static/

# Update package.json to include dependencies for API functions
echo "Setting up API functions"
cp -r api .vercel/output/functions/
cp package.json .vercel/output/functions/api/

# Create config.json
echo "Creating Vercel configuration"
cat > .vercel/output/config.json << EOL
{
  "version": 3,
  "routes": [
    { "src": "/generate-poetry", "dest": "/api/generate-poetry" },
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/$1" }
  ]
}
EOL

echo "Build completed successfully!" 