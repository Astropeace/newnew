const express = require('express');
const {
  getImages,
  getImage,
  uploadImage,
  updateImage,
  deleteImage,
  upload
} = require('../controllers/image.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.get('/', getImages);
router.get('/:id', getImage);

// Protected routes
router.post('/', protect, upload, uploadImage);
router.put('/:id', protect, updateImage);
router.delete('/:id', protect, deleteImage);

module.exports = router;
