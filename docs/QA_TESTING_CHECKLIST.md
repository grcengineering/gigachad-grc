# QA Testing Checklist

**Version:** 1.0.0-beta  
**Purpose:** Manual QA testing guide for critical user flows before public release

---

## Prerequisites

Before running QA tests:

1. **Start Infrastructure:**
   ```bash
   ./start.sh
   ```

2. **Wait for services to be healthy:**
   ```bash
   docker compose ps
   # All services should show "healthy" or "Up"
   ```

3. **Access points:**
   - Application: https://localhost (via Traefik)
   - Controls API: http://localhost:3001/api/docs
   - Keycloak Admin: https://auth.localhost (credentials in `.env`)
   - RustFS Console: http://localhost:9001 (credentials in `.env`)
   - Traefik Dashboard: disabled unless explicitly enabled

---

## Test Suite 1: Authentication & Authorization

### 1.1 User Login (Keycloak)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Login with valid credentials | 1. Navigate to app<br>2. Click Login<br>3. Enter demo user credentials | Redirected to dashboard | ⬜ |
| Login with invalid credentials | 1. Navigate to login<br>2. Enter wrong password | Error message displayed | ⬜ |
| Session persistence | 1. Login<br>2. Refresh page | User remains logged in | ⬜ |
| Logout | 1. Click user menu<br>2. Click Logout | Redirected to login, session cleared | ⬜ |
| Token refresh | 1. Login<br>2. Wait 5+ minutes<br>3. Perform action | Action succeeds (token auto-refreshed) | ⬜ |

### 1.2 Authorization (RBAC)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Admin sees all modules | Login as admin user | All navigation items visible | ⬜ |
| Viewer cannot edit | 1. Login as viewer<br>2. Try to edit a control | Edit button disabled or action rejected | ⬜ |
| Multi-tenant isolation | 1. Login as Org A user<br>2. Check data | Cannot see Org B data | ⬜ |

---

## Test Suite 2: Controls Module

### 2.1 CRUD Operations

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| View controls list | Navigate to Controls | List displays with pagination | ⬜ |
| Create control | 1. Click "Add Control"<br>2. Fill form<br>3. Save | Control created, appears in list | ⬜ |
| Edit control | 1. Click control<br>2. Modify fields<br>3. Save | Changes persisted | ⬜ |
| Delete control | 1. Click control<br>2. Click Delete<br>3. Confirm | Control removed (soft delete) | ⬜ |
| Search controls | Enter search term in filter | Matching controls shown | ⬜ |
| Filter by status | Select status filter | Only matching controls shown | ⬜ |
| Sort controls | Click column header | List re-sorted | ⬜ |

### 2.2 Control Details

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| View control details | Click on a control | Details panel/page opens | ⬜ |
| View mapped frameworks | On control detail | Linked frameworks listed | ⬜ |
| View evidence | On control detail | Attached evidence listed | ⬜ |

---

## Test Suite 3: Evidence Upload

### 3.1 File Upload

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Upload PDF | 1. Go to Evidence<br>2. Upload a PDF file | File uploaded, preview available | ⬜ |
| Upload image | Upload PNG/JPG file | File uploaded, thumbnail shown | ⬜ |
| Upload document | Upload DOCX file | File uploaded successfully | ⬜ |
| Reject invalid type | Try to upload .exe file | Rejected with error message | ⬜ |
| File size limit | Try to upload oversized file | Rejected with size error | ⬜ |
| Download evidence | Click download on uploaded file | File downloads correctly | ⬜ |

### 3.2 Evidence Metadata

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Add description | Upload file with description | Description saved and displayed | ⬜ |
| Link to control | 1. Upload evidence<br>2. Link to control | Shows in control's evidence list | ⬜ |
| Set expiration | Set evidence expiration date | Warning shown when approaching | ⬜ |

---

## Test Suite 4: Frameworks Module

### 4.1 Framework Management

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| View frameworks list | Navigate to Frameworks | List of frameworks shown | ⬜ |
| Activate framework | 1. Find inactive framework<br>2. Click Activate | Framework status changes to active | ⬜ |
| Deactivate framework | Click Deactivate on active framework | Framework deactivated | ⬜ |
| View framework details | Click on framework | Requirements/controls listed | ⬜ |

### 4.2 Framework Mappings

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| View mappings | On framework detail | Mapped controls shown | ⬜ |
| Map control to requirement | 1. Select requirement<br>2. Link control | Control appears under requirement | ⬜ |
| Unmap control | Remove control from requirement | Mapping removed | ⬜ |
| Compliance score | After mappings | Score calculated and displayed | ⬜ |

---

## Test Suite 5: Risk Management

### 5.1 Risk Registry

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| View risks | Navigate to Risk Management | Risk list displayed | ⬜ |
| Create risk | 1. Click Add Risk<br>2. Fill form<br>3. Save | Risk created | ⬜ |
| Edit risk | Modify risk details | Changes saved | ⬜ |
| Delete risk | Delete a risk | Risk removed | ⬜ |

### 5.2 Risk Scoring

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Set impact | On risk form, set impact level | Impact saved | ⬜ |
| Set likelihood | Set likelihood level | Likelihood saved | ⬜ |
| Risk score calculation | Set impact & likelihood | Score auto-calculated | ⬜ |
| Risk heatmap | Navigate to heatmap view | Heatmap displays correctly | ⬜ |

### 5.3 Risk Treatment

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Set treatment plan | Add treatment plan to risk | Plan saved | ⬜ |
| Link control to risk | Link mitigating control | Residual score updates | ⬜ |
| Set risk owner | Assign owner to risk | Owner displayed | ⬜ |

---

## Test Suite 6: Policy Workflow

### 6.1 Policy Lifecycle

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Create draft policy | 1. Add Policy<br>2. Fill details<br>3. Save as Draft | Draft status shown | ⬜ |
| Edit policy content | Modify policy text | Changes saved | ⬜ |
| Submit for review | Click "Submit for Review" | Status changes to "In Review" | ⬜ |
| Approve policy | As approver, approve policy | Status changes to "Approved" | ⬜ |
| Publish policy | Publish approved policy | Status changes to "Published" | ⬜ |
| Archive policy | Archive old policy | Status changes to "Archived" | ⬜ |

### 6.2 Policy Versions

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| View version history | On policy detail | All versions listed | ⬜ |
| Compare versions | Select two versions | Diff displayed | ⬜ |
| Create new version | Edit published policy | New draft version created | ⬜ |

### 6.3 Policy Acknowledgment

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Request acknowledgment | Assign policy to users | Users notified | ⬜ |
| Acknowledge policy | User clicks Acknowledge | Acknowledgment recorded | ⬜ |
| View acknowledgments | On policy | List of who acknowledged | ⬜ |

---

## Test Suite 7: Vendor Management (TPRM)

### 7.1 Vendor Registry

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| View vendors | Navigate to Vendors | Vendor list displayed | ⬜ |
| Add vendor | Create new vendor record | Vendor created | ⬜ |
| Edit vendor | Modify vendor details | Changes saved | ⬜ |
| Set vendor tier | Assign criticality tier | Tier saved | ⬜ |

### 7.2 Vendor Assessment

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Create assessment | Start new vendor assessment | Assessment form opens | ⬜ |
| Complete questionnaire | Fill in assessment questions | Responses saved | ⬜ |
| Calculate risk score | Submit assessment | Score calculated | ⬜ |
| View assessment history | On vendor detail | All assessments listed | ⬜ |

---

## Test Suite 8: Dashboard & Reporting

### 8.1 Dashboard

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Dashboard loads | Navigate to Dashboard | All widgets load | ⬜ |
| Compliance score widget | Check compliance widget | Accurate percentage shown | ⬜ |
| Risk overview widget | Check risk widget | Risk counts accurate | ⬜ |
| Recent activity | Check activity feed | Recent actions listed | ⬜ |

### 8.2 Reports

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Generate compliance report | Request compliance report | Report generated | ⬜ |
| Export to PDF | Export report as PDF | PDF downloads | ⬜ |
| Export to CSV | Export data as CSV | CSV downloads correctly | ⬜ |

---

## Test Suite 9: Backup & Restore

### 9.1 Backup

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Manual backup | Run `./deploy/backup.sh` | Backup file created | ⬜ |
| Backup includes all data | Check backup file | DB + files included | ⬜ |
| Verify backup | Run `./deploy/verify-backup.sh` | Backup valid | ⬜ |

### 9.2 Restore

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Restore backup | 1. Clear data<br>2. Run restore | Data restored | ⬜ |
| Verify restored data | Login and check data | All data present | ⬜ |

---

## Test Suite 10: AI Features (Mock Mode)

### 10.1 AI Assistant (Mock Provider)

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| AI toggle available | Check settings | AI can be enabled/disabled | ⬜ |
| Mock responses | Ask AI a question | Mock response returned | ⬜ |
| Control suggestions | Ask for control suggestions | Suggestions provided | ⬜ |
| Error handling | Disconnect from API | Graceful error shown | ⬜ |

---

## Test Suite 11: Config-as-Code

### 11.1 Export

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Export configuration | Run Terraform export | .tf files generated | ⬜ |
| Valid Terraform | Run `terraform validate` | No errors | ⬜ |

### 11.2 Import

| Test | Steps | Expected Result | Status |
|------|-------|-----------------|--------|
| Import configuration | Apply Terraform config | Resources created | ⬜ |
| State tracking | Check for drift | Drift detection works | ⬜ |

---

## Test Suite 12: Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ⬜ |
| Firefox | Latest | ⬜ |
| Safari | Latest | ⬜ |
| Edge | Latest | ⬜ |

---

## Test Suite 13: Responsive Design

| Viewport | Test | Status |
|----------|------|--------|
| Desktop (1920x1080) | All features accessible | ⬜ |
| Laptop (1366x768) | Layout adjusts correctly | ⬜ |
| Tablet (768x1024) | Responsive layout works | ⬜ |
| Mobile (375x667) | Mobile menu works | ⬜ |

---

## Post-Test Actions

After completing QA testing:

1. **Document Issues:**
   - Create GitHub issues for any bugs found
   - Tag with appropriate severity labels

2. **Update Status:**
   - Mark this checklist with ✅ for passing tests
   - Mark with ❌ for failing tests

3. **Sign-off:**
   - Tester: ________________
   - Date: ________________
   - Overall Status: ⬜ Pass / ⬜ Fail with issues

---

## Quick Start Test Commands

```bash
# Start all services
docker compose up -d

# Check service health
docker compose ps

# View logs
docker compose logs -f controls

# Run database seed (demo data)
cd services/controls && npm run seed

# Stop all services
docker compose down
```

---

*This checklist covers the critical paths for GigaChad GRC v1.0.0-beta release. Additional edge cases and negative testing should be performed as time permits.*

