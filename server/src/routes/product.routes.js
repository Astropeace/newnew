const express = require('express');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getFeaturedProducts,
  getProductsByCategory
} = require('../controllers/product.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Special routes
router.get('/featured', getFeaturedProducts);
router.get('/category/:categoryName', getProductsByCategory);

// Public routes
router.get('/', getProducts);
router.get('/:id', getProduct);

// Protected admin routes
router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.delete('/:id', protect, authorize('admin'), deleteProduct);
router.put('/:id/stock', protect, authorize('admin'), updateStock);

module.exports = router;
