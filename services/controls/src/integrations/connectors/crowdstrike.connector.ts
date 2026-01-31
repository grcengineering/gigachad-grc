/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

/**
 * CrowdStrike Integration Configuration
 */
export interface CrowdStrikeConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;  // e.g., https://api.crowdstrike.com or https://api.us-2.crowdstrike.com
}

/**
 * CrowdStrike Device
 */
interface CrowdStrikeDevice {
  device_id: string;
  hostname: string;
  platform_name: string;
  os_version: string;
  system_manufacturer: string;
  system_product_name: string;
  mac_address: string;
  local_ip: string;
  external_ip: string;
  agent_version: string;
  last_seen: string;
  first_seen: string;
  status: string;
  reduced_functionality_mode: string;
  device_policies: {
    prevention: { policy_id: string; applied: boolean };
    sensor_update: { policy_id: string; applied: boolean };
  };
}

/**
 * CrowdStrike Detection
 */
interface CrowdStrikeDetection {
  detection_id: string;
  device: {
    device_id: string;
    hostname: string;
    platform_name: string;
  };
  behaviors: Array<{
    behavior_id: string;
    tactic: string;
    technique: string;
    description: string;
    severity: number;
    confidence: number;
    ioc_type: string;
    ioc_value: string;
    timestamp: string;
  }>;
  max_severity: number;
  max_severity_displayname: string;
  status: string;
  created_timestamp: string;
  first_behavior: string;
  last_behavior: string;
}

/**
 * CrowdStrike Vulnerability
 */
interface CrowdStrikeVulnerability {
  id: string;
  cve: {
    id: string;
    base_score: number;
    severity: string;
    description: string;
    published_date: string;
  };
  host_info: {
    hostname: string;
    os_version: string;
  };
  app: {
    product_name: string;
    vendor: string;
    version: string;
  };
  status: string;
  created_timestamp: string;
}

/**
 * CrowdStrike Sync Result
 */
export interface CrowdStrikeSyncResult {
  devices: {
    total: number;
    online: number;
    offline: number;
    reduced_functionality: number;
    byPlatform: Record<string, number>;
    withPreventionPolicy: number;
    items: Array<{
      id: string;
      hostname: string;
      platform: string;
      osVersion: string;
      agentVersion: string;
      lastSeen: string;
      status: string;
      preventionEnabled: boolean;
    }>;
  };
  detections: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
    newDetections: number;
    inProgress: number;
    resolved: number;
    items: Array<{
      id: string;
      hostname: string;
      severity: string;
      tactic: string;
      technique: string;
      description: string;
      status: string;
      timestamp: string;
    }>;
  };
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    items: Array<{
      cveId: string;
      severity: string;
      score: number;
      hostname: string;
      application: string;
      version: string;
    }>;
  };
  prevention: {
    policiesApplied: number;
    devicesProtected: number;
    protectionPercentage: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class CrowdStrikeConnector {
  private readonly logger = new Logger(CrowdStrikeConnector.name);
  private readonly DEFAULT_BASE_URL = 'https://api.crowdstrike.com';

  /**
   * Test connection to CrowdStrike
   */
  async testConnection(config: CrowdStrikeConfig): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!config.clientId || !config.clientSecret) {
      return { success: false, message: 'Client ID and Client Secret are required' };
    }

    try {
      const token = await this.getAccessToken(config);
      if (!token) {
        return { success: false, message: 'Failed to authenticate - check credentials' };
      }

      // Test by getting sensor info
      const baseUrl = config.baseUrl || this.DEFAULT_BASE_URL;
      const response = await fetch(`${baseUrl}/sensors/queries/sensors/v1?limit=1`, {
        headers: this.buildHeaders(token),
      });

      if (!response.ok) {
        return { success: false, message: `API error: ${response.status}` };
      }

      return {
        success: true,
        message: 'Connected to CrowdStrike Falcon successfully',
        details: {
          apiUrl: baseUrl,
        },
      };
    } catch (error: any) {
      this.logger.error('CrowdStrike connection test failed', error);
      return { success: false, message: error.message || 'Connection failed' };
    }
  }

  /**
   * Full sync - collect endpoint security evidence from CrowdStrike
   */
  async sync(config: CrowdStrikeConfig): Promise<CrowdStrikeSyncResult> {
    const errors: string[] = [];
    const baseUrl = config.baseUrl || this.DEFAULT_BASE_URL;

    this.logger.log('Starting CrowdStrike sync...');

    const token = await this.getAccessToken(config);
    if (!token) {
      throw new Error('Failed to authenticate with CrowdStrike');
    }

    // Collect data in parallel
    const [devices, detections, vulnerabilities] = await Promise.all([
      this.getDevices(baseUrl, token).catch(e => {
        errors.push(`Devices: ${e.message}`);
        return [] as CrowdStrikeDevice[];
      }),
      this.getDetections(baseUrl, token).catch(e => {
        errors.push(`Detections: ${e.message}`);
        return [] as CrowdStrikeDetection[];
      }),
      this.getVulnerabilities(baseUrl, token).catch(e => {
        errors.push(`Vulnerabilities: ${e.message}`);
        return [] as CrowdStrikeVulnerability[];
      }),
    ]);

    // Process devices
    const onlineDevices = devices.filter(d => d.status === 'normal' || d.status === 'contained');
    const offlineDevices = devices.filter(d => d.status === 'offline' || d.status === 'unknown');
    const reducedFunctionality = devices.filter(d => d.reduced_functionality_mode === 'yes');
    
    const byPlatform: Record<string, number> = {};
    for (const device of devices) {
      byPlatform[device.platform_name] = (byPlatform[device.platform_name] || 0) + 1;
    }

    const withPrevention = devices.filter(d => d.device_policies?.prevention?.applied).length;

    // Process detections
    const severityMap: Record<number, string> = {
      1: 'informational', 2: 'informational',
      3: 'low', 4: 'low',
      5: 'medium', 6: 'medium',
      7: 'high', 8: 'high',
      9: 'critical', 10: 'critical',
    };

    const criticalDetections = detections.filter(d => d.max_severity >= 9);
    const highDetections = detections.filter(d => d.max_severity >= 7 && d.max_severity < 9);
    const mediumDetections = detections.filter(d => d.max_severity >= 5 && d.max_severity < 7);
    const lowDetections = detections.filter(d => d.max_severity >= 3 && d.max_severity < 5);
    const infoDetections = detections.filter(d => d.max_severity < 3);

    // Process vulnerabilities
    const criticalVulns = vulnerabilities.filter(v => v.cve?.severity === 'CRITICAL');
    const highVulns = vulnerabilities.filter(v => v.cve?.severity === 'HIGH');
    const mediumVulns = vulnerabilities.filter(v => v.cve?.severity === 'MEDIUM');
    const lowVulns = vulnerabilities.filter(v => v.cve?.severity === 'LOW');

    this.logger.log(`CrowdStrike sync complete: ${devices.length} devices, ${detections.length} detections`);

    return {
      devices: {
        total: devices.length,
        online: onlineDevices.length,
        offline: offlineDevices.length,
        reduced_functionality: reducedFunctionality.length,
        byPlatform,
        withPreventionPolicy: withPrevention,
        items: devices.slice(0, 100).map(d => ({
          id: d.device_id,
          hostname: d.hostname,
          platform: d.platform_name,
          osVersion: d.os_version,
          agentVersion: d.agent_version,
          lastSeen: d.last_seen,
          status: d.status,
          preventionEnabled: d.device_policies?.prevention?.applied || false,
        })),
      },
      detections: {
        total: detections.length,
        critical: criticalDetections.length,
        high: highDetections.length,
        medium: mediumDetections.length,
        low: lowDetections.length,
        informational: infoDetections.length,
        newDetections: detections.filter(d => d.status === 'new').length,
        inProgress: detections.filter(d => d.status === 'in_progress').length,
        resolved: detections.filter(d => d.status === 'closed' || d.status === 'true_positive' || d.status === 'false_positive').length,
        items: detections.slice(0, 50).map(d => ({
          id: d.detection_id,
          hostname: d.device?.hostname || 'Unknown',
          severity: severityMap[d.max_severity] || 'unknown',
          tactic: d.behaviors?.[0]?.tactic || '',
          technique: d.behaviors?.[0]?.technique || '',
          description: d.behaviors?.[0]?.description || '',
          status: d.status,
          timestamp: d.created_timestamp,
        })),
      },
      vulnerabilities: {
        total: vulnerabilities.length,
        critical: criticalVulns.length,
        high: highVulns.length,
        medium: mediumVulns.length,
        low: lowVulns.length,
        items: vulnerabilities.slice(0, 100).map(v => ({
          cveId: v.cve?.id || v.id,
          severity: v.cve?.severity || 'unknown',
          score: v.cve?.base_score || 0,
          hostname: v.host_info?.hostname || '',
          application: v.app?.product_name || '',
          version: v.app?.version || '',
        })),
      },
      prevention: {
        policiesApplied: withPrevention,
        devicesProtected: withPrevention,
        protectionPercentage: devices.length > 0 
          ? Math.round((withPrevention / devices.length) * 100) 
          : 0,
      },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  /**
   * Get OAuth2 access token
   */
  private async getAccessToken(config: CrowdStrikeConfig): Promise<string | null> {
    const baseUrl = config.baseUrl || this.DEFAULT_BASE_URL;

    try {
      const response = await fetch(`${baseUrl}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
      });

      if (!response.ok) {
        this.logger.error(`CrowdStrike OAuth failed: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      this.logger.error('Failed to get CrowdStrike access token', error);
      return null;
    }
  }

  /**
   * Get all devices
   */
  private async getDevices(baseUrl: string, token: string): Promise<CrowdStrikeDevice[]> {
    // First get device IDs
    const idsResponse = await fetch(
      `${baseUrl}/devices/queries/devices/v1?limit=500`,
      { headers: this.buildHeaders(token) },
    );

    if (!idsResponse.ok) {
      throw new Error(`Failed to fetch device IDs: ${idsResponse.status}`);
    }

    const idsData = await idsResponse.json();
    const deviceIds = idsData.resources || [];

    if (deviceIds.length === 0) {
      return [];
    }

    // Get device details (batch of 100)
    const devices: CrowdStrikeDevice[] = [];
    for (let i = 0; i < deviceIds.length; i += 100) {
      const batch = deviceIds.slice(i, i + 100);
      const detailsResponse = await fetch(
        `${baseUrl}/devices/entities/devices/v2`,
        {
          method: 'POST',
          headers: this.buildHeaders(token),
          body: JSON.stringify({ ids: batch }),
        },
      );

      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        devices.push(...(detailsData.resources || []));
      }
    }

    return devices;
  }

  /**
   * Get detections
   */
  private async getDetections(baseUrl: string, token: string): Promise<CrowdStrikeDetection[]> {
    // Get detection IDs from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const idsResponse = await fetch(
      `${baseUrl}/detects/queries/detects/v1?limit=200&filter=created_timestamp:>'${thirtyDaysAgo}'`,
      { headers: this.buildHeaders(token) },
    );

    if (!idsResponse.ok) {
      throw new Error(`Failed to fetch detection IDs: ${idsResponse.status}`);
    }

    const idsData = await idsResponse.json();
    const detectionIds = idsData.resources || [];

    if (detectionIds.length === 0) {
      return [];
    }

    // Get detection details
    const detailsResponse = await fetch(
      `${baseUrl}/detects/entities/summaries/GET/v1`,
      {
        method: 'POST',
        headers: this.buildHeaders(token),
        body: JSON.stringify({ ids: detectionIds.slice(0, 100) }),
      },
    );

    if (!detailsResponse.ok) {
      throw new Error(`Failed to fetch detection details: ${detailsResponse.status}`);
    }

    const detailsData = await detailsResponse.json();
    return detailsData.resources || [];
  }

  /**
   * Get vulnerabilities (Spotlight)
   */
  private async getVulnerabilities(baseUrl: string, token: string): Promise<CrowdStrikeVulnerability[]> {
    try {
      const response = await fetch(
        `${baseUrl}/spotlight/queries/vulnerabilities/v1?limit=200&filter=status:'open'`,
        { headers: this.buildHeaders(token) },
      );

      if (!response.ok) {
        // Spotlight might not be enabled
        if (response.status === 403) {
          return [];
        }
        throw new Error(`Failed to fetch vulnerabilities: ${response.status}`);
      }

      const idsData = await response.json();
      const vulnIds = idsData.resources || [];

      if (vulnIds.length === 0) {
        return [];
      }

      // Get vulnerability details
      const detailsResponse = await fetch(
        `${baseUrl}/spotlight/entities/vulnerabilities/v2?ids=${vulnIds.slice(0, 100).join('&ids=')}`,
        { headers: this.buildHeaders(token) },
      );

      if (!detailsResponse.ok) {
        return [];
      }

      const detailsData = await detailsResponse.json();
      return detailsData.resources || [];
    } catch {
      this.logger.warn('Spotlight vulnerabilities not available');
      return [];
    }
  }

  /**
   * Build headers for API requests
   */
  private buildHeaders(token: string): Record<string, string> {
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }
}

