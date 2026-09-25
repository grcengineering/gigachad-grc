#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { runControlTest, runBatchControlTests } from './tools/control-tester.js';
import { validatePolicyCompliance } from './tools/policy-validator.js';
import { generateComplianceReport } from './tools/report-generator.js';
import { checkSOC2Controls } from './frameworks/soc2-checks.js';
import { checkISO27001Controls } from './frameworks/iso27001-checks.js';
import { checkHIPAAControls } from './frameworks/hipaa-checks.js';
import { checkGDPRControls } from './frameworks/gdpr-checks.js';
// Server instance
const server = new Server({
    name: 'grc-compliance-server',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
        resources: {},
    },
});
// Define available tools
const tools = [
    {
        name: 'run_control_test',
        description: 'Execute an automated test for a specific control',
        inputSchema: {
            type: 'object',
            properties: {
                controlId: {
                    type: 'string',
                    description: 'The ID of the control to test',
                },
                controlType: {
                    type: 'string',
                    enum: ['technical', 'administrative', 'physical'],
                    description: 'Type of control',
                },
                testConfiguration: {
                    type: 'object',
                    description: 'Configuration for the test (varies by control type)',
                    properties: {
                        evidenceSource: { type: 'string' },
                        threshold: { type: 'number' },
                        criteria: { type: 'array', items: { type: 'string' } },
                    },
                },
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
                controlIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of control IDs to test',
                },
                parallel: {
                    type: 'boolean',
                    description: 'Run tests in parallel (default: false)',
                },
                stopOnFailure: {
                    type: 'boolean',
                    description: 'Stop batch on first failure (default: false)',
                },
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
                policyId: {
                    type: 'string',
                    description: 'ID of the policy to validate',
                },
                policyContent: {
                    type: 'string',
                    description: 'Content of the policy (if not fetching by ID)',
                },
                framework: {
                    type: 'string',
                    enum: ['SOC2', 'ISO27001', 'HIPAA', 'GDPR', 'PCI-DSS', 'NIST-CSF'],
                    description: 'Framework to validate against',
                },
                requirements: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Specific requirements to check',
                },
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
                    description: 'Framework to report on',
                },
                reportType: {
                    type: 'string',
                    enum: ['summary', 'detailed', 'executive', 'gap-analysis'],
                    description: 'Type of report to generate',
                },
                includeEvidence: {
                    type: 'boolean',
                    description: 'Include evidence references in report',
                },
                dateRange: {
                    type: 'object',
                    properties: {
                        start: { type: 'string' },
                        end: { type: 'string' },
                    },
                },
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
                    description: 'Trust service categories to check',
                },
                controlPoints: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Specific control points to check (e.g., CC1.1, CC6.1)',
                },
            },
        },
    },
    {
        name: 'check_iso27001_controls',
        description: 'Run ISO 27001 specific compliance checks',
        inputSchema: {
            type: 'object',
            properties: {
                annexAControls: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Annex A control references to check (e.g., A.5.1.1, A.8.2.3)',
                },
                domains: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Control domains to check (e.g., A.5 Information Security Policies)',
                },
            },
        },
    },
    {
        name: 'check_hipaa_controls',
        description: 'Run HIPAA specific compliance checks',
        inputSchema: {
            type: 'object',
            properties: {
                ruleTypes: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: ['privacy', 'security', 'breach_notification'],
                    },
                    description: 'HIPAA rule types to check',
                },
                safeguards: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: ['administrative', 'physical', 'technical'],
                    },
                    description: 'Safeguard categories to check',
                },
            },
        },
    },
    {
        name: 'check_gdpr_controls',
        description: 'Run GDPR specific compliance checks',
        inputSchema: {
            type: 'object',
            properties: {
                articles: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'GDPR article references to check (e.g., Article 5, Article 32)',
                },
                dataProcessingActivities: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Data processing activities to assess',
                },
            },
        },
    },
];
// Define available resources
const resources = [
    {
        uri: 'compliance://controls/{id}/test-results',
        name: 'Control Test Results',
        description: 'Historical test results for a control',
        mimeType: 'application/json',
    },
    {
        uri: 'compliance://frameworks/{name}/requirements',
        name: 'Framework Requirements',
        description: 'Full list of requirements for a compliance framework',
        mimeType: 'application/json',
    },
    {
        uri: 'compliance://frameworks/{name}/coverage',
        name: 'Framework Coverage',
        description: 'Current coverage status for a framework',
        mimeType: 'application/json',
    },
    {
        uri: 'compliance://policies/{id}/validation-history',
        name: 'Policy Validation History',
        description: 'Historical validation results for a policy',
        mimeType: 'application/json',
    },
    {
        uri: 'compliance://reports/latest/{framework}',
        name: 'Latest Compliance Report',
        description: 'Most recent compliance report for a framework',
        mimeType: 'application/json',
    },
];
const DEMO_ONLY_TOOLS = new Set([
    'run_control_test',
    'run_batch_tests',
    'generate_compliance_report',
    'check_soc2_controls',
    'check_iso27001_controls',
    'check_hipaa_controls',
    'check_gdpr_controls',
]);
// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        let result;
        // Cast args to unknown first to allow conversion to specific param types
        const toolArgs = args;
        switch (name) {
            case 'run_control_test':
                result = await runControlTest(toolArgs);
                break;
            case 'run_batch_tests':
                result = await runBatchControlTests(toolArgs);
                break;
            case 'validate_policy_compliance':
                result = await validatePolicyCompliance(toolArgs);
                break;
            case 'generate_compliance_report':
                result = await generateComplianceReport(toolArgs);
                break;
            case 'check_soc2_controls':
                result = await checkSOC2Controls(toolArgs);
                break;
            case 'check_iso27001_controls':
                result = await checkISO27001Controls(toolArgs);
                break;
            case 'check_hipaa_controls':
                result = await checkHIPAAControls(toolArgs);
                break;
            case 'check_gdpr_controls':
                result = await checkGDPRControls(toolArgs);
                break;
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
        if (DEMO_ONLY_TOOLS.has(name)) {
            result = {
                demoMode: true,
                warning: 'Synthetic demonstration output; do not use as compliance evidence.',
                result,
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
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
    // Parse the URI and return appropriate data
    const resourceData = {
        uri,
        fetchedAt: new Date().toISOString(),
        data: {
            message: 'Resource data would be fetched from compliance store',
        },
    };
    return {
        contents: [
            {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(resourceData, null, 2),
            },
        ],
    };
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('GRC Compliance Automation MCP Server running on stdio');
}
main().catch(console.error);
//# sourceMappingURL=index.js.map