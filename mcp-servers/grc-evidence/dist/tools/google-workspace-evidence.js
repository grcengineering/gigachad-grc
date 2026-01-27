// eslint-disable-next-line @typescript-eslint/no-explicit-any
let googleAPIs = null;
async function loadGoogleAPIs() {
    if (googleAPIs)
        return googleAPIs;
    try {
        const googleapis = await import('googleapis');
        googleAPIs = { google: googleapis.google };
        return googleAPIs;
    }
    catch {
        return null;
    }
}
export async function collectGoogleWorkspaceEvidence(params) {
    const { checks = ['admin-audit', 'login-audit', 'drive-sharing', 'mobile-devices', 'user-security'], timeRange, } = params;
    const findings = [];
    let criticalFindings = 0;
    let warnings = 0;
    let totalEvents = 0;
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const adminEmail = process.env.GOOGLE_ADMIN_EMAIL;
    const customerId = process.env.GOOGLE_CUSTOMER_ID || 'my_customer';
    if (!serviceAccountKey || !adminEmail) {
        console.warn('Google Workspace credentials not configured - running in demo mode');
        return {
            service: 'google_workspace',
            collectedAt: new Date().toISOString(),
            findings: getDemoFindings(checks),
            summary: {
                totalEvents: 0,
                criticalFindings: 0,
                warnings: 0,
            },
            isMockMode: true,
            mockModeReason: 'Google Workspace credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY (JSON string or path), GOOGLE_ADMIN_EMAIL (delegated admin), and optionally GOOGLE_CUSTOMER_ID.',
            requiredCredentials: ['GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_ADMIN_EMAIL', 'GOOGLE_CUSTOMER_ID (optional)'],
        };
    }
    // Load Google APIs
    const apis = await loadGoogleAPIs();
    if (!apis) {
        return {
            service: 'google_workspace',
            collectedAt: new Date().toISOString(),
            findings: getDemoFindings(checks),
            summary: {
                totalEvents: 0,
                criticalFindings: 0,
                warnings: 0,
            },
            isMockMode: true,
            mockModeReason: 'googleapis package not installed. Run: npm install googleapis',
            requiredCredentials: ['googleapis npm package'],
        };
    }
    try {
        // Parse service account credentials
        let credentials;
        try {
            credentials = JSON.parse(serviceAccountKey);
        }
        catch {
            // Might be a file path
            const fs = await import('fs');
            const credentialsFile = fs.readFileSync(serviceAccountKey, 'utf-8');
            credentials = JSON.parse(credentialsFile);
        }
        // Create authenticated client with domain-wide delegation
        const auth = new apis.google.auth.GoogleAuth({
            credentials,
            scopes: [
                'https://www.googleapis.com/auth/admin.reports.audit.readonly',
                'https://www.googleapis.com/auth/admin.directory.device.mobile.readonly',
                'https://www.googleapis.com/auth/admin.directory.user.readonly',
                'https://www.googleapis.com/auth/admin.directory.group.readonly',
                'https://www.googleapis.com/auth/drive.readonly',
            ],
            clientOptions: {
                subject: adminEmail,
            },
        });
        const authClient = await auth.getClient();
        // Initialize APIs
        const admin = apis.google.admin({ version: 'admin_directory_v1', auth: authClient });
        const drive = apis.google.drive({ version: 'v3', auth: authClient });
        for (const check of checks) {
            try {
                switch (check) {
                    case 'admin-audit':
                        findings.push(await collectAdminAuditLogs(admin.reports, timeRange));
                        break;
                    case 'login-audit':
                        findings.push(await collectLoginAuditLogs(admin.reports, timeRange));
                        break;
                    case 'drive-sharing':
                        findings.push(await collectDriveSharingSettings(drive));
                        break;
                    case 'mobile-devices':
                        findings.push(await collectMobileDeviceStatus(admin.directory, customerId));
                        break;
                    case 'user-security':
                        findings.push(await collectUserSecurityStatus(admin.directory, customerId));
                        break;
                    default:
                        findings.push({
                            type: check,
                            error: `Unsupported check type: ${check}`,
                        });
                }
            }
            catch (checkError) {
                findings.push({
                    type: check,
                    error: checkError instanceof Error ? checkError.message : 'Unknown error',
                    status: 'failed',
                });
            }
        }
        // Calculate summary from findings
        for (const finding of findings) {
            const f = finding;
            if (f.events) {
                totalEvents += f.events.length;
            }
            if (f.criticalCount) {
                criticalFindings += f.criticalCount;
            }
            if (f.warningCount) {
                warnings += f.warningCount;
            }
        }
        return {
            service: 'google_workspace',
            collectedAt: new Date().toISOString(),
            findings,
            summary: {
                totalEvents,
                criticalFindings,
                warnings,
            },
        };
    }
    catch (error) {
        console.error('Google Workspace evidence collection failed:', error);
        return {
            service: 'google_workspace',
            collectedAt: new Date().toISOString(),
            findings: [{
                    error: error instanceof Error ? error.message : 'Unknown error',
                    suggestion: 'Verify service account has domain-wide delegation enabled and the admin email has appropriate permissions.'
                }],
            summary: {
                totalEvents: 0,
                criticalFindings: 0,
                warnings: 0,
            },
            isMockMode: true,
            mockModeReason: `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}
async function collectAdminAuditLogs(reports, timeRange) {
    const startTime = timeRange?.startTime || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endTime = timeRange?.endTime || new Date().toISOString();
    const response = await reports.activities.list({
        userKey: 'all',
        applicationName: 'admin',
        startTime,
        endTime,
        maxResults: 1000,
    });
    const activities = response.data.items || [];
    // Categorize events by criticality
    const criticalEventTypes = [
        'GRANT_ADMIN_PRIVILEGE',
        'CREATE_DATA_TRANSFER_REQUEST',
        'CHANGE_CHROME_OS_ANDROID_APPLICATION_SETTING',
        'AUTHORIZE_API_CLIENT_ACCESS',
        'CHANGE_ALLOWED_TWO_STEP_VERIFICATION_METHODS',
        'ENFORCE_STRONG_AUTHENTICATION',
    ];
    const warningEventTypes = [
        'CREATE_USER',
        'DELETE_USER',
        'SUSPEND_USER',
        'UNSUSPEND_USER',
        'CHANGE_PASSWORD',
        'ADD_GROUP_MEMBER',
        'REMOVE_GROUP_MEMBER',
    ];
    let criticalCount = 0;
    let warningCount = 0;
    const categorizedEvents = activities.map((activity) => {
        const act = activity;
        const events = act.events || [];
        const eventNames = events.map(e => e.name).filter(Boolean);
        const isCritical = eventNames.some(name => criticalEventTypes.includes(name || ''));
        const isWarning = eventNames.some(name => warningEventTypes.includes(name || ''));
        if (isCritical)
            criticalCount++;
        else if (isWarning)
            warningCount++;
        return {
            ...act,
            severity: isCritical ? 'critical' : isWarning ? 'warning' : 'info',
        };
    });
    return {
        type: 'admin_audit',
        timeRange: { startTime, endTime },
        events: categorizedEvents,
        totalEvents: activities.length,
        criticalCount,
        warningCount,
        eventTypes: [...new Set(activities.flatMap((a) => {
                const act = a;
                const events = act.events || [];
                return events.map(e => e.name).filter(Boolean);
            }))],
    };
}
async function collectLoginAuditLogs(reports, timeRange) {
    const startTime = timeRange?.startTime || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endTime = timeRange?.endTime || new Date().toISOString();
    const response = await reports.activities.list({
        userKey: 'all',
        applicationName: 'login',
        startTime,
        endTime,
        maxResults: 1000,
    });
    const activities = response.data.items || [];
    // Analyze login patterns
    let suspiciousLogins = 0;
    let failedLogins = 0;
    let legacyProtocolLogins = 0;
    for (const activity of activities) {
        const act = activity;
        const events = act.events || [];
        for (const event of events) {
            if (event.name === 'login_failure') {
                failedLogins++;
            }
            if (event.name === 'suspicious_login' || event.name === 'suspicious_login_less_secure_app') {
                suspiciousLogins++;
            }
            const params = event.parameters || [];
            const isLegacy = params.some(p => p.name === 'is_second_factor' && p.value === 'false');
            if (isLegacy)
                legacyProtocolLogins++;
        }
    }
    return {
        type: 'login_audit',
        timeRange: { startTime, endTime },
        events: activities,
        totalEvents: activities.length,
        monitoring: {
            suspiciousLogins,
            failedLogins,
            legacyProtocolLogins,
        },
        criticalCount: suspiciousLogins,
        warningCount: failedLogins + legacyProtocolLogins,
    };
}
async function collectDriveSharingSettings(drive) {
    // Find externally shared and public files
    const externallySharedResponse = await drive.files.list({
        q: "visibility = 'anyoneWithLink' or visibility = 'anyoneCanFind'",
        fields: 'files(id, name, mimeType, shared, sharingUser, permissions, webViewLink)',
        pageSize: 100,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
    });
    const publicFiles = externallySharedResponse.data.files || [];
    // Categorize by risk
    const sensitivePatterns = [
        /password/i, /credential/i, /secret/i, /key/i, /token/i,
        /financial/i, /payroll/i, /salary/i, /ssn/i, /social.?security/i,
        /hipaa/i, /pii/i, /confidential/i, /private/i,
    ];
    let criticalCount = 0;
    let warningCount = 0;
    const categorizedFiles = publicFiles.map(file => {
        const isSensitive = sensitivePatterns.some(pattern => pattern.test(file.name || ''));
        const hasAnyonePermission = file.permissions?.some(p => p.type === 'anyone');
        if (isSensitive && hasAnyonePermission) {
            criticalCount++;
            return { ...file, risk: 'critical', reason: 'Sensitive file publicly accessible' };
        }
        else if (hasAnyonePermission) {
            warningCount++;
            return { ...file, risk: 'warning', reason: 'File publicly accessible' };
        }
        return { ...file, risk: 'info' };
    });
    return {
        type: 'drive_sharing',
        publicFiles: categorizedFiles,
        totalPublicFiles: publicFiles.length,
        criticalCount,
        warningCount,
        compliance: {
            hasPublicFiles: publicFiles.length > 0,
            sensitiveFilesExposed: criticalCount > 0,
        },
    };
}
async function collectMobileDeviceStatus(directory, customerId) {
    const response = await directory.mobiledevices.list({
        customerId,
        maxResults: 500,
    });
    const devices = response.data.mobiledevices || [];
    let managedDevices = 0;
    let encryptedDevices = 0;
    let compromisedDevices = 0;
    let criticalCount = 0;
    let warningCount = 0;
    const categorizedDevices = devices.map(device => {
        const isManaged = device.status === 'APPROVED';
        const isEncrypted = device.encryptionStatus === 'ENCRYPTED';
        const isCompromised = device.deviceCompromisedStatus === 'COMPROMISED';
        if (isManaged)
            managedDevices++;
        if (isEncrypted)
            encryptedDevices++;
        if (isCompromised) {
            compromisedDevices++;
            criticalCount++;
        }
        if (!isEncrypted && isManaged)
            warningCount++;
        return {
            deviceId: device.deviceId,
            email: device.email,
            model: device.model,
            os: device.os,
            status: device.status,
            type: device.type,
            isEncrypted,
            isCompromised,
            lastSync: device.lastSync,
            risk: isCompromised ? 'critical' : !isEncrypted ? 'warning' : 'ok',
        };
    });
    return {
        type: 'mobile_devices',
        summary: {
            totalDevices: devices.length,
            managedDevices,
            unmanagedDevices: devices.length - managedDevices,
            encryptedDevices,
            nonEncryptedDevices: devices.length - encryptedDevices,
            compromisedDevices,
        },
        devices: categorizedDevices,
        criticalCount,
        warningCount,
        compliance: {
            allDevicesManaged: managedDevices === devices.length,
            allDevicesEncrypted: encryptedDevices === devices.length,
            noCompromisedDevices: compromisedDevices === 0,
        },
    };
}
async function collectUserSecurityStatus(directory, customerId) {
    const response = await directory.users.list({
        customer: customerId,
        maxResults: 500,
    });
    const users = response.data.users || [];
    let with2FA = 0;
    let enforced2FA = 0;
    let admins = 0;
    let suspended = 0;
    let criticalCount = 0;
    let warningCount = 0;
    const categorizedUsers = users.map(user => {
        if (user.isEnrolledIn2Sv)
            with2FA++;
        if (user.isEnforcedIn2Sv)
            enforced2FA++;
        if (user.isAdmin)
            admins++;
        if (user.suspended)
            suspended++;
        // Flag admins without 2FA as critical
        if (user.isAdmin && !user.isEnrolledIn2Sv) {
            criticalCount++;
            return { ...user, risk: 'critical', reason: 'Admin without 2FA' };
        }
        // Flag regular users without 2FA as warning
        if (!user.isEnrolledIn2Sv) {
            warningCount++;
            return { ...user, risk: 'warning', reason: 'User without 2FA' };
        }
        return { ...user, risk: 'ok' };
    });
    const activeUsers = users.length - suspended;
    return {
        type: 'user_security',
        summary: {
            totalUsers: users.length,
            activeUsers,
            suspendedUsers: suspended,
            adminUsers: admins,
            usersWith2FA: with2FA,
            usersWithEnforced2FA: enforced2FA,
            usersWithout2FA: activeUsers - with2FA,
        },
        users: categorizedUsers,
        criticalCount,
        warningCount,
        compliance: {
            '2FAAdoption': activeUsers > 0 ? Math.round((with2FA / activeUsers) * 100) : 0,
            '2FAEnforcement': activeUsers > 0 ? Math.round((enforced2FA / activeUsers) * 100) : 0,
            allAdminsHave2FA: criticalCount === 0,
        },
    };
}
function getDemoFindings(checks) {
    return checks.map(check => ({
        type: check,
        events: [],
        status: 'demo_mode',
        note: `Demo mode - configure Google Workspace credentials to collect real ${check} data`,
        criticalCount: 0,
        warningCount: 0,
    }));
}
//# sourceMappingURL=google-workspace-evidence.js.map