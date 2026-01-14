# Password Portal

A secure, one-time password sharing portal for Initio Learning Trust. IT and Helpdesk staff can securely send passwords to end users via single-use links.

## Features

- **One-time links** - Passwords are deleted after viewing
- **Email notifications** - Send password links directly to recipients
- **Batch upload** - Create multiple password links via CSV
- **Password generator** - Generate memorable passwords like "Sunset-Tiger-42"
- **Queue management** - Track and manage all password links
- **API access** - Integrate with automation tools (e.g., Salamander)
- **Audit logging** - Full activity history
- **Role-based access** - Admin and Technician roles

---

## User Guide

### Logging In

1. Go to [password.initiolearning.org](https://password.initiolearning.org)
2. Click **Sign in with Google**
3. Use your @initiolearning.org account

---

### Creating a Password Link

1. Click **Create Password** in the sidebar
2. Enter the recipient's **email** and **name**
3. Either:
   - Click **Generate Password** for a memorable password
   - Or enter a custom password manually
4. Toggle **Send email notification** if you want to email the link
5. Click **Create Password Link**
6. Copy the password and/or link to share

---

### Batch Upload (Multiple Users)

For creating many password links at once:

1. Go to **Batch Upload** in the sidebar
2. Click **Download Template** to get the CSV format
3. Fill in your CSV file:

```csv
email,name,password,notes
john.smith@school.org,John Smith,,New starter
jane.doe@school.org,Jane Doe,,Password reset
bob.jones@school.org,Bob Jones,CustomPass123,Manual password
```

| Column | Required | Description |
|--------|----------|-------------|
| email | Yes | Recipient's email address |
| name | No | Recipient's display name |
| password | No | Leave blank to auto-generate |
| notes | No | Internal notes (not sent to user) |

4. Upload the CSV file
5. Review the preview - you can regenerate passwords or remove rows
6. Click **Create Password Links**
7. Download the results CSV with all the generated links

---

### Queue Management

View and manage all password links:

1. Go to **Queue** in the sidebar
2. Filter by status: Pending, Sent, Viewed, Expired, Revoked
3. Filter by source: Dashboard, API, Batch
4. Search by email

**Actions:**
- **Send** - Email the link to the recipient
- **Revoke** - Invalidate the link (can't be used)
- **Delete** - Remove the record entirely

**Bulk Actions:**
- Select multiple items with checkboxes
- Click **Send Selected** to email all at once

---

### Settings (Admin Only)

#### API Keys
Create API keys for automation tools:
1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Enter a name (e.g., "Salamander")
4. Copy the key immediately - it won't be shown again!

#### IP Whitelist
Restrict API access to specific IPs:
1. Go to **Settings** → **IP Whitelist**
2. Add allowed IP addresses or CIDR ranges

#### Word Lists
Customize the password generator:
1. Go to **Settings** → **Word Lists**
2. Add custom word lists (e.g., Animals, Nature, School)
3. Words are used to generate memorable passwords

#### Email Templates
Customize notification emails:
1. Go to **Settings** → **Email Templates**
2. Edit the subject, HTML body, and plain text body
3. Available variables:
   - `{{recipientName}}` - Recipient's name
   - `{{recipientEmail}}` - Recipient's email
   - `{{link}}` - Password view link

#### Users
Manage user roles:
1. Go to **Settings** → **Users**
2. Change roles between Admin and Technician

| Role | Permissions |
|------|-------------|
| Admin | Full access including Settings |
| Technician | Create/manage passwords only |

#### Audit Log
View all system activity:
1. Go to **Settings** → **Audit Log**
2. Filter by action type
3. Export to CSV for compliance

---

## API Documentation

### Authentication
- Header: `X-API-Key: your-api-key`
- IP must be in the whitelist (if configured)

### Create Password Link

```
POST https://europe-west2-password-portal-a7053.cloudfunctions.net/api
Content-Type: application/json
X-API-Key: your-api-key
```

**Request:**
```json
{
  "recipientEmail": "user@example.com",
  "recipientName": "John Smith",
  "password": "SecurePass123",
  "notes": "Optional internal notes",
  "sendEmail": false
}
```

**Response:**
```json
{
  "success": true,
  "id": "uuid-here",
  "link": "https://password.initiolearning.org/p/uuid-here",
  "status": "pending"
}
```

Set `sendEmail: true` to automatically send the notification email.

---

## Security

- Passwords are encrypted with AES-256-GCM
- Links use UUID v4 (122 bits of randomness)
- Passwords are deleted from database after viewing
- All actions are logged for audit
- Google Workspace SSO with domain restriction
- API access requires key + IP whitelist

---

## Technical Setup

### Requirements
- Node.js 20+
- Firebase project (Blaze plan)
- Google Workspace account for SMTP

### Environment Variables

Frontend (`.env`):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Cloud Functions secrets:
```
PASSWORD_ENCRYPTION_KEY  # 64-character hex string
SMTP_USER                # Google Workspace email
SMTP_PASS                # App password
```

### Deployment

```bash
# Build frontend
npm run build

# Build functions
cd functions && npm run build && cd ..

# Deploy
firebase deploy
```

---

## Support

For issues or questions, contact the Central IT Team.
