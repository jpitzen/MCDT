#!/bin/bash

# Need to overwrite zkQuorum.cfg for Kubernetes ZooKeeper StatefulSet
if [[ -z "${ZOO_SERVERS}" ]]; then
    echo "ZOO_SERVERS is not set"
else
    zooservers=($ZOO_SERVERS)
    QUORUM_LIST=""
    for i in "${!zooservers[@]}"; do
        QUORUM_LIST+=$(printf "zkQuorum.%d=%d~~%s~~2181~~2881~~3881~~\/var\/ZipLip\/DATA\/ZooKeeper\/zk%d_2881~~%s\\\\n" $((i+1)) $((i+1)) "${zooservers[i]}" $((i+1)) "${zooservers[i]}.zk-hs.default.svc.cluster.local") 
    done
        
    sed -i -e "8i $QUORUM_LIST" -e '/^zkQuorum/d'  /opt/ZipLip/ZLZooKeeper/config/zkQuorum.cfg
fi


/opt/ZipLip/ZLZooKeeper/bin/zlzk.sh