#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

try {
  // Read build info
  const buildInfoPath = path.join(__dirname, '../.build-info.json');
  const buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, 'utf8'));
  
  // Read the compiled JavaScript
  const jsPath = path.join(__dirname, '../dist/jamble.js');
  let jsContent = fs.readFileSync(jsPath, 'utf8');
  
  // Replace the placeholder with actual build version
  const versionPlaceholder = /BUILD_VERSION_PLACEHOLDER/g;
  jsContent = jsContent.replace(versionPlaceholder, buildInfo.version);
  
  // Write back the updated JavaScript
  fs.writeFileSync(jsPath, jsContent);
  
  console.log(`✅ Injected build version ${buildInfo.version} into compiled JavaScript`);
  
  // Clean up build info file
  fs.unlinkSync(buildInfoPath);
  
} catch (error) {
  console.error('❌ Error injecting build version:', error.message);
  process.exit(1);
}