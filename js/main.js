// Main JavaScript for NoelTookit Photography Website
// This script handles UI interactions and connects to the backend API

document.addEventListener('DOMContentLoaded', function() {
  // Initialize UI components
  initializeUI();
  
  // Initialize API connection and load data
  loadPortfolioImages();
  loadFeaturedProducts();
  
  // Check authentication status
  checkAuthStatus();
});

/**
 * Initialize UI components and event listeners
 */
function initializeUI() {
  // Header scroll effect
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 50) {
        header.classList.add('bg-white', 'shadow-md');
      } else {
        header.classList.remove('bg-white', 'shadow-md');
      }
    });
  }

  // Mobile menu toggle
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function() {
      mobileMenu.classList.toggle('hidden');
    });

    // Close mobile menu when clicking on a link
    const mobileLinks = mobileMenu.querySelectorAll('a');
    mobileLinks.forEach(link => {
      link.addEventListener('click', function() {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // Initialize cart functionality
  initializeCart();
  
  // Initialize gallery filtering and lightbox
  initializeGallery();

  // Update countdown timer
  initializeCountdown();
}

/**
 * Initialize countdown timer for limited time offers
 */
function initializeCountdown() {
  function updateCountdown() {
    const now = new Date();
    const nextMonday = new Date();
    nextMonday.setDate(nextMonday.getDate() + (8 - nextMonday.getDay()));
    nextMonday.setHours(9, 0, 0, 0);
    const timeLeft = nextMonday - now;
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
    
    const countdownElements = document.querySelectorAll('#countdown');
    countdownElements.forEach(element => {
      if (element) {
        element.textContent = `Time remaining: ${days}d ${hours}h ${minutes}m ${seconds}s`;
      }
    });
  }
  
  setInterval(updateCountdown, 1000);
  updateCountdown();
}

/**
 * Initialize shopping cart functionality
 */
function initializeCart() {
  let cart = JSON.parse(localStorage.getItem('cart')) || [];
  const cartSidebar = document.getElementById('cart-sidebar');
  const cartItems = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const checkoutButton = document.getElementById('checkout-button');

  // Toggle cart sidebar
  const cartLink = document.querySelector('a[href="#cart"]');
  if (cartLink) {
    cartLink.addEventListener('click', function(e) {
      e.preventDefault();
      cartSidebar.classList.remove('translate-x-full');
    });
  }
  
  const closeCartBtn = document.getElementById('close-cart');
  if (closeCartBtn) {
    closeCartBtn.addEventListener('click', function() {
      cartSidebar.classList.add('translate-x-full');
    });
  }

  // Add to cart functionality
  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      const name = this.getAttribute('data-name');
      const price = parseFloat(this.getAttribute('data-price'));
      
      // Check if item is already in cart
      const existingItem = cart.find(item => item.id === id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push({ id, name, price, quantity: 1 });
      }
      
      // Save to localStorage
      localStorage.setItem('cart', JSON.stringify(cart));
      
      // Update cart UI
      updateCartUI();
      
      // Open cart sidebar
      cartSidebar.classList.remove('translate-x-full');
    });
  });

  // Handle checkout
  checkoutButton?.addEventListener('click', async function() {
    if (cart.length === 0) return;
    
    try {
      // If user is not logged in, prompt login
      if (!localStorage.getItem('authToken')) {
        alert('Please log in to complete your purchase.');
        return;
      }
      
      // Create order through API
      const orderData = {
        products: cart.map(item => ({
          product: item.id,
          quantity: item.quantity
        })),
        shippingAddress: {
          // In a real app, you would collect this from a form
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        }
      };
      
      try {
        const order = await api.createOrder(orderData);
        
        // Create payment intent for this order
        const paymentIntent = await api.createPaymentIntent(order.data._id);
        
        // Here you would handle the Stripe payment flow with the client secret
        // For now, we'll just simulate a successful payment
        alert('Order placed successfully!');
        
        // Clear cart
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        
        // Close cart sidebar
        cartSidebar.classList.add('translate-x-full');
      } catch (error) {
        console.error('Error creating order:', error);
        alert('Failed to create order. Please try again.');
      }
    } catch (error) {
      console.error('Error during checkout:', error);
      alert('An error occurred during checkout. Please try again.');
    }
  });

  // Initialize cart UI
  updateCartUI();
  
  // Make item quantity update functions available globally
  window.updateQuantity = function(id, newQuantity) {
    if (newQuantity < 1) {
      removeFromCart(id);
      return;
    }
    
    const item = cart.find(item => item.id === id);
    if (item) {
      item.quantity = newQuantity;
      localStorage.setItem('cart', JSON.stringify(cart));
      updateCartUI();
    }
  };
  
  window.removeFromCart = function(id) {
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
  };
  
  // Function to update cart UI
  function updateCartUI() {
    // Update cart count
    cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    
    // Update cart items
    if (cartItems) {
      cartItems.innerHTML = cart.length === 0 
        ? '<p class="text-center text-gray-500 my-8">Your cart is empty</p>' 
        : cart.map(item => `
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="font-opensans font-medium">${item.name}</h4>
              <div class="flex items-center mt-1">
                <button class="text-gray-500 hover:text-primary" onclick="updateQuantity('${item.id}', ${item.quantity - 1})">
                  <i class="ri-subtract-line"></i>
                </button>
                <span class="mx-2">${item.quantity}</span>
                <button class="text-gray-500 hover:text-primary" onclick="updateQuantity('${item.id}', ${item.quantity + 1})">
                  <i class="ri-add-line"></i>
                </button>
              </div>
            </div>
            <div class="text-right">
              <p class="font-opensans font-medium">$${(item.price * item.quantity).toFixed(2)}</p>
              <button class="text-gray-500 hover:text-red-500 mt-1" onclick="removeFromCart('${item.id}')">
                <i class="ri-delete-bin-line"></i>
              </button>
            </div>
          </div>
        `).join('');
    }
    
    // Update subtotal
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    if (cartSubtotal) {
      cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    }
    
    // Enable/disable checkout button
    if (checkoutButton) {
      checkoutButton.disabled = cart.length === 0;
      checkoutButton.classList.toggle('opacity-50', cart.length === 0);
    }
    
    // Update stock counters for each product in cart
    cart.forEach(item => {
      updateProductStock(item.id, item.quantity);
    });
  }
  
  // Function to update product stock display
  function updateProductStock(productId, quantity) {
    const stockCounter = document.querySelector(`[data-id="${productId}"]`)?.closest('.bg-white')?.querySelector('.stock-counter');
    if (stockCounter) {
      let currentStock = parseInt(stockCounter.getAttribute('data-stock'));
      if (!isNaN(currentStock)) {
        stockCounter.textContent = `${currentStock} prints remaining`;
        
        if (currentStock === 0) {
          const addToCartButton = document.querySelector(`[data-id="${productId}"]`);
          if (addToCartButton) {
            addToCartButton.disabled = true;
            addToCartButton.classList.add('opacity-50', 'cursor-not-allowed');
            addToCartButton.textContent = 'Sold Out';
          }
        }
      }
    }
  }
}

/**
 * Initialize gallery filtering and lightbox
 */
function initializeGallery() {
  // Portfolio gallery filtering
  const filterButtons = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');
  
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      this.classList.add('active');
      
      const category = this.getAttribute('data-category');
      
      // Show/hide gallery items based on category
      galleryItems.forEach(item => {
        if (category === 'all' || item.getAttribute('data-category') === category) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });

  // Lightbox functionality
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.querySelector('.lightbox-img');
  const lightboxClose = document.querySelector('.lightbox-close');
  const lightboxPrev = document.querySelector('.lightbox-prev');
  const lightboxNext = document.querySelector('.lightbox-next');
  let currentIndex = 0;
  
  const visibleImages = () => Array.from(galleryItems).filter(item => item.style.display !== 'none');
  
  galleryItems.forEach(item => {
    item.addEventListener('click', function() {
      const img = this.querySelector('img');
      
      if (lightboxImg && img) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        
        if (lightbox) {
          lightbox.style.display = 'flex';
        }
        
        // Set current index
        currentIndex = visibleImages().indexOf(this);
      }
    });
  });
  
  if (lightboxClose) {
    lightboxClose.addEventListener('click', function() {
      lightbox.style.display = 'none';
    });
  }
  
  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', function() {
      const images = visibleImages();
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      const img = images[currentIndex].querySelector('img');
      
      if (img && lightboxImg) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
      }
    });
  }
  
  if (lightboxNext) {
    lightboxNext.addEventListener('click', function() {
      const images = visibleImages();
      currentIndex = (currentIndex + 1) % images.length;
      const img = images[currentIndex].querySelector('img');
      
      if (img && lightboxImg) {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
      }
    });
  }
  
  // Close lightbox when clicking outside the image
  if (lightbox) {
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) {
        lightbox.style.display = 'none';
      }
    });
  
    // Keyboard navigation for lightbox
    document.addEventListener('keydown', function(e) {
      if (lightbox.style.display === 'flex') {
        if (e.key === 'Escape') {
          lightbox.style.display = 'none';
        } else if (e.key === 'ArrowLeft' && lightboxPrev) {
          lightboxPrev.click();
        } else if (e.key === 'ArrowRight' && lightboxNext) {
          lightboxNext.click();
        }
      }
    });
  }
}

/**
 * Load portfolio images from the API
 */
async function loadPortfolioImages() {
  try {
    const galleryGrid = document.getElementById('gallery-grid');
    if (!galleryGrid) return;
    
    // Show loading state
    galleryGrid.innerHTML = '<div class="col-span-full text-center py-12"><i class="ri-loader-4-line ri-3x animate-spin text-primary"></i><p class="mt-4 text-gray-600">Loading gallery...</p></div>';
    
    try {
      // Fetch portfolio images from API
      const response = await api.getImages();
      
      if (response && response.data && response.data.length > 0) {
        // Clear loading state
        galleryGrid.innerHTML = '';
        
        // Render each image
        response.data.forEach(image => {
          const item = document.createElement('div');
          item.className = 'gallery-item rounded-lg overflow-hidden shadow-md';
          item.setAttribute('data-category', image.category || 'other');
          
          item.innerHTML = `
            <img src="${image.imageUrl}" alt="${image.title}" class="w-full h-80 object-cover object-top">
            <div class="gallery-overlay">
              <h3 class="font-playfair text-xl text-white">${image.title}</h3>
              <p class="font-opensans text-sm text-gray-200">${image.description || ''}</p>
            </div>
          `;
          
          galleryGrid.appendChild(item);
        });
        
        // Re-initialize gallery functionality
        initializeGallery();
      } else {
        // Show backend images are empty - use fallback
        console.log('No images found in API, using fallback gallery items');
        // Keep the existing gallery items
      }
    } catch (error) {
      console.error('Error fetching portfolio images:', error);
      // Keep the existing gallery items as fallback
    }
  } catch (error) {
    console.error('Error in loadPortfolioImages:', error);
  }
}

/**
 * Load featured products from the API
 */
async function loadFeaturedProducts() {
  try {
    const productsContainer = document.querySelector('#limited-prints .grid');
    if (!productsContainer) return;
    
    try {
      // Fetch featured products from API
      const response = await api.getFeaturedProducts(6);
      
      if (response && response.data && response.data.length > 0) {
        // Clear existing products
        productsContainer.innerHTML = '';
        
        // Render each product
        response.data.forEach(product => {
          const item = document.createElement('div');
          item.className = 'bg-white rounded-lg shadow-lg overflow-hidden';
          
          item.innerHTML = `
            <div class="relative aspect-[4/3]">
              <img src="${product.imageUrl || 'https://placehold.co/600x400?text=Product+Image'}" alt="${product.name}" class="w-full h-full object-cover">
              <div class="absolute top-4 right-4 bg-black/80 text-white px-4 py-2 rounded-full font-opensans text-sm">
                <span class="stock-counter" data-stock="${product.stock}">${product.stock} prints remaining</span>
              </div>
            </div>
            <div class="p-8">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="font-playfair text-2xl font-semibold mb-2">${product.name}</h3>
                  <p class="text-gray-600 mb-4">${product.description || 'Limited edition fine art print, museum-quality archival paper'}</p>
                </div>
                <div class="text-right">
                  <p class="text-3xl font-semibold">$${product.price.toFixed(2)}</p>
                  <p class="text-sm text-gray-500">${product.size || ''}</p>
                </div>
              </div>
              <button class="w-full bg-primary text-white py-4 font-opensans font-medium !rounded-button whitespace-nowrap hover:bg-primary/90 transition-colors add-to-cart" 
                data-id="${product._id}" 
                data-name="${product.name}" 
                data-price="${product.price}"
                ${product.stock <= 0 ? 'disabled' : ''}>
                ${product.stock <= 0 ? 'Sold Out' : 'Add to Cart'}
              </button>
            </div>
          `;
          
          productsContainer.appendChild(item);
        });
        
        // Re-initialize cart functionality for the new buttons
        initializeCart();
      } else {
        // Use the existing static products as fallback
        console.log('No products found in API, using fallback products');
      }
    } catch (error) {
      console.error('Error fetching featured products:', error);
      // Keep the existing products as fallback
    }
  } catch (error) {
    console.error('Error in loadFeaturedProducts:', error);
  }
}

/**
 * Check authentication status
 */
async function checkAuthStatus() {
  const authToken = localStorage.getItem('authToken');
  
  if (authToken) {
    try {
      // Verify token by getting user profile
      const userData = await api.getProfile();
      
      // User is authenticated
      console.log('User is authenticated:', userData);
      
      // Update UI with user info if needed
      // For example, show user's name or profile pic
    } catch (error) {
      // Token is invalid or expired
      console.error('Authentication error:', error);
      localStorage.removeItem('authToken');
    }
  } else {
    // User is not authenticated
    console.log('User is not authenticated');
    
    // Update UI for non-authenticated users if needed
  }
}
