// API Interface for NoelTookit Photography Website
// This script connects the frontend to the backend REST API

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * API client for backend communication
 */
class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = localStorage.getItem('authToken');
    console.log('API CLIENT - Initialized with token:', this.token ? 'token exists' : 'no token');
  }

  /**
   * Set authentication token for authenticated requests
   * @param {string} token - JWT token
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
    console.log('API CLIENT - Token set and saved to localStorage');
  }

  /**
   * Clear authentication token on logout
   */
  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
    console.log('API CLIENT - Token cleared from memory and localStorage');
  }

  /**
   * Handle API requests with proper error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise} - Response data
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`API CLIENT - Request to ${endpoint}`);
    
    // Add authorization header if token exists
    if (this.token) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${this.token}`
      };
      console.log('API CLIENT - Added authorization header with token');
    } else {
      console.log('API CLIENT - No token available for request');
    }

    // Add JSON headers for most requests
    if (!options.headers) {
      options.headers = {
        'Content-Type': 'application/json'
      };
    }

    try {
      const startTime = Date.now();
      console.log('API CLIENT - Sending request:', {
        url,
        method: options.method || 'GET',
        hasBody: !!options.body
      });
      
      const response = await fetch(url, options);
      const responseTime = Date.now() - startTime;
      
      // Parse JSON data
      const data = await response.json();
      
      // Handle API errors
      if (!response.ok) {
        const status = response.status;
        console.error('API CLIENT - Request failed:', {
          endpoint,
          status,
          responseTime: `${responseTime}ms`,
          error: data.error,
          isAuthError: status === 401,
        });

        // Special handling for authentication errors
        if (status === 401) {
          console.error('API CLIENT - Authentication error - token may be invalid or expired');
          // Currently no token refresh mechanism implemented
          // This would be a good place to add one
        }
        
        throw new Error(data.error || 'Something went wrong');
      }
      
      console.log('API CLIENT - Request successful:', {
        endpoint,
        status: response.status,
        responseTime: `${responseTime}ms`,
      });
      
      return data;
    } catch (error) {
      console.error('API CLIENT - Request failed with exception:', {
        endpoint,
        errorType: error.name,
        errorMessage: error.message
      });
      throw error;
    }
  }

  // Authentication methods
  
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise} - User data and token
   */
  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    // Save token on successful registration
    if (data.token) {
      this.setToken(data.token);
    }
    
    return data;
  }

  /**
   * Login user
   * @param {Object} credentials - User login credentials
   * @returns {Promise} - User data and token
   */
  async login(credentials) {
    console.log('API CLIENT - Login attempt:', { email: credentials.email });
    
    try {
      const data = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      
      // Save token on successful login
      if (data.token) {
        console.log('API CLIENT - Login successful, token received');
        this.setToken(data.token);
      } else {
        console.warn('API CLIENT - Login response missing token');
      }
      
      return data;
    } catch (error) {
      console.error('API CLIENT - Login failed:', error.message);
      throw error;
    }
  }

  /**
   * Get current user profile
   * @returns {Promise} - User profile data
   */
  async getProfile() {
    console.log('API CLIENT - Fetching user profile');
    try {
      const data = await this.request('/auth/me');
      console.log('API CLIENT - Profile fetched successfully:', {
        hasData: !!data,
        dataType: typeof data
      });
      return data;
    } catch (error) {
      console.error('API CLIENT - Failed to fetch profile:', error.message);
      // This is where token expiration is often first detected
      if (error.message.includes('Not authorized')) {
        console.warn('API CLIENT - Authentication issue detected in getProfile');
      }
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {Object} profileData - Updated profile data
   * @returns {Promise} - Updated user data
   */
  async updateProfile(profileData) {
    return this.request('/auth/updateprofile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  /**
   * Logout user
   */
  async logout() {
    console.log('API CLIENT - Logout initiated');
    try {
      // Note: We clear the token before making the request
      // This means the logout request itself might fail if the server
      // strictly requires authentication for the logout endpoint
      this.clearToken();
      const result = await this.request('/auth/logout');
      console.log('API CLIENT - Logout successful on server side');
      return result;
    } catch (error) {
      console.error('API CLIENT - Logout request failed:', error.message);
      console.log('API CLIENT - Token still cleared locally regardless of server response');
      // We don't rethrow here since the local logout was still successful
      return { success: true, message: 'Logged out locally' };
    }
  }

  // Portfolio/Image methods
  
  /**
   * Get all portfolio images with filtering
   * @param {Object} filters - Optional query parameters
   * @returns {Promise} - Image data
   */
  async getImages(filters = {}) {
    // Convert filters object to query string
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      queryParams.append(key, value);
    });
    
    return this.request(`/images?${queryParams.toString()}`);
  }

  /**
   * Get single image by ID
   * @param {string} imageId - Image ID
   * @returns {Promise} - Image data
   */
  async getImage(imageId) {
    return this.request(`/images/${imageId}`);
  }

  /**
   * Upload new image (multipart form data)
   * @param {FormData} formData - Form data with image and metadata
   * @returns {Promise} - Uploaded image data
   */
  async uploadImage(formData) {
    // Remove Content-Type header to let browser set it with boundary
    return this.request('/images', {
      method: 'POST',
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : undefined
      },
      body: formData
    });
  }

  /**
   * Update image metadata
   * @param {string} imageId - Image ID
   * @param {Object} imageData - Updated image data
   * @returns {Promise} - Updated image data
   */
  async updateImage(imageId, imageData) {
    return this.request(`/images/${imageId}`, {
      method: 'PUT',
      body: JSON.stringify(imageData)
    });
  }

  /**
   * Delete image
   * @param {string} imageId - Image ID
   * @returns {Promise} - Deletion response
   */
  async deleteImage(imageId) {
    return this.request(`/images/${imageId}`, {
      method: 'DELETE'
    });
  }

  // Product methods
  
  /**
   * Get all products with filtering
   * @param {Object} filters - Optional query parameters
   * @returns {Promise} - Product data
   */
  async getProducts(filters = {}) {
    // Convert filters object to query string
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      queryParams.append(key, value);
    });
    
    return this.request(`/products?${queryParams.toString()}`);
  }

  /**
   * Get featured products
   * @param {number} limit - Optional limit parameter
   * @returns {Promise} - Featured products data
   */
  async getFeaturedProducts(limit = 6) {
    return this.request(`/products/featured?limit=${limit}`);
  }

  /**
   * Get products by category
   * @param {string} categoryName - Category name
   * @returns {Promise} - Products in category
   */
  async getProductsByCategory(categoryName) {
    return this.request(`/products/category/${categoryName}`);
  }

  /**
   * Get single product by ID
   * @param {string} productId - Product ID
   * @returns {Promise} - Product data
   */
  async getProduct(productId) {
    return this.request(`/products/${productId}`);
  }

  /**
   * Create new product (admin only)
   * @param {Object} productData - Product data
   * @returns {Promise} - Created product data
   */
  async createProduct(productData) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  }

  /**
   * Update product (admin only)
   * @param {string} productId - Product ID
   * @param {Object} productData - Updated product data
   * @returns {Promise} - Updated product data
   */
  async updateProduct(productId, productData) {
    return this.request(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  }

  /**
   * Update product stock (admin only)
   * @param {string} productId - Product ID
   * @param {number} stock - New stock quantity
   * @returns {Promise} - Updated product data
   */
  async updateStock(productId, stock) {
    return this.request(`/products/${productId}/stock`, {
      method: 'PUT',
      body: JSON.stringify({ stock })
    });
  }

  /**
   * Delete product (admin only)
   * @param {string} productId - Product ID
   * @returns {Promise} - Deletion response
   */
  async deleteProduct(productId) {
    return this.request(`/products/${productId}`, {
      method: 'DELETE'
    });
  }

  // Order methods
  
  /**
   * Get all orders (admin sees all, users see their own)
   * @returns {Promise} - Orders data
   */
  async getOrders() {
    return this.request('/orders');
  }

  /**
   * Get current user's orders
   * @returns {Promise} - User's orders data
   */
  async getMyOrders() {
    return this.request('/orders/myorders');
  }

  /**
   * Get single order by ID
   * @param {string} orderId - Order ID
   * @returns {Promise} - Order data
   */
  async getOrder(orderId) {
    return this.request(`/orders/${orderId}`);
  }

  /**
   * Create new order
   * @param {Object} orderData - Order data including products and shipping address
   * @returns {Promise} - Created order data
   */
  async createOrder(orderData) {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData)
    });
  }

  /**
   * Update order status (admin only)
   * @param {string} orderId - Order ID
   * @param {string} status - New order status
   * @returns {Promise} - Updated order data
   */
  async updateOrderStatus(orderId, status) {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  /**
   * Create Stripe payment intent for order
   * @param {string} orderId - Order ID
   * @returns {Promise} - Payment intent data with client_secret
   */
  async createPaymentIntent(orderId) {
    return this.request('/orders/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ orderId })
    });
  }

  // Booking methods
  
  /**
   * Get all bookings (admin sees all, users see their own)
   * @returns {Promise} - Bookings data
   */
  async getBookings() {
    return this.request('/bookings');
  }

  /**
   * Get current user's bookings
   * @returns {Promise} - User's bookings data
   */
  async getMyBookings() {
    return this.request('/bookings/mybookings');
  }

  /**
   * Get single booking by ID
   * @param {string} bookingId - Booking ID
   * @returns {Promise} - Booking data
   */
  async getBooking(bookingId) {
    return this.request(`/bookings/${bookingId}`);
  }

  /**
   * Create new booking
   * @param {Object} bookingData - Booking data
   * @returns {Promise} - Created booking data
   */
  async createBooking(bookingData) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(bookingData)
    });
  }

  /**
   * Update booking details
   * @param {string} bookingId - Booking ID
   * @param {Object} bookingData - Updated booking data
   * @returns {Promise} - Updated booking data
   */
  async updateBooking(bookingId, bookingData) {
    return this.request(`/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(bookingData)
    });
  }

  /**
   * Cancel booking
   * @param {string} bookingId - Booking ID
   * @param {string} cancellationReason - Optional reason for cancellation
   * @returns {Promise} - Cancelled booking data
   */
  async cancelBooking(bookingId, cancellationReason) {
    return this.request(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ cancellationReason })
    });
  }

  /**
   * Update booking status (admin only)
   * @param {string} bookingId - Booking ID
   * @param {string} status - New booking status
   * @returns {Promise} - Updated booking data
   */
  async updateBookingStatus(bookingId, status) {
    return this.request(`/bookings/${bookingId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  /**
   * Assign photographer to booking (admin only)
   * @param {string} bookingId - Booking ID
   * @param {string} photographerId - Photographer user ID
   * @returns {Promise} - Updated booking data
   */
  async assignPhotographer(bookingId, photographerId) {
    return this.request(`/bookings/${bookingId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ photographerId })
    });
  }

  // Import methods (admin only)
  
  /**
   * Check directory contents before import
   * @param {string} directoryPath - Directory path to check
   * @returns {Promise} - Directory contents data
   */
  async checkDirectory(directoryPath) {
    return this.request('/import/check-directory', {
      method: 'POST',
      body: JSON.stringify({ directoryPath })
    });
  }

  /**
   * Import portfolio images from directory
   * @param {string} sourcePath - Source directory path
   * @param {string} category - Optional image category
   * @param {string} tags - Optional comma-separated tags
   * @returns {Promise} - Import results data
   */
  async importPortfolioImages(sourcePath, category = 'other', tags = '') {
    return this.request('/import/portfolio', {
      method: 'POST',
      body: JSON.stringify({ sourcePath, category, tags })
    });
  }
}

// Create and export global API client instance
const api = new ApiClient();
