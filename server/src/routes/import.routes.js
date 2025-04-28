const express = require('express');
const {
  importPortfolioImages,
  checkDirectory
} = require('../controllers/import.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require admin privileges
router.use(protect, authorize('admin'));

router.post('/portfolio', importPortfolioImages);
router.post('/check-directory', checkDirectory);

module.exports = router;
