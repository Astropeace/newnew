# Photography Website Backend

A complete backend solution for the photography website, providing APIs for portfolio management, e-commerce, and booking functionality.

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the server directory
3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file based on the provided `.env.example` with your own values
5. Start the development server:

```bash
npm run dev
```

## Features

- **User Authentication**: Register, login, profile management
- **Portfolio Management**: Upload, categorize and manage photography portfolio
- **E-commerce**: Sell limited edition prints and other merchandise
- **Booking System**: Schedule photography sessions with clients
- **Image Processing**: Optimize images for web and create thumbnails
- **Storage Options**: Local filesystem or AWS S3 for image storage
- **Portfolio Import**: Import existing images from local directories

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login existing user
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/updateprofile` - Update user profile
- `PUT /api/auth/updatepassword` - Update user password
- `GET /api/auth/logout` - Logout user

### Images (Portfolio)

- `GET /api/images` - Get all images (with filtering & pagination)
- `GET /api/images/:id` - Get single image
- `POST /api/images` - Upload new image
- `PUT /api/images/:id` - Update image
- `DELETE /api/images/:id` - Delete image

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `PUT /api/products/:id/stock` - Update product stock
- `GET /api/products/featured` - Get featured products
- `GET /api/products/category/:categoryName` - Get products by category

### Orders

- `GET /api/orders` - Get all orders (admin)
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create new order
- `PUT /api/orders/:id/status` - Update order status
- `POST /api/orders/create-payment-intent` - Create Stripe payment intent
- `POST /api/orders/webhook` - Handle Stripe webhooks
- `GET /api/orders/myorders` - Get current user's orders

### Bookings

- `GET /api/bookings` - Get all bookings (admin)
- `GET /api/bookings/:id` - Get single booking
- `POST /api/bookings` - Create new booking
- `PUT /api/bookings/:id` - Update booking details
- `PUT /api/bookings/:id/status` - Update booking status
- `PUT /api/bookings/:id/assign` - Assign photographer to booking
- `PUT /api/bookings/:id/cancel` - Cancel booking
- `POST /api/bookings/calendly-webhook` - Handle Calendly webhooks
- `GET /api/bookings/mybookings` - Get current user's bookings

### Import

- `POST /api/import/portfolio` - Import images from directory to portfolio
- `POST /api/import/check-directory` - Check directory contents

## License

[MIT](LICENSE)
