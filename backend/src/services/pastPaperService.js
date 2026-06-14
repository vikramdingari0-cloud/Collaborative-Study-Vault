const PastPaper = require("../models/PastPaper");
const { uploadToCloudinary, isCloudinaryConfigured } = require("./fileService");
const { cloudinary } = require("../config/cloudinary");
const logger = require("../utils/logger");

/**
 * Upload a new past paper
 * @param {Object} uploadParams - { file, title, subject, year, workspaceId, userId }
 * @returns {Object} Created PastPaper document
 */
const uploadPastPaper = async ({ file, title, subject, year, workspaceId, userId }) => {
  if (!file) {
    const error = new Error("No file uploaded");
    error.statusCode = 400;
    throw error;
  }

  logger.info(`Uploading past paper "${file.originalname}" for workspace ${workspaceId}`);

  // Upload to Cloudinary
  const uploadResult = await uploadToCloudinary(file.buffer, file.originalname);

  // Save to database
  const pastPaper = await PastPaper.create({
    title,
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    subject,
    year: parseInt(year, 10),
    workspace: workspaceId,
    uploadedBy: userId,
  });

  return pastPaper;
};

/**
 * Retrieve all past papers in a workspace
 * @param {string} workspaceId
 * @returns {Array} List of past papers
 */
const getPastPapersForWorkspace = async (workspaceId) => {
  return await PastPaper.find({ workspace: workspaceId })
    .populate("uploadedBy", "name email avatar")
    .sort({ year: -1, title: 1 });
};

/**
 * Delete a past paper
 * @param {string} pastPaperId
 */
const deletePastPaper = async (pastPaperId) => {
  const paper = await PastPaper.findById(pastPaperId);
  if (!paper) {
    const error = new Error("Past paper not found");
    error.statusCode = 404;
    throw error;
  }

  // Delete from Cloudinary
  const isCloudConfigured = cloudinary && cloudinary.config() && cloudinary.config().api_key;
  if (isCloudConfigured) {
    try {
      await cloudinary.uploader.destroy(paper.publicId, { resource_type: "raw" });
      logger.info(`Deleted past paper asset "${paper.publicId}" from Cloudinary`);
    } catch (err) {
      logger.error(`Failed to delete past paper from Cloudinary: ${err.message}`);
    }
  }

  // Delete from database
  await PastPaper.findByIdAndDelete(pastPaperId);
};

module.exports = {
  uploadPastPaper,
  getPastPapersForWorkspace,
  deletePastPaper,
};
