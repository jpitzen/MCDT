# AWS Deployment YAML Files - December 19, 2025
# Updated with new images (zlserver20251219, zlui20251219, etc.)
# Configured for AWS EKS infrastructure

# Image Configuration:
# - zlserver: 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlserver20251219
# - zlui: 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlui20251219
# - zlzookeeper: 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zlzookeeper20251219
# - zltika: 995553364920.dkr.ecr.us-east-1.amazonaws.com/ue1-zlps-ecr-01:zltika20251219

# Database Configuration (AWS RDS):
# - Host: use1-zlps-msexpsql-01-eks.c5s06occm2dn.us-east-1.rds.amazonaws.com
# - Database: zldb
# - User: pfuser
# - Password: LJZ-wkVv@t_!d*PiM2tbx3TZ4h (base64: TEpaLXdrVnZAdF8hZCpQaU0ydGJ4M1RaNGg=)

# These images contain:
# ✅ Fixed tcdb.cfg with proper ZooKeeper password encryption
# ✅ Updated DocumentConversion.xml with correct Tika service configuration
# ✅ Database schema with 394 tables, synonyms, and ZLInstance data
# ✅ Java 21 runtime environment
# ✅ Current configuration state as of December 19, 2025