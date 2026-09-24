/**
 * MCP Server Configuration
 *
 * Defines available MCP servers and their configuration.
 * Servers are spawned as child processes and communicate via stdio.
 */

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  autoStart?: boolean;
  healthCheckEndpoint?: string;
  timeout?: number;
  maxRetries?: number;
  capabilities: {
    tools?: boolean;
    prompts?: boolean;
    resources?: boolean;
  };
}

export const MCP_SERVERS: MCPServerConfig[] = [
  {
    id: 'grc-evidence',
    name: 'GRC Evidence Collector',
    description: 'Automated evidence collection from cloud providers and enterprise tools',
    command: 'node',
    args: ['dist/index.js'],
    cwd: 'mcp-servers/grc-evidence',
    autoStart: true,
    timeout: 30000,
    maxRetries: 3,
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
    },
  },
  {
    id: 'grc-compliance',
    name: 'GRC Compliance Checker',
    description: 'Framework compliance validation and control testing',
    command: 'node',
    args: ['dist/index.js'],
    cwd: 'mcp-servers/grc-compliance',
    autoStart: true,
    timeout: 60000,
    maxRetries: 3,
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
    },
  },
  {
    id: 'grc-ai-assistant',
    name: 'GRC AI Assistant',
    description: 'AI-powered GRC analysis and recommendations',
    command: 'node',
    args: ['dist/index.js'],
    cwd: 'mcp-servers/grc-ai-assistant',
    autoStart: false, // Requires API keys
    timeout: 120000,
    maxRetries: 2,
    capabilities: {
      tools: true,
      prompts: true,
      resources: false,
    },
  },
];

export function getServerConfig(serverId: string): MCPServerConfig | undefined {
  return MCP_SERVERS.find((s) => s.id === serverId);
}

export function getAutoStartServers(): MCPServerConfig[] {
  return MCP_SERVERS.filter((s) => s.autoStart);
}

/**
 * Tool definitions for each MCP server
 * These define what actions can be performed via each server
 */
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const MCP_TOOLS: Record<string, MCPToolDefinition[]> = {
  'grc-evidence': [
    {
      name: 'collect_aws_evidence',
      description: 'Collect compliance evidence from AWS services',
      inputSchema: {
        type: 'object',
        properties: {
          services: { type: 'array', items: { type: 'string' } },
          region: { type: 'string' },
          includeConfigurations: { type: 'boolean' },
        },
        required: ['services'],
      },
    },
    {
      name: 'collect_azure_evidence',
      description: 'Collect compliance evidence from Azure',
      inputSchema: {
        type: 'object',
        properties: {
          subscriptionId: { type: 'string' },
          resourceTypes: { type: 'array', items: { type: 'string' } },
        },
        required: ['subscriptionId'],
      },
    },
    {
      name: 'collect_github_evidence',
      description: 'Collect security and compliance evidence from GitHub repositories',
      inputSchema: {
        type: 'object',
        properties: {
          organization: { type: 'string' },
          repositories: { type: 'array', items: { type: 'string' } },
          checks: { type: 'array', items: { type: 'string' } },
        },
        required: ['organization'],
      },
    },
    {
      name: 'collect_okta_evidence',
      description: 'Collect identity and access management evidence from Okta',
      inputSchema: {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          checks: { type: 'array', items: { type: 'string' } },
        },
        required: ['domain'],
      },
    },
    {
      name: 'scan_vulnerability',
      description: 'Run vulnerability scans against a target',
      inputSchema: {
        type: 'object',
        properties: {
          scanType: {
            type: 'string',
            enum: ['container', 'dependency', 'network', 'web'],
          },
          target: { type: 'string' },
          severity: {
            type: 'string',
            enum: ['critical', 'high', 'medium', 'low', 'all'],
          },
        },
        required: ['scanType', 'target'],
      },
    },
    {
      name: 'capture_screenshot',
      description: 'Capture a screenshot of a URL as evidence',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string' },
          selector: { type: 'string' },
          waitForSelector: { type: 'string' },
          fullPage: { type: 'boolean' },
          authentication: { type: 'object' },
        },
        required: ['url'],
      },
    },
    {
      name: 'collect_google_workspace_evidence',
      description: 'Collect security evidence from Google Workspace',
      inputSchema: {
        type: 'object',
        properties: {
          checks: { type: 'array', items: { type: 'string' } },
          timeRange: { type: 'object' },
        },
      },
    },
    {
      name: 'collect_jamf_evidence',
      description: 'Collect device management evidence from Jamf Pro',
      inputSchema: {
        type: 'object',
        properties: {
          evidenceTypes: { type: 'array', items: { type: 'string' } },
          filters: { type: 'object' },
        },
      },
    },
  ],
  'grc-compliance': [
    {
      name: 'run_control_test',
      description: 'Execute an automated test for a specific control',
      inputSchema: {
        type: 'object',
        properties: {
          controlId: { type: 'string' },
          controlType: {
            type: 'string',
            enum: ['technical', 'administrative', 'physical'],
          },
          testConfiguration: { type: 'object' },
        },
        required: ['controlId', 'controlType'],
      },
    },
    {
      name: 'run_batch_tests',
      description: 'Run automated tests for multiple controls',
      inputSchema: {
        type: 'object',
        properties: {
          controlIds: { type: 'array', items: { type: 'string' } },
          parallel: { type: 'boolean' },
          stopOnFailure: { type: 'boolean' },
        },
        required: ['controlIds'],
      },
    },
    {
      name: 'validate_policy_compliance',
      description: 'Validate a policy document against compliance requirements',
      inputSchema: {
        type: 'object',
        properties: {
          policyId: { type: 'string' },
          policyContent: { type: 'string' },
          framework: {
            type: 'string',
            enum: ['SOC2', 'ISO27001', 'HIPAA', 'GDPR', 'PCI-DSS', 'NIST-CSF'],
          },
          requirements: { type: 'array', items: { type: 'string' } },
        },
        required: ['framework'],
      },
    },
    {
      name: 'generate_compliance_report',
      description: 'Generate a compliance status report for a framework',
      inputSchema: {
        type: 'object',
        properties: {
          framework: {
            type: 'string',
            enum: ['SOC2', 'ISO27001', 'HIPAA', 'GDPR', 'PCI-DSS', 'NIST-CSF'],
          },
          reportType: {
            type: 'string',
            enum: ['summary', 'detailed', 'executive', 'gap-analysis'],
          },
          includeEvidence: { type: 'boolean' },
          dateRange: { type: 'object' },
        },
        required: ['framework', 'reportType'],
      },
    },
    {
      name: 'check_soc2_controls',
      description: 'Run SOC 2 specific compliance checks',
      inputSchema: {
        type: 'object',
        properties: {
          trustServiceCategories: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'security',
                'availability',
                'processing_integrity',
                'confidentiality',
                'privacy',
              ],
            },
          },
          controlPoints: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'check_iso27001_controls',
      description: 'Run ISO 27001 specific compliance checks',
      inputSchema: {
        type: 'object',
        properties: {
          annexAControls: { type: 'array', items: { type: 'string' } },
          domains: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'check_hipaa_controls',
      description: 'Run HIPAA specific compliance checks',
      inputSchema: {
        type: 'object',
        properties: {
          ruleTypes: { type: 'array', items: { type: 'string' } },
          safeguards: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    {
      name: 'check_gdpr_controls',
      description: 'Run GDPR specific compliance checks',
      inputSchema: {
        type: 'object',
        properties: {
          articles: { type: 'array', items: { type: 'string' } },
          dataProcessingActivities: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  ],
  'grc-ai-assistant': [
    {
      name: 'analyze_risk',
      description: 'AI analysis of a risk scenario',
      inputSchema: {
        type: 'object',
        properties: {
          riskDescription: { type: 'string' },
          context: { type: 'object' },
          includeQuantitative: { type: 'boolean' },
        },
        required: ['riskDescription'],
      },
    },
    {
      name: 'suggest_controls',
      description: 'AI-powered control suggestions',
      inputSchema: {
        type: 'object',
        properties: {
          risk: { type: 'object' },
          frameworks: { type: 'array', items: { type: 'string' } },
          maxSuggestions: { type: 'number' },
        },
        required: ['risk'],
      },
    },
    {
      name: 'draft_policy',
      description: 'AI-assisted policy drafting',
      inputSchema: {
        type: 'object',
        properties: {
          policyType: { type: 'string' },
          frameworks: { type: 'array', items: { type: 'string' } },
          organizationContext: { type: 'object' },
          format: { type: 'string', enum: ['markdown', 'html', 'plain'] },
        },
        required: ['policyType'],
      },
    },
    {
      name: 'map_requirements',
      description: 'Auto-map controls to framework requirements',
      inputSchema: {
        type: 'object',
        properties: {
          control: { type: 'object' },
          targetFrameworks: { type: 'array', items: { type: 'string' } },
          confidenceThreshold: { type: 'number' },
        },
        required: ['control', 'targetFrameworks'],
      },
    },
    {
      name: 'explain_finding',
      description: 'Explain an audit finding in plain language',
      inputSchema: {
        type: 'object',
        properties: {
          finding: { type: 'object' },
          audience: {
            type: 'string',
            enum: ['technical', 'executive', 'auditor', 'general'],
          },
          includeRemediation: { type: 'boolean' },
        },
        required: ['finding'],
      },
    },
    {
      name: 'prioritize_remediation',
      description: 'AI-prioritized remediation recommendations',
      inputSchema: {
        type: 'object',
        properties: {
          findings: { type: 'array', items: { type: 'object' } },
          constraints: { type: 'object' },
          prioritizationStrategy: { type: 'string' },
        },
        required: ['findings'],
      },
    },
    {
      name: 'analyze_compliance_gap',
      description: 'Analyze gaps against a target compliance framework',
      inputSchema: {
        type: 'object',
        properties: {
          currentControls: { type: 'array', items: { type: 'object' } },
          targetFramework: { type: 'string' },
          includeRoadmap: { type: 'boolean' },
        },
        required: ['currentControls', 'targetFramework'],
      },
    },
    {
      name: 'assess_vendor_risk',
      description: 'AI-powered vendor risk assessment',
      inputSchema: {
        type: 'object',
        properties: {
          vendor: { type: 'object' },
          assessmentData: { type: 'object' },
          riskAppetite: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['vendor'],
      },
    },
  ],
};
