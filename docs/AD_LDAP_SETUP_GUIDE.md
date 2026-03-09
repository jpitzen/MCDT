# AD / LDAP Setup Guide

This guide walks administrators through configuring Active Directory (AD) or LDAP authentication for ZL-MCDT. Once enabled, users can sign in with their corporate directory credentials alongside — or instead of — local accounts.

---

## Prerequisites

Before you begin, ensure you have:

1. **An AD / LDAP service account** with read access to user and group objects. The account needs:
   - Permission to **bind** (authenticate) to the directory
   - Permission to **search** users and groups under the configured Base DN
   - A stable password (service accounts should not be subject to routine rotation policies without coordinating with ZL-MCDT configuration)

2. **Network access** from the ZL-MCDT backend server to the LDAP port:
   - `389` for LDAP (unencrypted / STARTTLS)
   - `636` for LDAPS (SSL/TLS) — **recommended for production**

3. **Admin access** to ZL-MCDT (you must be logged in as an `admin` role user)

4. **Directory information** ready:
   - Server URL (e.g. `ldaps://ad.corp.com`)
   - Base DN (e.g. `DC=corp,DC=com`)
   - Service account Bind DN (e.g. `CN=svc-zlmcdt,OU=Service Accounts,DC=corp,DC=com`)
   - Service account password
   - User search base and filter (defaults work for most Microsoft AD environments)

---

## Step 1 — Open the AD / LDAP Configuration Tab

1. Log in to ZL-MCDT as an **admin** user
2. Navigate to **System Admin** (gear icon in the sidebar)
3. Click the **AD / LDAP** tab

You'll see the configuration list (empty on first visit) and a **New Configuration** button.

---

## Step 2 — Create a Configuration

Click **New Configuration**. A dialog opens with these sections:

### Connection

| Field | Description | Example |
|-------|-------------|---------|
| **Configuration Name** | Friendly label | `Corp AD Server` |
| **Server URL** | LDAP(S) URL | `ldaps://ad.corp.com` |
| **Port** | LDAP port | `636` (LDAPS) or `389` (LDAP) |
| **Use SSL/TLS** | Enable for LDAPS | ✅ for production |
| **Timeout (ms)** | Connection timeout | `5000` |
| **Base DN** | Root of the directory tree | `DC=corp,DC=com` |

> ⚠️ **Security Warning**: If SSL/TLS is disabled, credentials are transmitted in plaintext over the network. Always enable SSL for production environments.

### Service Account

| Field | Description |
|-------|-------------|
| **Bind DN** | Full distinguished name of the service account |
| **Bind Password** | Service account password (encrypted at rest) |

### Search Settings

| Field | Default | Notes |
|-------|---------|-------|
| **User Search Filter** | `(sAMAccountName={{username}})` | `{{username}}` is replaced with the login input |
| **User Search Base** | *(empty = uses Base DN)* | Narrow scope: `OU=Users,DC=corp,DC=com` |
| **Group Search Filter** | `(objectClass=group)` | Standard for MS AD |
| **Group Search Base** | *(empty = uses Base DN)* | Narrow scope: `OU=Groups,DC=corp,DC=com` |

### Attribute Mapping

Maps LDAP attributes to ZL-MCDT user fields. Defaults work for Microsoft Active Directory:

| ZL-MCDT Field | Default AD Attribute |
|---------------|---------------------|
| Email | `mail` |
| Display Name | `displayName` |
| First Name | `givenName` |
| Last Name | `sn` |
| Group Membership | `memberOf` |
| Unique ID | `objectGUID` |

### Behavior

| Setting | Default | Description |
|---------|---------|-------------|
| **Auto-create users** | ✅ On | Automatically create a ZL-MCDT user on first AD login |
| **Default role** | `viewer` | Role assigned when no group-role mapping matches |
| **Sync interval** | `60` min | How often the background job syncs AD users (0 = disabled) |

Click **Save** (or **Create**) when done.

---

## Step 3 — Test the Connection

Before activating, verify connectivity:

1. In the configuration list, click the **▶ Test** button next to your configuration
2. A success message shows the connection latency
3. If it fails, check:
   - Network/firewall rules between ZL-MCDT and the AD server
   - Bind DN and password are correct
   - SSL certificate is valid (for LDAPS)

You can also test from within the editor dialog using the **Test Connection** button at the bottom.

---

## Step 4 — Set Up Role Mappings

Role mappings determine which ZL-MCDT role AD users receive based on their group membership.

1. Click on a configuration in the list to select it
2. The **Group → Role Mappings** section appears below
3. Click **Add Mapping**
4. Use the group browser to search and select an AD group
5. Choose the ZL-MCDT role: `Admin`, `Approver`, `Operator`, or `Viewer`
6. Set a **priority** (higher number wins when a user belongs to multiple matched groups)
7. Save

**Example mappings:**

| AD Group | ZL-MCDT Role | Priority |
|----------|-------------|----------|
| `CN=Cloud-Admins,OU=Groups,DC=corp,DC=com` | Admin | 100 |
| `CN=DevOps-Team,OU=Groups,DC=corp,DC=com` | Operator | 50 |
| `CN=QA-Team,OU=Groups,DC=corp,DC=com` | Viewer | 10 |

### Testing Role Resolution

Click **Test Resolution**, enter an AD username, and see:
- Which AD groups the user belongs to
- Which mappings matched
- The final resolved role

---

## Step 5 — Activate the Configuration

1. Click the **⏻ Activate** button next to your configuration
2. Only one configuration can be active at a time — activating one deactivates any previously active config
3. The login page will now show **Local** and **AD / LDAP** tabs

---

## Step 6 — User Synchronization

The AD sync job runs automatically at the configured interval (default: every 60 minutes). You can also trigger a manual sync:

1. Select the active configuration
2. In the **User Synchronization** section, click **Sync Now**
3. The sync creates new ZL-MCDT accounts for AD users and updates existing ones (name, email, group memberships, roles)

---

## Troubleshooting

| Issue | Possible Cause | Solution |
|-------|---------------|----------|
| "AD/LDAP authentication is not configured" | No active AD config | Activate a configuration in System Admin → AD / LDAP |
| Connection test fails with timeout | Firewall blocking LDAP port | Ensure port 389/636 is open from ZL-MCDT server to AD server |
| Connection test fails with certificate error | Invalid or self-signed SSL cert | Add the CA certificate to the server's trust store, or disable SSL for testing only |
| "Invalid credentials" on AD login | Wrong username or password | Verify with `ldapsearch` or AD admin tools; check user search filter |
| User gets wrong role | Incorrect priority or missing mapping | Use "Test Resolution" to debug; higher priority mappings take precedence |
| AD login works but user has no permissions | No matching role mapping | User gets the default role (viewer); add a mapping for their group |
| "Account locked" message | Too many failed attempts | Wait 15 minutes or have an admin unlock the account |
| Sync reports errors | Users missing required attributes | Ensure all mapped attributes (mail, sn, givenName) exist on AD user objects |

---

## Security Recommendations

1. **Always use LDAPS** (port 636 with SSL/TLS) in production
2. **Use a dedicated service account** — never use a personal admin account
3. **Grant minimal permissions** — the service account only needs read access
4. **Rotate the service account password** periodically and update it in ZL-MCDT via System Admin → AD / LDAP → Edit → Service Account
5. **Set `ENCRYPTION_KEY`** in `.env` to a strong 32-character value (used to encrypt the service account password at rest)
6. **Monitor audit logs** — all AD config changes and login events are recorded in the `audit_logs` table
7. **Keep sync intervals reasonable** — every 60 minutes is fine for most environments; very short intervals may increase LDAP server load
