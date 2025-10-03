#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const debugSystemPath = path.join(__dirname, '../src/debug/debug-system.ts');

try {
  // Read the debug-system.ts file
  let content = fs.readFileSync(debugSystemPath, 'utf8');
  
  // Find the BUILD_VERSION line
  const versionRegex = /private static readonly BUILD_VERSION = "v2\.0\.(\d+)";/;
  const match = content.match(versionRegex);
  
  if (match) {
    const currentNumber = parseInt(match[1]);
    const newNumber = String(currentNumber + 1).padStart(3, '0');
    const newVersion = `v2.0.${newNumber}`;
    
    // Replace the version in the file
    content = content.replace(versionRegex, `private static readonly BUILD_VERSION = "${newVersion}";`);
    
    // Write back to file
    fs.writeFileSync(debugSystemPath, content);
    
    console.log(`🎮 Build version updated: ${newVersion}`);
    console.log(`📦 Ready to build Jamble...`);
  } else {
    console.error('❌ Could not find BUILD_VERSION in debug-system.ts');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error updating build version:', error.message);
  process.exit(1);
}