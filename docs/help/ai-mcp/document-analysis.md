# AI Document Analysis

Leverage AI to analyze compliance documents and extract insights.

## Overview

AI Document Analysis helps you quickly understand vendor documents, audit reports, and compliance artifacts by automatically extracting key information and identifying potential concerns.

## SOC 2 Report Analysis

### What It Does

Analyzes SOC 2 Type II reports to extract:
- Report period and coverage
- Service organization details
- Auditor and opinion type
- Exceptions and qualifications
- CUECs (Complementary User Entity Controls)
- Subservice organizations
- Control gaps and concerns

### Running Analysis

1. Navigate to the vendor's **Documents** tab
2. Upload or select a SOC 2 report
3. Click **Analyze with AI**
4. Review extracted information

### Analysis Results

| Field | Description |
|-------|-------------|
| **Report Period** | Start and end dates of audit |
| **Opinion Type** | Unqualified, qualified, adverse |
| **Exceptions** | Control exceptions noted by auditor |
| **CUECs** | Controls you need to implement |
| **Subservices** | Third parties the vendor relies on |
| **Risk Score** | AI-generated risk assessment |

### Creating Assessments

Convert analysis into a vendor assessment:
1. Review AI findings
2. Click **Create Assessment**
3. Findings populate assessment items
4. Add your own evaluation
5. Submit for review

## Audit Finding Analysis

### Categorization

AI automatically categorizes findings by:
- **Severity**: Critical, High, Medium, Low
- **Category**: Security, Compliance, Operational
- **Control Domain**: Access Control, Change Management, etc.

### Evidence Gap Analysis

Identifies:
- Missing evidence for controls
- Stale evidence needing refresh
- Gaps in documentation

### Remediation Suggestions

Get AI-powered remediation recommendations:
- Suggested actions
- Priority order
- Resource requirements
- Timeline estimates

## Policy Document Analysis

### What's Analyzed

- Policy completeness
- Compliance alignment
- Gap identification
- Improvement suggestions

### Draft Generation

AI can draft policy sections:
1. Select policy type
2. Provide context
3. Review AI draft
4. Edit and finalize

## Risk Analysis

### From Text Descriptions

Describe a risk in plain language:
1. Go to **AI Risk Assistant**
2. Describe the risk scenario
3. AI provides:
   - Suggested risk level
   - Impact assessment
   - Control recommendations
   - Treatment options

### Control Suggestions

Based on risk analysis:
- Recommended controls
- Framework mappings
- Implementation guidance

## AI Features by Module

### Controls

- **Auto-categorization**: Categorize controls automatically
- **Smart Search**: Natural language control queries
- **Control Suggestions**: Recommend controls for gaps

### Risks

- **Risk Scoring**: AI-assisted risk ratings
- **Treatment Recommendations**: Suggested approaches
- **Scenario Analysis**: What-if assessments

### Trust Center

- **Questionnaire Assistance**: Help answering questions
- **Knowledge Base Search**: Find relevant information
- **Response Generation**: Draft questionnaire answers

### Audits

- **Finding Categorization**: Classify findings
- **Control Mapping**: Map requests to controls
- **Summary Generation**: Create audit summaries

## Using the AI Assistant

### MCP Integration

The GRC AI Assistant is available via MCP:
- Natural language queries
- Multi-tool conversations
- Context-aware responses

### Available Commands

| Command | Description |
|---------|-------------|
| `analyze_risk` | Analyze risk with scoring |
| `suggest_controls` | Get control recommendations |
| `draft_policy` | Generate policy content |
| `map_requirements` | Map to framework requirements |
| `explain_finding` | Get finding explanations |
| `prioritize_remediation` | Prioritize fixes |
| `analyze_compliance_gap` | Identify compliance gaps |
| `assess_vendor_risk` | Evaluate vendor risk |

## Current Limitations

### Metadata-Based Analysis

Currently, AI analysis uses document metadata (title, description, type) rather than extracting text from file contents. This means:

- Upload descriptive document titles
- Add detailed descriptions when uploading
- Use appropriate document type tags
- Consider copy/pasting key sections into descriptions

### Coming Soon

Future enhancements will include:
- Full PDF text extraction
- OCR for scanned documents
- Multi-format document parsing
- Deeper content analysis

## Best Practices

### Document Preparation

- Use clear, descriptive filenames
- Add comprehensive descriptions
- Tag with correct document type
- Include key dates in metadata

### Review AI Output

- Verify AI findings manually
- Use as starting point, not final answer
- Add human context and judgment
- Document AI-assisted decisions

### Iterative Analysis

- Re-analyze after document updates
- Compare analyses over time
- Track improvement trends

## Related Topics

- [AI Features Overview](ai-features.md)
- [AI Configuration](ai-configuration.md)
- [Vendor Documents](../vendors/documents.md)
