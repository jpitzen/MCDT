#!/bin/bash
# ---------------------------------------------------------------------------
# Bastion / EC2 User Data — Auto-mount EFS for ZL Vault
#
# Template variables (populated by Terraform templatefile()):
#   ${efs_dns_name}   — EFS file-system DNS name (fs-xxx.efs.region.amazonaws.com)
#   ${mount_point}    — local mount path (default: /var/opt/zlvault)
#   ${aws_region}     — AWS region for EFS utils configuration
# ---------------------------------------------------------------------------
set -euo pipefail

MOUNT_POINT="${mount_point}"
EFS_DNS="${efs_dns_name}"
AWS_REGION="${aws_region}"

echo ">>> [ZLAWS] Bastion userdata — starting EFS mount setup"

# -- 1. Install amazon-efs-utils (Amazon Linux 2 / AL2023) -------------------
if command -v dnf &>/dev/null; then
  dnf install -y amazon-efs-utils nfs-utils
elif command -v yum &>/dev/null; then
  yum install -y amazon-efs-utils nfs-utils
elif command -v apt-get &>/dev/null; then
  apt-get update -y
  apt-get install -y nfs-common git binutils rustc cargo pkg-config libssl-dev
  if [ ! -d /tmp/efs-utils ]; then
    git clone https://github.com/aws/efs-utils /tmp/efs-utils
    cd /tmp/efs-utils && ./build-deb.sh && dpkg -i build/amazon-efs-utils*.deb
  fi
fi

# -- 2. Configure EFS region -------------------------------------------------
if [ -f /etc/amazon/efs/efs-utils.conf ]; then
  sed -i "s/#region = us-east-1/region = $AWS_REGION/" /etc/amazon/efs/efs-utils.conf
fi

# -- 3. Create mount point & mount -------------------------------------------
mkdir -p "$MOUNT_POINT"

# Try EFS mount helper first (TLS), fall back to plain NFS
if command -v mount.efs &>/dev/null; then
  mount -t efs -o tls "$EFS_DNS":/ "$MOUNT_POINT" || \
    mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2 \
      "$EFS_DNS":/ "$MOUNT_POINT"
else
  mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2 \
    "$EFS_DNS":/ "$MOUNT_POINT"
fi

# -- 4. Persist in /etc/fstab -------------------------------------------------
if ! grep -q "$EFS_DNS" /etc/fstab; then
  echo "$EFS_DNS:/ $MOUNT_POINT efs _netdev,tls 0 0" >> /etc/fstab
fi

# -- 5. Create vault directory structure --------------------------------------
mkdir -p "$MOUNT_POINT"/{keys,certs,config,models,logs}
chmod -R 700 "$MOUNT_POINT"

echo ">>> [ZLAWS] EFS mounted at $MOUNT_POINT"

# -- 6. Install kubectl for cluster admin work --------------------------------
if ! command -v kubectl &>/dev/null; then
  curl -LO "https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
  rm -f kubectl
  echo ">>> [ZLAWS] kubectl installed"
fi

echo ">>> [ZLAWS] Bastion userdata complete"
