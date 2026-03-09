# ZL Application Local Minikube Deployment Guide

## Prerequisites

1. **Minikube Installation**: Ensure Minikube is installed and running
   ```bash
   minikube start --driver=docker
   ```

2. **kubectl**: Ensure kubectl is configured to use Minikube
   ```bash
   kubectl config use-context minikube
   ```

3. **Docker**: Ensure Docker is running with b1140 images available locally
   ```bash
   docker images | grep b1140
   ```

## Database Setup

1. **Deploy MS SQL Express**:
   ```bash
   kubectl apply -f yaml/mssql-deployment.yaml
   ```

2. **Wait for database to be ready**:
   ```bash
   kubectl get pods -l app=mssql-express
   kubectl logs -l app=mssql-express
   ```

3. **Initialize the database** (optional - if you have database scripts):
   - Copy your database initialization scripts to a temporary pod
   - Run the scripts against the mssql-service

## ZooKeeper Cluster Deployment

1. **Deploy ZooKeeper ConfigMap**:
   ```bash
   kubectl apply -f yaml/zk-config.yaml
   ```

2. **Deploy ZooKeeper Services**:
   ```bash
   kubectl apply -f yaml/zk-hs.yaml
   kubectl apply -f yaml/zk-cs.yaml
   ```

3. **Deploy ZooKeeper StatefulSet**:
   ```bash
   kubectl apply -f yaml/zlzookeeper-statefulset.yaml
   ```

4. **Verify ZooKeeper cluster**:
   ```bash
   kubectl get pods -l app=zlzookeeper
   kubectl logs zlzookeeper-0
   ```

## Application Configuration

1. **Deploy ConfigMaps**:
   ```bash
   kubectl apply -f yaml/db-config.yaml
   kubectl apply -f yaml/db-secret.yaml
   kubectl apply -f yaml/zlapp-config.yaml
   kubectl apply -f yaml/docconvert-configmap.yaml
   ```

## Storage Setup

1. **Deploy Persistent Volume Claims**:
   ```bash
   kubectl apply -f yaml/zlserver-pvcs.yaml
   kubectl apply -f yaml/zltika-pvc.yaml
   kubectl apply -f yaml/zlui-pvc.yaml
   ```

## Application Deployment

1. **Deploy ZL Server**:
   ```bash
   kubectl apply -f yaml/zlserver-deployment.yaml
   ```

2. **Deploy Tika Service**:
   ```bash
   kubectl apply -f yaml/zltika-deployment.yaml
   kubectl apply -f yaml/zltika-service.yaml
   ```

3. **Deploy ZL UI**:
   ```bash
   kubectl apply -f yaml/zlui-deployment.yaml
   kubectl apply -f yaml/zlui-service.yaml
   ```

## Access the Application

1. **Get service URLs**:
   ```bash
   minikube service zlui --url
   ```

2. **Check all pods are running**:
   ```bash
   kubectl get pods
   ```

3. **Check service endpoints**:
   ```bash
   kubectl get services
   ```

## Troubleshooting

### Common Issues

1. **PVC Pending**: Check if Minikube has enough resources for persistent volumes
2. **Pod Crashes**: Check logs with `kubectl logs <pod-name>`
3. **Local Images Not Found**: Ensure b1140 images are available in local Docker: `docker images | grep b1140`

### Useful Commands

```bash
# Check cluster status
kubectl get all

# Check pod logs
kubectl logs <pod-name>

# Describe resources
kubectl describe pod <pod-name>
kubectl describe pvc <pvc-name>

# Access pod shell
kubectl exec -it <pod-name> -- /bin/bash

# Port forward for debugging
kubectl port-forward svc/zlui 8080:80
```

## Configuration Notes

- Database: MS SQL Express with sa user
- ZooKeeper: 3-node cluster with internal service discovery
- All services use ClusterIP except ZL UI (LoadBalancer)
- Storage: Local persistent volumes (5Gi each)
- Images: Local Docker images with b1140 tags (imagePullPolicy: Never)

## Cleanup

To remove the deployment:
```bash
kubectl delete -f yaml/ --recursive
minikube stop
```