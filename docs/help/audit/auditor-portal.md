# Auditor Portal

Provide external auditors secure, limited access to audit materials.

## Overview

The Auditor Portal allows:
- External auditors to view assigned requests
- Secure document upload
- Comment and question threads
- Limited access without full platform credentials

## Enabling the Portal

### For an Audit

1. Open the audit details
2. Click **Portal Settings**
3. Toggle **Enable Auditor Portal**
4. Configure access settings
5. Generate access codes

### Access Configuration

| Setting | Description |
|---------|-------------|
| **Access Duration** | How long codes remain valid |
| **Expiration Date** | Specific end date for access |
| **Allowed IPs** | Restrict to specific IP ranges |
| **Download Limit** | Maximum file downloads |

## Generating Access Codes

### Individual Codes

Generate codes for specific auditors:

1. Click **Generate Access Code**
2. Enter auditor email
3. Set expiration (optional)
4. Click **Generate**
5. Code is emailed to auditor

### Bulk Generation

For audit teams:

1. Click **Bulk Generate**
2. Upload CSV with auditor emails
3. Set common expiration
4. Generate all codes
5. Codes emailed individually

## Auditor Experience

### Logging In

Auditors access the portal:

1. Navigate to `/portal`
2. Enter access code
3. (Optional) Enter email for verification
4. Access granted to assigned audit

### Portal Dashboard

Auditors see:
- Assigned requests
- Request status
- Upload interface
- Comment threads
- Document viewer

### Viewing Requests

For each request:
- Request description
- Due date
- Current status
- Attached documents
- Comment history

### Uploading Evidence

Auditors can upload:
1. Click **Upload** on request
2. Select files
3. Add description
4. Submit for review

### Commenting

Ask questions or provide feedback:
1. Open request
2. Type comment
3. Submit
4. Internal team notified

## Managing Portal Access

### Viewing Active Codes

See all generated codes:

1. Go to audit **Portal Settings**
2. View **Active Access Codes**
3. See code, email, status, expiration

### Revoking Access

Remove auditor access:

1. Find code in list
2. Click **Revoke**
3. Confirm revocation
4. Auditor immediately loses access

### Extending Access

If audit runs long:

1. Find code to extend
2. Click **Extend**
3. Set new expiration
4. Save changes

## Security Features

### Access Logging

All portal activity logged:
- Login attempts
- Document views
- Downloads
- Uploads
- Comments

### IP Restrictions

Limit access by IP:
- Corporate network only
- Specific auditor IPs
- Geo-restrictions

### Session Management

- Automatic timeout (configurable)
- Single session per code
- Force logout capability

### Watermarking

Documents can be watermarked:
- Auditor identifier
- Timestamp
- Access code
- "Confidential" marking

## Notifications

### To Internal Team

Notifications when:
- Auditor logs in
- Document uploaded
- Comment posted
- Download occurs

### To Auditors

Notifications for:
- Access code generated
- New request assigned
- Comment replies
- Access expiring soon

## Audit Trail

### Portal Activity

All portal activity tracked:

| Event | Data Captured |
|-------|---------------|
| Login | Time, IP, code used |
| View | Document ID, duration |
| Download | File, time, IP |
| Upload | File details, metadata |
| Comment | Content, thread, time |

### Export

Export portal activity:
1. Go to audit **Activity Log**
2. Filter by portal activity
3. Click **Export**
4. Download CSV/PDF

## Best Practices

### Access Management

- Use individual codes per auditor
- Set appropriate expirations
- Revoke promptly after audit
- Monitor for unusual activity

### Document Organization

- Name requests clearly
- Group related documents
- Provide context in descriptions
- Update status promptly

### Communication

- Respond to comments quickly
- Use portal for audit questions
- Keep threads organized
- Document decisions

## Troubleshooting

### Access Code Not Working

1. Verify code entered correctly
2. Check expiration date
3. Confirm email matches
4. Check IP restrictions
5. Contact administrator

### Cannot Upload Files

1. Check file size limits
2. Verify file type allowed
3. Ensure request accepts uploads
4. Check network connection

### Missing Documents

1. Verify request assignment
2. Check document permissions
3. Confirm upload completed
4. Contact internal team

## Portal API

The Auditor Portal provides REST API endpoints for programmatic access:

### Authentication
- `POST /api/audit-portal/auth` - Authenticate with access code
- `POST /api/audit-portal/auth/refresh` - Refresh session

### Request Access
All portal data endpoints require the `x-portal-access-code` header:

```
GET /api/audit-portal/requests
x-portal-access-code: ABC123
```

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/audit-portal/requests` | GET | List all requests for the audit |
| `/api/audit-portal/requests/:id` | GET | Get request details with evidence and comments |
| `/api/audit-portal/requests/:id/evidence` | GET | List evidence for a request |
| `/api/audit-portal/requests/:id/comments` | GET | List comments on a request |
| `/api/audit-portal/requests/:id/comments` | POST | Add a comment (if permitted) |

### Response Format

All endpoints return JSON with this structure:

```json
{
  "success": true,
  "data": { ... }
}
```

### Access Logging

All API access is automatically logged with:
- Timestamp
- IP address
- User agent
- Action type
- Success/failure status

## Related Topics

- [Audit Management](audits.md)
- [Audit Requests](requests.md)
- [FieldGuide Integration](fieldguide.md)

