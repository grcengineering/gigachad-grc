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
    const statusFacet = issues.facets?.find((f: any) => f.property === 'statuses');

    severityFacet?.values?.forEach((v: any) => {
      bySeverity[v.val] = v.count;
    });

    // Cap project-level fan-out to avoid runaway loops on large instances.
    const projectsToInspect = projects.slice(0, 50);

    // Per-project security_rating / coverage / duplication measures.
    const measures = await Promise.all(
      projectsToInspect.map((p: any) =>
        this.getProjectMeasures(baseUrl, config.token, p.key).catch(e => {
          errors.push(`Measures(${p.key}): ${e.message}`);
          return null;
        }),
      ),
    );

    // Per-project quality gate status.
    const gateStatuses = await Promise.all(
      projectsToInspect.map((p: any) =>
        this.getProjectGateStatus(baseUrl, config.token, p.key).catch(e => {
          errors.push(`Gate(${p.key}): ${e.message}`);
          return null;
        }),
      ),
    );

    const securityRating: { A: number; B: number; C: number; D: number; E: number } = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    const coverageValues: number[] = [];
    const duplicationValues: number[] = [];
    let projectsBelowCoverageThreshold = 0;
    const COVERAGE_THRESHOLD = 80;

    measures.forEach((m) => {
      if (!m) return;
      const sec = m.security_rating;
      if (typeof sec === 'number' && sec >= 1 && sec <= 5) {
        const bucket = (['A', 'B', 'C', 'D', 'E'] as const)[Math.round(sec) - 1];
        securityRating[bucket] += 1;
      }
      if (typeof m.coverage === 'number') {
        coverageValues.push(m.coverage);
        if (m.coverage < COVERAGE_THRESHOLD) projectsBelowCoverageThreshold += 1;
      }
      if (typeof m.duplicated_lines_density === 'number') {
        duplicationValues.push(m.duplicated_lines_density);
      }
    });

    const avg = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

    const passing = gateStatuses.filter((g) => g === 'OK').length;
    const failing = gateStatuses.filter((g) => g === 'ERROR' || g === 'WARN').length;

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
        // Read SECURITY_HOTSPOT from the same `types` facet already requested
        // by getIssues. Previously this was hardcoded to 0 — a security claim
        // that masked real hotspot counts.
        securityHotspots: typeFacet?.values?.find((v: any) => v.val === 'SECURITY_HOTSPOT')?.count || 0,
        bySeverity,
        open: statusFacet?.values?.find((v: any) => v.val === 'OPEN')?.count || 0,
        confirmed: statusFacet?.values?.find((v: any) => v.val === 'CONFIRMED')?.count || 0,
        resolved: statusFacet?.values?.find((v: any) => v.val === 'RESOLVED')?.count || 0,
      },
      qualityGates: {
        total: qualityGates.length,
        passing,
        failing,
      },
      securityRating,
      coverage: {
        avgCoverage: avg(coverageValues),
        projectsBelowThreshold: projectsBelowCoverageThreshold,
      },
      duplications: { avgDuplication: avg(duplicationValues) },
      collectedAt: new Date().toISOString(),
      errors,
    };
  }

  private async getProjectMeasures(
    baseUrl: string,
    token: string,
    projectKey: string,
  ): Promise<{ security_rating?: number; coverage?: number; duplicated_lines_density?: number } | null> {
    const url =
      `${baseUrl}/api/measures/component_tree?component=${encodeURIComponent(projectKey)}` +
      `&metricKeys=security_rating,coverage,duplicated_lines_density&ps=500&strategy=children`;
    const response = await fetch(url, { headers: this.buildHeaders(token) });
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    // The base component holds the aggregated measures for the project.
    const baseMeasures: any[] = Array.isArray(data.baseComponent?.measures)
      ? data.baseComponent.measures
      : [];
    const out: { security_rating?: number; coverage?: number; duplicated_lines_density?: number } = {};
    for (const m of baseMeasures) {
      const v = parseFloat(m.value);
      if (Number.isNaN(v)) continue;
      if (m.metric === 'security_rating') out.security_rating = v;
      if (m.metric === 'coverage') out.coverage = v;
      if (m.metric === 'duplicated_lines_density') out.duplicated_lines_density = v;
    }
    return out;
  }

  private async getProjectGateStatus(
    baseUrl: string,
    token: string,
    projectKey: string,
  ): Promise<string | null> {
    const response = await fetch(
      `${baseUrl}/api/qualitygates/project_status?projectKey=${encodeURIComponent(projectKey)}`,
      { headers: this.buildHeaders(token) },
    );
    if (!response.ok) throw new Error(`Failed: ${response.status}`);
    const data = await response.json();
    return data.projectStatus?.status || null;
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
