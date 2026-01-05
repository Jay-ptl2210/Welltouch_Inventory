# Deployment Guide for Render

This guide will help you deploy the Welltouch Inventory Management System to Render.

## Prerequisites

1. A GitHub account
2. A Render account (sign up at https://render.com)
3. A MongoDB Atlas account (for database)
4. Your code pushed to a GitHub repository

## Step 1: Prepare Your Code

### 1.1 Push to GitHub

If you haven't already, push your code to GitHub:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 1.2 Verify Files

Make sure these files exist in your repository:
- `package.json` (root)
- `server/index.js`
- `client/package.json`
- `render.yaml` (optional, for easier setup)

## Step 2: Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster (M0)
3. Create a database user (save username and password)
4. Whitelist IP: Add `0.0.0.0/0` for development (or your Render IP)
5. Get connection string: Click "Connect" → "Connect your application"
6. Copy the connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/`)

## Step 3: Deploy to Render

### Option A: Using Render Dashboard (Recommended)

1. **Sign in to Render**
   - Go to https://dashboard.render.com
   - Sign in or create an account

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your repository

3. **Configure Service**
   - **Name**: `welltouch-inventory` (or your preferred name)
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (root of repo)
   - **Build Command**: `npm run render-build`
   - **Start Command**: `npm start`

4. **Set Environment Variables**
   Click "Advanced" → "Add Environment Variable" and add:

   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/welltouch-inventory?retryWrites=true&w=majority
   JWT_ACCESS_SECRET=your-super-secret-access-token-key-change-this
   JWT_REFRESH_SECRET=your-super-secret-refresh-token-key-change-this
   CLIENT_URL=https://your-app-name.onrender.com
   PORT=10000
   ```

   **Important**: 
   - Replace `username` and `password` with your MongoDB Atlas credentials
   - Replace `your-app-name.onrender.com` with your actual Render URL (you'll get this after deployment)
   - Use strong, random strings for JWT secrets (you can generate them online)

5. **Deploy**
   - Click "Create Web Service"
   - Render will start building and deploying your app
   - Wait for deployment to complete (5-10 minutes)

6. **Get Your URL**
   - Once deployed, you'll get a URL like: `https://welltouch-inventory.onrender.com`
   - Update `CLIENT_URL` environment variable with this URL
   - Redeploy if needed

### Option B: Using render.yaml (Alternative)

If you created `render.yaml`, you can use it:

1. Push `render.yaml` to your repository
2. In Render dashboard, select "New" → "Blueprint"
3. Connect your repository
4. Render will read `render.yaml` and create the service
5. You'll still need to set environment variables in the dashboard

## Step 4: Verify Deployment

1. **Check Health Endpoint**
   - Visit: `https://your-app.onrender.com/api/health`
   - Should return: `{"status":"OK","message":"Server is running"}`

2. **Test Application**
   - Visit: `https://your-app.onrender.com`
   - Try registering a new user
   - Test adding products and transactions

## Step 5: Update Environment Variables (If Needed)

If you need to update environment variables after deployment:

1. Go to your service in Render dashboard
2. Click "Environment" tab
3. Add or update variables
4. Click "Save Changes"
5. Service will automatically redeploy

## Troubleshooting

### Build Fails

- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Render uses Node 18+ by default)

### Database Connection Issues

- Verify MongoDB Atlas connection string
- Check IP whitelist in MongoDB Atlas (should include Render IPs)
- Verify database user credentials

### Application Not Loading

- Check server logs in Render dashboard
- Verify `CLIENT_URL` matches your Render URL
- Ensure frontend build completed successfully

### CORS Errors

- Update `CLIENT_URL` environment variable
- Ensure it matches your Render URL exactly (with https://)

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `JWT_ACCESS_SECRET` | Secret for access tokens | Random string |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Random string |
| `CLIENT_URL` | Your Render app URL | `https://app.onrender.com` |
| `PORT` | Server port (Render sets this automatically) | `10000` |

## Notes

- Render free tier services spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- For production, consider upgrading to a paid plan
- Keep your JWT secrets secure and never commit them to Git

## Support

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com

