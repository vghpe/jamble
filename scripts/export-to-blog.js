"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const distDir = path.resolve(__dirname, "..", "dist");
const assets = ["jamble.js", "jamble.css"];

const defaultBlogRoot = path.join(os.homedir(), "blog");
const blogRoot = process.env.JAMBLE_BLOG_ROOT || defaultBlogRoot;
const targetDir = path.join(blogRoot, "static", "games", "jamble");

if (!fs.existsSync(distDir)) {
  console.error(`Missing build artifacts in ${distDir}. Run npm run build:jamble first.`);
  process.exit(1);
}

fs.mkdirSync(targetDir, { recursive: true });

let copiedCount = 0;
for (const asset of assets) {
  const sourcePath = path.join(distDir, asset);
  if (!fs.existsSync(sourcePath)) {
    console.warn(`Skipping ${asset} (not found in dist).`);
    continue;
  }

  const destinationPath = path.join(targetDir, asset);
  fs.copyFileSync(sourcePath, destinationPath);
  console.log(`Exported ${asset} -> ${destinationPath}`);
  copiedCount++;
}

if (copiedCount === 0) {
  console.warn("No assets were exported.");
} else {
  console.log(`Export complete. Assets available under ${targetDir}`);
}
