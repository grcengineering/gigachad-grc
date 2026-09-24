import axios from 'axios';
export async function collectJamfEvidence(params) {
    const { evidenceTypes = ['device-inventory', 'compliance-status', 'patch-status', 'security-configs'], filters, } = params;
    const jamfUrl = process.env.JAMF_URL;
    const jamfUsername = process.env.JAMF_USERNAME;
    const jamfPassword = process.env.JAMF_PASSWORD;
    if (!jamfUrl || !jamfUsername || !jamfPassword) {
        return {
            service: 'jamf',
            collectedAt: new Date().toISOString(),
            findings: [
                {
                    error: 'JAMF_URL, JAMF_USERNAME, and JAMF_PASSWORD environment variables required',
                },
            ],
            summary: {
                totalDevices: 0,
                compliantDevices: 0,
                nonCompliantDevices: 0,
            },
        };
    }
    // Get authentication token
    const auth = Buffer.from(`${jamfUsername}:${jamfPassword}`).toString('base64');
    const client = axios.create({
        baseURL: jamfUrl,
        headers: {
            Authorization: `Basic ${auth}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        },
    });
    const findings = [];
    let totalDevices = 0;
    let compliantDevices = 0;
    let nonCompliantDevices = 0;
    try {
        for (const evidenceType of evidenceTypes) {
            switch (evidenceType) {
                case 'device-inventory': {
                    const inventoryFindings = await collectDeviceInventory(client, filters);
                    findings.push(inventoryFindings);
                    totalDevices += inventoryFindings.totalDevices;
                    break;
                }
                case 'compliance-status': {
                    const complianceFindings = await collectComplianceStatus(client);
                    findings.push(complianceFindings);
                    compliantDevices += complianceFindings.compliantCount;
                    nonCompliantDevices += complianceFindings.nonCompliantCount;
                    break;
                }
                case 'patch-status':
                    findings.push(await collectPatchStatus(client));
                    break;
                case 'security-configs':
                    findings.push(await collectSecurityConfigs(client));
                    break;
                default:
                    findings.push({
                        type: evidenceType,
                        error: `Unsupported evidence type: ${evidenceType}`,
                    });
            }
        }
        return {
            service: 'jamf',
            collectedAt: new Date().toISOString(),
            findings,
            summary: {
                totalDevices,
                compliantDevices,
                nonCompliantDevices,
            },
        };
    }
    catch (error) {
        return {
            service: 'jamf',
            collectedAt: new Date().toISOString(),
            findings: [{ error: error instanceof Error ? error.message : 'Unknown error' }],
            summary: {
                totalDevices: 0,
                compliantDevices: 0,
                nonCompliantDevices: 0,
            },
        };
    }
}
async function collectDeviceInventory(client, filters) {
    const computers = [];
    const mobileDevices = [];
    try {
        // Get computers if not filtered to mobile only
        if (!filters?.deviceType || filters.deviceType === 'computer') {
            const { data } = await client.get('/JSSResource/computers');
            const computerList = data.computers || [];
            for (const computer of computerList) {
                try {
                    const { data: details } = await client.get(`/JSSResource/computers/id/${computer.id}`);
                    const comp = details.computer;
                    computers.push({
                        id: comp.general?.id,
                        name: comp.general?.name,
                        serialNumber: comp.general?.serial_number,
                        managed: comp.general?.remote_management?.managed,
                        lastContactTime: comp.general?.last_contact_time,
                        osVersion: comp.hardware?.os_version,
                        osBuild: comp.hardware?.os_build,
                        modelIdentifier: comp.hardware?.model_identifier,
                        processor: comp.hardware?.processor_type,
                        totalRam: comp.hardware?.total_ram,
                        filevaultEnabled: comp.hardware?.filevault2_status === 'Encrypted',
                        sipStatus: comp.hardware?.sip_status,
                        gatekeeperStatus: comp.hardware?.gatekeeper_status,
                        lastEnrollment: comp.general?.initial_entry_date,
                    });
                }
                catch {
                    computers.push({
                        id: computer.id,
                        name: computer.name,
                        error: 'Failed to fetch details',
                    });
                }
            }
        }
        // Get mobile devices if not filtered to computer only
        if (!filters?.deviceType || filters.deviceType === 'mobile') {
            const { data } = await client.get('/JSSResource/mobiledevices');
            const deviceList = data.mobile_devices || [];
            for (const device of deviceList) {
                try {
                    const { data: details } = await client.get(`/JSSResource/mobiledevices/id/${device.id}`);
                    const mobile = details.mobile_device;
                    mobileDevices.push({
                        id: mobile.general?.id,
                        name: mobile.general?.name,
                        serialNumber: mobile.general?.serial_number,
                        managed: mobile.general?.managed,
                        supervised: mobile.general?.supervised,
                        lastInventoryUpdate: mobile.general?.last_inventory_update,
                        osVersion: mobile.general?.os_version,
                        osBuild: mobile.general?.os_build,
                        model: mobile.general?.model,
                        modelIdentifier: mobile.general?.model_identifier,
                        passcodeEnabled: mobile.security?.data_protection,
                        blockLevelEncryption: mobile.security?.block_level_encryption_capable,
                        cloudBackupEnabled: mobile.general?.cloud_backup_enabled,
                    });
                }
                catch {
                    mobileDevices.push({
                        id: device.id,
                        name: device.name,
                        error: 'Failed to fetch details',
                    });
                }
            }
        }
        return {
            type: 'device_inventory',
            totalDevices: computers.length + mobileDevices.length,
            computers,
            mobileDevices,
        };
    }
    catch (error) {
        return {
            type: 'device_inventory',
            totalDevices: 0,
            computers: [{ error: error instanceof Error ? error.message : 'Failed to fetch computers' }],
            mobileDevices: [{ error: error instanceof Error ? error.message : 'Failed to fetch mobile devices' }],
        };
    }
}
async function collectComplianceStatus(client) {
    try {
        // Get configuration profiles for compliance
        const { data: profiles } = await client.get('/JSSResource/osxconfigurationprofiles');
        const profileList = profiles.os_x_configuration_profiles || [];
        const compliancePolicies = [];
        let compliantCount = 0;
        let nonCompliantCount = 0;
        for (const profile of profileList) {
            try {
                const { data: details } = await client.get(`/JSSResource/osxconfigurationprofiles/id/${profile.id}`);
                const prof = details.os_x_configuration_profile;
                const scope = prof.scope;
                const targetedDevices = (scope?.computers?.length || 0) + (scope?.computer_groups?.length || 0);
                compliancePolicies.push({
                    id: prof.general?.id,
                    name: prof.general?.name,
                    description: prof.general?.description,
                    site: prof.general?.site?.name,
                    category: prof.general?.category?.name,
                    distributionMethod: prof.general?.distribution_method,
                    userRemovable: prof.general?.user_removable,
                    level: prof.general?.level,
                    targetedDevices,
                    payloads: prof.payloads,
                });
                // In real implementation, you would check actual compliance status
                if (targetedDevices > 0) {
                    compliantCount++;
                }
            }
            catch {
                compliancePolicies.push({
                    id: profile.id,
                    name: profile.name,
                    error: 'Failed to fetch details',
                });
                nonCompliantCount++;
            }
        }
        return {
            type: 'compliance_status',
            compliantCount,
            nonCompliantCount,
            policies: compliancePolicies,
        };
    }
    catch (error) {
        return {
            type: 'compliance_status',
            compliantCount: 0,
            nonCompliantCount: 0,
            policies: [{ error: error instanceof Error ? error.message : 'Failed to fetch compliance' }],
        };
    }
}
async function collectPatchStatus(client) {
    try {
        // Get patch policies
        const { data } = await client.get('/JSSResource/patchpolicies');
        const policies = data.patch_policies || [];
        const patchInfo = [];
        for (const policy of policies) {
            try {
                const { data: details } = await client.get(`/JSSResource/patchpolicies/id/${policy.id}`);
                const patch = details.patch_policy;
                patchInfo.push({
                    id: patch.general?.id,
                    name: patch.general?.name,
                    enabled: patch.general?.enabled,
                    targetVersion: patch.general?.target_version,
                    releaseDate: patch.general?.release_date,
                    installType: patch.user_interaction?.install_button_text,
                    gracePeriod: patch.user_interaction?.grace_period?.grace_period_duration,
                });
            }
            catch {
                patchInfo.push({
                    id: policy.id,
                    name: policy.name,
                    error: 'Failed to fetch details',
                });
            }
        }
        return {
            type: 'patch_status',
            totalPolicies: policies.length,
            policies: patchInfo,
            summary: {
                enabledPolicies: patchInfo.filter((p) => p.enabled).length,
                disabledPolicies: patchInfo.filter((p) => !p.enabled).length,
            },
        };
    }
    catch (error) {
        return {
            type: 'patch_status',
            totalPolicies: 0,
            policies: [{ error: error instanceof Error ? error.message : 'Failed to fetch patches' }],
            summary: { enabledPolicies: 0, disabledPolicies: 0 },
        };
    }
}
async function collectSecurityConfigs(client) {
    try {
        // Get restricted software
        const { data: restrictedSoftware } = await client.get('/JSSResource/restrictedsoftware');
        // Get disk encryption configurations
        const { data: diskEncryption } = await client.get('/JSSResource/diskencryptionconfigurations');
        return {
            type: 'security_configs',
            restrictedSoftware: {
                count: restrictedSoftware.restricted_software?.length || 0,
                items: restrictedSoftware.restricted_software || [],
            },
            diskEncryption: {
                count: diskEncryption.disk_encryption_configurations?.length || 0,
                configurations: diskEncryption.disk_encryption_configurations?.map((config) => ({
                    id: config.id,
                    name: config.name,
                })) || [],
            },
            securityChecks: {
                hasRestrictedSoftwarePolicy: (restrictedSoftware.restricted_software?.length || 0) > 0,
                hasDiskEncryption: (diskEncryption.disk_encryption_configurations?.length || 0) > 0,
            },
        };
    }
    catch (error) {
        return {
            type: 'security_configs',
            error: error instanceof Error ? error.message : 'Failed to fetch security configs',
        };
    }
}
//# sourceMappingURL=jamf-evidence.js.map