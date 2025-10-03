#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const buildCounterPath = path.join(__dirname, '../.build-counter');

try {
  // Read current build number, or start at 0 if file doesn't exist
  let buildNumber = 0;
  if (fs.existsSync(buildCounterPath)) {
    buildNumber = parseInt(fs.readFileSync(buildCounterPath, 'utf8').trim()) || 0;
  }
  
  // Increment build number
  buildNumber += 1;
  
  // Save new build number
  fs.writeFileSync(buildCounterPath, buildNumber.toString());
  
  const buildVersion = `v2.0.${String(buildNumber).padStart(3, '0')}`;
  
  console.log(`🎮 Generating build version: ${buildVersion}`);

  // Store build version in a temporary file for post-build injection
  const buildInfoPath = path.join(__dirname, '../.build-info.json');
  fs.writeFileSync(buildInfoPath, JSON.stringify({ version: buildVersion, timestamp: Date.now() }));

  console.log(`📦 Ready to build Jamble...`);
} catch (error) {
  console.error('❌ Error generating build version:', error.message);
  process.exit(1);
}