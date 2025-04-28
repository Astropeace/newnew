// Mobile Menu Toggle
document.getElementById('menu-toggle').addEventListener('click', () => {
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenu.classList.toggle('hidden');
});

// Cart Management
let cart = JSON.parse(localStorage.getItem('cart')) || [];
const cartCount = document.getElementById('cart-count');

function updateCartCount() {
    cartCount.textContent = cart.length;
    localStorage.setItem('cart', JSON.stringify(cart));
    updateStockCounters();
}

document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', (e) => {
        const product = {
            id: e.target.dataset.id,
            name: e.target.dataset.name,
            price: e.target.dataset.price
        };
        cart.push(product);
        updateCartCount();
    });
});

// Countdown Timer
function updateCountdown() {
    const countdownDate = new Date();
    countdownDate.setDate(countdownDate.getDate() + 7);
    const countdownElement = document.getElementById('countdown');

    function update() {
        const now = new Date().getTime();
        const distance = countdownDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        countdownElement.textContent = `Time remaining: ${days}d ${hours}h ${minutes}m`;
    }

    update();
    setInterval(update, 60000);
}

// Stock Counter Updates
function updateStockCounters() {
    document.querySelectorAll('.stock-counter').forEach(element => {
        const stock = parseInt(element.dataset.stock);
        const itemsInCart = cart.filter(item => item.id === element.closest('.product-card').dataset.productId).length;
        element.textContent = `${stock - itemsInCart} prints remaining`;
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateCountdown();
    updateCartCount();
});