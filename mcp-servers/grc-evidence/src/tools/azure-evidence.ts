import { DefaultAzureCredential, TokenCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';

interface AzureEvidenceParams {
  subscriptionId: string;
  resourceTypes?: string[];
}

interface EvidenceResult {
  service: string;
  collectedAt: string;
  subscriptionId: string;
  findings: unknown[];
  summary: {
    totalResources: number;
    compliantResources: number;
    nonCompliantResources: number;
  };
  isMockMode?: boolean;
  mockModeReason?: string;
  requiredCredentials?: string[];
}

interface ComplianceCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'unknown';
  description: string;
  resourceId?: string;
}

export async function collectAzureEvidence(params: AzureEvidenceParams): Promise<EvidenceResult> {
  const { subscriptionId, resourceTypes = ['security-center', 'key-vault', 'network', 'storage'] } = params;
  const findings: unknown[] = [];
  let compliantCount = 0;
  let nonCompliantCount = 0;

  try {
    const credential = new DefaultAzureCredential();
    const resourceClient = new ResourceManagementClient(credential, subscriptionId);

    // Collect resource groups
    const resourceGroups: unknown[] = [];
    for await (const rg of resourceClient.resourceGroups.list()) {
      resourceGroups.push({
        name: rg.name,
        location: rg.location,
        tags: rg.tags,
        provisioningState: rg.properties?.provisioningState,
      });
    }

    findings.push({
      type: 'resource_groups',
      count: resourceGroups.length,
      groups: resourceGroups,
    });

    // Collect resources by type
    for (const resourceType of resourceTypes) {
      try {
        let result: { finding: unknown; compliant: number; nonCompliant: number };
        
        switch (resourceType.toLowerCase()) {
          case 'security-center':
            result = await collectSecurityCenterEvidence(credential, subscriptionId);
            break;
          case 'key-vault':
            result = await collectKeyVaultEvidence(credential, resourceClient, subscriptionId);
            break;
          case 'network':
            result = await collectNetworkEvidence(credential, resourceClient, subscriptionId);
            break;
          case 'storage':
            result = await collectStorageEvidence(credential, resourceClient, subscriptionId);
            break;
          default:
            result = {
              finding: { type: resourceType, error: `Unsupported resource type: ${resourceType}` },
              compliant: 0,
              nonCompliant: 0,
            };
        }
        
        findings.push(result.finding);
        compliantCount += result.compliant;
        nonCompliantCount += result.nonCompliant;
      } catch (error) {
        findings.push({
          type: resourceType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        nonCompliantCount++;
      }
    }

    // Calculate totals
    const resourceCount = findings.reduce<number>((total: number, f) => {
      const finding = f as Record<string, unknown>;
      if (typeof finding.count === 'number') {
        return total + finding.count;
      }
      return total;
    }, 0);

    return {
      service: 'azure',
      collectedAt: new Date().toISOString(),
      subscriptionId,
      findings,
      summary: {
        totalResources: resourceCount,
        compliantResources: compliantCount,
        nonCompliantResources: nonCompliantCount,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isAuthError = errorMessage.includes('credential') || 
                        errorMessage.includes('authentication') ||
                        errorMessage.includes('AZURE_');
    
    console.warn(`Azure evidence collection failed: ${errorMessage}`);
    
    return {
      service: 'azure',
      collectedAt: new Date().toISOString(),
      subscriptionId,
      findings: [],
      summary: {
        totalResources: 0,
        compliantResources: 0,
        nonCompliantResources: 0,
      },
      isMockMode: true,
      mockModeReason: isAuthError 
        ? 'Azure credentials not configured. Set AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and AZURE_TENANT_ID environment variables, or run on Azure with managed identity.'
        : `Azure evidence collection failed: ${errorMessage}`,
      requiredCredentials: isAuthError 
        ? ['AZURE_CLIENT_ID', 'AZURE_CLIENT_SECRET', 'AZURE_TENANT_ID'] 
        : undefined,
    };
  }
}

async function collectSecurityCenterEvidence(
  credential: TokenCredential,
  subscriptionId: string
): Promise<{ finding: unknown; compliant: number; nonCompliant: number }> {
  let compliant = 0;
  let nonCompliant = 0;

  try {
    // Dynamic import to handle missing SDK gracefully
    const { SecurityCenter } = await import('@azure/arm-security');
    
    const client = new SecurityCenter(credential, subscriptionId);
    
    // Collect secure score
    const secureScores: unknown[] = [];
    for await (const score of client.secureScores.list()) {
      secureScores.push({
        name: score.displayName,
        current: score.current,
        max: score.max,
        percentage: score.percentage,
      });
      
      // Score above 70% is considered compliant
      if ((score.percentage || 0) >= 0.7) compliant++;
      else nonCompliant++;
    }
    
    // Collect security assessments
    const assessments: unknown[] = [];
    try {
      for await (const assessment of client.assessments.list(`/subscriptions/${subscriptionId}`)) {
        const status = assessment.status?.code;
        assessments.push({
          name: assessment.displayName,
          status,
          resourceId: assessment.resourceDetails,
          description: assessment.status?.description,
        });
        
        if (status === 'Healthy') compliant++;
        else if (status === 'Unhealthy') nonCompliant++;
      }
    } catch {
      // Assessments API may not be available in all subscriptions
    }
    
    // Collect alerts
    const alerts: unknown[] = [];
    try {
      for await (const alert of client.alerts.list()) {
        alerts.push({
          name: alert.alertDisplayName,
          severity: alert.severity,
          status: alert.status,
          timeGenerated: alert.timeGeneratedUtc,
          description: alert.description,
        });
        
        if (alert.status === 'Active' && (alert.severity === 'High' || alert.severity === 'Medium')) {
          nonCompliant++;
        }
      }
    } catch {
      // Alerts API may require additional permissions
    }
    
    return {
      finding: {
        type: 'security_center',
        subscriptionId,
        collectedAt: new Date().toISOString(),
        count: secureScores.length + assessments.length,
        findings: {
          secureScores,
          assessments: assessments.slice(0, 100),
          assessmentCount: assessments.length,
          alerts: alerts.slice(0, 50),
          alertCount: alerts.length,
        },
        compliance: {
          overallScore: secureScores[0] ? (secureScores[0] as { percentage: number }).percentage * 100 : 0,
          healthyAssessments: assessments.filter((a: unknown) => (a as { status: string }).status === 'Healthy').length,
          unhealthyAssessments: assessments.filter((a: unknown) => (a as { status: string }).status === 'Unhealthy').length,
          activeAlerts: alerts.filter((a: unknown) => (a as { status: string }).status === 'Active').length,
        },
      },
      compliant,
      nonCompliant,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const err = error as { code?: string };
    const isModuleError = err.code === 'MODULE_NOT_FOUND' || 
                          errorMessage.includes('Cannot find module');
    
    console.warn(`Security Center evidence collection: ${isModuleError ? 'SDK not installed' : errorMessage}`);
    
    return {
      finding: {
        type: 'security_center',
        subscriptionId,
        collectedAt: new Date().toISOString(),
        count: 0,
        findings: {
          secureScore: { current: 0, max: 100, percentage: 0 },
          recommendations: [],
          alerts: [],
        },
        isMockMode: true,
        mockModeReason: isModuleError 
          ? 'Install @azure/arm-security SDK: npm install @azure/arm-security'
          : `Security Center collection failed: ${errorMessage}`,
      },
      compliant: 0,
      nonCompliant: 0,
    };
  }
}

async function collectKeyVaultEvidence(
  credential: TokenCredential,
  resourceClient: ResourceManagementClient,
  subscriptionId: string
): Promise<{ finding: unknown; compliant: number; nonCompliant: number }> {
  const keyVaults: unknown[] = [];
  const complianceChecks: ComplianceCheck[] = [];
  let compliant = 0;
  let nonCompliant = 0;

  // List all Key Vault resources
  for await (const resource of resourceClient.resources.list({
    filter: "resourceType eq 'Microsoft.KeyVault/vaults'",
  })) {
    keyVaults.push({
      name: resource.name,
      location: resource.location,
      id: resource.id,
      tags: resource.tags,
      sku: resource.sku,
    });
  }

  // Try to get detailed Key Vault information
  try {
    const { KeyVaultManagementClient } = await import('@azure/arm-keyvault');
    const kvClient = new KeyVaultManagementClient(credential, subscriptionId);

    for await (const vault of kvClient.vaults.list()) {
      const vaultName = vault.name || 'unknown';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const properties = (vault as any).properties as {
        enableSoftDelete?: boolean;
        enablePurgeProtection?: boolean;
        enableRbacAuthorization?: boolean;
        networkAcls?: { defaultAction?: string };
      } | undefined;

      // Check soft delete
      if (properties?.enableSoftDelete) {
        complianceChecks.push({
          name: 'Soft Delete Enabled',
          status: 'pass',
          description: `Soft delete is enabled for ${vaultName}`,
          resourceId: vault.id,
        });
        compliant++;
      } else {
        complianceChecks.push({
          name: 'Soft Delete Enabled',
          status: 'fail',
          description: `Soft delete is NOT enabled for ${vaultName}`,
          resourceId: vault.id,
        });
        nonCompliant++;
      }

      // Check purge protection
      if (properties?.enablePurgeProtection) {
        complianceChecks.push({
          name: 'Purge Protection Enabled',
          status: 'pass',
          description: `Purge protection is enabled for ${vaultName}`,
          resourceId: vault.id,
        });
        compliant++;
      } else {
        complianceChecks.push({
          name: 'Purge Protection Enabled',
          status: 'fail',
          description: `Purge protection is NOT enabled for ${vaultName}`,
          resourceId: vault.id,
        });
        nonCompliant++;
      }

      // Check network rules
      const networkRules = properties?.networkAcls;
      if (networkRules?.defaultAction === 'Deny') {
        complianceChecks.push({
          name: 'Network Restrictions',
          status: 'pass',
          description: `Network access is restricted for ${vaultName}`,
          resourceId: vault.id,
        });
        compliant++;
      } else {
        complianceChecks.push({
          name: 'Network Restrictions',
          status: 'warning',
          description: `Network access is open for ${vaultName}`,
          resourceId: vault.id,
        });
        nonCompliant++;
      }

      // Check RBAC authorization
      if (properties?.enableRbacAuthorization) {
        complianceChecks.push({
          name: 'RBAC Authorization',
          status: 'pass',
          description: `RBAC authorization is enabled for ${vaultName}`,
          resourceId: vault.id,
        });
        compliant++;
      } else {
        complianceChecks.push({
          name: 'RBAC Authorization',
          status: 'warning',
          description: `Using access policies instead of RBAC for ${vaultName}`,
          resourceId: vault.id,
        });
      }
    }
  } catch (error: unknown) {
    const err = error as { code?: string };
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (err.code !== 'MODULE_NOT_FOUND' && !errorMessage.includes('Cannot find module')) {
      console.warn(`Key Vault detailed check failed: ${errorMessage}`);
    }
    complianceChecks.push({
      name: 'Detailed Compliance Checks',
      status: 'unknown',
      description: 'Install @azure/arm-keyvault for detailed compliance checks',
    });
  }

  return {
    finding: {
      type: 'key_vault',
      count: keyVaults.length,
      vaults: keyVaults,
      complianceChecks,
      summary: {
        compliant,
        nonCompliant,
        total: keyVaults.length,
      },
    },
    compliant,
    nonCompliant,
  };
}

async function collectNetworkEvidence(
  credential: TokenCredential,
  resourceClient: ResourceManagementClient,
  subscriptionId: string
): Promise<{ finding: unknown; compliant: number; nonCompliant: number }> {
  const networkResources: Record<string, unknown[]> = {
    virtualNetworks: [],
    networkSecurityGroups: [],
    publicIpAddresses: [],
  };
  const complianceChecks: ComplianceCheck[] = [];
  let compliant = 0;
  let nonCompliant = 0;

  // List Virtual Networks
  for await (const resource of resourceClient.resources.list({
    filter: "resourceType eq 'Microsoft.Network/virtualNetworks'",
  })) {
    networkResources.virtualNetworks.push({
      name: resource.name,
      location: resource.location,
      id: resource.id,
    });
  }

  // List Network Security Groups
  for await (const resource of resourceClient.resources.list({
    filter: "resourceType eq 'Microsoft.Network/networkSecurityGroups'",
  })) {
    networkResources.networkSecurityGroups.push({
      name: resource.name,
      location: resource.location,
      id: resource.id,
    });
  }

  // List Public IP Addresses
  for await (const resource of resourceClient.resources.list({
    filter: "resourceType eq 'Microsoft.Network/publicIPAddresses'",
  })) {
    networkResources.publicIpAddresses.push({
      name: resource.name,
      location: resource.location,
      id: resource.id,
    });
  }

  // Try to get detailed NSG rules
  try {
    const { NetworkManagementClient } = await import('@azure/arm-network');
    const networkClient = new NetworkManagementClient(credential, subscriptionId);

    for await (const nsg of networkClient.networkSecurityGroups.listAll()) {
      const nsgName = nsg.name || 'unknown';
      const rules = nsg.securityRules || [];
      
      // Check for overly permissive rules
      for (const rule of rules) {
        if (rule.access === 'Allow' && rule.direction === 'Inbound') {
          const isOverlyPermissive = 
            rule.sourceAddressPrefix === '*' || 
            rule.sourceAddressPrefix === 'Internet' ||
            rule.sourceAddressPrefix === '0.0.0.0/0';
          
          const isSensitivePort = 
            rule.destinationPortRange === '*' ||
            rule.destinationPortRange === '22' ||
            rule.destinationPortRange === '3389' ||
            rule.destinationPortRange === '3306' ||
            rule.destinationPortRange === '1433';
          
          if (isOverlyPermissive && isSensitivePort) {
            complianceChecks.push({
              name: 'Overly Permissive Inbound Rule',
              status: 'fail',
              description: `NSG ${nsgName} allows ${rule.destinationPortRange} from ${rule.sourceAddressPrefix}`,
              resourceId: nsg.id,
            });
            nonCompliant++;
          }
        }
      }

      // Check for SSH/RDP from internet
      const hasSshFromInternet = rules.some(r => 
        r.access === 'Allow' && 
        r.direction === 'Inbound' && 
        (r.sourceAddressPrefix === '*' || r.sourceAddressPrefix === 'Internet') &&
        r.destinationPortRange === '22'
      );
      
      const hasRdpFromInternet = rules.some(r => 
        r.access === 'Allow' && 
        r.direction === 'Inbound' && 
        (r.sourceAddressPrefix === '*' || r.sourceAddressPrefix === 'Internet') &&
        r.destinationPortRange === '3389'
      );

      if (!hasSshFromInternet && !hasRdpFromInternet) {
        complianceChecks.push({
          name: 'Management Ports Protected',
          status: 'pass',
          description: `NSG ${nsgName} restricts SSH/RDP from internet`,
          resourceId: nsg.id,
        });
        compliant++;
      }
    }

    // Check for unused public IPs (potential cost/security issue)
    for await (const pip of networkClient.publicIPAddresses.listAll()) {
      if (!pip.ipConfiguration) {
        complianceChecks.push({
          name: 'Unused Public IP',
          status: 'warning',
          description: `Public IP ${pip.name} is not associated with any resource`,
          resourceId: pip.id,
        });
      }
    }
  } catch (error: unknown) {
    const err = error as { code?: string };
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (err.code !== 'MODULE_NOT_FOUND' && !errorMessage.includes('Cannot find module')) {
      console.warn(`Network detailed check failed: ${errorMessage}`);
    }
    complianceChecks.push({
      name: 'Detailed Network Checks',
      status: 'unknown',
      description: 'Install @azure/arm-network for detailed NSG rule analysis',
    });
  }

  return {
    finding: {
      type: 'network',
      count:
        networkResources.virtualNetworks.length +
        networkResources.networkSecurityGroups.length +
        networkResources.publicIpAddresses.length,
      resources: networkResources,
      complianceChecks,
      summary: {
        compliant,
        nonCompliant,
        virtualNetworks: networkResources.virtualNetworks.length,
        networkSecurityGroups: networkResources.networkSecurityGroups.length,
        publicIpAddresses: networkResources.publicIpAddresses.length,
      },
    },
    compliant,
    nonCompliant,
  };
}

async function collectStorageEvidence(
  credential: TokenCredential,
  resourceClient: ResourceManagementClient,
  subscriptionId: string
): Promise<{ finding: unknown; compliant: number; nonCompliant: number }> {
  const storageAccounts: unknown[] = [];
  const complianceChecks: ComplianceCheck[] = [];
  let compliant = 0;
  let nonCompliant = 0;

  // List Storage Accounts
  for await (const resource of resourceClient.resources.list({
    filter: "resourceType eq 'Microsoft.Storage/storageAccounts'",
  })) {
    storageAccounts.push({
      name: resource.name,
      location: resource.location,
      id: resource.id,
      sku: resource.sku,
      kind: resource.kind,
    });
  }

  // Try to get detailed storage account information
  try {
    const { StorageManagementClient } = await import('@azure/arm-storage');
    const storageClient = new StorageManagementClient(credential, subscriptionId);

    for await (const account of storageClient.storageAccounts.list()) {
      const accountName = account.name || 'unknown';

      // Check HTTPS only
      if (account.enableHttpsTrafficOnly) {
        complianceChecks.push({
          name: 'HTTPS Only',
          status: 'pass',
          description: `HTTPS-only traffic is enforced for ${accountName}`,
          resourceId: account.id,
        });
        compliant++;
      } else {
        complianceChecks.push({
          name: 'HTTPS Only',
          status: 'fail',
          description: `HTTP traffic is allowed for ${accountName}`,
          resourceId: account.id,
        });
        nonCompliant++;
      }

      // Check encryption
      if (account.encryption?.services?.blob?.enabled) {
        complianceChecks.push({
          name: 'Blob Encryption',
          status: 'pass',
          description: `Blob encryption is enabled for ${accountName}`,
          resourceId: account.id,
        });
        compliant++;
      } else {
        complianceChecks.push({
          name: 'Blob Encryption',
          status: 'fail',
          description: `Blob encryption is NOT enabled for ${accountName}`,
          resourceId: account.id,
        });
        nonCompliant++;
      }

      // Check public blob access
      if (account.allowBlobPublicAccess === false) {
        complianceChecks.push({
          name: 'Public Blob Access Disabled',
          status: 'pass',
          description: `Public blob access is disabled for ${accountName}`,
          resourceId: account.id,
        });
        compliant++;
      } else {
        complianceChecks.push({
          name: 'Public Blob Access Disabled',
          status: 'warning',
          description: `Public blob access is allowed for ${accountName}`,
          resourceId: account.id,
        });
        nonCompliant++;
      }

      // Check network rules
      const networkRules = account.networkRuleSet;
      if (networkRules?.defaultAction === 'Deny') {
        complianceChecks.push({
          name: 'Network Restrictions',
          status: 'pass',
          description: `Network access is restricted for ${accountName}`,
          resourceId: account.id,
        });
        compliant++;
      } else {
        complianceChecks.push({
          name: 'Network Restrictions',
          status: 'warning',
          description: `Network access is open for ${accountName}`,
          resourceId: account.id,
        });
      }

      // Check minimum TLS version
      if (account.minimumTlsVersion === 'TLS1_2') {
        complianceChecks.push({
          name: 'Minimum TLS Version',
          status: 'pass',
          description: `TLS 1.2 is enforced for ${accountName}`,
          resourceId: account.id,
        });
        compliant++;
      } else {
        complianceChecks.push({
          name: 'Minimum TLS Version',
          status: 'warning',
          description: `TLS version lower than 1.2 is allowed for ${accountName}`,
          resourceId: account.id,
        });
        nonCompliant++;
      }
    }
  } catch (error: unknown) {
    const err = error as { code?: string };
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (err.code !== 'MODULE_NOT_FOUND' && !errorMessage.includes('Cannot find module')) {
      console.warn(`Storage detailed check failed: ${errorMessage}`);
    }
    complianceChecks.push({
      name: 'Detailed Storage Checks',
      status: 'unknown',
      description: 'Install @azure/arm-storage for detailed compliance checks: npm install @azure/arm-storage',
    });
  }

  return {
    finding: {
      type: 'storage',
      count: storageAccounts.length,
      accounts: storageAccounts,
      complianceChecks,
      summary: {
        compliant,
        nonCompliant,
        total: storageAccounts.length,
      },
    },
    compliant,
    nonCompliant,
  };
}
