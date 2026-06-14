// ============================================
// fileService.js — File Business Logic
// ============================================
// Interacts with Cloudinary for asset hosting and MongoDB for metadata storage.
// Supports memory-buffered streaming uploads to support cloud-native deployment.
// ============================================

const File = require("../models/File");
const Folder = require("../models/Folder");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");
const logger = require("../utils/logger");

const assertFolderInWorkspace = async (folderId, workspaceId) => {
  if (!folderId) return;

  const folder = await Folder.findById(folderId);
  if (!folder) {
    const error = new Error("Folder not found");
    error.statusCode = 404;
    throw error;
  }

  if (folder.workspace.toString() !== workspaceId.toString()) {
    const error = new Error("Folder does not belong to this workspace");
    error.statusCode = 400;
    throw error;
  }
};

/**
 * Helper to upload buffer to Cloudinary via upload_stream
 */
const uploadToCloudinary = (fileBuffer, fileName) => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured()) {
      return reject(new Error("Cloudinary is not configured on the server."));
    }

    const extension = fileName.split(".").pop().toLowerCase();
    let resourceType = "raw"; // default for PDFs/docs

    // Auto-detect image formats for proper Cloudinary categorization
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension)) {
      resourceType = "image";
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "study_vault_resources",
        resource_type: resourceType,
        public_id: `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9]/g, "_")}`,
      },
      (error, result) => {
        if (error) {
          logger.error(`Cloudinary upload error: ${error.message}`);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(fileBuffer);
  });
};

/**
 * Upload a new file
 * @param {Object} uploadParams - { file, workspaceId, folderId, userId }
 * @returns {Object} Created file metadata document
 */
const uploadFile = async ({ file, workspaceId, folderId = null, userId }) => {
  if (!file) {
    const error = new Error("No file uploaded");
    error.statusCode = 400;
    throw error;
  }

  await assertFolderInWorkspace(folderId, workspaceId);

  logger.info(`Uploading file "${file.originalname}" for workspace ${workspaceId}`);

  // Upload buffer to Cloudinary
  const uploadResult = await uploadToCloudinary(file.buffer, file.originalname);

  // Save metadata to MongoDB
  const extension = file.originalname.split(".").pop().toLowerCase();

  const fileDoc = await File.create({
    name: file.originalname,
    url: uploadResult.secure_url,
    publicId: uploadResult.public_id,
    fileType: extension,
    size: file.size,
    workspace: workspaceId,
    folder: folderId || null,
    uploadedBy: userId,
  });

  return fileDoc;
};

/**
 * Get all files in a workspace (optionally filtered by folder)
 * @param {string} workspaceId - Workspace ID
 * @param {string|null} folderId - Folder ID (or 'root' for loose resources)
 * @returns {Array} Files
 */
const getFilesForWorkspace = async (workspaceId, folderId = null) => {
  const query = { workspace: workspaceId };
  if (folderId !== null) {
    query.folder = folderId === "root" ? null : folderId;
  }

  return await File.find(query)
    .populate("uploadedBy", "name email avatar")
    .sort({ createdAt: -1 });
};

/**
 * Delete a single file from Cloudinary and DB
 * @param {string} fileId - File ID to delete
 */
const deleteFile = async (fileId) => {
  const file = await File.findById(fileId);
  if (!file) {
    const error = new Error("File not found");
    error.statusCode = 404;
    throw error;
  }

  // Delete from Cloudinary
  if (isCloudinaryConfigured()) {
    try {
      // Raw files in Cloudinary require resource_type specification, images might not but it's safe to specify raw/image
      const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(file.fileType);
      const resourceType = isImage ? "image" : "raw";

      await cloudinary.uploader.destroy(file.publicId, { resource_type: resourceType });
      logger.info(`Deleted asset "${file.publicId}" from Cloudinary`);
    } catch (err) {
      logger.error(`Failed to delete asset from Cloudinary: ${err.message}`);
    }
  }

  // Delete from DB
  await File.findByIdAndDelete(fileId);
};

/**
 * Recursively delete all files associated with a list of folder IDs
 * @param {Array<string>} folderIds - List of folder IDs being deleted
 */
const deleteFilesForFolders = async (folderIds) => {
  const files = await File.find({ folder: { $in: folderIds } });

  if (files.length === 0) return;

  logger.info(`Deleting ${files.length} files recursively associated with folders: [${folderIds}]`);

  for (const file of files) {
    try {
      if (isCloudinaryConfigured()) {
        const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(file.fileType);
        const resourceType = isImage ? "image" : "raw";
        await cloudinary.uploader.destroy(file.publicId, { resource_type: resourceType });
      }
    } catch (err) {
      logger.error(`Cloudinary cleanup failed for nested file "${file.publicId}": ${err.message}`);
    }
  }

  await File.deleteMany({ folder: { $in: folderIds } });
};

module.exports = {
  uploadFile,
  getFilesForWorkspace,
  deleteFile,
  deleteFilesForFolders,
  uploadToCloudinary,
};
