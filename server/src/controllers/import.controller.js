const path = require('path');
const fs = require('fs');
const User = require('../models/user.model');
const Image = require('../models/image.model');
const imageService = require('../services/image.service');
const { ErrorResponse } = require('../middleware/error.middleware');

/**
 * @desc    Import portfolio images from directory
 * @route   POST /api/import/portfolio
 * @access  Private/Admin
 */
exports.importPortfolioImages = async (req, res, next) => {
  try {
    const { sourcePath, category = 'other', tags } = req.body;
    
    if (!sourcePath) {
      return next(new ErrorResponse('Please provide source directory path', 400));
    }
    
    // Check if directory exists
    if (!fs.existsSync(sourcePath)) {
      return next(new ErrorResponse(`Directory not found: ${sourcePath}`, 404));
    }
    
    // Process the directory and import images
    const importResults = await imageService.importFromDirectory(sourcePath, category);
    
    // Create database records for each imported image
    const imageRecords = [];
    
    for (const result of importResults) {
      const imageRecord = await Image.create({
        title: path.basename(result.filename, path.extname(result.filename)),
        description: '',
        category,
        tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl,
        originalFilename: result.filename,
        size: result.metadata.size || 0,
        width: result.metadata.width || 0,
        height: result.metadata.height || 0,
        format: result.metadata.format || path.extname(result.filename).replace('.', ''),
        uploadedBy: req.user.id
      });
      
      imageRecords.push(imageRecord);
    }
    
    res.status(200).json({
      success: true,
      count: imageRecords.length,
      data: imageRecords
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check directory contents
 * @route   POST /api/import/check-directory
 * @access  Private/Admin
 */
exports.checkDirectory = async (req, res, next) => {
  try {
    const { directoryPath } = req.body;
    
    if (!directoryPath) {
      return next(new ErrorResponse('Please provide directory path', 400));
    }
    
    // Check if directory exists
    if (!fs.existsSync(directoryPath)) {
      return next(new ErrorResponse(`Directory not found: ${directoryPath}`, 404));
    }
    
    // List files in directory
    const files = fs.readdirSync(directoryPath);
    
    // Filter for image files only
    const imageFiles = files.filter(file => {
      return /\.(jpg|jpeg|png|gif|webp)$/i.test(file);
    });
    
    res.status(200).json({
      success: true,
      directory: directoryPath,
      totalFiles: files.length,
      imageFiles: imageFiles.length,
      data: imageFiles
    });
  } catch (error) {
    next(error);
  }
};
