const Order = require('../models/order.model');
const Product = require('../models/product.model');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { ErrorResponse } = require('../middleware/error.middleware');

/**
 * @desc    Get all orders
 * @route   GET /api/orders
 * @access  Private/Admin
 */
exports.getOrders = async (req, res, next) => {
  try {
    let query;

    // If user is not admin, only show their orders
    if (req.user.role !== 'admin') {
      query = Order.find({ user: req.user.id });
    } else {
      query = Order.find();
    }

    // Sort by created date (descending)
    query = query.sort('-createdAt');

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Order.countDocuments();

    query = query.skip(startIndex).limit(limit).populate('user', 'name email');

    // Executing query
    const orders = await query;

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
      count: orders.length,
      pagination,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order
 * @route   GET /api/orders/:id
 * @access  Private
 */
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }

    // Make sure user is order owner or admin
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to view this order`, 401));
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Private
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { products, shippingAddress } = req.body;

    if (!products || products.length === 0) {
      return next(new ErrorResponse('Please add at least one product to your order', 400));
    }

    if (!shippingAddress) {
      return next(new ErrorResponse('Please provide a shipping address', 400));
    }

    // Calculate prices
    const orderItems = [];
    let subtotal = 0;

    // Process all products in the order
    for (const item of products) {
      const product = await Product.findById(item.product);

      if (!product) {
        return next(new ErrorResponse(`Product not found with id of ${item.product}`, 404));
      }

      if (product.stock < item.quantity) {
        return next(new ErrorResponse(`${product.name} is out of stock. Only ${product.stock} available.`, 400));
      }

      // Add to order items
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity
      });

      // Calculate subtotal
      subtotal += product.price * item.quantity;

      // Update stock
      product.stock -= item.quantity;
      await product.save();
    }

    // Calculate total (subtotal + tax + shipping)
    const tax = subtotal * 0.1; // 10% tax rate
    const shipping = subtotal > 100 ? 0 : 10; // Free shipping for orders over $100
    const total = subtotal + tax + shipping;

    // Create order
    const order = await Order.create({
      user: req.user.id,
      products: orderItems,
      shippingAddress,
      subtotal,
      tax,
      shipping,
      total,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status
 * @route   PUT /api/orders/:id/status
 * @access  Private/Admin
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status) {
      return next(new ErrorResponse('Please provide a status', 400));
    }

    let order = await Order.findById(req.params.id);

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${req.params.id}`, 404));
    }

    // Update order status
    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create payment intent for Stripe
 * @route   POST /api/orders/create-payment-intent
 * @access  Private
 */
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return next(new ErrorResponse('Please provide an order ID', 400));
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return next(new ErrorResponse(`Order not found with id of ${orderId}`, 404));
    }

    // Make sure user is order owner
    if (order.user.toString() !== req.user.id) {
      return next(new ErrorResponse(`User ${req.user.id} is not authorized to pay for this order`, 401));
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), // Stripe expects amount in cents
      currency: 'usd',
      metadata: {
        orderId: order._id.toString(),
        userId: req.user.id
      }
    });

    // Update order with payment info
    order.paymentInfo = {
      type: 'stripe',
      transactionId: paymentIntent.id,
      status: 'pending'
    };
    
    await order.save();

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      orderId: order._id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Handle Stripe webhook
 * @route   POST /api/orders/webhook
 * @access  Public
 */
exports.handleStripeWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      
      // Update order status
      const orderId = paymentIntent.metadata.orderId;
      const order = await Order.findById(orderId);
      
      if (order) {
        order.paymentInfo.status = 'completed';
        order.status = 'processing';
        await order.save();
      }
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get my orders
 * @route   GET /api/orders/myorders
 * @access  Private
 */
exports.getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id }).sort('-createdAt');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};
