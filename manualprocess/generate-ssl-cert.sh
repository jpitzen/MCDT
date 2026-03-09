#!/bin/bash
# Generate self-signed SSL certificate for zlui

# Generate private key and certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key \
  -out tls.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=*.elb.amazonaws.com"

# Create Kubernetes secret
kubectl create secret tls zlui-ssl-cert \
  --cert=tls.crt \
  --key=tls.key \
  --namespace=default \
  --dry-run=client -o yaml > zlui-ssl-secret.yaml

echo "SSL certificate generated!"
echo "Apply with: kubectl apply -f zlui-ssl-secret.yaml"

# Clean up local files
rm -f tls.key tls.crt
