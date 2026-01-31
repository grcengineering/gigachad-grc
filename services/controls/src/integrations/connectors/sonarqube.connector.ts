/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';

export interface SonarQubeConfig {
  baseUrl: string;
  token: string;
}

export interface SonarQubeSyncResult {
  projects: {
    total: number;
    analyzed: number;
    items: Array<{
      key: string;
      name: string;
      qualifier: string;
      lastAnalysis: string;
      visibility: string;
    }>;
  };
  issues: {
    total: number;
    bugs: number;
    vulnerabilities: number;
    codeSmells: number;
    securityHotspots: number;
    bySeverity: Record<string, number>;
    open: number;
    confirmed: number;
    resolved: number;
  };
  qualityGates: {
    total: number;
    passing: number;
    failing: number;
  };
  securityRating: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
  };
  coverage: {
    avgCoverage: number;
    projectsBelowThreshold: number;
  };
  duplications: {
    avgDuplication: number;
  };
  collectedAt: string;
  errors: string[];
}

@Injectable()
export class SonarQubeConnector {
  private readonly logger = new Logger(SonarQubeConnector.name);

  async testConnection(config: SonarQubeConfig): Promise<{ success: boolean; message: string; details?: any }> {
    if (!config.baseUrl || !config.token) {
      return { success: false, message: 'Base URL and token are required' };
    }

    try {
      const baseUrl = config.baseUrl.replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/api/system/status`, {
        headers: this.buildHeaders(config.token),
      });

      if (!response.ok) {
        return { success: false, message: response.status === 401 ? 'Invalid token' : `API error: ${response.status}` };
      }

      const data = await response.json();
      return {
        success: true,
        message: `Connected to SonarQube ${data.version}`,
        details: { version: data.version, status: data.status },
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async sync(config: SonarQubeConfig): Promise<SonarQubeSyncResult> {
    const errors: string[] = [];
    const baseUrl = config.baseUrl.replace(/\/+$/, '');

    const [projects, issues, qualityGates] = await Promise.all([
      this.getProjects(baseUrl, config.token).catch(e => { errors.push(`Projects: ${e.message}`); return []; }),
      this.getIssues(baseUrl, config.token).catch(e => { errors.push(`Issues: ${e.message}`); return { total: 0, facets: [] }; }),
      this.getQualityGates(baseUrl, config.token).catch(e => { errors.push(`QG: ${e.message}`); return []; }),
    ]);

    const bySeverity: Record<string, number> = {};
    const typeFacet = issues.facets?.find((f: any) => f.property === 'types');
    const severityFacet = issues.facets?.find((f: any) => f.property === 'severities');
    
    severityFacet?.values?.forEach((v: any) => {
      bySeverity[v.val] = v.count;
    });

    return {
      projects: {
        total: projects.length,
        analyzed: projects.filter((p: any) => p.lastAnalysisDate).length,
        items: projects.slice(0, 50).map((p: any) => ({
          key: p.key,
          name: p.name,
          qualifier: p.qualifier,
          lastAnalysis: p.lastAnalysisDate || '',
          visibility: p.visibility,
        })),
      },
      issues: {
        total: issues.total || 0,
        bugs: typeFacet?.values?.find((v: any) => v.val === 'BUG')?.count || 0,
        vulnerabilities: typeFacet?.values?.find((v: any) => v.val === 'VULNERABILITY')?.count || 0,
        codeSmells: typeFacet?.values?.find((v: any) => v.val === 'CODE_SMELL')?.count || 0,
        securityHotspots: 0,
        bySeverity,
        open: 0,
        confirmed: 0,
        resolved: 0,
      },
      qualityGates: {
        total: qualityGates.length,
        passing: 0,
        failing: 0,
      },
      securityRating: { A: 0, B: 0, C: 0, D: 0, E: 0 },
      coverage: { avgCoverage: 0, projectsBelowThreshold: 0 },
      duplications: { avgDuplication: 0 },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private buildHeaders(token: string): Record<string, string> {
    const auth = Buffer.from(`${token}:`).toString('base64');
    return { 'Authorization': `Basic ${auth}` };
  }

  private async getProjects(baseUrl: string, token: string): Promise<any[]> {
    const response = await fetch(`${baseUrl}/api/projects/search?ps=500`, {
      headers: this.buildHeaders(token),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.components || [];
  }

  private async getIssues(baseUrl: string, token: string): Promise<any> {
    const response = await fetch(`${baseUrl}/api/issues/search?ps=1&facets=types,severities,statuses`, {
      headers: this.buildHeaders(token),
    });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    return response.json();
  }

  private async getQualityGates(baseUrl: string, token: string): Promise<any[]> {
    const response = await fetch(`${baseUrl}/api/qualitygates/list`, {
      headers: this.buildHeaders(token),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.qualitygates || [];
  }
}

