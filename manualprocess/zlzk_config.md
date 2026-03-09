# ZooKeeper Configuration Steps (Extracted from History)

## Problem Identified
ZooKeeper pods were failing with "Unable to find Pid zlzookeeper-0 port=-1 in server list" due to a port mismatch between the configuration file inside the container and the Kubernetes services.

**Root Cause:**
- `zkQuorum.cfg` inside container used ports `2881/3881` (peer/election)
- Kubernetes StatefulSet and services exposed ports `2888/3888`
- This mismatch prevented proper quorum formation

## Solution Steps

### Step 1: Create ZooKeeper Quorum Configuration ConfigMap

Create a ConfigMap that overrides the `zkQuorum.cfg` file with correct port configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: zk-quorum-config
  namespace: default
data:
  zkQuorum.cfg: |
    #if !_ZK_SERVER_CONFIG_FILE_IS_INCLUDED
    #define _ZK_SERVER_CONFIG_FILE_IS_INCLUDED = true

    //Replace below commented sample auth configuration with output from the command "zkauth -g" on the command line
    _zlzk.auth=#com.zlti.zlzookeeper.ZLZKAuth~~/aIpFRJV+AkUAxTpiXuKbxggADMgJwSSbqk6eDR1mu+hzrO/H923Q/jbLTrNqXnGVt+DmJkd7B0BqsMBzCJWCA==

    // id,machine,clientPort,peerPort,electionPort,dataDir,[hostname]
    zkQuorum.1=1~~zlzookeeper-0~~2181~~2888~~3888~~/var/ZipLip/DATA/ZooKeeper/zk1_2888~~zlzookeeper-0.zk-hs.default.svc.cluster.local
    zkQuorum.2=2~~zlzookeeper-1~~2181~~2888~~3888~~/var/ZipLip/DATA/ZooKeeper/zk2_2888~~zlzookeeper-1.zk-hs.default.svc.cluster.local
    zkQuorum.3=3~~zlzookeeper-2~~2181~~2888~~3888~~/var/ZipLip/DATA/ZooKeeper/zk3_2888~~zlzookeeper-2.zk-hs.default.svc.cluster.local

    acv.zkQuorum=#wsi.config.AllConfigVariables~~@NAMES_THAT_START_WITH@~~zkQuorum.

    #endif
```

**Key Configuration Details:**
- **Client Port:** 2181 (for application connections)
- **Peer Port:** 2888 (for inter-node communication)
- **Election Port:** 3888 (for leader election)
- **Data Directory:** `/var/ZipLip/DATA/ZooKeeper/zk{id}_{peerPort}`
- **Hostnames:** Use headless service DNS names (`zlzookeeper-{id}.zk-hs.default.svc.cluster.local`)

### Step 2: Update StatefulSet to Mount ConfigMap

Patch the ZooKeeper StatefulSet to mount the ConfigMap as a volume:

```bash
kubectl patch statefulset zlzookeeper -n default --type='json' -p='[
  {"op": "add", "path": "/spec/template/spec/volumes", "value": [{"name": "zk-quorum-config", "configMap": {"name": "zk-quorum-config"}}]},
  {"op": "add", "path": "/spec/template/spec/containers/0/volumeMounts/-", "value": {"name": "zk-quorum-config", "mountPath": "/opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg", "subPath": "zkQuorum.cfg"}}
]'
```

**What this does:**
- Adds a volume named `zk-quorum-config` that references the ConfigMap
- Mounts the `zkQuorum.cfg` file from the ConfigMap to `/opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg` in the container
- Uses `subPath` to mount only the specific file, not the entire ConfigMap directory

### Step 3: Restart ZooKeeper Pods

Force delete and recreate the ZooKeeper pods to pick up the new configuration:

```bash
kubectl delete pod zlzookeeper-0 zlzookeeper-1 zlzookeeper-2 -n default --force --grace-period=0
```

**Why force delete:**
- Ensures pods restart immediately with new configuration
- Bypasses graceful shutdown which might not work with broken config

### Step 4: Verify ZooKeeper Cluster Health

Monitor pod startup and check logs for successful quorum formation:

```bash
# Watch pods come up
kubectl get pods -n default -l app=zlzookeeper -o wide

# Check logs for leader election and quorum messages
kubectl logs zlzookeeper-0 -n default --tail=30
kubectl logs zlzookeeper-1 -n default --tail=15
kubectl logs zlzookeeper-2 -n default --tail=15
```

**Expected log messages indicating success:**
- "Leader election working"
- "Session authentication successful"
- "Cluster is communicating properly"
- One node shows as "leader", others as "followers"

## Additional Configuration Files

### ZooKeeper Services (Prerequisites)

**Headless Service (zk-hs.yaml):**
```yaml
apiVersion: v1
kind: Service
metadata:
  labels:
    app: zlzookeeper
  name: zk-hs
spec:
  ports:
  - port: 2888
    name: server
  - port: 3888
    name: leader-election
  clusterIP: None
  selector:
    app: zlzookeeper
```

**Client Service (zk-cs.yaml):**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: zk-cs
  labels:
    app: zlzookeeper
spec:
  ports:
  - port: 2181
    name: client
  selector:
    app: zlzookeeper
```

### Application Configuration (zlapp-config.yaml)

The application ConfigMap should include ZooKeeper server addresses:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: zlapp-config
data:
  ZOO_SERVERS: zlzookeeper-0.zk-hs.default.svc.cluster.local:2181,zlzookeeper-1.zk-hs.default.svc.cluster.local:2181,zlzookeeper-2.zk-hs.default.svc.cluster.local:2181
  TIKA_HOST: zltika
  TIKA_PORT: "9972"
```

## Deployment Order

1. **Services:** `zk-hs.yaml`, `zk-cs.yaml`
2. **ConfigMaps:** `zlapp-config.yaml`, `zk-quorum-config.yaml`
3. **StatefulSet:** `zlzookeeper-statefulset.yaml` (with ConfigMap mount)
4. **Applications:** Deploy after ZooKeeper is healthy

## Troubleshooting

**If pods still fail:**
- Check that ConfigMap is mounted correctly: `kubectl exec zlzookeeper-0 -- cat /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg`
- Verify ports match between ConfigMap and services
- Check pod logs for specific error messages

**If quorum doesn't form:**
- Ensure all 3 pods can communicate via headless service DNS names
- Check that data directories are writable
- Verify authentication configuration is correct

## Summary

The key to successful ZooKeeper deployment was identifying and fixing the port mismatch between the container's baked-in configuration (2881/3881) and the Kubernetes service exposure (2888/3888). By creating a ConfigMap that overrides the `zkQuorum.cfg` file with the correct ports, the ZooKeeper cluster can properly form quorum and elect a leader.</content>
<parameter name="filePath">c:\Projects\aws-zl\zlzk_config.md