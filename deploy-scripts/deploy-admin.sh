#!/bin/bash

# Separate deployment script for admin dashboard
echo "Deploying Admin Dashboard..."

# Build admin-only version
npm run build:admin

# Deploy to separate subdomain
vercel --prod --scope admin-100x

# Or deploy to separate server
# rsync -avz ./admin-build/ admin-server:/var/www/admin/

echo "Admin dashboard deployed to https://admin.100x.com"
