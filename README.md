# Noel Photography Website

A full-stack photography website with portfolio management, e-commerce capabilities for limited edition prints, and a booking system.

## Project Structure

- `/server` - Backend Node.js/Express server with MongoDB
- `/js` - Frontend JavaScript
- `/index.html` - Main frontend HTML

## Features

- **Portfolio Management**: Display and organize photography portfolio
- **E-commerce**: Sell limited edition prints with secure payment processing
- **Booking System**: Schedule and manage photography sessions
- **Image Processing**: Optimize images for web and generate thumbnails
- **User Authentication**: Secure user accounts with role-based permissions

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB
- npm or yarn

### Installation & Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/noel-photography.git
cd noel-photography
```

2. Install backend dependencies:
```bash
cd server
npm install
```

3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the values with your specific configuration

4. Start the development server:
```bash
npm run dev
```

5. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Backend API

The backend provides a comprehensive REST API for all website functionality. See the [server README](server/README.md) for detailed API documentation.

## Portfolio Import

The website includes a feature to import existing portfolio images from your local directories. Use the import API to automatically process and integrate your existing portfolio.

## Deployment

### Frontend

You can deploy the frontend to any static hosting service such as GitHub Pages, Netlify, or Vercel.

### Backend

The backend can be deployed to services like:
- Heroku
- Digital Ocean
- AWS EC2
- Google Cloud Run

Remember to set up proper environment variables for your production environment.

## License

[MIT](LICENSE)
