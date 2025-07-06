#!/bin/bash

# Environment Setup Script
# Usage: ./setup-env.sh [dev|prod]

if [ "$1" = "dev" ]; then
    echo "Setting up DEVELOPMENT environment..."
    cp .env.development .env
    echo "✅ Development environment loaded (.env.development -> .env)"
    echo "You can now run: npm run dev"
elif [ "$1" = "prod" ]; then
    echo "Setting up PRODUCTION environment..."
    cp .env.production .env
    echo "✅ Production environment loaded (.env.production -> .env)"
    echo "You can now run: npm run build && npm start"
else
    echo "Usage: ./setup-env.sh [dev|prod]"
    echo "  dev  - Load development environment"
    echo "  prod - Load production environment"
fi
