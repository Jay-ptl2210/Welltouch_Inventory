# Welltouch Inventory Management System

A full-stack React application with MongoDB and JWT authentication for managing inventory for Welltouch Hygiene products. This application allows you to track finished goods inventory, add new products, manage transactions (produce/delivered), and view a comprehensive dashboard.

## Features

- **Secure Authentication**: JWT-based authentication with access and refresh tokens
- **User Management**: Register, login, and logout functionality
- **Dashboard**: View current stock levels for all products organized by name and size
- **Add Products**: Add new products with name, size, quantity (liner or pics), and previous stock
- **Manage Products**: Record transactions (produce or delivered) with filtering capabilities
- **Transaction History**: View and filter all transactions by product, size, and date
- **Fully Responsive**: Works seamlessly on mobile devices, tablets, and desktops

## Technology Stack

- **Frontend**: React 18, React Router, Tailwind CSS, Vite, Axios
- **Backend**: Node.js, Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) with access and refresh tokens
- **Security**: Bcrypt for password hashing, protected routes

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

## Installation

1. **Clone the repository** (if applicable)

2. **Install server dependencies:**
```bash
npm install
```

3. **Install client dependencies:**
```bash
cd client
npm install
cd ..
```

Or use the convenience script:
```bash
npm run install-all
```

4. **Set up environment variables:**
   - Create a `.env` file in the root directory (same level as `package.json`)
   - Add the following variables:
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/welltouch-inventory?retryWrites=true&w=majority
     JWT_ACCESS_SECRET=your-super-secret-access-token-key-change-this-in-production
     JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this-in-production
     PORT=5000
     CLIENT_URL=http://localhost:3000
     NODE_ENV=development
     ```
   
   **Important:** The `MONGODB_URI` is required and must be set to your MongoDB Atlas connection string.

## MongoDB Setup

### Option 1: Local MongoDB

1. Install MongoDB on your system
2. Start MongoDB service:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl start mongod
   ```
3. Use the default connection string: `mongodb://localhost:27017/welltouch-inventory`

### Option 2: MongoDB Atlas (Cloud) - **Recommended**

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (Free tier M0 is sufficient)
3. Create a database user:
   - Go to "Database Access" → "Add New Database User"
   - Choose "Password" authentication
   - Create a username and password (save these!)
4. Whitelist your IP address:
   - Go to "Network Access" → "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0) for development, or add your specific IP
5. Get your connection string:
   - Go to "Database" → "Connect" → "Connect your application"
   - Copy the connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/`)
   - Replace `<password>` with your database user password
   - Replace `<database>` with `welltouch-inventory` (or your preferred database name)
   - Add `?retryWrites=true&w=majority` at the end
6. Set the connection string in your `.env` file as `MONGODB_URI`

## Running the Application

### Development Mode (runs both server and client)

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend development server on `http://localhost:3000`

### Run Separately

**Backend only:**
```bash
npm run server
```

**Frontend only:**
```bash
npm run client
```

## Usage

1. **Register**: Create a new account at `/register`
2. **Login**: Sign in with your credentials at `/login`
3. **Dashboard**: Navigate to the home page to see current inventory levels
4. **Add Product**: Click "Add Product" to add new products to the inventory
5. **Manage Products**: Use "Manage Products" to record produce or delivered transactions
6. **Filter Transactions**: Use the filters in the transaction history to find specific records
7. **Logout**: Click on your name in the navigation bar and select "Logout"

## Project Structure

```
welltouch-inventory/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/          # Reusable components
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/             # React contexts
│   │   │   └── AuthContext.jsx
│   │   ├── pages/               # Page components
│   │   │   ├── Home.jsx
│   │   │   ├── AddProduct.jsx
│   │   │   ├── ManageProducts.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── services/            # API service functions
│   │   │   └── api.js
│   │   └── App.jsx              # Main app component
│   └── package.json
├── server/                      # Node.js backend
│   ├── config/                  # Configuration files
│   │   └── database.js
│   ├── middleware/              # Express middleware
│   │   └── auth.js
│   ├── models/                  # Mongoose models
│   │   ├── User.js
│   │   ├── Product.js
│   │   └── Transaction.js
│   ├── routes/                  # API routes
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── transactions.js
│   │   └── dashboard.js
│   └── index.js                 # Express server
├── .env.example                 # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user (Protected)
- `GET /api/auth/me` - Get current user (Protected)

### Products (Protected)
- `GET /api/products` - Get all products for the current user
- `POST /api/products` - Add a new product

### Transactions (Protected)
- `GET /api/transactions` - Get all transactions for the current user
- `POST /api/transactions` - Add a new transaction

### Dashboard (Protected)
- `GET /api/dashboard` - Get dashboard data (aggregated by product and size)

## Security Features

- **Password Hashing**: Passwords are hashed using bcrypt before storing
- **JWT Authentication**: Access tokens (15min expiry) and refresh tokens (7 days expiry)
- **Protected Routes**: All API endpoints (except auth) require valid JWT token
- **Token Refresh**: Automatic token refresh on expiry
- **User Isolation**: Each user only sees and manages their own products and transactions

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Required: MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/welltouch-inventory?retryWrites=true&w=majority

# Required: JWT Secrets (use strong, random strings in production)
JWT_ACCESS_SECRET=your-super-secret-access-token-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this-in-production

# Optional: Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

**Note:** The `MONGODB_URI` is required. The application will not start without it.

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong, unique secrets for JWT tokens
3. Use MongoDB Atlas or secure MongoDB instance
4. Set proper CORS origins in `CLIENT_URL`
5. Build the frontend: `npm run build`
6. Serve the built files from the backend or a CDN
7. Use environment variables for all sensitive data

## License

ISC