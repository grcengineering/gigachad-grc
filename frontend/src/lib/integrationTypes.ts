// Integration Types Configuration
// This defines all available integrations with their configuration fields, 
// API documentation, and evidence collection capabilities

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'textarea' | 'select' | 'url' | 'checkbox';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  description?: string;
  default?: string | boolean;
  options?: { value: string; label: string }[] | string[];
}

export interface EvidenceType {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

export interface IntegrationType {
  name: string;
  description: string;
  category: string;
  iconSlug: string;
  apiDocs?: string;
  configFields: ConfigField[];
  evidenceTypes: EvidenceType[];
  authType: 'api_key' | 'oauth2' | 'basic' | 'service_account' | 'token';
  webhookSupport?: boolean;
  syncFrequencies: string[];
  capabilities?: string[];
}

export const INTEGRATION_TYPES: Record<string, IntegrationType> = {
  // ============================================
  // CLOUD INFRASTRUCTURE
  // ============================================
  aws: {
    name: 'Amazon Web Services',
    description: 'Connect AWS for cloud resource inventory, security findings, IAM analysis, and compliance data',
    category: 'Cloud Infrastructure',
    iconSlug: 'aws',
    apiDocs: 'https://docs.aws.amazon.com/general/latest/gr/aws-apis.html',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true, placeholder: 'AKIA...', helpText: 'Your AWS Access Key ID' },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true, placeholder: '••••••••', helpText: 'Your AWS Secret Access Key' },
      { key: 'region', label: 'Default Region', type: 'select', required: true, options: [
        { value: 'us-east-1', label: 'US East (N. Virginia)' },
        { value: 'us-east-2', label: 'US East (Ohio)' },
        { value: 'us-west-1', label: 'US West (N. California)' },
        { value: 'us-west-2', label: 'US West (Oregon)' },
        { value: 'eu-west-1', label: 'EU (Ireland)' },
        { value: 'eu-west-2', label: 'EU (London)' },
        { value: 'eu-central-1', label: 'EU (Frankfurt)' },
        { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
        { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
        { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
      ]},
      { key: 'assumeRoleArn', label: 'Assume Role ARN (Optional)', type: 'text', required: false, placeholder: 'arn:aws:iam::123456789012:role/GRCRole', helpText: 'ARN of IAM role to assume for cross-account access' },
    ],
    evidenceTypes: [
      { key: 'iam_users', label: 'IAM Users & Roles', description: 'User accounts, roles, policies, and access keys', defaultEnabled: true },
      { key: 'iam_policies', label: 'IAM Policies', description: 'Attached and inline policies', defaultEnabled: true },
      { key: 'security_groups', label: 'Security Groups', description: 'VPC security group configurations', defaultEnabled: true },
      { key: 'ec2_instances', label: 'EC2 Instances', description: 'Running instances and their configurations', defaultEnabled: true },
      { key: 's3_buckets', label: 'S3 Buckets', description: 'Bucket configurations, policies, and encryption settings', defaultEnabled: true },
      { key: 'cloudtrail', label: 'CloudTrail Logs', description: 'API activity and audit logs', defaultEnabled: true },
      { key: 'config_rules', label: 'AWS Config Rules', description: 'Compliance rules and evaluations', defaultEnabled: true },
      { key: 'security_hub', label: 'Security Hub Findings', description: 'Aggregated security findings', defaultEnabled: true },
      { key: 'guardduty', label: 'GuardDuty Findings', description: 'Threat detection findings', defaultEnabled: false },
      { key: 'kms_keys', label: 'KMS Keys', description: 'Encryption key configurations', defaultEnabled: true },
      { key: 'rds_instances', label: 'RDS Instances', description: 'Database instance configurations', defaultEnabled: true },
      { key: 'lambda_functions', label: 'Lambda Functions', description: 'Serverless function configurations', defaultEnabled: false },
      { key: 'vpc_flow_logs', label: 'VPC Flow Logs', description: 'Network traffic logs', defaultEnabled: false },
    ],
  },

  gcp: {
    name: 'Google Cloud Platform',
    description: 'Integrate GCP for asset discovery, Security Command Center findings, and IAM analysis',
    category: 'Cloud Infrastructure',
    iconSlug: 'gcp',
    apiDocs: 'https://cloud.google.com/apis/docs/overview',
    authType: 'service_account',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', type: 'textarea', required: true, placeholder: '{\n  "type": "service_account",\n  "project_id": "...",\n  ...}', helpText: 'Paste your service account JSON key' },
      { key: 'projectId', label: 'Project ID', type: 'text', required: true, placeholder: 'my-project-123', helpText: 'Your GCP Project ID' },
      { key: 'organizationId', label: 'Organization ID (Optional)', type: 'text', required: false, placeholder: '123456789', helpText: 'For organization-wide access' },
    ],
    evidenceTypes: [
      { key: 'iam_policies', label: 'IAM Policies', description: 'Project and organization IAM bindings', defaultEnabled: true },
      { key: 'service_accounts', label: 'Service Accounts', description: 'Service account configurations and keys', defaultEnabled: true },
      { key: 'compute_instances', label: 'Compute Instances', description: 'VM instances and configurations', defaultEnabled: true },
      { key: 'gke_clusters', label: 'GKE Clusters', description: 'Kubernetes cluster configurations', defaultEnabled: true },
      { key: 'cloud_storage', label: 'Cloud Storage Buckets', description: 'Bucket configurations and permissions', defaultEnabled: true },
      { key: 'firewall_rules', label: 'Firewall Rules', description: 'VPC firewall rule configurations', defaultEnabled: true },
      { key: 'scc_findings', label: 'Security Command Center', description: 'Security findings and vulnerabilities', defaultEnabled: true },
      { key: 'audit_logs', label: 'Audit Logs', description: 'Admin activity and data access logs', defaultEnabled: true },
      { key: 'cloud_sql', label: 'Cloud SQL Instances', description: 'Database configurations', defaultEnabled: true },
      { key: 'kms_keys', label: 'Cloud KMS Keys', description: 'Encryption key configurations', defaultEnabled: true },
    ],
  },

  azure: {
    name: 'Microsoft Azure',
    description: 'Connect Azure for resource management, Security Center findings, and policy compliance',
    category: 'Cloud Infrastructure',
    iconSlug: 'azure',
    apiDocs: 'https://docs.microsoft.com/en-us/rest/api/azure/',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', helpText: 'Azure AD Tenant ID' },
      { key: 'clientId', label: 'Application (Client) ID', type: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', helpText: 'App registration client ID' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, placeholder: '••••••••', helpText: 'App registration client secret' },
      { key: 'subscriptionId', label: 'Subscription ID', type: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', helpText: 'Azure Subscription ID' },
    ],
    evidenceTypes: [
      { key: 'azure_ad_users', label: 'Azure AD Users', description: 'User accounts and group memberships', defaultEnabled: true },
      { key: 'azure_ad_groups', label: 'Azure AD Groups', description: 'Security and Microsoft 365 groups', defaultEnabled: true },
      { key: 'rbac_assignments', label: 'RBAC Assignments', description: 'Role-based access control assignments', defaultEnabled: true },
      { key: 'virtual_machines', label: 'Virtual Machines', description: 'VM configurations and security settings', defaultEnabled: true },
      { key: 'storage_accounts', label: 'Storage Accounts', description: 'Storage configurations and access policies', defaultEnabled: true },
      { key: 'network_security_groups', label: 'Network Security Groups', description: 'NSG rules and configurations', defaultEnabled: true },
      { key: 'security_center', label: 'Security Center Alerts', description: 'Defender for Cloud recommendations', defaultEnabled: true },
      { key: 'policy_compliance', label: 'Policy Compliance', description: 'Azure Policy compliance states', defaultEnabled: true },
      { key: 'activity_logs', label: 'Activity Logs', description: 'Subscription activity and audit logs', defaultEnabled: true },
      { key: 'key_vaults', label: 'Key Vaults', description: 'Key vault configurations and access policies', defaultEnabled: true },
      { key: 'sql_databases', label: 'SQL Databases', description: 'Azure SQL configurations', defaultEnabled: true },
      { key: 'conditional_access', label: 'Conditional Access Policies', description: 'Azure AD conditional access', defaultEnabled: true },
    ],
  },

  cloudflare: {
    name: 'Cloudflare',
    description: 'Integrate Cloudflare for DNS records, WAF rules, and security analytics',
    category: 'Cloud Infrastructure',
    iconSlug: 'cloudflare',
    apiDocs: 'https://developers.cloudflare.com/api/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true, placeholder: '••••••••', helpText: 'Cloudflare API Token with appropriate permissions' },
      { key: 'accountId', label: 'Account ID', type: 'text', required: false, placeholder: 'Account ID for enterprise features', helpText: 'Required for account-level features' },
    ],
    evidenceTypes: [
      { key: 'dns_records', label: 'DNS Records', description: 'Domain DNS configurations', defaultEnabled: true },
      { key: 'firewall_rules', label: 'Firewall Rules', description: 'WAF and firewall configurations', defaultEnabled: true },
      { key: 'ssl_certificates', label: 'SSL/TLS Settings', description: 'Certificate and encryption settings', defaultEnabled: true },
      { key: 'access_policies', label: 'Access Policies', description: 'Cloudflare Access rules', defaultEnabled: true },
      { key: 'security_events', label: 'Security Events', description: 'Threat and attack analytics', defaultEnabled: true },
      { key: 'page_rules', label: 'Page Rules', description: 'URL-based configurations', defaultEnabled: false },
    ],
  },

  digital_ocean: {
    name: 'DigitalOcean',
    description: 'Monitor DigitalOcean droplets, databases, and Kubernetes clusters',
    category: 'Cloud Infrastructure',
    iconSlug: 'digital_ocean',
    apiDocs: 'https://docs.digitalocean.com/reference/api/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'Personal Access Token', type: 'password', required: true, placeholder: '••••••••', helpText: 'DigitalOcean API token with read access' },
    ],
    evidenceTypes: [
      { key: 'droplets', label: 'Droplets', description: 'Virtual machine instances', defaultEnabled: true },
      { key: 'kubernetes', label: 'Kubernetes Clusters', description: 'DOKS cluster configurations', defaultEnabled: true },
      { key: 'databases', label: 'Managed Databases', description: 'Database cluster configurations', defaultEnabled: true },
      { key: 'firewalls', label: 'Firewalls', description: 'Cloud firewall rules', defaultEnabled: true },
      { key: 'spaces', label: 'Spaces', description: 'Object storage configurations', defaultEnabled: true },
      { key: 'load_balancers', label: 'Load Balancers', description: 'Load balancer configurations', defaultEnabled: true },
    ],
  },

  // ============================================
  // DEVELOPER TOOLS
  // ============================================
  github: {
    name: 'GitHub',
    description: 'Connect repositories for code scanning, dependency alerts, secret scanning, and access reviews',
    category: 'Developer Tools',
    iconSlug: 'github',
    apiDocs: 'https://docs.github.com/en/rest',
    authType: 'token',
    webhookSupport: true,
    syncFrequencies: ['realtime', 'hourly', 'daily'],
    configFields: [
      { key: 'accessToken', label: 'Personal Access Token', type: 'password', required: true, placeholder: 'ghp_...', helpText: 'Token with repo, admin:org, and security_events scopes' },
      { key: 'organization', label: 'Organization', type: 'text', required: false, placeholder: 'my-org', helpText: 'GitHub organization name (leave empty for personal repos)' },
      { key: 'enterpriseUrl', label: 'Enterprise URL (Optional)', type: 'url', required: false, placeholder: 'https://github.mycompany.com', helpText: 'For GitHub Enterprise Server' },
    ],
    evidenceTypes: [
      { key: 'repositories', label: 'Repositories', description: 'Repository configurations and settings', defaultEnabled: true },
      { key: 'branch_protection', label: 'Branch Protection Rules', description: 'Branch protection policies', defaultEnabled: true },
      { key: 'code_scanning', label: 'Code Scanning Alerts', description: 'CodeQL and third-party scan results', defaultEnabled: true },
      { key: 'dependabot', label: 'Dependabot Alerts', description: 'Vulnerable dependency alerts', defaultEnabled: true },
      { key: 'secret_scanning', label: 'Secret Scanning', description: 'Exposed secrets and credentials', defaultEnabled: true },
      { key: 'org_members', label: 'Organization Members', description: 'Member list and roles', defaultEnabled: true },
      { key: 'team_access', label: 'Team Access', description: 'Team repository permissions', defaultEnabled: true },
      { key: 'audit_log', label: 'Audit Log', description: 'Organization audit events', defaultEnabled: true },
      { key: 'webhooks', label: 'Webhooks', description: 'Configured webhooks', defaultEnabled: false },
      { key: 'actions_workflows', label: 'Actions Workflows', description: 'CI/CD workflow configurations', defaultEnabled: true },
      { key: 'deploy_keys', label: 'Deploy Keys', description: 'Repository deploy keys', defaultEnabled: true },
    ],
  },

  gitlab: {
    name: 'GitLab',
    description: 'Integrate GitLab for security scanning, merge request policies, and user access management',
    category: 'Developer Tools',
    iconSlug: 'gitlab',
    apiDocs: 'https://docs.gitlab.com/ee/api/',
    authType: 'token',
    webhookSupport: true,
    syncFrequencies: ['realtime', 'hourly', 'daily'],
    configFields: [
      { key: 'accessToken', label: 'Personal Access Token', type: 'password', required: true, placeholder: 'glpat-...', helpText: 'Token with api and read_repository scopes' },
      { key: 'baseUrl', label: 'GitLab URL', type: 'url', required: true, placeholder: 'https://gitlab.com', helpText: 'GitLab instance URL' },
      { key: 'groupId', label: 'Group ID (Optional)', type: 'text', required: false, placeholder: '12345', helpText: 'Limit to specific group' },
    ],
    evidenceTypes: [
      { key: 'projects', label: 'Projects', description: 'Project configurations and settings', defaultEnabled: true },
      { key: 'protected_branches', label: 'Protected Branches', description: 'Branch protection rules', defaultEnabled: true },
      { key: 'merge_request_approvals', label: 'MR Approval Rules', description: 'Merge request approval policies', defaultEnabled: true },
      { key: 'sast_results', label: 'SAST Results', description: 'Static application security testing', defaultEnabled: true },
      { key: 'dependency_scanning', label: 'Dependency Scanning', description: 'Vulnerable dependency reports', defaultEnabled: true },
      { key: 'container_scanning', label: 'Container Scanning', description: 'Container image vulnerabilities', defaultEnabled: true },
      { key: 'group_members', label: 'Group Members', description: 'Group membership and access levels', defaultEnabled: true },
      { key: 'audit_events', label: 'Audit Events', description: 'Group and project audit logs', defaultEnabled: true },
      { key: 'deploy_tokens', label: 'Deploy Tokens', description: 'Configured deploy tokens', defaultEnabled: true },
      { key: 'ci_variables', label: 'CI/CD Variables', description: 'Pipeline variable configurations', defaultEnabled: false },
    ],
  },

  jira: {
    name: 'Jira',
    description: 'Connect Jira for issue tracking, project management, and workflow compliance',
    category: 'Developer Tools',
    iconSlug: 'jira',
    apiDocs: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Jira URL', type: 'url', required: true, placeholder: 'https://yourcompany.atlassian.net', helpText: 'Your Jira Cloud or Server URL' },
      { key: 'email', label: 'Email', type: 'text', required: true, placeholder: 'user@company.com', helpText: 'Atlassian account email' },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true, placeholder: '••••••••', helpText: 'Atlassian API token' },
    ],
    evidenceTypes: [
      { key: 'projects', label: 'Projects', description: 'Project configurations', defaultEnabled: true },
      { key: 'issues', label: 'Issues', description: 'Issue data and history', defaultEnabled: true },
      { key: 'workflows', label: 'Workflows', description: 'Workflow configurations', defaultEnabled: true },
      { key: 'permissions', label: 'Permission Schemes', description: 'Project permission configurations', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'User accounts and groups', defaultEnabled: true },
      { key: 'audit_log', label: 'Audit Log', description: 'Admin audit records', defaultEnabled: true },
      { key: 'security_schemes', label: 'Security Schemes', description: 'Issue security levels', defaultEnabled: false },
    ],
  },

  // ============================================
  // IDENTITY PROVIDERS
  // ============================================
  okta: {
    name: 'Okta',
    description: 'Connect Okta for SSO, user provisioning, MFA status, and access reviews',
    category: 'Identity Providers',
    iconSlug: 'okta',
    apiDocs: 'https://developer.okta.com/docs/reference/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'domain', label: 'Okta Domain', type: 'text', required: true, placeholder: 'yourcompany.okta.com', helpText: 'Your Okta organization domain' },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true, placeholder: '••••••••', helpText: 'Okta API token with appropriate scopes' },
    ],
    evidenceTypes: [
      { key: 'user_access_list', label: 'User Access List', description: 'Apps and systems each user has access to', defaultEnabled: true },
      { key: 'app_assignments', label: 'App Assignments', description: 'Application access assignments per user', defaultEnabled: true },
      { key: 'group_memberships', label: 'Group Memberships', description: 'User group membership details', defaultEnabled: true },
      { key: 'mfa_status', label: 'MFA Status', description: 'MFA enrollment status per user', defaultEnabled: true },
      { key: 'login_activity', label: 'Login Activity', description: 'Authentication events and login history', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'User profiles and status', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'Group configurations', defaultEnabled: false },
      { key: 'policies', label: 'Policies', description: 'Authentication and sign-on policies', defaultEnabled: false },
    ],
  },

  azure_ad: {
    name: 'Azure Active Directory',
    description: 'Integrate Azure AD for identity management, conditional access, and security defaults',
    category: 'Identity Providers',
    iconSlug: 'azure_ad',
    apiDocs: 'https://docs.microsoft.com/en-us/graph/api/overview',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'clientId', label: 'Application (Client) ID', type: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, placeholder: '••••••••' },
    ],
    evidenceTypes: [
      { key: 'user_access_list', label: 'User Access List', description: 'Apps and resources each user has access to', defaultEnabled: true },
      { key: 'app_assignments', label: 'App Assignments', description: 'Enterprise app access per user', defaultEnabled: true },
      { key: 'group_memberships', label: 'Group Memberships', description: 'Security and M365 group memberships', defaultEnabled: true },
      { key: 'mfa_status', label: 'MFA Status', description: 'Per-user MFA registration', defaultEnabled: true },
      { key: 'login_activity', label: 'Login Activity', description: 'Sign-in logs and authentication events', defaultEnabled: true },
      { key: 'access_review_status', label: 'Access Review Status', description: 'Access review completion status', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'User accounts and properties', defaultEnabled: true },
      { key: 'conditional_access', label: 'Conditional Access', description: 'CA policies and named locations', defaultEnabled: false },
      { key: 'privileged_roles', label: 'Privileged Roles', description: 'Directory role assignments', defaultEnabled: false },
    ],
  },

  google_workspace: {
    name: 'Google Workspace',
    description: 'Connect Google Workspace for user management, security alerts, and admin activity',
    category: 'Identity Providers',
    iconSlug: 'google_workspace',
    apiDocs: 'https://developers.google.com/admin-sdk',
    authType: 'service_account',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', type: 'textarea', required: true, helpText: 'Service account with domain-wide delegation' },
      { key: 'adminEmail', label: 'Admin Email', type: 'text', required: true, placeholder: 'admin@company.com', helpText: 'Super admin email for impersonation' },
      { key: 'customerId', label: 'Customer ID', type: 'text', required: false, placeholder: 'C0xxxxxxx', helpText: 'Google Workspace customer ID' },
    ],
    evidenceTypes: [
      { key: 'user_access_list', label: 'User Access List', description: 'Apps and services each user has access to', defaultEnabled: true },
      { key: 'app_assignments', label: 'App Assignments', description: 'OAuth token authorizations per user', defaultEnabled: true },
      { key: 'group_memberships', label: 'Group Memberships', description: 'User group memberships', defaultEnabled: true },
      { key: 'mfa_status', label: 'MFA Status', description: '2FA enrollment status per user', defaultEnabled: true },
      { key: 'login_activity', label: 'Login Activity', description: 'Authentication and login events', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'User accounts and status', defaultEnabled: true },
      { key: 'admin_roles', label: 'Admin Roles', description: 'Delegated admin assignments', defaultEnabled: false },
      { key: 'security_alerts', label: 'Security Alerts', description: 'Alert Center notifications', defaultEnabled: false },
    ],
  },

  // ============================================
  // MDM
  // ============================================
  jamf: {
    name: 'Jamf Pro',
    description: 'Connect Jamf for Apple device management, compliance policies, and security configurations',
    category: 'MDM',
    iconSlug: 'jamf',
    apiDocs: 'https://developer.jamf.com/',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'serverUrl', label: 'Jamf Pro URL', type: 'url', required: true, placeholder: 'https://yourcompany.jamfcloud.com' },
      { key: 'username', label: 'Username', type: 'text', required: true, placeholder: 'api-user' },
      { key: 'password', label: 'Password', type: 'password', required: true, placeholder: '••••••••' },
    ],
    evidenceTypes: [
      { key: 'device_inventory', label: 'Device Inventory', description: 'Complete device inventory (Mac and mobile)', defaultEnabled: true },
      { key: 'device_assignments', label: 'Device Assignments', description: 'Device to user assignments', defaultEnabled: true },
      { key: 'device_compliance', label: 'Device Compliance', description: 'Compliance status per device', defaultEnabled: true },
      { key: 'computers', label: 'Computers', description: 'Mac inventory and details', defaultEnabled: true },
      { key: 'mobile_devices', label: 'Mobile Devices', description: 'iOS/iPadOS device inventory', defaultEnabled: true },
      { key: 'configuration_profiles', label: 'Configuration Profiles', description: 'Deployed profiles and payloads', defaultEnabled: false },
      { key: 'policies', label: 'Policies', description: 'Management policies', defaultEnabled: false },
      { key: 'filevault_status', label: 'FileVault Status', description: 'Encryption status', defaultEnabled: true },
    ],
  },

  microsoft_intune: {
    name: 'Microsoft Intune',
    description: 'Integrate Intune for endpoint management, compliance policies, and conditional access',
    category: 'MDM',
    iconSlug: 'microsoft_intune',
    apiDocs: 'https://docs.microsoft.com/en-us/graph/api/resources/intune-graph-overview',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'clientId', label: 'Application (Client) ID', type: 'text', required: true, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true, placeholder: '••••••••' },
    ],
    evidenceTypes: [
      { key: 'device_inventory', label: 'Device Inventory', description: 'Complete device inventory', defaultEnabled: true },
      { key: 'device_assignments', label: 'Device Assignments', description: 'Device to user assignments', defaultEnabled: true },
      { key: 'device_compliance', label: 'Device Compliance', description: 'Compliance status per device', defaultEnabled: true },
      { key: 'managed_devices', label: 'Managed Devices', description: 'Detailed device records', defaultEnabled: true },
      { key: 'managed_apps', label: 'Managed Apps', description: 'Application deployments', defaultEnabled: true },
      { key: 'compliance_policies', label: 'Compliance Policies', description: 'Device compliance policies', defaultEnabled: false },
      { key: 'security_baselines', label: 'Security Baselines', description: 'Baseline compliance', defaultEnabled: false },
    ],
  },

  // ============================================
  // COLLABORATION
  // ============================================
  slack: {
    name: 'Slack',
    description: 'Connect Slack for communication monitoring, DLP, and audit trails',
    category: 'Collaboration',
    iconSlug: 'slack',
    apiDocs: 'https://api.slack.com/',
    authType: 'oauth2',
    webhookSupport: true,
    syncFrequencies: ['realtime', 'hourly', 'daily'],
    configFields: [
      { key: 'botToken', label: 'Bot User OAuth Token', type: 'password', required: true, placeholder: 'xoxb-...', helpText: 'Bot token with appropriate scopes' },
      { key: 'userToken', label: 'User OAuth Token (Optional)', type: 'password', required: false, placeholder: 'xoxp-...', helpText: 'For admin-level access' },
      { key: 'signingSecret', label: 'Signing Secret', type: 'password', required: false, placeholder: '••••••••', helpText: 'For webhook verification' },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Workspace members and guests', defaultEnabled: true },
      { key: 'channels', label: 'Channels', description: 'Public and private channels', defaultEnabled: true },
      { key: 'user_groups', label: 'User Groups', description: 'Group memberships', defaultEnabled: true },
      { key: 'apps', label: 'Installed Apps', description: 'Third-party app integrations', defaultEnabled: true },
      { key: 'access_logs', label: 'Access Logs', description: 'User login events', defaultEnabled: true },
      { key: 'audit_logs', label: 'Audit Logs (Enterprise)', description: 'Enterprise Grid audit events', defaultEnabled: false },
      { key: 'file_sharing', label: 'File Sharing', description: 'Shared files and external access', defaultEnabled: false },
      { key: 'dlp_policies', label: 'DLP Policies', description: 'Data loss prevention rules', defaultEnabled: false },
    ],
  },

  // ============================================
  // CYBERSECURITY
  // ============================================
  crowdstrike: {
    name: 'CrowdStrike Falcon',
    description: 'Connect CrowdStrike for endpoint detection, threat intelligence, and incident data',
    category: 'Cybersecurity',
    iconSlug: 'crowdstrike',
    apiDocs: 'https://falcon.crowdstrike.com/documentation/',
    authType: 'oauth2',
    syncFrequencies: ['realtime', 'hourly', 'daily'],
    configFields: [
      { key: 'clientId', label: 'API Client ID', type: 'text', required: true, placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'clientSecret', label: 'API Client Secret', type: 'password', required: true, placeholder: '••••••••' },
      { key: 'baseUrl', label: 'API Base URL', type: 'select', required: true, options: [
        { value: 'https://api.crowdstrike.com', label: 'US-1' },
        { value: 'https://api.us-2.crowdstrike.com', label: 'US-2' },
        { value: 'https://api.eu-1.crowdstrike.com', label: 'EU-1' },
        { value: 'https://api.laggar.gcw.crowdstrike.com', label: 'US-GOV-1' },
      ]},
    ],
    evidenceTypes: [
      { key: 'hosts', label: 'Host Inventory', description: 'Managed endpoint inventory', defaultEnabled: true },
      { key: 'detections', label: 'Detections', description: 'Threat detections and alerts', defaultEnabled: true },
      { key: 'incidents', label: 'Incidents', description: 'Security incidents', defaultEnabled: true },
      { key: 'vulnerabilities', label: 'Vulnerabilities', description: 'Spotlight vulnerability data', defaultEnabled: true },
      { key: 'policies', label: 'Prevention Policies', description: 'Sensor policy configurations', defaultEnabled: true },
      { key: 'sensor_versions', label: 'Sensor Versions', description: 'Agent version compliance', defaultEnabled: true },
      { key: 'iocs', label: 'IOC Management', description: 'Custom indicators of compromise', defaultEnabled: false },
    ],
  },

  snyk: {
    name: 'Snyk',
    description: 'Integrate Snyk for developer security, vulnerability scanning, and license compliance',
    category: 'Cybersecurity',
    iconSlug: 'snyk',
    apiDocs: 'https://snyk.docs.apiary.io/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true, placeholder: '••••••••', helpText: 'Snyk API token' },
      { key: 'orgId', label: 'Organization ID', type: 'text', required: false, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    ],
    evidenceTypes: [
      { key: 'projects', label: 'Projects', description: 'Monitored projects and repos', defaultEnabled: true },
      { key: 'issues', label: 'Vulnerability Issues', description: 'Open security issues', defaultEnabled: true },
      { key: 'dependencies', label: 'Dependencies', description: 'Dependency inventory', defaultEnabled: true },
      { key: 'licenses', label: 'Licenses', description: 'License compliance data', defaultEnabled: true },
      { key: 'ignores', label: 'Ignored Issues', description: 'Suppressed vulnerabilities', defaultEnabled: true },
      { key: 'test_results', label: 'Test Results', description: 'CI/CD scan results', defaultEnabled: true },
    ],
  },

  // ============================================
  // HR TOOLS
  // ============================================
  workday: {
    name: 'Workday',
    description: 'Connect Workday for HR data, employee lifecycle, and organizational structure',
    category: 'HR Tools',
    iconSlug: 'workday',
    apiDocs: 'https://community.workday.com/sites/default/files/file-hosting/productionapi/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'tenantUrl', label: 'Tenant URL', type: 'url', required: true, placeholder: 'https://wd2-impl-services1.workday.com' },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employee_roster', label: 'Employee Roster', description: 'Complete employee directory with status', defaultEnabled: true },
      { key: 'org_chart', label: 'Organization Chart', description: 'Reporting structure and hierarchy', defaultEnabled: true },
      { key: 'employment_status', label: 'Employment Status', description: 'Active, terminated, on leave status', defaultEnabled: true },
      { key: 'onboarding_status', label: 'Onboarding Status', description: 'New hire onboarding progress', defaultEnabled: true },
      { key: 'offboarding_status', label: 'Offboarding Status', description: 'Termination and offboarding records', defaultEnabled: true },
      { key: 'workers', label: 'Workers (Legacy)', description: 'Employee and contingent worker data', defaultEnabled: false },
      { key: 'job_profiles', label: 'Job Profiles', description: 'Position and role definitions', defaultEnabled: false },
      { key: 'security_groups', label: 'Security Groups', description: 'Workday security group assignments', defaultEnabled: false },
    ],
  },

  bamboohr: {
    name: 'BambooHR',
    description: 'Integrate BambooHR for employee data, onboarding, and offboarding tracking',
    category: 'HR Tools',
    iconSlug: 'bamboohr',
    apiDocs: 'https://documentation.bamboohr.com/reference',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'subdomain', label: 'Company Subdomain', type: 'text', required: true, placeholder: 'yourcompany', helpText: 'From yourcompany.bamboohr.com' },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employee_roster', label: 'Employee Roster', description: 'Complete employee directory with status', defaultEnabled: true },
      { key: 'org_chart', label: 'Organization Chart', description: 'Department and reporting structure', defaultEnabled: true },
      { key: 'employment_status', label: 'Employment Status', description: 'Active, terminated, on leave status', defaultEnabled: true },
      { key: 'onboarding_status', label: 'Onboarding Status', description: 'New hire onboarding tasks and progress', defaultEnabled: true },
      { key: 'offboarding_status', label: 'Offboarding Status', description: 'Termination records and exit tasks', defaultEnabled: true },
      { key: 'time_off', label: 'Time Off', description: 'PTO balances and requests', defaultEnabled: false },
    ],
  },

  // ============================================
  // CRM & SUPPORT
  // ============================================
  salesforce: {
    name: 'Salesforce',
    description: 'Connect Salesforce for CRM data, user access, and security settings',
    category: 'CRM & Support',
    iconSlug: 'salesforce',
    apiDocs: 'https://developer.salesforce.com/docs/apis',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'instanceUrl', label: 'Instance URL', type: 'url', required: true, placeholder: 'https://yourcompany.salesforce.com' },
      { key: 'clientId', label: 'Consumer Key', type: 'text', required: true },
      { key: 'clientSecret', label: 'Consumer Secret', type: 'password', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password + Security Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'User accounts and profiles', defaultEnabled: true },
      { key: 'profiles', label: 'Profiles', description: 'Permission profiles', defaultEnabled: true },
      { key: 'permission_sets', label: 'Permission Sets', description: 'Additional permissions', defaultEnabled: true },
      { key: 'login_history', label: 'Login History', description: 'User authentication events', defaultEnabled: true },
      { key: 'setup_audit', label: 'Setup Audit Trail', description: 'Admin configuration changes', defaultEnabled: true },
      { key: 'field_audit', label: 'Field Audit Trail', description: 'Record change history', defaultEnabled: false },
      { key: 'connected_apps', label: 'Connected Apps', description: 'OAuth applications', defaultEnabled: true },
      { key: 'session_settings', label: 'Session Settings', description: 'Security configurations', defaultEnabled: true },
    ],
  },

  servicenow: {
    name: 'ServiceNow',
    description: 'Integrate ServiceNow for ITSM, CMDB, and GRC workflow integration',
    category: 'CRM & Support',
    iconSlug: 'servicenow',
    apiDocs: 'https://developer.servicenow.com/dev.do#!/reference/api/',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'instanceUrl', label: 'Instance URL', type: 'url', required: true, placeholder: 'https://yourcompany.service-now.com' },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'User accounts and roles', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'Group memberships', defaultEnabled: true },
      { key: 'incidents', label: 'Incidents', description: 'Incident records', defaultEnabled: true },
      { key: 'changes', label: 'Change Requests', description: 'Change management records', defaultEnabled: true },
      { key: 'cmdb', label: 'CMDB', description: 'Configuration items', defaultEnabled: true },
      { key: 'policies', label: 'GRC Policies', description: 'Policy and compliance records', defaultEnabled: true },
      { key: 'risks', label: 'GRC Risks', description: 'Risk register items', defaultEnabled: true },
      { key: 'controls', label: 'GRC Controls', description: 'Control definitions', defaultEnabled: true },
    ],
  },

  // ============================================
  // DATA & ANALYTICS
  // ============================================
  datadog: {
    name: 'Datadog',
    description: 'Integrate Datadog for monitoring data, security signals, and audit logs',
    category: 'Data Analytics',
    iconSlug: 'datadog',
    apiDocs: 'https://docs.datadoghq.com/api/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'appKey', label: 'Application Key', type: 'password', required: true },
      { key: 'site', label: 'Datadog Site', type: 'select', required: true, options: [
        { value: 'datadoghq.com', label: 'US1 (datadoghq.com)' },
        { value: 'us3.datadoghq.com', label: 'US3' },
        { value: 'us5.datadoghq.com', label: 'US5' },
        { value: 'datadoghq.eu', label: 'EU1' },
        { value: 'ddog-gov.com', label: 'US1-FED' },
      ]},
    ],
    evidenceTypes: [
      { key: 'monitors', label: 'Monitors', description: 'Alert configurations', defaultEnabled: true },
      { key: 'security_signals', label: 'Security Signals', description: 'Cloud SIEM detections', defaultEnabled: true },
      { key: 'audit_logs', label: 'Audit Logs', description: 'Platform audit events', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'User accounts and roles', defaultEnabled: true },
      { key: 'dashboards', label: 'Dashboards', description: 'Dashboard configurations', defaultEnabled: false },
      { key: 'api_keys', label: 'API Keys', description: 'API key inventory', defaultEnabled: true },
    ],
  },

  splunk: {
    name: 'Splunk',
    description: 'Connect Splunk for SIEM data, saved searches, and security analytics',
    category: 'Data Analytics',
    iconSlug: 'splunk',
    apiDocs: 'https://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTprolog',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Splunk URL', type: 'url', required: true, placeholder: 'https://splunk.company.com:8089' },
      { key: 'token', label: 'Bearer Token', type: 'password', required: true, helpText: 'Authentication token' },
    ],
    evidenceTypes: [
      { key: 'saved_searches', label: 'Saved Searches', description: 'Alert and report definitions', defaultEnabled: true },
      { key: 'notable_events', label: 'Notable Events', description: 'ES notable events', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'User accounts and roles', defaultEnabled: true },
      { key: 'apps', label: 'Apps', description: 'Installed applications', defaultEnabled: true },
      { key: 'indexes', label: 'Indexes', description: 'Index configurations', defaultEnabled: false },
      { key: 'inputs', label: 'Data Inputs', description: 'Data source configurations', defaultEnabled: false },
    ],
  },

  // ============================================
  // ADDITIONAL CLOUD INFRASTRUCTURE
  // ============================================
  oracle_cloud: {
    name: 'Oracle Cloud',
    description: 'Connect Oracle Cloud Infrastructure for resource and security monitoring',
    category: 'Cloud Infrastructure',
    iconSlug: 'oracle_cloud',
    apiDocs: 'https://docs.oracle.com/en-us/iaas/api/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'tenancyOcid', label: 'Tenancy OCID', type: 'text', required: true, placeholder: 'ocid1.tenancy.oc1...' },
      { key: 'userOcid', label: 'User OCID', type: 'text', required: true, placeholder: 'ocid1.user.oc1...' },
      { key: 'fingerprint', label: 'API Key Fingerprint', type: 'text', required: true },
      { key: 'privateKey', label: 'Private Key', type: 'textarea', required: true },
      { key: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-ashburn-1' },
    ],
    evidenceTypes: [
      { key: 'compute', label: 'Compute Instances', description: 'VM instances', defaultEnabled: true },
      { key: 'iam', label: 'IAM', description: 'Users, groups, and policies', defaultEnabled: true },
      { key: 'networking', label: 'Networking', description: 'VCN and security lists', defaultEnabled: true },
      { key: 'audit', label: 'Audit Logs', description: 'Activity logs', defaultEnabled: true },
    ],
  },
  ibm_cloud: {
    name: 'IBM Cloud',
    description: 'Integrate IBM Cloud for workload and security management',
    category: 'Cloud Infrastructure',
    iconSlug: 'ibm_cloud',
    apiDocs: 'https://cloud.ibm.com/apidocs',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'accountId', label: 'Account ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'resources', label: 'Resources', description: 'Cloud resources', defaultEnabled: true },
      { key: 'iam', label: 'IAM', description: 'Access management', defaultEnabled: true },
    ],
  },
  alibaba_cloud: {
    name: 'Alibaba Cloud',
    description: 'Connect Alibaba Cloud for resource discovery and compliance',
    category: 'Cloud Infrastructure',
    iconSlug: 'alibaba_cloud',
    apiDocs: 'https://www.alibabacloud.com/help/en/api-overview',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
      { key: 'accessKeySecret', label: 'Access Key Secret', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'ecs', label: 'ECS Instances', description: 'Compute instances', defaultEnabled: true },
      { key: 'ram', label: 'RAM', description: 'Access control', defaultEnabled: true },
    ],
  },
  linode: {
    name: 'Linode (Akamai)',
    description: 'Monitor Linode instances and Kubernetes clusters',
    category: 'Cloud Infrastructure',
    iconSlug: 'linode',
    apiDocs: 'https://www.linode.com/docs/api/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'Personal Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'linodes', label: 'Linodes', description: 'VM instances', defaultEnabled: true },
      { key: 'lke', label: 'LKE Clusters', description: 'Kubernetes clusters', defaultEnabled: true },
    ],
  },
  vultr: {
    name: 'Vultr',
    description: 'Track Vultr cloud instances and resources',
    category: 'Cloud Infrastructure',
    iconSlug: 'vultr',
    apiDocs: 'https://www.vultr.com/api/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'instances', label: 'Instances', description: 'Cloud instances', defaultEnabled: true },
      { key: 'kubernetes', label: 'Kubernetes', description: 'VKE clusters', defaultEnabled: true },
    ],
  },
  heroku: {
    name: 'Heroku',
    description: 'Monitor Heroku applications, dynos, and add-ons',
    category: 'Cloud Infrastructure',
    iconSlug: 'heroku',
    apiDocs: 'https://devcenter.heroku.com/articles/platform-api-reference',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'apps', label: 'Applications', description: 'Heroku apps', defaultEnabled: true },
      { key: 'addons', label: 'Add-ons', description: 'Installed add-ons', defaultEnabled: true },
      { key: 'collaborators', label: 'Collaborators', description: 'App access', defaultEnabled: true },
    ],
  },
  vercel: {
    name: 'Vercel',
    description: 'Connect Vercel for deployment monitoring and project management',
    category: 'Cloud Infrastructure',
    iconSlug: 'vercel',
    apiDocs: 'https://vercel.com/docs/rest-api',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'teamId', label: 'Team ID (Optional)', type: 'text', required: false },
    ],
    evidenceTypes: [
      { key: 'projects', label: 'Projects', description: 'Vercel projects', defaultEnabled: true },
      { key: 'deployments', label: 'Deployments', description: 'Deployment history', defaultEnabled: true },
      { key: 'members', label: 'Team Members', description: 'Team access', defaultEnabled: true },
    ],
  },
  netlify: {
    name: 'Netlify',
    description: 'Monitor Netlify sites, builds, and serverless functions',
    category: 'Cloud Infrastructure',
    iconSlug: 'netlify',
    apiDocs: 'https://docs.netlify.com/api/get-started/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'accessToken', label: 'Personal Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'sites', label: 'Sites', description: 'Netlify sites', defaultEnabled: true },
      { key: 'builds', label: 'Builds', description: 'Build history', defaultEnabled: true },
    ],
  },
  render: {
    name: 'Render',
    description: 'Track Render services, databases, and deployments',
    category: 'Cloud Infrastructure',
    iconSlug: 'render',
    apiDocs: 'https://api-docs.render.com/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'services', label: 'Services', description: 'Render services', defaultEnabled: true },
      { key: 'databases', label: 'Databases', description: 'Managed databases', defaultEnabled: true },
    ],
  },
  hetzner: {
    name: 'Hetzner',
    description: 'Monitor Hetzner Cloud servers and resources',
    category: 'Cloud Infrastructure',
    iconSlug: 'hetzner',
    apiDocs: 'https://docs.hetzner.cloud/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'servers', label: 'Servers', description: 'Cloud servers', defaultEnabled: true },
      { key: 'firewalls', label: 'Firewalls', description: 'Firewall rules', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL DEVELOPER TOOLS
  // ============================================
  bitbucket: {
    name: 'Bitbucket',
    description: 'Connect Bitbucket for repository security and access management',
    category: 'Developer Tools',
    iconSlug: 'bitbucket',
    apiDocs: 'https://developer.atlassian.com/cloud/bitbucket/rest/intro/',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'appPassword', label: 'App Password', type: 'password', required: true },
      { key: 'workspace', label: 'Workspace', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'repositories', label: 'Repositories', description: 'Repository list', defaultEnabled: true },
      { key: 'branch_restrictions', label: 'Branch Restrictions', description: 'Branch protection', defaultEnabled: true },
      { key: 'workspace_members', label: 'Workspace Members', description: 'Member access', defaultEnabled: true },
    ],
  },
  docker_hub: {
    name: 'Docker Hub',
    description: 'Monitor container images and vulnerability scanning results',
    category: 'Developer Tools',
    iconSlug: 'docker_hub',
    apiDocs: 'https://docs.docker.com/docker-hub/api/latest/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'accessToken', label: 'Personal Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'repositories', label: 'Repositories', description: 'Image repositories', defaultEnabled: true },
      { key: 'scan_results', label: 'Scan Results', description: 'Vulnerability scans', defaultEnabled: true },
    ],
  },
  jenkins: {
    name: 'Jenkins',
    description: 'Integrate Jenkins for build pipeline security and job monitoring',
    category: 'Developer Tools',
    iconSlug: 'jenkins',
    apiDocs: 'https://www.jenkins.io/doc/book/using/remote-access-api/',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Jenkins URL', type: 'url', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'jobs', label: 'Jobs', description: 'Build jobs', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Jenkins users', defaultEnabled: true },
      { key: 'plugins', label: 'Plugins', description: 'Installed plugins', defaultEnabled: true },
    ],
  },
  circleci: {
    name: 'CircleCI',
    description: 'Connect CircleCI for pipeline security and audit logs',
    category: 'Developer Tools',
    iconSlug: 'circleci',
    apiDocs: 'https://circleci.com/docs/api/v2/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'Personal API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'projects', label: 'Projects', description: 'CircleCI projects', defaultEnabled: true },
      { key: 'pipelines', label: 'Pipelines', description: 'Pipeline runs', defaultEnabled: true },
      { key: 'contexts', label: 'Contexts', description: 'Environment contexts', defaultEnabled: true },
    ],
  },
  travis_ci: {
    name: 'Travis CI',
    description: 'Monitor Travis CI builds and security configurations',
    category: 'Developer Tools',
    iconSlug: 'travis_ci',
    apiDocs: 'https://developer.travis-ci.com/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'repositories', label: 'Repositories', description: 'Connected repos', defaultEnabled: true },
      { key: 'builds', label: 'Builds', description: 'Build history', defaultEnabled: true },
    ],
  },
  azure_devops: {
    name: 'Azure DevOps',
    description: 'Integrate Azure DevOps for repos, pipelines, and boards',
    category: 'Developer Tools',
    iconSlug: 'azure_devops',
    apiDocs: 'https://docs.microsoft.com/en-us/rest/api/azure/devops/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'organization', label: 'Organization', type: 'text', required: true },
      { key: 'pat', label: 'Personal Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'projects', label: 'Projects', description: 'DevOps projects', defaultEnabled: true },
      { key: 'repositories', label: 'Repositories', description: 'Git repos', defaultEnabled: true },
      { key: 'pipelines', label: 'Pipelines', description: 'Build/release pipelines', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Organization users', defaultEnabled: true },
    ],
  },
  jfrog: {
    name: 'JFrog Artifactory',
    description: 'Connect JFrog for artifact security and Xray scanning',
    category: 'Developer Tools',
    iconSlug: 'jfrog',
    apiDocs: 'https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Artifactory URL', type: 'url', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'repositories', label: 'Repositories', description: 'Artifact repos', defaultEnabled: true },
      { key: 'xray_scans', label: 'Xray Scans', description: 'Security scans', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Artifactory users', defaultEnabled: true },
    ],
  },
  sonarqube: {
    name: 'SonarQube',
    description: 'Connect SonarQube for code quality and vulnerability scanning',
    category: 'Developer Tools',
    iconSlug: 'sonarqube',
    apiDocs: 'https://docs.sonarqube.org/latest/extension-guide/web-api/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'SonarQube URL', type: 'url', required: true },
      { key: 'token', label: 'User Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'projects', label: 'Projects', description: 'Analyzed projects', defaultEnabled: true },
      { key: 'issues', label: 'Issues', description: 'Code issues', defaultEnabled: true },
      { key: 'quality_gates', label: 'Quality Gates', description: 'Gate status', defaultEnabled: true },
    ],
  },
  pagerduty: {
    name: 'PagerDuty',
    description: 'Integrate PagerDuty for incident management and on-call schedules',
    category: 'Developer Tools',
    iconSlug: 'pagerduty',
    apiDocs: 'https://developer.pagerduty.com/api-reference/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'services', label: 'Services', description: 'PagerDuty services', defaultEnabled: true },
      { key: 'incidents', label: 'Incidents', description: 'Incident history', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'User accounts', defaultEnabled: true },
      { key: 'schedules', label: 'Schedules', description: 'On-call schedules', defaultEnabled: true },
    ],
  },
  incidentio: {
    name: 'incident.io',
    description: 'Connect incident.io for comprehensive incident management, post-incident reviews, status pages, and on-call scheduling evidence',
    category: 'Incident Management',
    iconSlug: 'incidentio',
    apiDocs: 'https://api-docs.incident.io/',
    authType: 'api_key',
    webhookSupport: true,
    syncFrequencies: ['realtime', 'hourly', 'daily', 'weekly'],
    configFields: [
      { 
        key: 'apiKey', 
        label: 'API Key', 
        type: 'password', 
        required: true, 
        placeholder: 'inc_api_...',
        helpText: 'Generate an API key from Settings > API Keys in incident.io'
      },
      { 
        key: 'organizationId', 
        label: 'Organization ID', 
        type: 'text', 
        required: false,
        placeholder: 'org_...',
        helpText: 'Optional: Specify organization ID for multi-org setups'
      },
      { 
        key: 'webhookSecret', 
        label: 'Webhook Secret', 
        type: 'password', 
        required: false,
        placeholder: 'whsec_...',
        helpText: 'Optional: For real-time incident notifications'
      },
      {
        key: 'includeSeverities',
        label: 'Severity Filter',
        type: 'select',
        required: false,
        options: [
          { value: 'all', label: 'All Severities' },
          { value: 'sev0_only', label: 'SEV0 Only (Critical)' },
          { value: 'sev0_sev1', label: 'SEV0 & SEV1 (Critical & High)' },
          { value: 'sev0_sev1_sev2', label: 'SEV0, SEV1 & SEV2' },
        ],
        helpText: 'Filter incidents by severity level'
      },
      {
        key: 'lookbackDays',
        label: 'Historical Data (Days)',
        type: 'select',
        required: false,
        options: [
          { value: '30', label: 'Last 30 days' },
          { value: '90', label: 'Last 90 days' },
          { value: '180', label: 'Last 180 days' },
          { value: '365', label: 'Last 365 days' },
          { value: 'all', label: 'All historical data' },
        ],
        helpText: 'How far back to sync incident data'
      },
    ],
    evidenceTypes: [
      { 
        key: 'incidents', 
        label: 'Incidents', 
        description: 'Active and resolved incidents with timeline, severity, status, and metadata', 
        defaultEnabled: true 
      },
      { 
        key: 'incident_updates', 
        label: 'Incident Updates', 
        description: 'Status updates and communications during incidents', 
        defaultEnabled: true 
      },
      { 
        key: 'incident_roles', 
        label: 'Incident Roles', 
        description: 'Role assignments (Incident Lead, Communications Lead, etc.)', 
        defaultEnabled: true 
      },
      { 
        key: 'incident_timestamps', 
        label: 'Incident Timestamps', 
        description: 'Key timestamps (detected, acknowledged, mitigated, resolved)', 
        defaultEnabled: true 
      },
      { 
        key: 'post_incident_reviews', 
        label: 'Post-Incident Reviews (PIRs)', 
        description: 'Retrospectives, root cause analysis, and follow-up actions', 
        defaultEnabled: true 
      },
      { 
        key: 'follow_up_actions', 
        label: 'Follow-up Actions', 
        description: 'Action items from incidents and their completion status', 
        defaultEnabled: true 
      },
      { 
        key: 'severities', 
        label: 'Severity Definitions', 
        description: 'Configured severity levels and their criteria', 
        defaultEnabled: true 
      },
      { 
        key: 'incident_types', 
        label: 'Incident Types', 
        description: 'Categorization of incidents (Security, Infrastructure, etc.)', 
        defaultEnabled: true 
      },
      { 
        key: 'status_pages', 
        label: 'Status Pages', 
        description: 'Public and internal status page configurations', 
        defaultEnabled: true 
      },
      { 
        key: 'status_page_incidents', 
        label: 'Status Page Incidents', 
        description: 'Incidents published to status pages', 
        defaultEnabled: true 
      },
      { 
        key: 'on_call_schedules', 
        label: 'On-Call Schedules', 
        description: 'On-call rotation schedules and escalation policies', 
        defaultEnabled: true 
      },
      { 
        key: 'on_call_shifts', 
        label: 'On-Call Shifts', 
        description: 'Historical and upcoming on-call shift assignments', 
        defaultEnabled: true 
      },
      { 
        key: 'escalation_paths', 
        label: 'Escalation Paths', 
        description: 'Configured escalation policies and notification rules', 
        defaultEnabled: true 
      },
      { 
        key: 'users', 
        label: 'Users', 
        description: 'User accounts and their roles in incident response', 
        defaultEnabled: true 
      },
      { 
        key: 'teams', 
        label: 'Teams', 
        description: 'Team structures and responsibilities', 
        defaultEnabled: false 
      },
      { 
        key: 'custom_fields', 
        label: 'Custom Fields', 
        description: 'Custom field definitions and values for incidents', 
        defaultEnabled: false 
      },
      { 
        key: 'workflows', 
        label: 'Workflows', 
        description: 'Automated incident workflows and their configurations', 
        defaultEnabled: false 
      },
      { 
        key: 'metrics', 
        label: 'Incident Metrics', 
        description: 'MTTR, MTTA, incident frequency, and other KPIs', 
        defaultEnabled: true 
      },
      { 
        key: 'audit_logs', 
        label: 'Audit Logs', 
        description: 'Administrative actions and configuration changes', 
        defaultEnabled: false 
      },
    ],
  },
  sentry: {
    name: 'Sentry',
    description: 'Connect Sentry for error tracking and security event monitoring',
    category: 'Developer Tools',
    iconSlug: 'sentry',
    apiDocs: 'https://docs.sentry.io/api/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
      { key: 'organization', label: 'Organization Slug', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'projects', label: 'Projects', description: 'Sentry projects', defaultEnabled: true },
      { key: 'issues', label: 'Issues', description: 'Error issues', defaultEnabled: true },
      { key: 'members', label: 'Members', description: 'Org members', defaultEnabled: true },
    ],
  },
  launchdarkly: {
    name: 'LaunchDarkly',
    description: 'Monitor feature flags and access controls',
    category: 'Developer Tools',
    iconSlug: 'launchdarkly',
    apiDocs: 'https://apidocs.launchdarkly.com/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'projects', label: 'Projects', description: 'LD projects', defaultEnabled: true },
      { key: 'flags', label: 'Feature Flags', description: 'Flag configurations', defaultEnabled: true },
      { key: 'members', label: 'Members', description: 'Team members', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL IDENTITY PROVIDERS
  // ============================================
  onelogin: {
    name: 'OneLogin',
    description: 'Integrate OneLogin for SSO and user lifecycle management',
    category: 'Identity Providers',
    iconSlug: 'onelogin',
    apiDocs: 'https://developers.onelogin.com/',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'select', required: true, options: [
        { value: 'us', label: 'United States' },
        { value: 'eu', label: 'Europe' },
      ]},
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'User accounts', defaultEnabled: true },
      { key: 'apps', label: 'Applications', description: 'SSO apps', defaultEnabled: true },
      { key: 'events', label: 'Events', description: 'Audit events', defaultEnabled: true },
    ],
  },
  auth0: {
    name: 'Auth0',
    description: 'Connect Auth0 for authentication and user management',
    category: 'Identity Providers',
    iconSlug: 'auth0',
    apiDocs: 'https://auth0.com/docs/api',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'domain', label: 'Domain', type: 'text', required: true, placeholder: 'your-tenant.auth0.com' },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'User accounts', defaultEnabled: true },
      { key: 'applications', label: 'Applications', description: 'Auth0 apps', defaultEnabled: true },
      { key: 'connections', label: 'Connections', description: 'Identity connections', defaultEnabled: true },
      { key: 'logs', label: 'Logs', description: 'Auth logs', defaultEnabled: true },
    ],
  },
  ping_identity: {
    name: 'Ping Identity',
    description: 'Integrate Ping Identity for enterprise SSO and access management',
    category: 'Identity Providers',
    iconSlug: 'ping_identity',
    apiDocs: 'https://apidocs.pingidentity.com/',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'environmentId', label: 'Environment ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'User accounts', defaultEnabled: true },
      { key: 'applications', label: 'Applications', description: 'SSO apps', defaultEnabled: true },
    ],
  },
  jumpcloud: {
    name: 'JumpCloud',
    description: 'Connect JumpCloud for directory services and device management',
    category: 'Identity Providers',
    iconSlug: 'jumpcloud',
    apiDocs: 'https://docs.jumpcloud.com/api/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'orgId', label: 'Organization ID (Optional)', type: 'text', required: false },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Directory users', defaultEnabled: true },
      { key: 'systems', label: 'Systems', description: 'Managed devices', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'User groups', defaultEnabled: true },
      { key: 'applications', label: 'Applications', description: 'SSO apps', defaultEnabled: true },
    ],
  },
  duo_security: {
    name: 'Duo Security',
    description: 'Integrate Duo for MFA and access device insights',
    category: 'Identity Providers',
    iconSlug: 'duo_security',
    apiDocs: 'https://duo.com/docs/adminapi',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
      { key: 'apiHostname', label: 'API Hostname', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Duo users', defaultEnabled: true },
      { key: 'devices', label: 'Devices', description: 'Auth devices', defaultEnabled: true },
      { key: 'auth_logs', label: 'Auth Logs', description: 'Authentication logs', defaultEnabled: true },
    ],
  },
  lastpass: {
    name: 'LastPass',
    description: 'Connect LastPass for password management and security score',
    category: 'Identity Providers',
    iconSlug: 'lastpass',
    apiDocs: 'https://support.lastpass.com/help/use-the-lastpass-provisioning-api',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'accountId', label: 'Account ID', type: 'text', required: true },
      { key: 'provisioningHash', label: 'Provisioning Hash', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'LastPass users', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'User groups', defaultEnabled: true },
      { key: 'security_score', label: 'Security Score', description: 'Password security', defaultEnabled: true },
    ],
  },
  one_password: {
    name: '1Password',
    description: 'Integrate 1Password for team password security and breach monitoring',
    category: 'Identity Providers',
    iconSlug: 'one_password',
    apiDocs: 'https://developer.1password.com/docs/events-api/',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Team members', defaultEnabled: true },
      { key: 'vaults', label: 'Vaults', description: 'Shared vaults', defaultEnabled: true },
      { key: 'events', label: 'Events', description: 'Activity events', defaultEnabled: true },
    ],
  },
  cyberark: {
    name: 'CyberArk',
    description: 'Connect CyberArk for privileged access management',
    category: 'Identity Providers',
    iconSlug: 'cyberark',
    apiDocs: 'https://docs.cyberark.com/Product-Doc/OnlineHelp/PAS/Latest/en/Content/WebServices/Implementing%20Privileged%20Account%20Security%20Web%20Services%20.htm',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'PVWA URL', type: 'url', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'accounts', label: 'Privileged Accounts', description: 'Managed accounts', defaultEnabled: true },
      { key: 'safes', label: 'Safes', description: 'Credential safes', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'PAM users', defaultEnabled: true },
    ],
  },
  keycloak: {
    name: 'Keycloak',
    description: 'Integrate Keycloak for open source identity management',
    category: 'Identity Providers',
    iconSlug: 'keycloak',
    apiDocs: 'https://www.keycloak.org/docs-api/latest/rest-api/',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Keycloak URL', type: 'url', required: true },
      { key: 'realm', label: 'Realm', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Realm users', defaultEnabled: true },
      { key: 'clients', label: 'Clients', description: 'OIDC clients', defaultEnabled: true },
      { key: 'roles', label: 'Roles', description: 'Realm roles', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL MDM
  // ============================================
  vmware_workspace_one: {
    name: 'VMware Workspace ONE',
    description: 'Connect Workspace ONE for unified endpoint management',
    category: 'MDM',
    iconSlug: 'vmware_workspace_one',
    apiDocs: 'https://docs.vmware.com/en/VMware-Workspace-ONE-UEM/services/UEM_ConsoleBasics/GUID-REST-APIs.html',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'device_inventory', label: 'Device Inventory', description: 'Complete device inventory', defaultEnabled: true },
      { key: 'device_assignments', label: 'Device Assignments', description: 'Device to user assignments', defaultEnabled: true },
      { key: 'device_compliance', label: 'Device Compliance', description: 'Compliance status per device', defaultEnabled: true },
      { key: 'managed_apps', label: 'Managed Apps', description: 'Application deployments', defaultEnabled: true },
    ],
  },
  kandji: {
    name: 'Kandji',
    description: 'Connect Kandji for Apple device management and compliance',
    category: 'MDM',
    iconSlug: 'kandji',
    apiDocs: 'https://api.kandji.io/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'subdomain', label: 'Subdomain', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'device_inventory', label: 'Device Inventory', description: 'Apple device inventory', defaultEnabled: true },
      { key: 'device_assignments', label: 'Device Assignments', description: 'Device to user assignments', defaultEnabled: true },
      { key: 'device_compliance', label: 'Device Compliance', description: 'Compliance status per device', defaultEnabled: true },
      { key: 'blueprints', label: 'Blueprints', description: 'Device blueprints', defaultEnabled: false },
    ],
  },
  mosyle: {
    name: 'Mosyle',
    description: 'Connect Mosyle for Apple device management in education and business',
    category: 'MDM',
    iconSlug: 'mosyle',
    apiDocs: 'https://mosyle.com/documentation',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'device_inventory', label: 'Device Inventory', description: 'Device inventory', defaultEnabled: true },
      { key: 'device_assignments', label: 'Device Assignments', description: 'Device to user assignments', defaultEnabled: true },
      { key: 'device_compliance', label: 'Device Compliance', description: 'Compliance status', defaultEnabled: true },
    ],
  },

  // ============================================
  // WORKFLOW MANAGEMENT
  // ============================================
  asana: {
    name: 'Asana',
    description: 'Integrate Asana for task management and workflow tracking',
    category: 'Workflow Management',
    iconSlug: 'asana',
    apiDocs: 'https://developers.asana.com/docs',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'accessToken', label: 'Personal Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'workspaces', label: 'Workspaces', description: 'Asana workspaces', defaultEnabled: true },
      { key: 'projects', label: 'Projects', description: 'Project list', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Workspace members', defaultEnabled: true },
    ],
  },
  trello: {
    name: 'Trello',
    description: 'Connect Trello boards for task and project visibility',
    category: 'Workflow Management',
    iconSlug: 'trello',
    apiDocs: 'https://developer.atlassian.com/cloud/trello/rest/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'text', required: true },
      { key: 'token', label: 'Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'boards', label: 'Boards', description: 'Trello boards', defaultEnabled: true },
      { key: 'members', label: 'Members', description: 'Board members', defaultEnabled: true },
    ],
  },
  monday: {
    name: 'Monday.com',
    description: 'Integrate Monday.com for work management and reporting',
    category: 'Workflow Management',
    iconSlug: 'monday',
    apiDocs: 'https://developer.monday.com/api-reference/docs',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'boards', label: 'Boards', description: 'Monday boards', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Account users', defaultEnabled: true },
    ],
  },
  clickup: {
    name: 'ClickUp',
    description: 'Connect ClickUp for project and task management',
    category: 'Workflow Management',
    iconSlug: 'clickup',
    apiDocs: 'https://clickup.com/api',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'workspaces', label: 'Workspaces', description: 'ClickUp workspaces', defaultEnabled: true },
      { key: 'spaces', label: 'Spaces', description: 'Workspace spaces', defaultEnabled: true },
      { key: 'members', label: 'Members', description: 'Workspace members', defaultEnabled: true },
    ],
  },
  linear: {
    name: 'Linear',
    description: 'Integrate Linear for issue tracking and project planning',
    category: 'Workflow Management',
    iconSlug: 'linear',
    apiDocs: 'https://developers.linear.app/docs/graphql/working-with-the-graphql-api',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'teams', label: 'Teams', description: 'Linear teams', defaultEnabled: true },
      { key: 'projects', label: 'Projects', description: 'Team projects', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Organization users', defaultEnabled: true },
    ],
  },
  notion: {
    name: 'Notion',
    description: 'Integrate Notion for workspace and documentation management',
    category: 'Workflow Management',
    iconSlug: 'notion',
    apiDocs: 'https://developers.notion.com/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'Integration Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Workspace users', defaultEnabled: true },
      { key: 'databases', label: 'Databases', description: 'Notion databases', defaultEnabled: true },
      { key: 'pages', label: 'Pages', description: 'Workspace pages', defaultEnabled: false },
    ],
  },
  airtable: {
    name: 'Airtable',
    description: 'Integrate Airtable for flexible data management',
    category: 'Workflow Management',
    iconSlug: 'airtable',
    apiDocs: 'https://airtable.com/developers/web/api/introduction',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'Personal Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'bases', label: 'Bases', description: 'Airtable bases', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Workspace users', defaultEnabled: true },
    ],
  },
  smartsheet: {
    name: 'Smartsheet',
    description: 'Connect Smartsheet for work management and reporting',
    category: 'Workflow Management',
    iconSlug: 'smartsheet',
    apiDocs: 'https://smartsheet.redoc.ly/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'sheets', label: 'Sheets', description: 'Smartsheet sheets', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Account users', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL COLLABORATION
  // ============================================
  microsoft_teams: {
    name: 'Microsoft Teams',
    description: 'Integrate Teams for collaboration and communication compliance',
    category: 'Collaboration',
    iconSlug: 'microsoft_teams',
    apiDocs: 'https://docs.microsoft.com/en-us/graph/teams-concept-overview',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'teams', label: 'Teams', description: 'Teams list', defaultEnabled: true },
      { key: 'channels', label: 'Channels', description: 'Team channels', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Team members', defaultEnabled: true },
      { key: 'apps', label: 'Apps', description: 'Installed apps', defaultEnabled: true },
    ],
  },
  zoom: {
    name: 'Zoom',
    description: 'Connect Zoom for meeting security and recording management',
    category: 'Collaboration',
    iconSlug: 'zoom',
    apiDocs: 'https://developers.zoom.us/docs/api/',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'accountId', label: 'Account ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Zoom users', defaultEnabled: true },
      { key: 'meetings', label: 'Meetings', description: 'Meeting settings', defaultEnabled: true },
      { key: 'recordings', label: 'Recordings', description: 'Cloud recordings', defaultEnabled: false },
    ],
  },
  discord: {
    name: 'Discord',
    description: 'Connect Discord for community communication monitoring',
    category: 'Collaboration',
    iconSlug: 'discord',
    apiDocs: 'https://discord.com/developers/docs/intro',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
      { key: 'guildId', label: 'Server (Guild) ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'members', label: 'Members', description: 'Server members', defaultEnabled: true },
      { key: 'roles', label: 'Roles', description: 'Server roles', defaultEnabled: true },
      { key: 'channels', label: 'Channels', description: 'Server channels', defaultEnabled: true },
    ],
  },
  webex: {
    name: 'Webex',
    description: 'Integrate Cisco Webex for enterprise collaboration',
    category: 'Collaboration',
    iconSlug: 'webex',
    apiDocs: 'https://developer.webex.com/docs/api/getting-started',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'people', label: 'People', description: 'Org members', defaultEnabled: true },
      { key: 'rooms', label: 'Spaces', description: 'Webex spaces', defaultEnabled: true },
    ],
  },
  mattermost: {
    name: 'Mattermost',
    description: 'Connect Mattermost for secure team messaging',
    category: 'Collaboration',
    iconSlug: 'mattermost',
    apiDocs: 'https://api.mattermost.com/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Mattermost URL', type: 'url', required: true },
      { key: 'accessToken', label: 'Personal Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Server users', defaultEnabled: true },
      { key: 'teams', label: 'Teams', description: 'Server teams', defaultEnabled: true },
      { key: 'channels', label: 'Channels', description: 'Team channels', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL CYBERSECURITY
  // ============================================
  wiz: {
    name: 'Wiz',
    description: 'Integrate Wiz for cloud security posture management',
    category: 'Cybersecurity',
    iconSlug: 'wiz',
    apiDocs: 'https://docs.wiz.io/wiz-docs/docs/using-the-wiz-api',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'apiEndpoint', label: 'API Endpoint', type: 'url', required: true },
    ],
    evidenceTypes: [
      { key: 'issues', label: 'Issues', description: 'Security issues', defaultEnabled: true },
      { key: 'inventory', label: 'Cloud Inventory', description: 'Cloud resources', defaultEnabled: true },
      { key: 'vulnerabilities', label: 'Vulnerabilities', description: 'CVE findings', defaultEnabled: true },
    ],
  },
  rapid7: {
    name: 'Rapid7',
    description: 'Connect Rapid7 for vulnerability management and SIEM',
    category: 'Cybersecurity',
    iconSlug: 'rapid7',
    apiDocs: 'https://help.rapid7.com/insightvm/en-us/api/index.html',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Console URL', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'assets', label: 'Assets', description: 'Discovered assets', defaultEnabled: true },
      { key: 'vulnerabilities', label: 'Vulnerabilities', description: 'Vuln findings', defaultEnabled: true },
      { key: 'scans', label: 'Scans', description: 'Scan results', defaultEnabled: true },
    ],
  },
  tenable: {
    name: 'Tenable',
    description: 'Integrate Tenable for vulnerability scanning and management',
    category: 'Cybersecurity',
    iconSlug: 'tenable',
    apiDocs: 'https://developer.tenable.com/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'accessKey', label: 'Access Key', type: 'text', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'assets', label: 'Assets', description: 'Discovered assets', defaultEnabled: true },
      { key: 'vulnerabilities', label: 'Vulnerabilities', description: 'Vuln findings', defaultEnabled: true },
      { key: 'scans', label: 'Scans', description: 'Scan configurations', defaultEnabled: true },
    ],
  },
  qualys: {
    name: 'Qualys',
    description: 'Connect Qualys for vulnerability and compliance scanning',
    category: 'Cybersecurity',
    iconSlug: 'qualys',
    apiDocs: 'https://www.qualys.com/docs/qualys-api-vmpc-user-guide.pdf',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'url', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'assets', label: 'Assets', description: 'Host assets', defaultEnabled: true },
      { key: 'vulnerabilities', label: 'Vulnerabilities', description: 'Vuln detections', defaultEnabled: true },
      { key: 'compliance', label: 'Compliance', description: 'Policy compliance', defaultEnabled: true },
    ],
  },
  sentinelone: {
    name: 'SentinelOne',
    description: 'Connect SentinelOne for autonomous endpoint protection',
    category: 'Cybersecurity',
    iconSlug: 'sentinelone',
    apiDocs: 'https://usea1-partners.sentinelone.net/api-doc/overview',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Console URL', type: 'url', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'agents', label: 'Agents', description: 'Endpoint agents', defaultEnabled: true },
      { key: 'threats', label: 'Threats', description: 'Detected threats', defaultEnabled: true },
      { key: 'vulnerabilities', label: 'Vulnerabilities', description: 'App vulnerabilities', defaultEnabled: true },
    ],
  },
  palo_alto: {
    name: 'Palo Alto Networks',
    description: 'Connect Palo Alto for firewall and security management',
    category: 'Cybersecurity',
    iconSlug: 'palo_alto',
    apiDocs: 'https://pan.dev/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Firewall/Panorama URL', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'security_rules', label: 'Security Rules', description: 'Firewall rules', defaultEnabled: true },
      { key: 'threats', label: 'Threats', description: 'Threat logs', defaultEnabled: true },
    ],
  },
  fortinet: {
    name: 'Fortinet',
    description: 'Integrate Fortinet for network security and firewall management',
    category: 'Cybersecurity',
    iconSlug: 'fortinet',
    apiDocs: 'https://docs.fortinet.com/product/fortigate/7.4',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'FortiGate URL', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'policies', label: 'Firewall Policies', description: 'Security policies', defaultEnabled: true },
      { key: 'threats', label: 'Threats', description: 'Detected threats', defaultEnabled: true },
    ],
  },
  lacework: {
    name: 'Lacework',
    description: 'Integrate Lacework for cloud security and compliance',
    category: 'Cybersecurity',
    iconSlug: 'lacework',
    apiDocs: 'https://docs.lacework.net/api/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'account', label: 'Account Name', type: 'text', required: true },
      { key: 'keyId', label: 'API Key ID', type: 'text', required: true },
      { key: 'secret', label: 'API Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'alerts', label: 'Alerts', description: 'Security alerts', defaultEnabled: true },
      { key: 'compliance', label: 'Compliance', description: 'Compliance reports', defaultEnabled: true },
      { key: 'vulnerabilities', label: 'Vulnerabilities', description: 'CVE findings', defaultEnabled: true },
    ],
  },
  orca_security: {
    name: 'Orca Security',
    description: 'Connect Orca for agentless cloud security',
    category: 'Cybersecurity',
    iconSlug: 'orca_security',
    apiDocs: 'https://docs.orcasecurity.io/docs/api-reference',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'alerts', label: 'Alerts', description: 'Security alerts', defaultEnabled: true },
      { key: 'assets', label: 'Assets', description: 'Cloud assets', defaultEnabled: true },
    ],
  },
  checkmarx: {
    name: 'Checkmarx',
    description: 'Connect Checkmarx for application security testing',
    category: 'Cybersecurity',
    iconSlug: 'checkmarx',
    apiDocs: 'https://checkmarx.com/resource/documents/en/34965-19059-checkmarx-one-api-reference-guide.html',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Checkmarx URL', type: 'url', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'projects', label: 'Projects', description: 'Scanned projects', defaultEnabled: true },
      { key: 'scans', label: 'Scans', description: 'Scan results', defaultEnabled: true },
      { key: 'vulnerabilities', label: 'Vulnerabilities', description: 'Code vulnerabilities', defaultEnabled: true },
    ],
  },
  prisma_cloud: {
    name: 'Prisma Cloud',
    description: 'Integrate Palo Alto Prisma Cloud for cloud security',
    category: 'Cybersecurity',
    iconSlug: 'prisma_cloud',
    apiDocs: 'https://pan.dev/prisma-cloud/api/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'url', required: true },
      { key: 'accessKey', label: 'Access Key', type: 'text', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'alerts', label: 'Alerts', description: 'Security alerts', defaultEnabled: true },
      { key: 'assets', label: 'Assets', description: 'Cloud assets', defaultEnabled: true },
      { key: 'compliance', label: 'Compliance', description: 'Compliance status', defaultEnabled: true },
    ],
  },
  veracode: {
    name: 'Veracode',
    description: 'Connect Veracode for application security testing',
    category: 'Cybersecurity',
    iconSlug: 'veracode',
    apiDocs: 'https://docs.veracode.com/r/c_gettingstarted',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiId', label: 'API ID', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'applications', label: 'Applications', description: 'Scanned apps', defaultEnabled: true },
      { key: 'findings', label: 'Findings', description: 'Security findings', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL CRM & SUPPORT
  // ============================================
  hubspot: {
    name: 'HubSpot',
    description: 'Integrate HubSpot for marketing and sales compliance',
    category: 'CRM & Support',
    iconSlug: 'hubspot',
    apiDocs: 'https://developers.hubspot.com/docs/api/overview',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'accessToken', label: 'Private App Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Portal users', defaultEnabled: true },
      { key: 'contacts', label: 'Contacts', description: 'Contact records', defaultEnabled: false },
      { key: 'audit_logs', label: 'Audit Logs', description: 'Activity logs', defaultEnabled: true },
    ],
  },
  zendesk: {
    name: 'Zendesk',
    description: 'Connect Zendesk for support ticket management and access control',
    category: 'CRM & Support',
    iconSlug: 'zendesk',
    apiDocs: 'https://developer.zendesk.com/api-reference/',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'subdomain', label: 'Subdomain', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Agent users', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'Agent groups', defaultEnabled: true },
      { key: 'tickets', label: 'Tickets', description: 'Support tickets', defaultEnabled: false },
    ],
  },
  freshdesk: {
    name: 'Freshdesk',
    description: 'Connect Freshdesk for customer support management',
    category: 'CRM & Support',
    iconSlug: 'freshdesk',
    apiDocs: 'https://developers.freshdesk.com/api/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'domain', label: 'Domain', type: 'text', required: true, placeholder: 'yourcompany.freshdesk.com' },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'agents', label: 'Agents', description: 'Support agents', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'Agent groups', defaultEnabled: true },
    ],
  },
  intercom: {
    name: 'Intercom',
    description: 'Integrate Intercom for customer messaging and support',
    category: 'CRM & Support',
    iconSlug: 'intercom',
    apiDocs: 'https://developers.intercom.com/docs/build-an-integration/learn-more/rest-apis/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'admins', label: 'Admins', description: 'Team members', defaultEnabled: true },
      { key: 'teams', label: 'Teams', description: 'Team structure', defaultEnabled: true },
    ],
  },

  // ============================================
  // FINANCIAL TOOLS
  // ============================================
  stripe: {
    name: 'Stripe',
    description: 'Connect Stripe for payment processing and compliance',
    category: 'Financial Tools',
    iconSlug: 'stripe',
    apiDocs: 'https://stripe.com/docs/api',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'accounts', label: 'Account Info', description: 'Account settings', defaultEnabled: true },
      { key: 'team', label: 'Team Members', description: 'Dashboard users', defaultEnabled: true },
    ],
  },
  quickbooks: {
    name: 'QuickBooks',
    description: 'Integrate QuickBooks for accounting and financial management',
    category: 'Financial Tools',
    iconSlug: 'quickbooks',
    apiDocs: 'https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'realmId', label: 'Company ID', type: 'text', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'company_info', label: 'Company Info', description: 'Company settings', defaultEnabled: true },
      { key: 'accounts', label: 'Chart of Accounts', description: 'Account list', defaultEnabled: true },
    ],
  },
  xero: {
    name: 'Xero',
    description: 'Connect Xero for accounting and bookkeeping',
    category: 'Financial Tools',
    iconSlug: 'xero',
    apiDocs: 'https://developer.xero.com/documentation/api/api-overview',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'organisation', label: 'Organisation', description: 'Org settings', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Xero users', defaultEnabled: true },
    ],
  },
  netsuite: {
    name: 'NetSuite',
    description: 'Connect NetSuite for ERP and financial management',
    category: 'Financial Tools',
    iconSlug: 'netsuite',
    apiDocs: 'https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_N3444729.html',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'accountId', label: 'Account ID', type: 'text', required: true },
      { key: 'consumerKey', label: 'Consumer Key', type: 'text', required: true },
      { key: 'consumerSecret', label: 'Consumer Secret', type: 'password', required: true },
      { key: 'tokenId', label: 'Token ID', type: 'text', required: true },
      { key: 'tokenSecret', label: 'Token Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employees', label: 'Employees', description: 'Employee records', defaultEnabled: true },
      { key: 'roles', label: 'Roles', description: 'User roles', defaultEnabled: true },
    ],
  },
  brex: {
    name: 'Brex',
    description: 'Integrate Brex for corporate card and expense management',
    category: 'Financial Tools',
    iconSlug: 'brex',
    apiDocs: 'https://developer.brex.com/',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Brex users', defaultEnabled: true },
      { key: 'cards', label: 'Cards', description: 'Card inventory', defaultEnabled: true },
    ],
  },
  ramp: {
    name: 'Ramp',
    description: 'Connect Ramp for corporate card and spend management',
    category: 'Financial Tools',
    iconSlug: 'ramp',
    apiDocs: 'https://docs.ramp.com/developer-api/v1/overview',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Ramp users', defaultEnabled: true },
      { key: 'cards', label: 'Cards', description: 'Card inventory', defaultEnabled: true },
    ],
  },
  expensify: {
    name: 'Expensify',
    description: 'Integrate Expensify for expense management',
    category: 'Financial Tools',
    iconSlug: 'expensify',
    apiDocs: 'https://integrations.expensify.com/Integration-Server/doc/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'partnerUserId', label: 'Partner User ID', type: 'text', required: true },
      { key: 'partnerUserSecret', label: 'Partner User Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employees', label: 'Employees', description: 'Policy members', defaultEnabled: true },
      { key: 'policies', label: 'Policies', description: 'Expense policies', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL HR TOOLS
  // ============================================
  gusto: {
    name: 'Gusto',
    description: 'Connect Gusto for payroll and HR services',
    category: 'HR Tools',
    iconSlug: 'gusto',
    apiDocs: 'https://docs.gusto.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employee_roster', label: 'Employee Roster', description: 'Complete employee directory', defaultEnabled: true },
      { key: 'org_chart', label: 'Organization Chart', description: 'Department structure', defaultEnabled: true },
      { key: 'employment_status', label: 'Employment Status', description: 'Employee status tracking', defaultEnabled: true },
      { key: 'onboarding_status', label: 'Onboarding Status', description: 'New hire onboarding', defaultEnabled: true },
    ],
  },
  rippling: {
    name: 'Rippling',
    description: 'Integrate Rippling for HR, IT, and finance management',
    category: 'HR Tools',
    iconSlug: 'rippling',
    apiDocs: 'https://developer.rippling.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employee_roster', label: 'Employee Roster', description: 'Complete employee directory', defaultEnabled: true },
      { key: 'org_chart', label: 'Organization Chart', description: 'Org structure and hierarchy', defaultEnabled: true },
      { key: 'employment_status', label: 'Employment Status', description: 'Employee status tracking', defaultEnabled: true },
      { key: 'onboarding_status', label: 'Onboarding Status', description: 'Onboarding task progress', defaultEnabled: true },
      { key: 'offboarding_status', label: 'Offboarding Status', description: 'Offboarding task progress', defaultEnabled: true },
      { key: 'device_assignments', label: 'Device Assignments', description: 'IT assets assigned to employees', defaultEnabled: true },
      { key: 'app_assignments', label: 'App Assignments', description: 'Applications assigned to employees', defaultEnabled: true },
    ],
  },
  adp: {
    name: 'ADP',
    description: 'Integrate ADP for payroll and workforce management',
    category: 'HR Tools',
    iconSlug: 'adp',
    apiDocs: 'https://developers.adp.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'sslCert', label: 'SSL Certificate', type: 'textarea', required: true },
      { key: 'sslKey', label: 'SSL Private Key', type: 'textarea', required: true },
    ],
    evidenceTypes: [
      { key: 'employee_roster', label: 'Employee Roster', description: 'Complete employee records', defaultEnabled: true },
      { key: 'org_chart', label: 'Organization Chart', description: 'Reporting structure', defaultEnabled: true },
      { key: 'employment_status', label: 'Employment Status', description: 'Employee status tracking', defaultEnabled: true },
    ],
  },
  personio: {
    name: 'Personio',
    description: 'Integrate Personio for HR software and management',
    category: 'HR Tools',
    iconSlug: 'personio',
    apiDocs: 'https://developer.personio.de/reference/introduction',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employee_roster', label: 'Employee Roster', description: 'Complete employee directory', defaultEnabled: true },
      { key: 'org_chart', label: 'Organization Chart', description: 'Department structure', defaultEnabled: true },
      { key: 'employment_status', label: 'Employment Status', description: 'Employee status tracking', defaultEnabled: true },
      { key: 'onboarding_status', label: 'Onboarding Status', description: 'Onboarding checklist progress', defaultEnabled: true },
      { key: 'offboarding_status', label: 'Offboarding Status', description: 'Offboarding process', defaultEnabled: true },
    ],
  },
  hibob: {
    name: 'HiBob',
    description: 'Connect Bob for modern HR platform',
    category: 'HR Tools',
    iconSlug: 'hibob',
    apiDocs: 'https://apidocs.hibob.com/',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'Service User Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employee_roster', label: 'Employee Roster', description: 'Complete employee records', defaultEnabled: true },
      { key: 'org_chart', label: 'Organization Chart', description: 'Org structure', defaultEnabled: true },
      { key: 'employment_status', label: 'Employment Status', description: 'Employee status tracking', defaultEnabled: true },
      { key: 'onboarding_status', label: 'Onboarding Status', description: 'Onboarding workflows', defaultEnabled: true },
    ],
  },
  lattice: {
    name: 'Lattice',
    description: 'Integrate Lattice for performance and engagement',
    category: 'HR Tools',
    iconSlug: 'lattice',
    apiDocs: 'https://developers.lattice.com/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Lattice users', defaultEnabled: true },
      { key: 'reviews', label: 'Reviews', description: 'Performance reviews', defaultEnabled: false },
    ],
  },

  // ============================================
  // KNOWLEDGE MANAGEMENT
  // ============================================
  confluence: {
    name: 'Confluence',
    description: 'Connect Confluence for wiki and documentation management',
    category: 'Knowledge Management',
    iconSlug: 'confluence',
    apiDocs: 'https://developer.atlassian.com/cloud/confluence/rest/v2/intro/',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Confluence URL', type: 'url', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'spaces', label: 'Spaces', description: 'Confluence spaces', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Space users', defaultEnabled: true },
      { key: 'permissions', label: 'Permissions', description: 'Space permissions', defaultEnabled: true },
    ],
  },
  sharepoint: {
    name: 'SharePoint',
    description: 'Connect SharePoint for document management and collaboration',
    category: 'Knowledge Management',
    iconSlug: 'sharepoint',
    apiDocs: 'https://docs.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'siteUrl', label: 'Site URL', type: 'url', required: true },
    ],
    evidenceTypes: [
      { key: 'sites', label: 'Sites', description: 'SharePoint sites', defaultEnabled: true },
      { key: 'permissions', label: 'Permissions', description: 'Site permissions', defaultEnabled: true },
    ],
  },
  google_drive: {
    name: 'Google Drive',
    description: 'Integrate Google Drive for file storage and sharing',
    category: 'Knowledge Management',
    iconSlug: 'google_drive',
    apiDocs: 'https://developers.google.com/drive/api',
    authType: 'service_account',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', type: 'textarea', required: true },
      { key: 'adminEmail', label: 'Admin Email', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'shared_drives', label: 'Shared Drives', description: 'Team drives', defaultEnabled: true },
      { key: 'permissions', label: 'Permissions', description: 'Sharing settings', defaultEnabled: true },
    ],
  },
  dropbox: {
    name: 'Dropbox',
    description: 'Connect Dropbox for file sync and sharing',
    category: 'Knowledge Management',
    iconSlug: 'dropbox',
    apiDocs: 'https://www.dropbox.com/developers/documentation/http/overview',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'team_members', label: 'Team Members', description: 'Team users', defaultEnabled: true },
      { key: 'shared_folders', label: 'Shared Folders', description: 'Team folders', defaultEnabled: true },
    ],
  },
  box: {
    name: 'Box',
    description: 'Integrate Box for cloud content management',
    category: 'Knowledge Management',
    iconSlug: 'box',
    apiDocs: 'https://developer.box.com/reference/',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'enterpriseId', label: 'Enterprise ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Box users', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'User groups', defaultEnabled: true },
      { key: 'collaborations', label: 'Collaborations', description: 'Shared access', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL DATA ANALYTICS
  // ============================================
  tableau: {
    name: 'Tableau',
    description: 'Connect Tableau for BI and data visualization security',
    category: 'Data Analytics',
    iconSlug: 'tableau',
    apiDocs: 'https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api.htm',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'url', required: true },
      { key: 'personalAccessTokenName', label: 'Token Name', type: 'text', required: true },
      { key: 'personalAccessTokenSecret', label: 'Token Secret', type: 'password', required: true },
      { key: 'siteName', label: 'Site Name', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Tableau users', defaultEnabled: true },
      { key: 'workbooks', label: 'Workbooks', description: 'Published workbooks', defaultEnabled: true },
      { key: 'permissions', label: 'Permissions', description: 'Content permissions', defaultEnabled: true },
    ],
  },
  looker: {
    name: 'Looker',
    description: 'Integrate Looker for data exploration and analytics',
    category: 'Data Analytics',
    iconSlug: 'looker',
    apiDocs: 'https://cloud.google.com/looker/docs/api-intro',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Looker URL', type: 'url', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Looker users', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'User groups', defaultEnabled: true },
      { key: 'roles', label: 'Roles', description: 'Access roles', defaultEnabled: true },
    ],
  },
  power_bi: {
    name: 'Power BI',
    description: 'Connect Power BI for business intelligence reporting',
    category: 'Data Analytics',
    iconSlug: 'power_bi',
    apiDocs: 'https://docs.microsoft.com/en-us/rest/api/power-bi/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'workspaces', label: 'Workspaces', description: 'Power BI workspaces', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Workspace users', defaultEnabled: true },
      { key: 'reports', label: 'Reports', description: 'Published reports', defaultEnabled: true },
    ],
  },
  snowflake: {
    name: 'Snowflake',
    description: 'Connect Snowflake for data cloud and analytics',
    category: 'Data Analytics',
    iconSlug: 'snowflake',
    apiDocs: 'https://docs.snowflake.com/en/developer-guide/sql-api/index',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'account', label: 'Account Identifier', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'warehouse', label: 'Warehouse', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Snowflake users', defaultEnabled: true },
      { key: 'roles', label: 'Roles', description: 'Access roles', defaultEnabled: true },
      { key: 'databases', label: 'Databases', description: 'Database list', defaultEnabled: true },
    ],
  },
  databricks: {
    name: 'Databricks',
    description: 'Integrate Databricks for data engineering and ML',
    category: 'Data Analytics',
    iconSlug: 'databricks',
    apiDocs: 'https://docs.databricks.com/api/',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'workspaceUrl', label: 'Workspace URL', type: 'url', required: true },
      { key: 'accessToken', label: 'Personal Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Workspace users', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'User groups', defaultEnabled: true },
      { key: 'clusters', label: 'Clusters', description: 'Compute clusters', defaultEnabled: true },
    ],
  },
  grafana: {
    name: 'Grafana',
    description: 'Connect Grafana for observability and dashboards',
    category: 'Data Analytics',
    iconSlug: 'grafana',
    apiDocs: 'https://grafana.com/docs/grafana/latest/developers/http_api/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Grafana URL', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Grafana users', defaultEnabled: true },
      { key: 'teams', label: 'Teams', description: 'User teams', defaultEnabled: true },
      { key: 'dashboards', label: 'Dashboards', description: 'Dashboard list', defaultEnabled: true },
    ],
  },
  new_relic: {
    name: 'New Relic',
    description: 'Connect New Relic for observability and APM',
    category: 'Data Analytics',
    iconSlug: 'new_relic',
    apiDocs: 'https://docs.newrelic.com/docs/apis/intro-apis/introduction-new-relic-apis/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'User API Key', type: 'password', required: true },
      { key: 'accountId', label: 'Account ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Account users', defaultEnabled: true },
      { key: 'accounts', label: 'Accounts', description: 'Sub-accounts', defaultEnabled: true },
    ],
  },
  elasticsearch: {
    name: 'Elasticsearch',
    description: 'Integrate Elasticsearch for search and analytics',
    category: 'Data Analytics',
    iconSlug: 'elasticsearch',
    apiDocs: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/rest-apis.html',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Elasticsearch URL', type: 'url', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'ES users', defaultEnabled: true },
      { key: 'roles', label: 'Roles', description: 'Security roles', defaultEnabled: true },
      { key: 'indices', label: 'Indices', description: 'Index list', defaultEnabled: true },
    ],
  },
  segment: {
    name: 'Segment',
    description: 'Integrate Segment for customer data platform',
    category: 'Data Analytics',
    iconSlug: 'segment',
    apiDocs: 'https://segment.com/docs/api/',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'sources', label: 'Sources', description: 'Data sources', defaultEnabled: true },
      { key: 'destinations', label: 'Destinations', description: 'Data destinations', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Workspace users', defaultEnabled: true },
    ],
  },
  mixpanel: {
    name: 'Mixpanel',
    description: 'Connect Mixpanel for product analytics',
    category: 'Data Analytics',
    iconSlug: 'mixpanel',
    apiDocs: 'https://developer.mixpanel.com/reference/overview',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'projectId', label: 'Project ID', type: 'text', required: true },
      { key: 'serviceAccountUsername', label: 'Service Account Username', type: 'text', required: true },
      { key: 'serviceAccountSecret', label: 'Service Account Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Project users', defaultEnabled: true },
    ],
  },
  amplitude: {
    name: 'Amplitude',
    description: 'Integrate Amplitude for product intelligence',
    category: 'Data Analytics',
    iconSlug: 'amplitude',
    apiDocs: 'https://www.docs.developers.amplitude.com/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'text', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Org users', defaultEnabled: true },
    ],
  },
  heap: {
    name: 'Heap',
    description: 'Connect Heap for digital insights and analytics',
    category: 'Data Analytics',
    iconSlug: 'heap',
    apiDocs: 'https://developers.heap.io/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'appId', label: 'App ID', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Account users', defaultEnabled: true },
    ],
  },
  fivetran: {
    name: 'Fivetran',
    description: 'Connect Fivetran for automated data integration',
    category: 'Data Analytics',
    iconSlug: 'fivetran',
    apiDocs: 'https://fivetran.com/docs/rest-api',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'text', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'connectors', label: 'Connectors', description: 'Data connectors', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Account users', defaultEnabled: true },
    ],
  },
  domo: {
    name: 'Domo',
    description: 'Connect Domo for business intelligence platform',
    category: 'Data Analytics',
    iconSlug: 'domo',
    apiDocs: 'https://developer.domo.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Domo users', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'User groups', defaultEnabled: true },
    ],
  },
  qlik: {
    name: 'Qlik',
    description: 'Integrate Qlik for data analytics and visualization',
    category: 'Data Analytics',
    iconSlug: 'qlik',
    apiDocs: 'https://qlik.dev/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'tenantUrl', label: 'Tenant URL', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Qlik users', defaultEnabled: true },
      { key: 'spaces', label: 'Spaces', description: 'Shared spaces', defaultEnabled: true },
    ],
  },
  metabase: {
    name: 'Metabase',
    description: 'Connect Metabase for open source BI and analytics',
    category: 'Data Analytics',
    iconSlug: 'metabase',
    apiDocs: 'https://www.metabase.com/docs/latest/api-documentation',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Metabase URL', type: 'url', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Metabase users', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'Permission groups', defaultEnabled: true },
    ],
  },
  sumo_logic: {
    name: 'Sumo Logic',
    description: 'Connect Sumo Logic for log management and SIEM',
    category: 'Data Analytics',
    iconSlug: 'sumo_logic',
    apiDocs: 'https://help.sumologic.com/docs/api/',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiEndpoint', label: 'API Endpoint', type: 'url', required: true },
      { key: 'accessId', label: 'Access ID', type: 'text', required: true },
      { key: 'accessKey', label: 'Access Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Sumo Logic users', defaultEnabled: true },
      { key: 'roles', label: 'Roles', description: 'User roles', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL WORKFLOW MANAGEMENT
  // ============================================
  wrike: {
    name: 'Wrike',
    description: 'Integrate Wrike for project management and collaboration',
    category: 'Workflow Management',
    iconSlug: 'wrike',
    apiDocs: 'https://developers.wrike.com/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'accessToken', label: 'Permanent Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Wrike users', defaultEnabled: true },
      { key: 'folders', label: 'Folders', description: 'Project folders', defaultEnabled: true },
    ],
  },
  basecamp: {
    name: 'Basecamp',
    description: 'Connect Basecamp for team project management',
    category: 'Workflow Management',
    iconSlug: 'basecamp',
    apiDocs: 'https://github.com/basecamp/bc3-api',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
      { key: 'accountId', label: 'Account ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'people', label: 'People', description: 'Account people', defaultEnabled: true },
      { key: 'projects', label: 'Projects', description: 'Basecamp projects', defaultEnabled: true },
    ],
  },
  shortcut: {
    name: 'Shortcut',
    description: 'Connect Shortcut for software project management',
    category: 'Workflow Management',
    iconSlug: 'shortcut',
    apiDocs: 'https://developer.shortcut.com/api/rest/v3',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'members', label: 'Members', description: 'Workspace members', defaultEnabled: true },
      { key: 'projects', label: 'Projects', description: 'Shortcut projects', defaultEnabled: true },
    ],
  },
  height: {
    name: 'Height',
    description: 'Integrate Height for autonomous project management',
    category: 'Workflow Management',
    iconSlug: 'height',
    apiDocs: 'https://height.notion.site/API-documentation-f38cdea3ac0244c0b8b8d1c1c1f4fcbd',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Workspace users', defaultEnabled: true },
    ],
  },
  teamwork: {
    name: 'Teamwork',
    description: 'Connect Teamwork for project and client management',
    category: 'Workflow Management',
    iconSlug: 'teamwork',
    apiDocs: 'https://developer.teamwork.com/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'siteName', label: 'Site Name', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'people', label: 'People', description: 'Team members', defaultEnabled: true },
      { key: 'projects', label: 'Projects', description: 'Teamwork projects', defaultEnabled: true },
    ],
  },
  podio: {
    name: 'Podio',
    description: 'Integrate Podio for customizable work management',
    category: 'Workflow Management',
    iconSlug: 'podio',
    apiDocs: 'https://developers.podio.com/',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Org users', defaultEnabled: true },
      { key: 'workspaces', label: 'Workspaces', description: 'Podio workspaces', defaultEnabled: true },
    ],
  },
  coda: {
    name: 'Coda',
    description: 'Connect Coda for docs and applications',
    category: 'Workflow Management',
    iconSlug: 'coda',
    apiDocs: 'https://coda.io/developers/apis/v1',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'docs', label: 'Docs', description: 'Coda docs', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL COLLABORATION
  // ============================================
  google_meet: {
    name: 'Google Meet',
    description: 'Integrate Google Meet for meeting management and security',
    category: 'Collaboration',
    iconSlug: 'google_meet',
    apiDocs: 'https://developers.google.com/meet/api',
    authType: 'service_account',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', type: 'textarea', required: true },
      { key: 'adminEmail', label: 'Admin Email', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'meetings', label: 'Meetings', description: 'Meeting records', defaultEnabled: true },
    ],
  },
  ringcentral: {
    name: 'RingCentral',
    description: 'Integrate RingCentral for unified communications',
    category: 'Collaboration',
    iconSlug: 'ringcentral',
    apiDocs: 'https://developers.ringcentral.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'serverUrl', label: 'Server URL', type: 'url', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Account users', defaultEnabled: true },
      { key: 'extensions', label: 'Extensions', description: 'Phone extensions', defaultEnabled: true },
    ],
  },
  gotomeeting: {
    name: 'GoToMeeting',
    description: 'Connect GoToMeeting for meeting management',
    category: 'Collaboration',
    iconSlug: 'gotomeeting',
    apiDocs: 'https://developer.goto.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Account users', defaultEnabled: true },
    ],
  },
  rocket_chat: {
    name: 'Rocket.Chat',
    description: 'Integrate Rocket.Chat for secure team communication',
    category: 'Collaboration',
    iconSlug: 'rocket_chat',
    apiDocs: 'https://developer.rocket.chat/reference/api',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'url', required: true },
      { key: 'userId', label: 'User ID', type: 'text', required: true },
      { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Server users', defaultEnabled: true },
      { key: 'channels', label: 'Channels', description: 'Public channels', defaultEnabled: true },
      { key: 'roles', label: 'Roles', description: 'User roles', defaultEnabled: true },
    ],
  },
  workplace_meta: {
    name: 'Workplace from Meta',
    description: 'Integrate Workplace for enterprise social networking',
    category: 'Collaboration',
    iconSlug: 'workplace_meta',
    apiDocs: 'https://developers.facebook.com/docs/workplace/reference',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'members', label: 'Members', description: 'Community members', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'Workplace groups', defaultEnabled: true },
    ],
  },
  chanty: {
    name: 'Chanty',
    description: 'Integrate Chanty for team chat and collaboration',
    category: 'Collaboration',
    iconSlug: 'chanty',
    apiDocs: 'https://chanty.com/api/',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Team users', defaultEnabled: true },
    ],
  },
  twist: {
    name: 'Twist',
    description: 'Connect Twist for asynchronous team communication',
    category: 'Collaboration',
    iconSlug: 'twist',
    apiDocs: 'https://developer.twist.com/v3/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Workspace users', defaultEnabled: true },
    ],
  },
  flock: {
    name: 'Flock',
    description: 'Connect Flock for team messaging and collaboration',
    category: 'Collaboration',
    iconSlug: 'flock',
    apiDocs: 'https://docs.flock.com/',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Team users', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL CRM & SUPPORT
  // ============================================
  front: {
    name: 'Front',
    description: 'Connect Front for shared inbox and customer communication',
    category: 'CRM & Support',
    iconSlug: 'front',
    apiDocs: 'https://dev.frontapp.com/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'teammates', label: 'Teammates', description: 'Front users', defaultEnabled: true },
      { key: 'teams', label: 'Teams', description: 'Team structure', defaultEnabled: true },
      { key: 'inboxes', label: 'Inboxes', description: 'Shared inboxes', defaultEnabled: true },
    ],
  },
  help_scout: {
    name: 'Help Scout',
    description: 'Integrate Help Scout for customer service management',
    category: 'CRM & Support',
    iconSlug: 'help_scout',
    apiDocs: 'https://developer.helpscout.com/',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'App ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'App Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Help Scout users', defaultEnabled: true },
      { key: 'mailboxes', label: 'Mailboxes', description: 'Support mailboxes', defaultEnabled: true },
    ],
  },
  zoho_crm: {
    name: 'Zoho CRM',
    description: 'Connect Zoho CRM for sales and customer management',
    category: 'CRM & Support',
    iconSlug: 'zoho_crm',
    apiDocs: 'https://www.zoho.com/crm/developer/docs/api/v5/',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'CRM users', defaultEnabled: true },
      { key: 'roles', label: 'Roles', description: 'User roles', defaultEnabled: true },
      { key: 'profiles', label: 'Profiles', description: 'Permission profiles', defaultEnabled: true },
    ],
  },
  pipedrive: {
    name: 'Pipedrive',
    description: 'Integrate Pipedrive for sales pipeline management',
    category: 'CRM & Support',
    iconSlug: 'pipedrive',
    apiDocs: 'https://developers.pipedrive.com/docs/api/v1',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Pipedrive users', defaultEnabled: true },
      { key: 'permission_sets', label: 'Permission Sets', description: 'User permissions', defaultEnabled: true },
    ],
  },
  dynamics_365: {
    name: 'Dynamics 365',
    description: 'Integrate Microsoft Dynamics for enterprise CRM',
    category: 'CRM & Support',
    iconSlug: 'dynamics_365',
    apiDocs: 'https://docs.microsoft.com/en-us/dynamics365/customer-engagement/web-api/about',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'resourceUrl', label: 'Environment URL', type: 'url', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Dynamics users', defaultEnabled: true },
      { key: 'teams', label: 'Teams', description: 'User teams', defaultEnabled: true },
      { key: 'security_roles', label: 'Security Roles', description: 'Role assignments', defaultEnabled: true },
    ],
  },
  sugarcrm: {
    name: 'SugarCRM',
    description: 'Connect SugarCRM for customer relationship management',
    category: 'CRM & Support',
    iconSlug: 'sugarcrm',
    apiDocs: 'https://support.sugarcrm.com/Documentation/Sugar_Developer/Sugar_Developer_Guide/',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'SugarCRM URL', type: 'url', required: true },
      { key: 'clientId', label: 'OAuth Consumer Key', type: 'text', required: true },
      { key: 'clientSecret', label: 'OAuth Consumer Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'CRM users', defaultEnabled: true },
      { key: 'roles', label: 'Roles', description: 'User roles', defaultEnabled: true },
    ],
  },
  copper: {
    name: 'Copper',
    description: 'Integrate Copper for Google Workspace CRM',
    category: 'CRM & Support',
    iconSlug: 'copper',
    apiDocs: 'https://developer.copper.com/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'email', label: 'User Email', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Copper users', defaultEnabled: true },
    ],
  },
  close: {
    name: 'Close',
    description: 'Integrate Close for sales communication and CRM',
    category: 'CRM & Support',
    iconSlug: 'close',
    apiDocs: 'https://developer.close.com/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Close users', defaultEnabled: true },
      { key: 'roles', label: 'Roles', description: 'User roles', defaultEnabled: true },
    ],
  },
  insightly: {
    name: 'Insightly',
    description: 'Connect Insightly for CRM and project management',
    category: 'CRM & Support',
    iconSlug: 'insightly',
    apiDocs: 'https://api.insightly.com/v3.1/Help',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Insightly users', defaultEnabled: true },
      { key: 'teams', label: 'Teams', description: 'User teams', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL HR TOOLS
  // ============================================
  namely: {
    name: 'Namely',
    description: 'Connect Namely for HR, payroll, and benefits',
    category: 'HR Tools',
    iconSlug: 'namely',
    apiDocs: 'https://developers.namely.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'subdomain', label: 'Company Subdomain', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employees', label: 'Employees', description: 'Employee records', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'Employee groups', defaultEnabled: true },
    ],
  },
  paychex: {
    name: 'Paychex',
    description: 'Connect Paychex for payroll and HR services',
    category: 'HR Tools',
    iconSlug: 'paychex',
    apiDocs: 'https://developer.paychex.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'workers', label: 'Workers', description: 'Employee records', defaultEnabled: true },
    ],
  },
  zenefits: {
    name: 'Zenefits',
    description: 'Integrate Zenefits for HR and benefits administration',
    category: 'HR Tools',
    iconSlug: 'zenefits',
    apiDocs: 'https://developers.zenefits.com/',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'people', label: 'People', description: 'Employee records', defaultEnabled: true },
      { key: 'departments', label: 'Departments', description: 'Department structure', defaultEnabled: true },
    ],
  },
  justworks: {
    name: 'Justworks',
    description: 'Connect Justworks for PEO and HR management',
    category: 'HR Tools',
    iconSlug: 'justworks',
    apiDocs: 'https://developer.justworks.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employees', label: 'Employees', description: 'Employee records', defaultEnabled: true },
    ],
  },
  trinet: {
    name: 'TriNet',
    description: 'Integrate TriNet for HR outsourcing and PEO',
    category: 'HR Tools',
    iconSlug: 'trinet',
    apiDocs: 'https://developers.trinet.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employees', label: 'Employees', description: 'Employee records', defaultEnabled: true },
    ],
  },
  ukg: {
    name: 'UKG',
    description: 'Connect UKG for workforce management and HR',
    category: 'HR Tools',
    iconSlug: 'ukg',
    apiDocs: 'https://developer.ukg.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'url', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employees', label: 'Employees', description: 'Employee records', defaultEnabled: true },
      { key: 'org_levels', label: 'Org Levels', description: 'Organization structure', defaultEnabled: true },
    ],
  },
  sap_successfactors: {
    name: 'SAP SuccessFactors',
    description: 'Integrate SuccessFactors for HCM and talent management',
    category: 'HR Tools',
    iconSlug: 'sap_successfactors',
    apiDocs: 'https://help.sap.com/docs/SAP_SUCCESSFACTORS_PLATFORM/d599f15995d348a1b45ba5603e2aba9b/03e1fc3791684367a6a76a614a2916de.html',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'url', required: true },
      { key: 'companyId', label: 'Company ID', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'SF users', defaultEnabled: true },
      { key: 'employees', label: 'Employees', description: 'Employee data', defaultEnabled: true },
    ],
  },
  oracle_hcm: {
    name: 'Oracle HCM',
    description: 'Connect Oracle HCM Cloud for HR management',
    category: 'HR Tools',
    iconSlug: 'oracle_hcm',
    apiDocs: 'https://docs.oracle.com/en/cloud/saas/human-resources/',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'HCM URL', type: 'url', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'workers', label: 'Workers', description: 'Worker records', defaultEnabled: true },
      { key: 'departments', label: 'Departments', description: 'Org structure', defaultEnabled: true },
    ],
  },
  factorial: {
    name: 'Factorial',
    description: 'Integrate Factorial for HR software and management',
    category: 'HR Tools',
    iconSlug: 'factorial',
    apiDocs: 'https://apidoc.factorialhr.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employees', label: 'Employees', description: 'Employee records', defaultEnabled: true },
      { key: 'teams', label: 'Teams', description: 'Team structure', defaultEnabled: true },
    ],
  },
  charliehr: {
    name: 'Charlie HR',
    description: 'Connect Charlie HR for people management',
    category: 'HR Tools',
    iconSlug: 'charliehr',
    apiDocs: 'https://charliehr.readme.io/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'team_members', label: 'Team Members', description: 'Employee records', defaultEnabled: true },
    ],
  },
  culture_amp: {
    name: 'Culture Amp',
    description: 'Connect Culture Amp for employee engagement',
    category: 'HR Tools',
    iconSlug: 'culture_amp',
    apiDocs: 'https://developers.cultureamp.com/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'employees', label: 'Employees', description: 'Employee records', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL FINANCIAL TOOLS
  // ============================================
  bill_com: {
    name: 'Bill.com',
    description: 'Integrate Bill.com for accounts payable automation',
    category: 'Financial Tools',
    iconSlug: 'bill_com',
    apiDocs: 'https://developer.bill.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client App ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Bill.com users', defaultEnabled: true },
    ],
  },
  freshbooks: {
    name: 'FreshBooks',
    description: 'Connect FreshBooks for invoicing and accounting',
    category: 'Financial Tools',
    iconSlug: 'freshbooks',
    apiDocs: 'https://www.freshbooks.com/api/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Account users', defaultEnabled: true },
    ],
  },
  divvy: {
    name: 'Divvy',
    description: 'Integrate Divvy for expense management and budgeting',
    category: 'Financial Tools',
    iconSlug: 'divvy',
    apiDocs: 'https://developer.divvy.co/',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Divvy users', defaultEnabled: true },
      { key: 'cards', label: 'Cards', description: 'Card inventory', defaultEnabled: true },
    ],
  },
  concur: {
    name: 'SAP Concur',
    description: 'Connect Concur for travel and expense management',
    category: 'Financial Tools',
    iconSlug: 'concur',
    apiDocs: 'https://developer.concur.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'geolocation', label: 'Geolocation', type: 'select', required: true, options: [
        { value: 'us', label: 'United States' },
        { value: 'eu', label: 'Europe' },
        { value: 'cn', label: 'China' },
      ]},
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Concur users', defaultEnabled: true },
    ],
  },
  wave: {
    name: 'Wave',
    description: 'Integrate Wave for free accounting and invoicing',
    category: 'Financial Tools',
    iconSlug: 'wave',
    apiDocs: 'https://developer.waveapps.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Account users', defaultEnabled: true },
    ],
  },
  ziphq: {
    name: 'Zip',
    description: 'Sync vendors, contracts, and spend data from Zip procurement platform',
    category: 'Financial Tools',
    iconSlug: 'ziphq',
    apiDocs: 'https://developers.ziphq.com/',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, description: 'Your Zip API key from Settings > API' },
      { key: 'environment', label: 'Environment', type: 'select', required: false, options: ['production', 'sandbox'], default: 'production' },
      { key: 'syncVendors', label: 'Sync Vendors to TPRM', type: 'checkbox', required: false, default: true },
      { key: 'syncContracts', label: 'Sync Contracts', type: 'checkbox', required: false, default: true },
      { key: 'syncSpend', label: 'Sync Spend Analytics', type: 'checkbox', required: false, default: true },
    ],
    evidenceTypes: [
      { key: 'vendors', label: 'Vendors/Suppliers', description: 'Import and sync vendors from Zip to TPRM', defaultEnabled: true },
      { key: 'contracts', label: 'Contracts', description: 'Contract status and expiration tracking', defaultEnabled: true },
      { key: 'spend', label: 'Spend Analytics', description: 'Vendor spend summaries and trends', defaultEnabled: true },
      { key: 'compliance', label: 'Vendor Compliance', description: 'SOC2, ISO27001, and insurance status', defaultEnabled: true },
    ],
    capabilities: ['vendor_sync', 'contract_tracking', 'spend_analytics', 'compliance_status'],
  },

  // ============================================
  // ADDITIONAL KNOWLEDGE MANAGEMENT
  // ============================================
  guru: {
    name: 'Guru',
    description: 'Connect Guru for knowledge management and wiki',
    category: 'Knowledge Management',
    iconSlug: 'guru',
    apiDocs: 'https://developer.getguru.com/',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'members', label: 'Members', description: 'Team members', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'User groups', defaultEnabled: true },
    ],
  },
  document360: {
    name: 'Document360',
    description: 'Integrate Document360 for knowledge base software',
    category: 'Knowledge Management',
    iconSlug: 'document360',
    apiDocs: 'https://apidocs.document360.io/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'team_accounts', label: 'Team Accounts', description: 'Team members', defaultEnabled: true },
    ],
  },
  slab: {
    name: 'Slab',
    description: 'Connect Slab for knowledge base and documentation',
    category: 'Knowledge Management',
    iconSlug: 'slab',
    apiDocs: 'https://slab.com/api/',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Slab users', defaultEnabled: true },
    ],
  },
  tettra: {
    name: 'Tettra',
    description: 'Integrate Tettra for internal knowledge management',
    category: 'Knowledge Management',
    iconSlug: 'tettra',
    apiDocs: 'https://tettra.com/api-docs/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Tettra users', defaultEnabled: true },
    ],
  },
  bloomfire: {
    name: 'Bloomfire',
    description: 'Connect Bloomfire for knowledge engagement',
    category: 'Knowledge Management',
    iconSlug: 'bloomfire',
    apiDocs: 'https://support.bloomfire.com/hc/en-us/articles/360028950391-Bloomfire-API-Overview',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'subdomain', label: 'Subdomain', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Community users', defaultEnabled: true },
    ],
  },
  helpjuice: {
    name: 'Helpjuice',
    description: 'Integrate Helpjuice for knowledge base software',
    category: 'Knowledge Management',
    iconSlug: 'helpjuice',
    apiDocs: 'https://help.helpjuice.com/en_US/api',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'subdomain', label: 'Subdomain', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Helpjuice users', defaultEnabled: true },
    ],
  },
  nuclino: {
    name: 'Nuclino',
    description: 'Integrate Nuclino for team knowledge wiki',
    category: 'Knowledge Management',
    iconSlug: 'nuclino',
    apiDocs: 'https://help.nuclino.com/d3a29686-api',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Team users', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL CYBERSECURITY
  // ============================================
  aqua_security: {
    name: 'Aqua Security',
    description: 'Integrate Aqua for container and cloud native security',
    category: 'Cybersecurity',
    iconSlug: 'aqua_security',
    apiDocs: 'https://docs.aquasec.com/reference',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'url', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'images', label: 'Images', description: 'Container images', defaultEnabled: true },
      { key: 'vulnerabilities', label: 'Vulnerabilities', description: 'Security findings', defaultEnabled: true },
    ],
  },
  sysdig: {
    name: 'Sysdig',
    description: 'Connect Sysdig for container security and monitoring',
    category: 'Cybersecurity',
    iconSlug: 'sysdig',
    apiDocs: 'https://docs.sysdig.com/en/docs/developer-tools/sysdig-api/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'url', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'vulnerabilities', label: 'Vulnerabilities', description: 'Runtime vulnerabilities', defaultEnabled: true },
      { key: 'compliance', label: 'Compliance', description: 'Compliance status', defaultEnabled: true },
    ],
  },
  armorcode: {
    name: 'ArmorCode',
    description: 'Integrate ArmorCode for AppSec posture management',
    category: 'Cybersecurity',
    iconSlug: 'armorcode',
    apiDocs: 'https://docs.armorcode.com/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'findings', label: 'Findings', description: 'Security findings', defaultEnabled: true },
      { key: 'products', label: 'Products', description: 'Application inventory', defaultEnabled: true },
    ],
  },
  panther: {
    name: 'Panther',
    description: 'Connect Panther for cloud-native SIEM',
    category: 'Cybersecurity',
    iconSlug: 'panther',
    apiDocs: 'https://docs.panther.com/api-documentation',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'url', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'alerts', label: 'Alerts', description: 'Security alerts', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Panther users', defaultEnabled: true },
    ],
  },
  drata: {
    name: 'Drata',
    description: 'Integrate Drata for continuous compliance automation',
    category: 'Cybersecurity',
    iconSlug: 'drata',
    apiDocs: 'https://developers.drata.com/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'personnel', label: 'Personnel', description: 'Team members', defaultEnabled: true },
      { key: 'vendors', label: 'Vendors', description: 'Third-party vendors', defaultEnabled: true },
    ],
  },
  checkpoint: {
    name: 'Check Point',
    description: 'Connect Check Point for security gateway management',
    category: 'Cybersecurity',
    iconSlug: 'checkpoint',
    apiDocs: 'https://sc1.checkpoint.com/documents/latest/APIs/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'serverUrl', label: 'Management Server URL', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'gateways', label: 'Gateways', description: 'Security gateways', defaultEnabled: true },
      { key: 'policies', label: 'Policies', description: 'Security policies', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL IDENTITY PROVIDERS
  // ============================================
  forgerock: {
    name: 'ForgeRock',
    description: 'Integrate ForgeRock for identity governance',
    category: 'Identity Providers',
    iconSlug: 'forgerock',
    apiDocs: 'https://backstage.forgerock.com/docs/',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'AM URL', type: 'url', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Directory users', defaultEnabled: true },
      { key: 'applications', label: 'Applications', description: 'OAuth apps', defaultEnabled: true },
    ],
  },
  aws_cognito: {
    name: 'AWS Cognito',
    description: 'Connect Cognito for user pool management and authentication',
    category: 'Identity Providers',
    iconSlug: 'aws_cognito',
    apiDocs: 'https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-reference.html',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'text', required: true },
      { key: 'userPoolId', label: 'User Pool ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'Pool users', defaultEnabled: true },
      { key: 'groups', label: 'Groups', description: 'User groups', defaultEnabled: true },
    ],
  },
  fusionauth: {
    name: 'FusionAuth',
    description: 'Connect FusionAuth for authentication and user management',
    category: 'Identity Providers',
    iconSlug: 'fusionauth',
    apiDocs: 'https://fusionauth.io/docs/apis/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'FusionAuth URL', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'FusionAuth users', defaultEnabled: true },
      { key: 'applications', label: 'Applications', description: 'FA applications', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL MDM
  // ============================================
  citrix_endpoint: {
    name: 'Citrix Endpoint Management',
    description: 'Integrate Citrix for mobile device management',
    category: 'MDM',
    iconSlug: 'citrix_endpoint',
    apiDocs: 'https://developer.cloud.com/citrixworkspace/citrix-endpoint-management/',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'url', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'devices', label: 'Devices', description: 'Managed devices', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Enrolled users', defaultEnabled: true },
    ],
  },
  ibm_maas360: {
    name: 'IBM MaaS360',
    description: 'Connect MaaS360 for enterprise mobility management',
    category: 'MDM',
    iconSlug: 'ibm_maas360',
    apiDocs: 'https://www.ibm.com/docs/en/maas360',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'billingId', label: 'Billing ID', type: 'text', required: true },
      { key: 'platformId', label: 'Platform ID', type: 'text', required: true },
      { key: 'appId', label: 'App ID', type: 'text', required: true },
      { key: 'appVersion', label: 'App Version', type: 'text', required: true },
      { key: 'accessKey', label: 'Access Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'devices', label: 'Devices', description: 'Managed devices', defaultEnabled: true },
    ],
  },
  blackberry_uem: {
    name: 'BlackBerry UEM',
    description: 'Integrate BlackBerry for secure endpoint management',
    category: 'MDM',
    iconSlug: 'blackberry_uem',
    apiDocs: 'https://docs.blackberry.com/en/endpoint-management/blackberry-uem/',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'serverUrl', label: 'UEM Server URL', type: 'url', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'devices', label: 'Devices', description: 'Managed devices', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'UEM users', defaultEnabled: true },
    ],
  },
  manageengine_mdm: {
    name: 'ManageEngine MDM',
    description: 'Connect ManageEngine for mobile device management',
    category: 'MDM',
    iconSlug: 'manageengine_mdm',
    apiDocs: 'https://www.manageengine.com/mobile-device-management/api/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'devices', label: 'Devices', description: 'Managed devices', defaultEnabled: true },
    ],
  },
  miradore: {
    name: 'Miradore',
    description: 'Integrate Miradore for device management and security',
    category: 'MDM',
    iconSlug: 'miradore',
    apiDocs: 'https://www.miradore.com/knowledge/mdm-api/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'devices', label: 'Devices', description: 'Managed devices', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL ASSET MANAGEMENT
  // ============================================
  snow_software: {
    name: 'Snow Software',
    description: 'Integrate Snow for software asset management',
    category: 'Asset Management',
    iconSlug: 'snow_software',
    apiDocs: 'https://docs.snowsoftware.com/',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'url', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'computers', label: 'Computers', description: 'Computer assets', defaultEnabled: true },
      { key: 'applications', label: 'Applications', description: 'Software inventory', defaultEnabled: true },
    ],
  },
  flexera: {
    name: 'Flexera',
    description: 'Connect Flexera for IT asset management and optimization',
    category: 'Asset Management',
    iconSlug: 'flexera',
    apiDocs: 'https://docs.flexera.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'orgId', label: 'Organization ID', type: 'text', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'assets', label: 'Assets', description: 'IT assets', defaultEnabled: true },
      { key: 'licenses', label: 'Licenses', description: 'Software licenses', defaultEnabled: true },
    ],
  },
  asset_panda: {
    name: 'Asset Panda',
    description: 'Connect Asset Panda for asset tracking',
    category: 'Asset Management',
    iconSlug: 'asset_panda',
    apiDocs: 'https://www.assetpanda.com/product/asset-tracking-api/',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'assets', label: 'Assets', description: 'Tracked assets', defaultEnabled: true },
    ],
  },
  ivanti: {
    name: 'Ivanti',
    description: 'Connect Ivanti for IT asset and service management',
    category: 'Asset Management',
    iconSlug: 'ivanti',
    apiDocs: 'https://help.ivanti.com/',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'url', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'assets', label: 'Assets', description: 'IT assets', defaultEnabled: true },
    ],
  },
  manageengine_assetexplorer: {
    name: 'ManageEngine AssetExplorer',
    description: 'Integrate AssetExplorer for IT asset management',
    category: 'Asset Management',
    iconSlug: 'manageengine_assetexplorer',
    apiDocs: 'https://www.manageengine.com/products/asset-explorer/api/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'url', required: true },
      { key: 'apiKey', label: 'Technician Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'assets', label: 'Assets', description: 'IT assets', defaultEnabled: true },
      { key: 'software', label: 'Software', description: 'Installed software', defaultEnabled: true },
    ],
  },
  device42: {
    name: 'Device42',
    description: 'Integrate Device42 for data center and IT documentation',
    category: 'Asset Management',
    iconSlug: 'device42',
    apiDocs: 'https://api.device42.com/',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'serverUrl', label: 'Device42 URL', type: 'url', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'devices', label: 'Devices', description: 'IT devices', defaultEnabled: true },
      { key: 'software', label: 'Software', description: 'Software inventory', defaultEnabled: true },
    ],
  },
  atlassian_assets: {
    name: 'Atlassian Assets',
    description: 'Integrate Atlassian Assets (JSM) for CMDB and asset tracking. Cloud ID and Workspace ID are auto-discovered from your site URL.',
    category: 'Asset Management',
    iconSlug: 'atlassian_assets',
    apiDocs: 'https://developer.atlassian.com/cloud/assets/rest/intro/',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'siteUrl', label: 'Jira Site URL', type: 'url', required: true, placeholder: 'https://your-domain.atlassian.net', helpText: 'Your Atlassian Cloud site URL. Cloud ID and Workspace ID will be auto-discovered.' },
      { key: 'email', label: 'Email', type: 'text', required: true, placeholder: 'you@company.com', helpText: 'The email address associated with your Atlassian account.' },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true, helpText: 'Generate at id.atlassian.com/manage/api-tokens' },
    ],
    evidenceTypes: [
      { key: 'objects', label: 'Asset Objects', description: 'CMDB objects and configuration items', defaultEnabled: true },
      { key: 'schemas', label: 'Object Schemas', description: 'Asset object schema definitions', defaultEnabled: true },
    ],
  },

  // ============================================
  // ASSET MANAGEMENT
  // ============================================
  servicenow_itam: {
    name: 'ServiceNow ITAM',
    description: 'Connect ServiceNow IT Asset Management',
    category: 'Asset Management',
    iconSlug: 'servicenow_itam',
    apiDocs: 'https://developer.servicenow.com/',
    authType: 'basic',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'instanceUrl', label: 'Instance URL', type: 'url', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'assets', label: 'Assets', description: 'IT assets', defaultEnabled: true },
      { key: 'software', label: 'Software', description: 'Software inventory', defaultEnabled: true },
    ],
  },
  snipe_it: {
    name: 'Snipe-IT',
    description: 'Integrate Snipe-IT for open source asset management',
    category: 'Asset Management',
    iconSlug: 'snipe_it',
    apiDocs: 'https://snipe-it.readme.io/reference/api-overview',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Snipe-IT URL', type: 'url', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'hardware', label: 'Hardware', description: 'Hardware assets', defaultEnabled: true },
      { key: 'licenses', label: 'Licenses', description: 'Software licenses', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Asset users', defaultEnabled: true },
    ],
  },
  lansweeper: {
    name: 'Lansweeper',
    description: 'Integrate Lansweeper for IT asset discovery',
    category: 'Asset Management',
    iconSlug: 'lansweeper',
    apiDocs: 'https://docs.lansweeper.com/docs/api/overview',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'assets', label: 'Assets', description: 'Discovered assets', defaultEnabled: true },
      { key: 'software', label: 'Software', description: 'Installed software', defaultEnabled: true },
    ],
  },
  oomnitza: {
    name: 'Oomnitza',
    description: 'Connect Oomnitza for enterprise technology management',
    category: 'Asset Management',
    iconSlug: 'oomnitza',
    apiDocs: 'https://api.oomnitza.com/',
    authType: 'token',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'url', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'assets', label: 'Assets', description: 'IT assets', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Asset owners', defaultEnabled: true },
    ],
  },
  freshservice: {
    name: 'Freshservice',
    description: 'Connect Freshservice for IT service and asset management',
    category: 'Asset Management',
    iconSlug: 'freshservice',
    apiDocs: 'https://api.freshservice.com/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'domain', label: 'Domain', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'assets', label: 'Assets', description: 'CMDB assets', defaultEnabled: true },
      { key: 'agents', label: 'Agents', description: 'IT agents', defaultEnabled: true },
    ],
  },

  // ============================================
  // CUSTOM
  // ============================================
  custom: {
    name: 'Custom Integration',
    description: 'Create a custom integration with any REST API or webhook endpoint',
    category: 'Custom',
    iconSlug: 'custom',
    authType: 'api_key',
    syncFrequencies: ['manual', 'hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'API Base URL', type: 'url', required: true, placeholder: 'https://api.example.com' },
      { key: 'authType', label: 'Authentication Type', type: 'select', required: true, options: [
        { value: 'none', label: 'None' },
        { value: 'api_key', label: 'API Key' },
        { value: 'bearer', label: 'Bearer Token' },
        { value: 'basic', label: 'Basic Auth' },
        { value: 'oauth2', label: 'OAuth 2.0' },
      ]},
      { key: 'apiKey', label: 'API Key / Token', type: 'password', required: false },
      { key: 'headerName', label: 'Auth Header Name', type: 'text', required: false, placeholder: 'Authorization' },
      { key: 'username', label: 'Username (Basic Auth)', type: 'text', required: false },
      { key: 'password', label: 'Password (Basic Auth)', type: 'password', required: false },
    ],
    evidenceTypes: [
      { key: 'custom_data', label: 'Custom Data', description: 'Data from custom API endpoints', defaultEnabled: true },
    ],
  },

  // ============================================
  // BACKGROUND CHECK PROVIDERS
  // ============================================
  certn: {
    name: 'Certn',
    description: 'Connect Certn for AI-powered background checks, identity verification, and risk assessment',
    category: 'Background Check',
    iconSlug: 'certn',
    apiDocs: 'https://docs.certn.co/reference/getting-started',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'certn_xxx', helpText: 'Your Certn API key from the dashboard' },
      { key: 'environment', label: 'Environment', type: 'select', required: true, options: [
        { value: 'production', label: 'Production' },
        { value: 'sandbox', label: 'Sandbox' },
      ]},
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: false, helpText: 'Optional: For receiving real-time status updates' },
    ],
    evidenceTypes: [
      { key: 'background_check_results', label: 'Background Check Results', description: 'Aggregated background check status for employee compliance', defaultEnabled: true },
      { key: 'screening_status', label: 'Screening Status', description: 'Overall screening status by candidate', defaultEnabled: true },
      { key: 'identity_verification', label: 'Identity Verification', description: 'ID verification status and results', defaultEnabled: true },
      { key: 'criminal_records', label: 'Criminal Records', description: 'Criminal record check results', defaultEnabled: true },
      { key: 'employment_verification', label: 'Employment Verification', description: 'Employment history verifications', defaultEnabled: true },
      { key: 'education_verification', label: 'Education Verification', description: 'Education credential verifications', defaultEnabled: true },
      { key: 'credit_checks', label: 'Credit Checks', description: 'Credit history check results', defaultEnabled: false },
      { key: 'reference_checks', label: 'Reference Checks', description: 'Professional reference verifications', defaultEnabled: false },
      { key: 'driving_records', label: 'Driving Records', description: 'Motor vehicle record checks', defaultEnabled: false },
    ],
  },
  checkr: {
    name: 'Checkr',
    description: 'Integrate Checkr for comprehensive background checks, screening, and compliance verification',
    category: 'Background Check',
    iconSlug: 'checkr',
    apiDocs: 'https://docs.checkr.com/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'xxxx', helpText: 'Your Checkr API key' },
      { key: 'environment', label: 'Environment', type: 'select', required: true, options: [
        { value: 'production', label: 'Production' },
        { value: 'staging', label: 'Staging' },
      ]},
      { key: 'accountId', label: 'Account ID', type: 'text', required: false, helpText: 'For multi-account setups' },
    ],
    evidenceTypes: [
      { key: 'background_check_results', label: 'Background Check Results', description: 'Aggregated background check status for employee compliance', defaultEnabled: true },
      { key: 'screening_status', label: 'Screening Status', description: 'Overall screening status by candidate', defaultEnabled: true },
      { key: 'criminal_records', label: 'Criminal Records', description: 'Criminal record search results', defaultEnabled: true },
      { key: 'identity_verification', label: 'Identity Verification', description: 'SSN trace and identity verification', defaultEnabled: true },
      { key: 'employment_verification', label: 'Employment Verification', description: 'Employment history verifications', defaultEnabled: true },
      { key: 'education_verification', label: 'Education Verification', description: 'Education verification results', defaultEnabled: true },
      { key: 'motor_vehicle', label: 'Motor Vehicle Records', description: 'Driving history and license verification', defaultEnabled: false },
      { key: 'drug_screening', label: 'Drug Screening', description: 'Drug test results and status', defaultEnabled: false },
      { key: 'adverse_actions', label: 'Adverse Actions', description: 'FCRA adverse action tracking', defaultEnabled: false },
    ],
  },
  sterling: {
    name: 'Sterling',
    description: 'Connect Sterling for background screening, identity verification, and workforce monitoring',
    category: 'Background Check',
    iconSlug: 'sterling',
    apiDocs: 'https://developer.sterlingcheck.com/',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'environment', label: 'Environment', type: 'select', required: true, options: [
        { value: 'production', label: 'Production' },
        { value: 'uat', label: 'UAT (Testing)' },
      ]},
    ],
    evidenceTypes: [
      { key: 'screenings', label: 'Screenings', description: 'All screening requests and results', defaultEnabled: true },
      { key: 'criminal_checks', label: 'Criminal Checks', description: 'Criminal background results', defaultEnabled: true },
      { key: 'verification', label: 'Verifications', description: 'Employment and education verifications', defaultEnabled: true },
      { key: 'drug_tests', label: 'Drug Tests', description: 'Drug screening results', defaultEnabled: false },
      { key: 'continuous_monitoring', label: 'Continuous Monitoring', description: 'Ongoing screening alerts', defaultEnabled: true },
    ],
  },
  goodhire: {
    name: 'GoodHire',
    description: 'Integrate GoodHire for employment background checks and screening services',
    category: 'Background Check',
    iconSlug: 'goodhire',
    apiDocs: 'https://developers.goodhire.com/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'accountId', label: 'Account ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'candidates', label: 'Candidates', description: 'Candidate profiles and status', defaultEnabled: true },
      { key: 'reports', label: 'Reports', description: 'Background check reports', defaultEnabled: true },
      { key: 'verifications', label: 'Verifications', description: 'Employment and education checks', defaultEnabled: true },
    ],
  },
  hireright: {
    name: 'HireRight',
    description: 'Connect HireRight for global background screening and employment verification',
    category: 'Background Check',
    iconSlug: 'hireright',
    apiDocs: 'https://developer.hireright.com/',
    authType: 'oauth2',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accountNumber', label: 'Account Number', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'orders', label: 'Screening Orders', description: 'All screening requests', defaultEnabled: true },
      { key: 'reports', label: 'Reports', description: 'Background check results', defaultEnabled: true },
      { key: 'international_checks', label: 'International Checks', description: 'Global screening results', defaultEnabled: true },
      { key: 'drug_alcohol', label: 'Drug & Alcohol', description: 'Testing program results', defaultEnabled: false },
    ],
  },
  intelifi: {
    name: 'Intelifi',
    description: 'Integrate Intelifi for background verification and due diligence screening',
    category: 'Background Check',
    iconSlug: 'intelifi',
    apiDocs: 'https://www.intelifi.com/api/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'companyId', label: 'Company ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'background_check_results', label: 'Background Check Results', description: 'Aggregated background check status', defaultEnabled: true },
      { key: 'screening_status', label: 'Screening Status', description: 'Overall screening status', defaultEnabled: true },
      { key: 'verifications', label: 'Verifications', description: 'Background verification results', defaultEnabled: true },
    ],
  },

  // ============================================
  // SECURITY AWARENESS & LMS
  // ============================================
  knowbe4: {
    name: 'KnowBe4',
    description: 'Connect KnowBe4 for security awareness training, phishing simulations, and user risk scores',
    category: 'Security Awareness',
    iconSlug: 'knowbe4',
    apiDocs: 'https://developer.knowbe4.com/',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, helpText: 'Reporting API key from KnowBe4 console' },
      { key: 'region', label: 'Region', type: 'select', required: true, options: [
        { value: 'us', label: 'United States' },
        { value: 'eu', label: 'European Union' },
        { value: 'ca', label: 'Canada' },
        { value: 'uk', label: 'United Kingdom' },
        { value: 'de', label: 'Germany' },
      ]},
    ],
    evidenceTypes: [
      { key: 'training_assignments', label: 'Training Assignments', description: 'Assigned training campaigns by user', defaultEnabled: true },
      { key: 'training_completions', label: 'Training Completions', description: 'Completed training with scores', defaultEnabled: true },
      { key: 'phishing_test_results', label: 'Phishing Test Results', description: 'Phishing simulation results by user', defaultEnabled: true },
      { key: 'security_awareness_score', label: 'Security Awareness Score', description: 'User risk scores and rankings', defaultEnabled: true },
      { key: 'training_campaigns', label: 'Training Campaigns', description: 'All training campaign configurations', defaultEnabled: true },
      { key: 'user_training_status', label: 'User Training Status', description: 'Overall training status per user', defaultEnabled: true },
      { key: 'phishing_campaigns', label: 'Phishing Campaigns', description: 'Phishing simulation campaigns', defaultEnabled: false },
      { key: 'groups', label: 'User Groups', description: 'User group assignments', defaultEnabled: false },
    ],
  },
  proofpoint_sat: {
    name: 'Proofpoint Security Awareness',
    description: 'Integrate Proofpoint SAT for security awareness training and phishing simulations',
    category: 'Security Awareness',
    iconSlug: 'proofpoint',
    apiDocs: 'https://help.proofpoint.com/Threat_Insight_Dashboard/API_Documentation',
    authType: 'api_key',
    syncFrequencies: ['hourly', 'daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', required: true },
      { key: 'orgId', label: 'Organization ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'training_assignments', label: 'Training Assignments', description: 'Assigned training modules by user', defaultEnabled: true },
      { key: 'training_completions', label: 'Training Completions', description: 'Completed training with assessment scores', defaultEnabled: true },
      { key: 'phishing_test_results', label: 'Phishing Test Results', description: 'Phishing simulation results', defaultEnabled: true },
      { key: 'security_awareness_score', label: 'Security Awareness Score', description: 'User vulnerability scores', defaultEnabled: true },
      { key: 'user_training_status', label: 'User Training Status', description: 'Overall training status', defaultEnabled: true },
      { key: 'attack_simulations', label: 'Attack Simulations', description: 'Simulated attack campaigns', defaultEnabled: false },
      { key: 'very_attacked_people', label: 'Very Attacked People', description: 'High-risk user identification', defaultEnabled: false },
    ],
  },
  curricula: {
    name: 'Curricula',
    description: 'Connect Curricula for fun, story-based security awareness training',
    category: 'Security Awareness',
    iconSlug: 'curricula',
    apiDocs: 'https://api.getcurricula.com/docs',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'training_assignments', label: 'Training Assignments', description: 'Assigned episodes and courses', defaultEnabled: true },
      { key: 'training_completions', label: 'Training Completions', description: 'Completed training progress', defaultEnabled: true },
      { key: 'phishing_test_results', label: 'Phishing Test Results', description: 'Phishing simulation results', defaultEnabled: true },
      { key: 'user_training_status', label: 'User Training Status', description: 'Overall training status', defaultEnabled: true },
      { key: 'learner_progress', label: 'Learner Progress', description: 'Detailed learner progress data', defaultEnabled: false },
    ],
  },
  hoxhunt: {
    name: 'Hoxhunt',
    description: 'Integrate Hoxhunt for gamified phishing training and threat reporting',
    category: 'Security Awareness',
    iconSlug: 'hoxhunt',
    apiDocs: 'https://help.hoxhunt.com/en/articles/api',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'organizationId', label: 'Organization ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'training_completions', label: 'Training Completions', description: 'Completed training modules', defaultEnabled: true },
      { key: 'phishing_test_results', label: 'Phishing Test Results', description: 'Phishing simulation results', defaultEnabled: true },
      { key: 'security_awareness_score', label: 'Security Awareness Score', description: 'User behavior scores', defaultEnabled: true },
      { key: 'user_training_status', label: 'User Training Status', description: 'Overall user status', defaultEnabled: true },
      { key: 'threat_reports', label: 'Threat Reports', description: 'User-reported threats', defaultEnabled: true },
      { key: 'leaderboards', label: 'Leaderboards', description: 'Gamification rankings', defaultEnabled: false },
    ],
  },
  infosec_iq: {
    name: 'Infosec IQ',
    description: 'Connect Infosec IQ (Cengage) for security awareness training and assessments',
    category: 'Security Awareness',
    iconSlug: 'infosec',
    apiDocs: 'https://www.infosecinstitute.com/iq/api/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'siteId', label: 'Site ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'training_assignments', label: 'Training Assignments', description: 'Assigned training content', defaultEnabled: true },
      { key: 'training_completions', label: 'Training Completions', description: 'Completed courses and assessments', defaultEnabled: true },
      { key: 'phishing_test_results', label: 'Phishing Test Results', description: 'PhishSim campaign results', defaultEnabled: true },
      { key: 'user_training_status', label: 'User Training Status', description: 'Learner progress summary', defaultEnabled: true },
      { key: 'assessment_scores', label: 'Assessment Scores', description: 'Quiz and assessment results', defaultEnabled: true },
    ],
  },
  mimecast_awareness: {
    name: 'Mimecast Awareness Training',
    description: 'Integrate Mimecast for security awareness training and phishing defense',
    category: 'Security Awareness',
    iconSlug: 'mimecast',
    apiDocs: 'https://developer.mimecast.com/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', required: true },
      { key: 'baseUrl', label: 'Base URL', type: 'url', required: true, placeholder: 'https://xx-api.mimecast.com' },
    ],
    evidenceTypes: [
      { key: 'training_assignments', label: 'Training Assignments', description: 'Assigned training modules', defaultEnabled: true },
      { key: 'training_completions', label: 'Training Completions', description: 'Completed training', defaultEnabled: true },
      { key: 'phishing_test_results', label: 'Phishing Test Results', description: 'Phishing campaign results', defaultEnabled: true },
      { key: 'user_training_status', label: 'User Training Status', description: 'User training summary', defaultEnabled: true },
    ],
  },
  cofense: {
    name: 'Cofense PhishMe',
    description: 'Connect Cofense for phishing awareness and threat intelligence',
    category: 'Security Awareness',
    iconSlug: 'cofense',
    apiDocs: 'https://cofense.com/resources/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'orgId', label: 'Organization ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'phishing_test_results', label: 'Phishing Test Results', description: 'PhishMe simulation results', defaultEnabled: true },
      { key: 'security_awareness_score', label: 'Security Awareness Score', description: 'Susceptibility scores', defaultEnabled: true },
      { key: 'user_training_status', label: 'User Training Status', description: 'User awareness status', defaultEnabled: true },
      { key: 'threat_reports', label: 'Threat Reports', description: 'User-reported threats via Reporter', defaultEnabled: true },
    ],
  },
  terranova: {
    name: 'Terranova Security',
    description: 'Integrate Terranova for security awareness training content',
    category: 'Security Awareness',
    iconSlug: 'terranova',
    apiDocs: 'https://terranovasecurity.com/resources/',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'customerId', label: 'Customer ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'training_assignments', label: 'Training Assignments', description: 'Assigned awareness content', defaultEnabled: true },
      { key: 'training_completions', label: 'Training Completions', description: 'Completed training modules', defaultEnabled: true },
      { key: 'phishing_test_results', label: 'Phishing Test Results', description: 'Phishing simulation results', defaultEnabled: true },
      { key: 'user_training_status', label: 'User Training Status', description: 'User compliance status', defaultEnabled: true },
    ],
  },

  // ============================================
  // ADDITIONAL INTEGRATIONS
  // ============================================
  pega: {
    name: 'Pega',
    description: 'Connect Pega for CRM, BPM, and case management data',
    category: 'CRM & Support',
    iconSlug: 'pega',
    apiDocs: 'https://docs.pega.com/bundle/platform/page/platform/api/api-landing.html',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Pega Server URL', type: 'url', required: true, placeholder: 'https://your-pega-instance.com' },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'cases', label: 'Cases', description: 'Case management records', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'User accounts and access', defaultEnabled: true },
      { key: 'audit_logs', label: 'Audit Logs', description: 'System audit trail', defaultEnabled: true },
    ],
  },
  redash: {
    name: 'Redash',
    description: 'Integrate Redash for BI dashboards and query access control',
    category: 'Data & Analytics',
    iconSlug: 'redash',
    apiDocs: 'https://redash.io/help/user-guide/integrations-and-api/api',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Redash URL', type: 'url', required: true, placeholder: 'https://redash.yourcompany.com' },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'User accounts and groups', defaultEnabled: true },
      { key: 'queries', label: 'Queries', description: 'Saved queries and permissions', defaultEnabled: true },
      { key: 'dashboards', label: 'Dashboards', description: 'Dashboard configurations', defaultEnabled: true },
      { key: 'data_sources', label: 'Data Sources', description: 'Connected data source configurations', defaultEnabled: true },
    ],
  },
  sonatype_nexus: {
    name: 'Sonatype Nexus',
    description: 'Connect Nexus Repository for artifact management and vulnerability scanning',
    category: 'DevSecOps',
    iconSlug: 'sonatype',
    apiDocs: 'https://help.sonatype.com/repomanager3/integrations/rest-and-integration-api',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Nexus URL', type: 'url', required: true, placeholder: 'https://nexus.yourcompany.com' },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'repositories', label: 'Repositories', description: 'Repository configurations', defaultEnabled: true },
      { key: 'components', label: 'Components', description: 'Stored artifacts and packages', defaultEnabled: true },
      { key: 'security_vulnerabilities', label: 'Security Vulnerabilities', description: 'IQ Server vulnerability findings', defaultEnabled: true },
      { key: 'users', label: 'Users & Roles', description: 'User accounts and role assignments', defaultEnabled: true },
    ],
  },
  codeclimate: {
    name: 'Code Climate',
    description: 'Code quality and maintainability analysis',
    category: 'DevSecOps',
    iconSlug: 'codeclimate',
    apiDocs: 'https://codeclimate.com/docs/api',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'repos', label: 'Repositories', description: 'Analyzed repositories', defaultEnabled: true },
      { key: 'issues', label: 'Issues', description: 'Code quality issues', defaultEnabled: true },
      { key: 'test_coverage', label: 'Test Coverage', description: 'Test coverage reports', defaultEnabled: true },
    ],
  },
  knowledgeowl: {
    name: 'KnowledgeOwl',
    description: 'Knowledge base and documentation platform',
    category: 'Knowledge Management',
    iconSlug: 'knowledgeowl',
    apiDocs: 'https://support.knowledgeowl.com/help/api-overview',
    authType: 'api_key',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'projectId', label: 'Project ID', type: 'text', required: true },
    ],
    evidenceTypes: [
      { key: 'articles', label: 'Articles', description: 'Knowledge base articles', defaultEnabled: true },
      { key: 'categories', label: 'Categories', description: 'Article categories', defaultEnabled: true },
    ],
  },
  monday_crm: {
    name: 'Monday CRM',
    description: 'CRM and sales pipeline management',
    category: 'CRM',
    iconSlug: 'monday',
    apiDocs: 'https://monday.com/developers/v2',
    authType: 'token',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'boards', label: 'Boards', description: 'CRM boards', defaultEnabled: true },
      { key: 'items', label: 'Items', description: 'CRM items/deals', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'Team members', defaultEnabled: true },
    ],
  },
  sap: {
    name: 'SAP',
    description: 'Enterprise resource planning system',
    category: 'Finance',
    iconSlug: 'sap',
    apiDocs: 'https://api.sap.com/',
    authType: 'oauth2',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'SAP URL', type: 'url', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'users', label: 'Users', description: 'SAP user accounts', defaultEnabled: true },
      { key: 'roles', label: 'Roles', description: 'User roles and authorizations', defaultEnabled: true },
      { key: 'audit_logs', label: 'Audit Logs', description: 'System audit logs', defaultEnabled: true },
    ],
  },
  superset: {
    name: 'Apache Superset',
    description: 'Modern data exploration and visualization platform',
    category: 'Data & Analytics',
    iconSlug: 'superset',
    apiDocs: 'https://superset.apache.org/docs/api',
    authType: 'basic',
    syncFrequencies: ['daily', 'weekly'],
    configFields: [
      { key: 'baseUrl', label: 'Superset URL', type: 'url', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
    evidenceTypes: [
      { key: 'dashboards', label: 'Dashboards', description: 'Dashboard configurations', defaultEnabled: true },
      { key: 'charts', label: 'Charts', description: 'Chart definitions', defaultEnabled: true },
      { key: 'datasets', label: 'Datasets', description: 'Data source configurations', defaultEnabled: true },
      { key: 'users', label: 'Users', description: 'User accounts and permissions', defaultEnabled: true },
    ],
  },
};

// Get integration types grouped by category
export function getIntegrationsByCategory(): Record<string, Array<{ type: string; data: IntegrationType }>> {
  const grouped: Record<string, Array<{ type: string; data: IntegrationType }>> = {};
  
  Object.entries(INTEGRATION_TYPES).forEach(([type, data]) => {
    const category = data.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({ type, data });
  });
  
  // Sort each category alphabetically
  Object.keys(grouped).forEach(category => {
    grouped[category].sort((a, b) => a.data.name.localeCompare(b.data.name));
  });
  
  return grouped;
}

// Get count of integrations
export function getIntegrationCount(): number {
  return Object.keys(INTEGRATION_TYPES).length;
}

// Get categories with counts
export function getCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  Object.values(INTEGRATION_TYPES).forEach(integration => {
    counts[integration.category] = (counts[integration.category] || 0) + 1;
  });
  return counts;
}

