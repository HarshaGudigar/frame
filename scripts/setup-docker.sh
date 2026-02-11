#!/bin/bash

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install -y docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Allow current user to run docker (requires re-login or 'newgrp docker')
sudo usermod -aG docker $USER

echo "Docker installation complete. Please log out and back in for group changes to take effect."
