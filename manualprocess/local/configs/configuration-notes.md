# Local Minikube Configuration Notes

## Database Configuration
- Host: mssql-service
- Port: 1433
- Database: zldb
- User: sa
- Password: YourStrong!Passw0rd

## ZooKeeper Configuration
- Cluster: 3 nodes (zlzookeeper-0, zlzookeeper-1, zlzookeeper-2)
- Client Port: 2181
- Peer Ports: 2888, 3888
- Service: zk-cs (client), zk-hs (headless)

## Application Services
- ZL Server: zlserver (port 9972)
- Tika: zltika (port 9972)
- ZL UI: zlui (ports 80, 8000, 9970, 9975)

## Storage
- All PVCs use default storage class
- Size: 5Gi for logs/temp, 10Gi for database and ZooKeeper data

## Images
- Local Docker images with b1140 tags
- ImagePullPolicy: Never (uses local images)
- Images: zlzookeeper:zlzookeeper11.1.0-b1140, zlserver:zlserver11.1.0-b1140, zltika:zltika11.1.0-b1140, zlui:zlui11.1.0-b1140

## Networking
- All services use ClusterIP except ZL UI (LoadBalancer)
- Minikube tunnel may be required for LoadBalancer services

## Environment Variables
- JAVA_HOME: /usr/lib/jvm/java-21-openjdk-amd64
- Database connection via ConfigMap/Secret
- ZooKeeper servers via ConfigMap

## Troubleshooting
- Check Minikube dashboard: minikube dashboard
- View logs: kubectl logs <pod-name>
- Debug networking: kubectl exec -it <pod-name> -- /bin/bash