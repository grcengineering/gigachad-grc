#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';

import { collectAWSEvidence } from './tools/aws-evidence.js';
import { collectAzureEvidence } from './tools/azure-evidence.js';
import { collectGitHubEvidence } from './tools/github-evidence.js';
import { collectOktaEvidence } from './tools/okta-evidence.js';
import { scanVulnerabilities } from './tools/vulnerability-scanner.js';
import { captureScreenshot } from './tools/screenshot-capture.js';
import { collectGoogleWorkspaceEvidence } from './tools/google-workspace-evidence.js';
import { collectJamfEvidence } from './tools/jamf-evidence.js';

// Server instance
const server = new Server(
  {
    name: 'grc-evidence-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: 'collect_aws_evidence',
    description: 'Collect compliance evidence from AWS services (S3, IAM, EC2, VPC, CloudTrail)',
    inputSchema: {
      type: 'object',
      properties: {
        services: {
          type: 'array',
          items: { type: 'string' },
          description:
            'AWS services to collect evidence from (s3, iam, ec2, vpc, cloudtrail, config)',
        },
        region: {
          type: 'string',
          description: 'AWS region to query (default: us-east-1)',
        },
        includeConfigurations: {
          type: 'boolean',
          description: 'Include detailed resource configurations',
        },
      },
      required: ['services'],
    },
  },
  {
    name: 'collect_azure_evidence',
    description:
      'Collect compliance evidence from Azure (Resource Groups, Security Center, Key Vault)',
    inputSchema: {
      type: 'object',
      properties: {
        subscriptionId: {
          type: 'string',
          description: 'Azure subscription ID',
        },
        resourceTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Resource types to collect (security-center, key-vault, network, storage)',
        },
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
        organization: {
          type: 'string',
          description: 'GitHub organization name',
        },
        repositories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific repositories to check (optional, checks all if not specified)',
        },
        checks: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Security checks to perform (branch-protection, secrets-scanning, dependabot, code-scanning)',
        },
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
        domain: {
          type: 'string',
          description: 'Okta domain (e.g., yourcompany.okta.com)',
        },
        checks: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Checks to perform (mfa-status, password-policy, app-assignments, inactive-users)',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'scan_vulnerability',
    description: 'Run vulnerability scans against specified targets',
    inputSchema: {
      type: 'object',
      properties: {
        scanType: {
          type: 'string',
          enum: ['container', 'dependency', 'network', 'web'],
          description: 'Type of vulnerability scan to run',
        },
        target: {
          type: 'string',
          description: 'Target to scan (image name, repo path, IP/URL)',
        },
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low', 'all'],
          description: 'Minimum severity level to report',
        },
      },
      required: ['scanType', 'target'],
    },
  },
  {
    name: 'capture_screenshot',
    description: 'Capture screenshot evidence of a web page or UI element',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to capture',
        },
        selector: {
          type: 'string',
          description: 'CSS selector for specific element (optional)',
        },
        waitForSelector: {
          type: 'string',
          description: 'Wait for this selector before capture',
        },
        fullPage: {
          type: 'boolean',
          description: 'Capture full page scroll',
        },
        authentication: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['basic', 'bearer', 'cookie'] },
            credentials: { type: 'object' },
          },
          description: 'Authentication for protected pages',
        },
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
        checks: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Checks to perform (admin-audit, login-audit, drive-sharing, mobile-devices)',
        },
        timeRange: {
          type: 'object',
          properties: {
            startTime: { type: 'string' },
            endTime: { type: 'string' },
          },
          description: 'Time range for audit logs',
        },
      },
    },
  },
  {
    name: 'collect_jamf_evidence',
    description: 'Collect device management evidence from Jamf Pro',
    inputSchema: {
      type: 'object',
      properties: {
        evidenceTypes: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Evidence types (device-inventory, compliance-status, patch-status, security-configs)',
        },
        filters: {
          type: 'object',
          properties: {
            deviceType: { type: 'string', enum: ['computer', 'mobile'] },
            managementStatus: { type: 'string', enum: ['managed', 'unmanaged'] },
          },
        },
      },
    },
  },
];

// Define available resources
// Evidence is collected on demand through tools. Do not advertise resource
// URIs until a durable evidence-resource store is implemented.
const resources: Resource[] = [];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;
    // Cast args to unknown first to allow conversion to specific param types
    const toolArgs = args as unknown;

    switch (name) {
      case 'collect_aws_evidence':
        result = await collectAWSEvidence(toolArgs as Parameters<typeof collectAWSEvidence>[0]);
        break;
      case 'collect_azure_evidence':
        result = await collectAzureEvidence(toolArgs as Parameters<typeof collectAzureEvidence>[0]);
        break;
      case 'collect_github_evidence':
        result = await collectGitHubEvidence(
          toolArgs as Parameters<typeof collectGitHubEvidence>[0]
        );
        break;
      case 'collect_okta_evidence':
        result = await collectOktaEvidence(toolArgs as Parameters<typeof collectOktaEvidence>[0]);
        break;
      case 'scan_vulnerability':
        result = await scanVulnerabilities(toolArgs as Parameters<typeof scanVulnerabilities>[0]);
        break;
      case 'capture_screenshot':
        result = await captureScreenshot(toolArgs as Parameters<typeof captureScreenshot>[0]);
        break;
      case 'collect_google_workspace_evidence':
        result = await collectGoogleWorkspaceEvidence(
          toolArgs as Parameters<typeof collectGoogleWorkspaceEvidence>[0]
        );
        break;
      case 'collect_jamf_evidence':
        result = await collectJamfEvidence(toolArgs as Parameters<typeof collectJamfEvidence>[0]);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }),
        },
      ],
      isError: true,
    };
  }
});

// Handle list resources request
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources };
});

// Handle read resource request
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  throw new Error(`Evidence resource is not available: ${uri}. Use an evidence collection tool.`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GRC Evidence Collection MCP Server running on stdio');
}

main().catch(console.error);
