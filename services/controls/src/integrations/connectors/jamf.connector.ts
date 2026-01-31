/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

interface JamfConfig {
  serverUrl: string;
  clientId: string;
  clientSecret: string;
}

interface JamfTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface JamfComputer {
  id: string;
  udid: string;
  general: {
    name: string;
    lastContactTime: string;
    lastReportedIp: string;
    platform: string;
    managed: boolean;
    mdmCapable: boolean;
    supervised: boolean;
  };
  hardware: {
    model: string;
    modelIdentifier: string;
    serialNumber: string;
    processorType: string;
    totalRamMegabytes: number;
  };
  operatingSystem: {
    name: string;
    version: string;
    build: string;
    activeDirectoryStatus: string;
  };
  security: {
    sipStatus: string;
    gatekeeperStatus: string;
    xprotectVersion: string;
    autoLoginDisabled: boolean;
    remoteDesktopEnabled: boolean;
    activationLockEnabled: boolean;
    secureBootLevel: string;
    externalBootLevel: string;
    bootstrapTokenAllowed: boolean;
  };
  diskEncryption: {
    bootPartitionEncryptionDetails: {
      partitionName: string;
      partitionFileVault2State: string;
      partitionFileVault2Percent: number;
    };
    individualRecoveryKeyValidityStatus: string;
    institutionalRecoveryKeyPresent: boolean;
    diskEncryptionConfigurationName: string;
    fileVault2EnabledUserNames: string[];
    fileVault2EligibilityMessage: string;
  };
}

interface JamfMobileDevice {
  id: string;
  name: string;
  serialNumber: string;
  wifiMacAddress: string;
  udid: string;
  model: string;
  modelIdentifier: string;
  osVersion: string;
  osBuild: string;
  supervised: boolean;
  managed: boolean;
  lastInventoryUpdateDate: string;
}

export interface JamfSyncResult {
  computers: {
    total: number;
    managed: number;
    encrypted: number;
    compliant: number;
    devices: any[];
  };
  mobileDevices: {
    total: number;
    managed: number;
    supervised: number;
    devices: any[];
  };
  securitySummary: {
    fileVaultEnabled: number;
    fileVaultDisabled: number;
    sipEnabled: number;
    sipDisabled: number;
    gatekeeperEnabled: number;
    gatekeeperDisabled: number;
    firewallEnabled: number;
    firewallDisabled: number;
  };
  collectedAt: string;
}

@Injectable()
export class JamfConnector {
  private readonly logger = new Logger(JamfConnector.name);

  /**
   * Test connection to Jamf Pro by attempting to get an access token
   */
  async testConnection(config: JamfConfig): Promise<{ success: boolean; message: string; details?: any }> {
    // Validate config
    if (!config.serverUrl) {
      return { success: false, message: 'Server URL is required' };
    }
    if (!config.clientId) {
      return { success: false, message: 'Client ID is required' };
    }
    if (!config.clientSecret) {
      return { success: false, message: 'Client Secret is required' };
    }

    const baseUrl = this.normalizeUrl(config.serverUrl);
    this.logger.log(`Testing Jamf connection to: ${baseUrl}`);

    try {
      // Step 1: Get access token
      const token = await this.getAccessToken(config);
      
      if (!token) {
        return { success: false, message: 'Failed to obtain access token - check your Client ID and Secret' };
      }

      // Step 2: Verify token works by calling version endpoint
      const response = await fetch(`${baseUrl}/api/v1/jamf-pro-version`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          message: `Token obtained but API request failed: ${response.status} - ${errorText.substring(0, 100)}` 
        };
      }

      const versionInfo = await response.json();
      
      return { 
        success: true, 
        message: `Connected to Jamf Pro ${versionInfo.version || 'successfully'}`,
        details: versionInfo,
      };
    } catch (error: any) {
      this.logger.error('Jamf connection test failed', error);
      
      // Provide helpful error messages
      let message = error.message || 'Connection failed';
      
      if (message.includes('ENOTFOUND') || message.includes('getaddrinfo')) {
        message = `Cannot reach server: ${config.serverUrl} - check the URL is correct`;
      } else if (message.includes('ECONNREFUSED')) {
        message = `Connection refused by ${config.serverUrl} - server may be down or URL incorrect`;
      } else if (message.includes('certificate')) {
        message = `SSL certificate error for ${config.serverUrl}`;
      } else if (message.includes('401') || message.includes('invalid_client')) {
        message = 'Invalid Client ID or Client Secret';
      } else if (message.includes('403')) {
        message = 'Access forbidden - check API client permissions in Jamf Pro';
      }
      
      return { 
        success: false, 
        message,
      };
    }
  }

  /**
   * Sync device inventory and security configurations from Jamf Pro
   */
  async sync(config: JamfConfig): Promise<JamfSyncResult> {
    const token = await this.getAccessToken(config);
    if (!token) {
      throw new Error('Failed to authenticate with Jamf Pro');
    }

    const baseUrl = this.normalizeUrl(config.serverUrl);
    
    // Fetch computers and mobile devices in parallel
    const [computers, mobileDevices] = await Promise.all([
      this.fetchComputers(baseUrl, token),
      this.fetchMobileDevices(baseUrl, token),
    ]);

    // Calculate security summary
    const securitySummary = this.calculateSecuritySummary(computers);

    return {
      computers: {
        total: computers.length,
        managed: computers.filter(c => c.general?.managed).length,
        encrypted: computers.filter(c => 
          c.diskEncryption?.bootPartitionEncryptionDetails?.partitionFileVault2State === 'ENCRYPTED'
        ).length,
        compliant: this.countCompliantComputers(computers),
        devices: computers.map(c => this.summarizeComputer(c)),
      },
      mobileDevices: {
        total: mobileDevices.length,
        managed: mobileDevices.filter(d => d.managed).length,
        supervised: mobileDevices.filter(d => d.supervised).length,
        devices: mobileDevices.map(d => this.summarizeMobileDevice(d)),
      },
      securitySummary,
      collectedAt: new Date().toISOString(),
    };
  }

  /**
   * Get OAuth access token from Jamf Pro
   */
  private async getAccessToken(config: JamfConfig): Promise<string | null> {
    const baseUrl = this.normalizeUrl(config.serverUrl);
    
    // Trim whitespace from credentials (common copy/paste issue)
    const clientId = config.clientId.trim();
    const clientSecret = config.clientSecret.trim();
    
    const tokenUrl = `${baseUrl}/api/oauth/token`;
    
    this.logger.log(`Attempting Jamf OAuth to: ${tokenUrl}`);
    this.logger.log(`Client ID length: ${clientId.length}, starts with: ${clientId.substring(0, 8)}...`);
    
    try {
      // Build payload exactly like the working Google Apps Script does:
      // Raw string concatenation, grant_type first, no URL encoding
      const payload = 'grant_type=client_credentials' +
                      '&client_id=' + clientId +
                      '&client_secret=' + clientSecret;

      this.logger.log(`Request payload format: grant_type=client_credentials&client_id=${clientId}&client_secret=***`);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: payload,
      });

      const responseText = await response.text();
      this.logger.log(`Jamf OAuth response status: ${response.status}`);
      this.logger.log(`Jamf OAuth response body: ${responseText.substring(0, 500)}`);

      if (!response.ok) {
        this.logger.error(`Jamf OAuth failed: ${response.status} - ${responseText}`);
        
        // Try to parse error for better message
        try {
          const errorJson = JSON.parse(responseText);
          const errorMsg = errorJson.error_description || errorJson.error || errorJson.message || `HTTP ${response.status}`;
          throw new Error(errorMsg);
        } catch {
          // If we can't parse JSON, check for common HTML error pages
          if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
            throw new Error(`Server returned HTML instead of JSON - check if URL ${baseUrl} is correct`);
          }
          throw new Error(`Authentication failed: HTTP ${response.status} - ${responseText.substring(0, 200)}`);
        }
      }

      const data: JamfTokenResponse = JSON.parse(responseText);
      
      if (!data.access_token) {
        this.logger.error('Jamf OAuth response missing access_token', data);
        throw new Error('Invalid response from Jamf - no access token received');
      }
      
      this.logger.log('Jamf OAuth successful, token obtained');
      return data.access_token;
    } catch (error: any) {
      this.logger.error('Failed to get Jamf access token', error);
      throw error; // Re-throw to provide better error message to user
    }
  }

  /**
   * Fetch computer inventory from Jamf Pro
   */
  private async fetchComputers(baseUrl: string, token: string): Promise<JamfComputer[]> {
    try {
      const computers: JamfComputer[] = [];
      let page = 0;
      const pageSize = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(
          `${baseUrl}/api/v1/computers-inventory?section=GENERAL&section=HARDWARE&section=OPERATING_SYSTEM&section=SECURITY&section=DISK_ENCRYPTION&page=${page}&page-size=${pageSize}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          this.logger.warn(`Failed to fetch computers page ${page}: ${response.status}`);
          break;
        }

        const data = await response.json();
        const results = data.results || [];
        computers.push(...results);
        
        hasMore = results.length === pageSize;
        page++;
        
        // Safety limit
        if (page > 100) break;
      }

      this.logger.log(`Fetched ${computers.length} computers from Jamf`);
      return computers;
    } catch (error) {
      this.logger.error('Failed to fetch computers from Jamf', error);
      return [];
    }
  }

  /**
   * Fetch mobile device inventory from Jamf Pro
   */
  private async fetchMobileDevices(baseUrl: string, token: string): Promise<JamfMobileDevice[]> {
    try {
      const devices: JamfMobileDevice[] = [];
      let page = 0;
      const pageSize = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(
          `${baseUrl}/api/v2/mobile-devices?page=${page}&page-size=${pageSize}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          this.logger.warn(`Failed to fetch mobile devices page ${page}: ${response.status}`);
          break;
        }

        const data = await response.json();
        const results = data.results || [];
        devices.push(...results);
        
        hasMore = results.length === pageSize;
        page++;
        
        // Safety limit
        if (page > 100) break;
      }

      this.logger.log(`Fetched ${devices.length} mobile devices from Jamf`);
      return devices;
    } catch (error) {
      this.logger.error('Failed to fetch mobile devices from Jamf', error);
      return [];
    }
  }

  /**
   * Calculate security summary across all computers
   */
  private calculateSecuritySummary(computers: JamfComputer[]) {
    const summary = {
      fileVaultEnabled: 0,
      fileVaultDisabled: 0,
      sipEnabled: 0,
      sipDisabled: 0,
      gatekeeperEnabled: 0,
      gatekeeperDisabled: 0,
      firewallEnabled: 0,
      firewallDisabled: 0,
    };

    for (const computer of computers) {
      // FileVault
      const fvState = computer.diskEncryption?.bootPartitionEncryptionDetails?.partitionFileVault2State;
      if (fvState === 'ENCRYPTED') {
        summary.fileVaultEnabled++;
      } else {
        summary.fileVaultDisabled++;
      }

      // SIP
      const sipStatus = computer.security?.sipStatus?.toLowerCase();
      if (sipStatus === 'enabled' || sipStatus === 'active') {
        summary.sipEnabled++;
      } else {
        summary.sipDisabled++;
      }

      // Gatekeeper
      const gkStatus = computer.security?.gatekeeperStatus?.toLowerCase();
      if (gkStatus === 'app store and identified developers' || gkStatus === 'enabled' || gkStatus?.includes('app store')) {
        summary.gatekeeperEnabled++;
      } else {
        summary.gatekeeperDisabled++;
      }
    }

    return summary;
  }

  /**
   * Count computers that meet compliance criteria
   */
  private countCompliantComputers(computers: JamfComputer[]): number {
    return computers.filter(c => {
      const hasFileVault = c.diskEncryption?.bootPartitionEncryptionDetails?.partitionFileVault2State === 'ENCRYPTED';
      const hasSIP = c.security?.sipStatus?.toLowerCase() === 'enabled';
      const hasGatekeeper = c.security?.gatekeeperStatus?.toLowerCase()?.includes('app store');
      return hasFileVault && hasSIP && hasGatekeeper;
    }).length;
  }

  /**
   * Create a summary of a computer for storage
   */
  private summarizeComputer(computer: JamfComputer) {
    return {
      id: computer.id,
      name: computer.general?.name,
      serialNumber: computer.hardware?.serialNumber,
      model: computer.hardware?.model,
      osVersion: computer.operatingSystem?.version,
      managed: computer.general?.managed,
      lastContactTime: computer.general?.lastContactTime,
      security: {
        fileVaultEnabled: computer.diskEncryption?.bootPartitionEncryptionDetails?.partitionFileVault2State === 'ENCRYPTED',
        sipEnabled: computer.security?.sipStatus?.toLowerCase() === 'enabled',
        gatekeeperStatus: computer.security?.gatekeeperStatus,
        autoLoginDisabled: computer.security?.autoLoginDisabled,
        remoteDesktopEnabled: computer.security?.remoteDesktopEnabled,
      },
    };
  }

  /**
   * Create a summary of a mobile device for storage
   */
  private summarizeMobileDevice(device: JamfMobileDevice) {
    return {
      id: device.id,
      name: device.name,
      serialNumber: device.serialNumber,
      model: device.model,
      osVersion: device.osVersion,
      managed: device.managed,
      supervised: device.supervised,
      lastInventoryUpdate: device.lastInventoryUpdateDate,
    };
  }

  /**
   * Normalize the server URL
   */
  private normalizeUrl(url: string): string {
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    return normalized.replace(/\/+$/, ''); // Remove trailing slashes
  }
}

