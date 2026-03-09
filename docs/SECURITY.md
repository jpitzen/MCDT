# Security Guide

Comprehensive security guidelines for the AWS EKS Deployment Platform.

## Table of Contents

1. [Credential Management](#credential-management)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Network Security](#network-security)
5. [AWS IAM Security](#aws-iam-security)
6. [Vault Integration](#vault-integration)
7. [Audit Logging](#audit-logging)
8. [Incident Response](#incident-response)
9. [Security Checklist](#security-checklist)

---

## Credential Management

### Secure Credential Storage

All AWS credentials are encrypted using AES-256 encryption before storage:

```javascript
// Backend service - credential encryption
const crypto = require('crypto');

function encryptCredential(accessKey, secretKey, encryptionKey) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  
  let encrypted = cipher.update(secretKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    encrypted: encrypted
  };
}

function decryptCredential(encryptedData, encryptionKey) {
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', encryptionKey, iv);
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Credential Rotation

Implement automatic credential rotation:

```bash
#!/bin/bash
# Rotate AWS credentials every 90 days

ROTATION_INTERVAL_DAYS=90
CURRENT_DATE=$(date +%s)
LAST_ROTATED=$(grep "lastRotated" credentials.json | sed 's/.*: "\([^"]*\)".*/\1/')
LAST_ROTATED_EPOCH=$(date -d "$LAST_ROTATED" +%s)
DIFF=$((($CURRENT_DATE - $LAST_ROTATED_EPOCH) / 86400))

if [ $DIFF -gt $ROTATION_INTERVAL_DAYS ]; then
  echo "Rotating AWS credentials..."
  aws iam create-access-key --user-name deployer
  # Archive old keys after verification
  aws iam delete-access-key --access-key-id <OLD_KEY_ID>
fi
```

### Password Policy

```javascript
// Enforce strong password requirements
const passwordPolicy = {
  minLength: 14,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

function validatePassword(password) {
  const errors = [];
  
  if (password.length < passwordPolicy.minLength) {
    errors.push(`Password must be at least ${passwordPolicy.minLength} characters`);
  }
  if (!passwordPolicy.requireUppercase || !/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  }
  if (!passwordPolicy.requireLowercase || !/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  }
  if (!passwordPolicy.requireNumbers || !/[0-9]/.test(password)) {
    errors.push('Password must contain numbers');
  }
  if (!passwordPolicy.requireSpecialChars || 
      !new RegExp(`[${passwordPolicy.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`).test(password)) {
    errors.push('Password must contain special characters');
  }
  
  return { valid: errors.length === 0, errors };
}
```

---

## Authentication & Authorization

### JWT Token Security

```javascript
// Generate secure JWT tokens
const jwt = require('jsonwebtoken');

function generateToken(userId, role, expiresIn = '1h') {
  const token = jwt.sign(
    {
      userId,
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn,
      issuer: 'eks-deployer',
      audience: 'eks-deployer-api'
    }
  );
  
  return token;
}

function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'eks-deployer',
      audience: 'eks-deployer-api'
    });
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}
```

### Role-Based Access Control (RBAC)

```javascript
// Define roles and permissions
const rolePermissions = {
  admin: {
    deployments: ['create', 'read', 'update', 'delete'],
    credentials: ['create', 'read', 'update', 'delete', 'rotate'],
    clusters: ['create', 'read', 'delete'],
    users: ['create', 'read', 'update', 'delete']
  },
  operator: {
    deployments: ['create', 'read', 'pause', 'resume'],
    credentials: ['read'],
    clusters: ['read'],
    users: []
  },
  viewer: {
    deployments: ['read'],
    credentials: [],
    clusters: ['read'],
    users: []
  }
};

// Middleware to check permissions
function authorize(requiredPermission) {
  return (req, res, next) => {
    const user = req.user;
    const [resource, action] = requiredPermission.split(':');
    
    const userPermissions = rolePermissions[user.role] || {};
    const resourcePermissions = userPermissions[resource] || [];
    
    if (!resourcePermissions.includes(action)) {
      return res.status(403).json({
        error: 'Insufficient permissions'
      });
    }
    
    next();
  };
}
```

### Multi-Factor Authentication (MFA)

```javascript
// MFA implementation using TOTP
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Enable MFA for user
async function enableMFA(userId) {
  const secret = speakeasy.generateSecret({
    name: 'EKS Deployer',
    issuer: 'EKS Deployer',
    length: 32
  });
  
  const qrCode = await QRCode.toDataURL(secret.otpauth_url);
  
  return {
    secret: secret.base32,
    qrCode: qrCode
  };
}

// Verify MFA token
function verifyMFAToken(userId, token, secret) {
  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2
  });
  
  return verified;
}
```

---

## Data Protection

### Encryption at Rest

```javascript
// Enable database encryption
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  ssl: true,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// Encrypt sensitive fields in database
function encryptField(value) {
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptField(encryptedValue) {
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
  const parts = encryptedValue.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Database Backups

```bash
#!/bin/bash
# Automated encrypted database backups

BACKUP_DIR="/backups/eks-deployer"
ENCRYPTION_KEY="$(<$HOME/.backup_key)"
RETENTION_DAYS=30

# Create backup
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | \
  openssl enc -aes-256-cbc -salt -pass pass:"$ENCRYPTION_KEY" > \
  "$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql.enc"

# Upload to S3 with encryption
aws s3 cp "$BACKUP_DIR/backup-$(date +%Y%m%d).sql.enc" \
  s3://eks-deployer-backups/ \
  --sse AES256 \
  --storage-class GLACIER_IR

# Clean old backups
find "$BACKUP_DIR" -mtime +$RETENTION_DAYS -delete
```

### TLS/HTTPS Everywhere

```javascript
// Enforce HTTPS
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('/path/to/private-key.pem'),
  cert: fs.readFileSync('/path/to/certificate.pem'),
  ciphers: 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256',
  minVersion: 'TLSv1.2'
};

https.createServer(options, app).listen(443);

// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    res.redirect(`https://${req.headers.host}${req.url}`);
  } else {
    next();
  }
});
```

---

## Network Security

### VPC & Security Groups

```bash
# Create secure VPC configuration
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create security group for API
aws ec2 create-security-group \
  --group-name eks-deployer-api \
  --description "EKS Deployer API" \
  --vpc-id vpc-xxxxx

# Allow only HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Allow internal communication
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 5000 \
  --source-group sg-xxxxx
```

### API Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests, please try again later'
});

// Stricter limiter for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

// Apply limiters
app.use(globalLimiter);
app.post('/api/auth/login', authLimiter, loginHandler);
```

### CORS Configuration

```javascript
const cors = require('cors');

const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 3600
};

app.use(cors(corsOptions));
```

---

## AWS IAM Security

### Least Privilege Principle

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "eks:CreateCluster",
        "eks:UpdateCluster",
        "eks:DescribeCluster",
        "eks:ListClusters"
      ],
      "Resource": "arn:aws:eks:*:ACCOUNT_ID:cluster/eks-deployer-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateSecurityGroup",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:DescribeSecurityGroups"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ec2:Vpc": "arn:aws:ec2:*:ACCOUNT_ID:vpc/vpc-*"
        }
      }
    },
    {
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole",
        "iam:AttachRolePolicy"
      ],
      "Resource": "arn:aws:iam::ACCOUNT_ID:role/eks-deployer-*"
    }
  ]
}
```

### IAM Access Keys Rotation

```bash
#!/bin/bash
# Rotate IAM access keys

USER="deployer"
CURRENT_KEYS=$(aws iam list-access-keys --user-name $USER --query 'AccessKeyMetadata[].AccessKeyId' --output text)

for KEY in $CURRENT_KEYS; do
  CREATE_DATE=$(aws iam list-access-keys --user-name $USER --query "AccessKeyMetadata[?AccessKeyId=='$KEY'].CreateDate" --output text)
  DAYS_OLD=$((($(date +%s) - $(date -d "$CREATE_DATE" +%s)) / 86400))
  
  if [ $DAYS_OLD -gt 90 ]; then
    # Create new access key
    NEW_KEY=$(aws iam create-access-key --user-name $USER --query 'AccessKey.AccessKeyId' --output text)
    
    # Update in vault or secrets manager
    # ... update application credentials ...
    
    # Deactivate old key
    aws iam update-access-key --user-name $USER --access-key-id $KEY --status Inactive
  fi
done
```

---

## Vault Integration

### Secret Storage

```javascript
const vault = require('node-vault');

const client = vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

// Store AWS credentials in Vault
async function storeCredentials(credentialName, accessKey, secretKey) {
  await client.write(`secret/data/aws/${credentialName}`, {
    data: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey
    }
  });
}

// Retrieve credentials from Vault
async function getCredentials(credentialName) {
  const secret = await client.read(`secret/data/aws/${credentialName}`);
  return secret.data.data;
}

// Rotate credentials in Vault
async function rotateCredentials(credentialName, newAccessKey, newSecretKey) {
  await client.write(`secret/data/aws/${credentialName}`, {
    data: {
      accessKeyId: newAccessKey,
      secretAccessKey: newSecretKey,
      rotatedAt: new Date().toISOString()
    }
  });
}
```

---

## Audit Logging

### Comprehensive Audit Trail

```javascript
// Audit logging middleware
function auditLog(action, resource, resourceId, details) {
  const timestamp = new Date();
  const userId = req.user?.id;
  const ipAddress = req.ip;
  
  return {
    timestamp,
    action,
    resource,
    resourceId,
    userId,
    ipAddress,
    details,
    status: 'success'
  };
}

// Log all credential access
app.get('/api/credentials/:id', (req, res, next) => {
  const log = auditLog('READ', 'credentials', req.params.id, {
    endpoint: req.path,
    userAgent: req.get('user-agent')
  });
  
  // Store in audit database
  AuditLog.create(log);
  next();
});

// Log deployments
app.post('/api/deployments', (req, res, next) => {
  const log = auditLog('CREATE', 'deployments', null, {
    cluster: req.body.clusterName,
    region: req.body.region,
    config: req.body.config
  });
  
  AuditLog.create(log);
  next();
});
```

### CloudWatch Logging

```javascript
const cloudwatch = new AWS.CloudWatch();

function sendToCloudWatch(logGroup, logStream, message) {
  const params = {
    logGroupName: logGroup,
    logStreamName: logStream,
    logEvents: [{
      message: JSON.stringify(message),
      timestamp: Date.now()
    }]
  };
  
  cloudwatch.putLogEvents(params, (err) => {
    if (err) console.error('Error logging to CloudWatch:', err);
  });
}
```

---

## Incident Response

### Security Incident Procedures

1. **Detect**: Monitor logs for suspicious activity
2. **Respond**: Isolate affected systems
3. **Investigate**: Analyze logs and collect evidence
4. **Remediate**: Fix the vulnerability
5. **Recover**: Restore normal operations
6. **Review**: Post-incident analysis

### Credential Breach Response

```bash
#!/bin/bash
# Immediate response to credential compromise

# 1. Invalidate compromised credentials
aws iam update-access-key --access-key-id AKIAIOSFODNN7EXAMPLE --status Inactive

# 2. Create new access keys
NEW_KEY=$(aws iam create-access-key --query 'AccessKey.AccessKeyId' --output text)
NEW_SECRET=$(aws iam create-access-key --query 'AccessKey.SecretAccessKey' --output text)

# 3. Update in Vault
vault write secret/data/aws/emergency \
  accessKeyId=$NEW_KEY \
  secretAccessKey=$NEW_SECRET \
  compromisedAt=$(date -u +'%Y-%m-%dT%H:%M:%SZ')

# 4. Alert security team
aws sns publish \
  --topic-arn arn:aws:sns:region:account:security-alerts \
  --subject "SECURITY ALERT: AWS Credentials Compromised" \
  --message "Old key: AKIAIOSFODNN7EXAMPLE has been deactivated"

# 5. Review deployment logs
grep -r "AKIAIOSFODNN7EXAMPLE" ./logs/ | tee incident-report.txt
```

---

## Security Checklist

### Before Deployment

- [ ] Change all default passwords
- [ ] Enable HTTPS/TLS everywhere
- [ ] Configure firewall rules
- [ ] Enable MFA for all users
- [ ] Set up audit logging
- [ ] Review IAM permissions
- [ ] Enable encryption at rest
- [ ] Configure backup procedures
- [ ] Document security procedures
- [ ] Conduct security review

### Regularly

- [ ] Rotate credentials (every 90 days)
- [ ] Review audit logs
- [ ] Update dependencies
- [ ] Scan for vulnerabilities
- [ ] Review IAM permissions
- [ ] Test backup/restore procedures
- [ ] Update security documentation
- [ ] Train team on security practices

### Before Production

- [ ] Security penetration testing
- [ ] Compliance audit (SOC 2, ISO 27001, etc.)
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Incident response drill
- [ ] Final security review

---

## References

- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
