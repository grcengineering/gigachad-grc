# Vendor Security Scanner

Automated OSINT-based security assessment for your vendors.

## Overview

The Security Scanner performs automated external security assessments of vendor websites, providing instant visibility into their security posture without requiring vendor cooperation.

## What It Scans

The scanner collects data from multiple sources:

| Collector | What It Checks |
|-----------|---------------|
| **SSL/TLS** | Certificate validity, expiry, issuer, HTTPS redirect |
| **Security Headers** | HSTS, CSP, X-Frame-Options, and more |
| **DNS Security** | SPF, DMARC, CAA records |
| **Web Presence** | Accessibility, contact info, policies |
| **Compliance** | Trust portals, certifications, bug bounty |
| **Subdomains** | Subdomain enumeration and analysis |

## Running a Scan

### From Vendor Detail Page

1. Navigate to the vendor's detail page
2. Find the **Security Scan** section
3. Click **Run Security Scan**
4. Wait for results (~60-90 seconds)

### Automatic Scans

Configure automatic scans in **TPRM Configuration**:
- Run on vendor creation
- Periodic rescans (weekly, monthly)
- Trigger on assessment due

## Understanding Results

### Overall Risk Score

A weighted score from 0-100:
- **0-25**: Low Risk (Green)
- **26-50**: Medium Risk (Yellow)
- **51-75**: High Risk (Orange)
- **76-100**: Critical Risk (Red)

### Category Scores

| Category | What It Measures |
|----------|-----------------|
| **Security** | Technical security controls (SSL, headers, DNS) |
| **Breach** | Indicators of potential breach exposure |
| **Reputation** | Web presence and professionalism |
| **Compliance** | Certifications and trust indicators |

### Security Findings

Each finding includes:
- **Severity**: Critical, High, Medium, Low, Info
- **Title**: What was found
- **Description**: Details about the issue
- **Remediation**: How the vendor should fix it

## SSL/TLS Analysis

### What's Checked

- Certificate validity and expiration
- Certificate issuer (trusted CA)
- HTTP to HTTPS redirect
- SSL/TLS version support

### Grades

| Grade | Meaning |
|-------|---------|
| **A** | Excellent - valid cert, HTTPS redirect, good expiry |
| **B** | Good - valid but minor issues |
| **C** | Fair - some concerns |
| **F** | Fail - invalid, expired, or missing |
| **N/A** | Unable to check |

## Security Headers

### Headers Checked

| Header | Purpose |
|--------|---------|
| **Strict-Transport-Security** | Force HTTPS |
| **Content-Security-Policy** | Prevent XSS |
| **X-Frame-Options** | Prevent clickjacking |
| **X-Content-Type-Options** | Prevent MIME sniffing |
| **X-XSS-Protection** | XSS filter |
| **Referrer-Policy** | Control referrer info |
| **Permissions-Policy** | Limit browser features |

### Missing Headers

Missing headers are flagged as findings with remediation guidance.

## DNS Security

### Records Analyzed

- **SPF**: Email sender policy
- **DMARC**: Email authentication
- **CAA**: Certificate authority restrictions

### Common Issues

- Missing SPF record
- No DMARC policy
- DMARC set to "none" (no enforcement)

## Compliance Detection

### Trust Portals

Automatically detects:
- Vanta Trust Center
- Drata Trust Center
- SecureFrame
- SafeBase
- Anecdotes
- TrustCloud

### Certifications

Scans for mentions of:
- SOC 2 Type I/II
- ISO 27001
- GDPR compliance
- HIPAA compliance
- PCI DSS

### Bug Bounty

Checks for:
- security.txt file
- Bug bounty program mentions
- Responsible disclosure policy

## Subdomain Discovery

### What's Found

- Common subdomains (www, api, app, mail, etc.)
- SSL status per subdomain
- Accessibility status

### Subdomain Crawling

Click on any subdomain to:
- Crawl discovered pages
- Find additional links
- Identify external connections

## Using Scan Results

### Create Assessment

Convert scan findings into a formal assessment:
1. Review scan results
2. Click **Create Assessment from Scan**
3. Findings become assessment items
4. Add additional context as needed

### Update Risk Score

Scan results can automatically update the vendor's inherent risk score based on findings.

### Export Results

Export scan results for:
- Vendor communication
- Internal review
- Audit documentation

## Scan History

View previous scans to:
- Track improvement over time
- Compare before/after changes
- Identify recurring issues

## Limitations

- **External only**: Scans public-facing resources only
- **Point in time**: Results reflect current state
- **No penetration testing**: Non-intrusive OSINT only
- **Subdomain limit**: First 20 discovered subdomains
- **Timeout**: 90-second maximum per scan

## Best Practices

### When to Scan

- Before onboarding new vendors
- Periodically for existing vendors
- After vendor reports security changes
- Before contract renewals

### Interpreting Results

- Focus on critical/high findings first
- Consider context (startup vs. enterprise)
- Use as one input, not sole decision factor
- Follow up with vendors on concerns

### Vendor Communication

- Share relevant findings professionally
- Request remediation timelines
- Verify fixes with rescan
- Document vendor responses

## Related Topics

- [Vendor Assessments](assessments.md)
- [Vendor Risk Profiles](risk-profiles.md)
- [TPRM Overview](overview.md)
