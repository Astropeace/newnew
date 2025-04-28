const path = require('path');
const fs = require('fs');
const AWS = require('aws-sdk');
const multer = require('multer');
const Image = require('../models/image.model');
const { ErrorResponse } = require('../middleware/error.middleware');

// Configure AWS
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/images'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/)) {
    req.fileValidationError = 'Only image files are allowed!';
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

// Upload middleware
exports.upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
}).single('image');

/**
 * @desc    Upload image
 * @route   POST /api/images
 * @access  Private
 */
exports.uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ErrorResponse('Please upload an image file', 400));
    }

    // Get file path
    const filePath = req.file.path;
    let imageUrl;

    // If AWS is configured, upload to S3
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      // Read the file
      const fileContent = fs.readFileSync(filePath);

      // Set up S3 upload parameters
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `portfolio/${req.file.filename}`,
        Body: fileContent,
        ContentType: req.file.mimetype
      };

      // Upload to S3
      const s3Upload = await s3.upload(params).promise();
      imageUrl = s3Upload.Location;

      // Delete local file after S3 upload
      fs.unlinkSync(filePath);
    } else {
      // Use local path if AWS is not configured
      imageUrl = `/images/${req.file.filename}`;
    }

    // Create image record in database
    const image = await Image.create({
      title: req.body.title || req.file.originalname,
      description: req.body.description || '',
      category: req.body.category || 'other',
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
      imageUrl,
      originalFilename: req.file.originalname,
      size: req.file.size,
      format: path.extname(req.file.originalname).replace('.', ''),
      uploadedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: image
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all images
 * @route   GET /api/images
 * @access  Public
 */
exports.getImages = async (req, res, next) => {
  try {
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from filtering
    const removeFields = ['select', 'sort', 'page', 'limit', 'search'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);
    
    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Finding resource
    query = Image.find(JSON.parse(queryStr));

    // Handle search
    if (req.query.search) {
      query = Image.find({ $text: { $search: req.query.search } });
    }

    // Select fields
    if (req.query.select) {
      const fields = req.query.select.split(',').join(' ');
      query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-uploadedAt');
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Image.countDocuments();

    query = query.skip(startIndex).limit(limit);

    // Executing query
    const images = await query;

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: images.length,
      pagination,
      data: images
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single image
 * @route   GET /api/images/:id
 * @access  Public
 */
exports.getImage = async (req, res, next) => {
  try {
    const image = await Image.findById(req.params.id);

    if (!image) {
      return next(new ErrorResponse(`Image not found with id of ${req.params.id}`, 404));
    }

    res.status(200).json({
      success: true,
      data: image
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update image details
 * @route   PUT /api/images/:id
 * @access  Private
 */
exports.updateImage = async (req, res, next) => {
  try {
    let image = await Image.findById(req.params.id);

    if (!image) {
      return next(new ErrorResponse(`Image not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is image owner or admin
    if (image.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to update this image`, 401));
    }

    // Prepare update fields
    const updateFields = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : undefined,
      location: req.body.location,
      dateTaken: req.body.dateTaken,
      featured: req.body.featured,
      inPortfolio: req.body.inPortfolio,
      isForSale: req.body.isForSale
    };

    // Filter out undefined fields
    Object.keys(updateFields).forEach(
      key => updateFields[key] === undefined && delete updateFields[key]
    );

    // Update image
    image = await Image.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: image
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete image
 * @route   DELETE /api/images/:id
 * @access  Private
 */
exports.deleteImage = async (req, res, next) => {
  try {
    const image = await Image.findById(req.params.id);

    if (!image) {
      return next(new ErrorResponse(`Image not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is image owner or admin
    if (image.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to delete this image`, 401));
    }

    // If image is stored on S3, delete from S3
    if (image.imageUrl.includes('amazonaws.com')) {
      const key = image.imageUrl.split('/').slice(3).join('/');
      
      const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key
      };

      await s3.deleteObject(params).promise();
    } 
    // If local file, delete from filesystem
    else if (image.imageUrl.startsWith('/images/')) {
      const filePath = path.join(__dirname, '../../public', image.imageUrl);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await image.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
