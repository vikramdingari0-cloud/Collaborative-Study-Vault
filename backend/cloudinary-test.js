#!/usr/bin/env node

const { v2: cloudinary } = require("cloudinary");

// Configure Cloudinary
cloudinary.config({
  cloud_name: "dczhxhgmz",
  api_key: "168469225633989",
  api_secret: "dblZIA34PfKSHu8xBbVdlx_J7k4",
});

async function main() {
  try {
    console.log("Uploading image...");

    const uploadResult = await cloudinary.uploader.upload(
      "https://res.cloudinary.com/demo/image/upload/sample.jpg"
    );

    console.log("\n=== Upload Result ===");
    console.log("Secure URL:", uploadResult.secure_url);
    console.log("Public ID:", uploadResult.public_id);

    const details = await cloudinary.api.resource(uploadResult.public_id);

    console.log("\n=== Image Details ===");
    console.log("Width:", details.width);
    console.log("Height:", details.height);
    console.log("Format:", details.format);
    console.log("File Size (bytes):", details.bytes);

    // f_auto = automatically selects best image format
    // q_auto = automatically selects optimal image quality
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: "auto",
      quality: "auto",
      secure: true,
    });

    console.log("\n=== Optimized Image ===");
    console.log(transformedUrl);

    console.log(
      "\nDone! Click link below to see optimized version of the image. Check the size and the format."
    );
  } catch (error) {
    console.error("Error:", error);
  }
}

main();