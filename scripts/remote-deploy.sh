#!/bin/bash

# remote-deploy.sh
# Usage: ./remote-deploy.sh <VM_IP> <SSH_KEY_PATH> <TENANT_ID>

VM_IP=$1
SSH_KEY=$2
TENANT_ID=$3

if [ -z "$VM_IP" ] || [ -z "$SSH_KEY" ] || [ -z "$TENANT_ID" ]; then
    echo "Usage: ./remote-deploy.sh <VM_IP> <SSH_KEY_PATH> <TENANT_ID>"
    exit 1
fi

echo "🚀 Starting remote deployment for $TENANT_ID at $VM_IP..."

# Connect to the remote VM and run the deployment commands
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@"$VM_IP" << EOF
    # Navigate to the app directory
    cd ~/frame || git clone https://github.com/HarshaGudigar/frame.git ~/frame
    cd ~/frame
    
    # Pull latest changes
    git pull origin main
    
    # Safely update only the tenant-specific env vars (preserves existing vars)
    # Remove old values if they exist, then append new ones
    touch .env.production
    sed -i '/^APP_TENANT_ID=/d' .env.production
    sed -i '/^MONGODB_URI=/d' .env.production
    echo "APP_TENANT_ID=$TENANT_ID" >> .env.production
    echo "MONGODB_URI=mongodb://localhost:27017/$TENANT_ID" >> .env.production
    
    # Build and restart containers
    sudo docker compose down
    sudo docker compose up -d --build
EOF

echo "✅ Deployment for $TENANT_ID completed."
