import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum IntegrationType {
  // Cloud Infrastructure
  AWS = 'aws',
  GCP = 'gcp',
  AZURE = 'azure',
  DIGITAL_OCEAN = 'digital_ocean',
  ORACLE_CLOUD = 'oracle_cloud',
  IBM_CLOUD = 'ibm_cloud',
  ALIBABA_CLOUD = 'alibaba_cloud',
  LINODE = 'linode',
  VULTR = 'vultr',
  HEROKU = 'heroku',
  CLOUDFLARE = 'cloudflare',
  VERCEL = 'vercel',
  NETLIFY = 'netlify',
  RENDER = 'render',
  HETZNER = 'hetzner',

  // Developer Tools
  GITHUB = 'github',
  GITLAB = 'gitlab',
  BITBUCKET = 'bitbucket',
  DOCKER_HUB = 'docker_hub',
  JENKINS = 'jenkins',
  CIRCLECI = 'circleci',
  TRAVIS_CI = 'travis_ci',
  AZURE_DEVOPS = 'azure_devops',
  JFROG = 'jfrog',
  SONATYPE_NEXUS = 'sonatype_nexus',
  CODECLIMATE = 'codeclimate',
  SONARQUBE = 'sonarqube',
  PAGERDUTY = 'pagerduty',
  LAUNCHDARKLY = 'launchdarkly',
  SENTRY = 'sentry',

  // Identity Providers
  OKTA = 'okta',
  AZURE_AD = 'azure_ad',
  GOOGLE_WORKSPACE = 'google_workspace',
  ONELOGIN = 'onelogin',
  AUTH0 = 'auth0',
  PING_IDENTITY = 'ping_identity',
  JUMPCLOUD = 'jumpcloud',
  DUO_SECURITY = 'duo_security',
  LASTPASS = 'lastpass',
  ONE_PASSWORD = 'one_password',
  CYBERARK = 'cyberark',
  FORGEROCK = 'forgerock',
  AWS_COGNITO = 'aws_cognito',
  KEYCLOAK = 'keycloak',
  FUSIONAUTH = 'fusionauth',

  // MDM
  JAMF = 'jamf',
  MICROSOFT_INTUNE = 'microsoft_intune',
  VMWARE_WORKSPACE_ONE = 'vmware_workspace_one',
  CITRIX_ENDPOINT = 'citrix_endpoint',
  IBM_MAAS360 = 'ibm_maas360',
  BLACKBERRY_UEM = 'blackberry_uem',
  MANAGEENGINE_MDM = 'manageengine_mdm',
  MIRADORE = 'miradore',
  KANDJI = 'kandji',

  // Workflow Management
  JIRA = 'jira',
  ASANA = 'asana',
  TRELLO = 'trello',
  MONDAY = 'monday',
  CLICKUP = 'clickup',
  WRIKE = 'wrike',
  SMARTSHEET = 'smartsheet',
  AIRTABLE = 'airtable',
  BASECAMP = 'basecamp',
  LINEAR = 'linear',
  SHORTCUT = 'shortcut',
  HEIGHT = 'height',
  TEAMWORK = 'teamwork',
  PODIO = 'podio',

  // Collaboration
  SLACK = 'slack',
  MICROSOFT_TEAMS = 'microsoft_teams',
  ZOOM = 'zoom',
  GOOGLE_MEET = 'google_meet',
  DISCORD = 'discord',
  WEBEX = 'webex',
  MATTERMOST = 'mattermost',
  RINGCENTRAL = 'ringcentral',
  GOTOMEETING = 'gotomeeting',
  CHANTY = 'chanty',
  TWIST = 'twist',
  WORKPLACE_META = 'workplace_meta',
  FLOCK = 'flock',
  ROCKET_CHAT = 'rocket_chat',

  // CRM & Support
  SALESFORCE = 'salesforce',
  HUBSPOT = 'hubspot',
  ZENDESK = 'zendesk',
  SERVICENOW = 'servicenow',
  FRESHDESK = 'freshdesk',
  INTERCOM = 'intercom',
  FRONT = 'front',
  HELP_SCOUT = 'help_scout',
  ZOHO_CRM = 'zoho_crm',
  PIPEDRIVE = 'pipedrive',
  MONDAY_CRM = 'monday_crm',
  DYNAMICS_365 = 'dynamics_365',
  SUGARCRM = 'sugarcrm',
  COPPER = 'copper',
  PEGA = 'pega',

  // Cybersecurity
  CROWDSTRIKE = 'crowdstrike',
  WIZ = 'wiz',
  SNYK = 'snyk',
  TENABLE = 'tenable',
  RAPID7 = 'rapid7',
  QUALYS = 'qualys',
  PRISMA_CLOUD = 'prisma_cloud',
  SENTINELONE = 'sentinelone',
  SPLUNK = 'splunk',
  SUMO_LOGIC = 'sumo_logic',
  LACEWORK = 'lacework',
  ORCA_SECURITY = 'orca_security',
  AQUA_SECURITY = 'aqua_security',
  SYSDIG = 'sysdig',
  CHECKMARX = 'checkmarx',
  ARMORCODE = 'armorcode',
  PANTHER = 'panther',

  // Data Analytics
  SNOWFLAKE = 'snowflake',
  DATADOG = 'datadog',
  TABLEAU = 'tableau',
  POWER_BI = 'power_bi',
  LOOKER = 'looker',
  GRAFANA = 'grafana',
  ELASTICSEARCH = 'elasticsearch',
  NEW_RELIC = 'new_relic',
  MIXPANEL = 'mixpanel',
  AMPLITUDE = 'amplitude',
  SEGMENT = 'segment',
  REDASH = 'redash',
  METABASE = 'metabase',
  SUPERSET = 'superset',
  DOMO = 'domo',

  // Financial Tools
  QUICKBOOKS = 'quickbooks',
  XERO = 'xero',
  NETSUITE = 'netsuite',
  SAP = 'sap',
  STRIPE = 'stripe',
  BILL_COM = 'bill_com',
  EXPENSIFY = 'expensify',
  CONCUR = 'concur',
  FRESHBOOKS = 'freshbooks',
  WAVE = 'wave',
  ZIPHQ = 'ziphq',

  // HR Tools
  BAMBOOHR = 'bamboohr',
  WORKDAY = 'workday',
  ADP = 'adp',
  GUSTO = 'gusto',
  RIPPLING = 'rippling',
  NAMELY = 'namely',
  ZENEFITS = 'zenefits',
  TRINET = 'trinet',
  PAYCHEX = 'paychex',
  UKG = 'ukg',
  SAP_SUCCESSFACTORS = 'sap_successfactors',
  ORACLE_HCM = 'oracle_hcm',
  PERSONIO = 'personio',
  FACTORIAL = 'factorial',
  CHARLIEHR = 'charliehr',

  // Knowledge Management
  CONFLUENCE = 'confluence',
  NOTION_KM = 'notion_km',
  SHAREPOINT = 'sharepoint',
  GOOGLE_DRIVE = 'google_drive',
  DROPBOX = 'dropbox',
  BOX = 'box',
  GURU = 'guru',
  DOCUMENT360 = 'document360',
  SLAB = 'slab',
  TETTRA = 'tettra',
  BLOOMFIRE = 'bloomfire',
  HELPJUICE = 'helpjuice',
  KNOWLEDGEOWL = 'knowledgeowl',
  NUCLINO = 'nuclino',
  CODA = 'coda',

  // Asset Management
  SERVICENOW_ITAM = 'servicenow_itam',
  SNOW_SOFTWARE = 'snow_software',
  FLEXERA = 'flexera',
  LANSWEEPER = 'lansweeper',
  ASSET_PANDA = 'asset_panda',
  SNIPE_IT = 'snipe_it',
  IVANTI = 'ivanti',
  MANAGEENGINE_ASSETEXPLORER = 'manageengine_assetexplorer',
  OOMNITZA = 'oomnitza',
  DEVICE42 = 'device42',
  FRESHSERVICE = 'freshservice',
  ATLASSIAN_ASSETS = 'atlassian_assets',

  CUSTOM = 'custom',
}

export enum IntegrationStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  PENDING_SETUP = 'pending_setup',
}

export enum SyncFrequency {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MANUAL = 'manual',
}

export class CreateIntegrationDto {
  @ApiProperty({ enum: IntegrationType })
  @IsEnum(IntegrationType)
  type: IntegrationType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: SyncFrequency })
  @IsEnum(SyncFrequency)
  @IsOptional()
  syncFrequency?: SyncFrequency;
}

export class UpdateIntegrationDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: IntegrationStatus })
  @IsEnum(IntegrationStatus)
  @IsOptional()
  status?: IntegrationStatus;

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ enum: SyncFrequency })
  @IsEnum(SyncFrequency)
  @IsOptional()
  syncFrequency?: SyncFrequency;
}

export class IntegrationFilterDto {
  @ApiPropertyOptional({ enum: IntegrationType })
  @IsEnum(IntegrationType)
  @IsOptional()
  type?: IntegrationType;

  @ApiPropertyOptional({ enum: IntegrationStatus })
  @IsEnum(IntegrationStatus)
  @IsOptional()
  status?: IntegrationStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}

// Integration type metadata for the frontend
export const INTEGRATION_TYPES = {
  // ============================================
  // CLOUD INFRASTRUCTURE
  // ============================================
  aws: {
    name: 'Amazon Web Services',
    description: 'AWS Config, CloudTrail, IAM, SecurityHub, GuardDuty',
    icon: 'aws',
    iconSlug: 'amazonwebservices',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://docs.aws.amazon.com/',
    configFields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
      { key: 'region', label: 'Default Region', type: 'text', required: true },
      { key: 'assumeRoleArn', label: 'Assume Role ARN (optional)', type: 'text', required: false },
    ],
  },
  gcp: {
    name: 'Google Cloud Platform',
    description: 'Security Command Center, Cloud Asset Inventory, Audit Logs',
    icon: 'gcp',
    iconSlug: 'googlecloud',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://cloud.google.com/apis/docs/overview',
    configFields: [
      { key: 'projectId', label: 'Project ID', type: 'text', required: true },
      { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', type: 'textarea', required: true },
    ],
  },
  azure: {
    name: 'Microsoft Azure',
    description: 'Security Center, Azure AD, Policy Compliance',
    icon: 'azure',
    iconSlug: 'microsoftazure',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://learn.microsoft.com/en-us/rest/api/azure/',
    configFields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'subscriptionId', label: 'Subscription ID', type: 'text', required: true },
    ],
  },
  digital_ocean: {
    name: 'DigitalOcean',
    description: 'Droplets, Kubernetes, Databases, and Networking',
    icon: 'digitalocean',
    iconSlug: 'digitalocean',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://docs.digitalocean.com/reference/api/',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  oracle_cloud: {
    name: 'Oracle Cloud',
    description: 'Compute, Database, and Cloud Security',
    icon: 'oracle',
    iconSlug: 'oracle',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://docs.oracle.com/en-us/iaas/api/',
    configFields: [
      { key: 'tenancyId', label: 'Tenancy OCID', type: 'text', required: true },
      { key: 'userId', label: 'User OCID', type: 'text', required: true },
      { key: 'fingerprint', label: 'API Key Fingerprint', type: 'text', required: true },
      { key: 'privateKey', label: 'Private Key', type: 'textarea', required: true },
      { key: 'region', label: 'Region', type: 'text', required: true },
    ],
  },
  ibm_cloud: {
    name: 'IBM Cloud',
    description: 'Infrastructure, AI, and Security Services',
    icon: 'ibm',
    iconSlug: 'ibmcloud',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://cloud.ibm.com/apidocs',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'text', required: true },
    ],
  },
  alibaba_cloud: {
    name: 'Alibaba Cloud',
    description: 'Compute, Storage, and Security Services',
    icon: 'alibaba',
    iconSlug: 'alibabacloud',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://www.alibabacloud.com/help/en/api',
    configFields: [
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
      { key: 'accessKeySecret', label: 'Access Key Secret', type: 'password', required: true },
      { key: 'regionId', label: 'Region ID', type: 'text', required: true },
    ],
  },
  linode: {
    name: 'Linode',
    description: 'Cloud Computing Platform',
    icon: 'linode',
    iconSlug: 'linode',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://www.linode.com/docs/api/',
    configFields: [
      { key: 'personalAccessToken', label: 'Personal Access Token', type: 'password', required: true },
    ],
  },
  vultr: {
    name: 'Vultr',
    description: 'High Performance Cloud Compute',
    icon: 'vultr',
    iconSlug: 'vultr',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://www.vultr.com/api/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  heroku: {
    name: 'Heroku',
    description: 'Platform as a Service',
    icon: 'heroku',
    iconSlug: 'heroku',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://devcenter.heroku.com/articles/platform-api-reference',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  cloudflare: {
    name: 'Cloudflare',
    description: 'CDN, DNS, and Security Services',
    icon: 'cloudflare',
    iconSlug: 'cloudflare',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://developers.cloudflare.com/api/',
    configFields: [
      { key: 'email', label: 'Account Email', type: 'text', required: true },
      { key: 'apiKey', label: 'Global API Key', type: 'password', required: true },
    ],
  },
  vercel: {
    name: 'Vercel',
    description: 'Frontend Cloud Platform',
    icon: 'vercel',
    iconSlug: 'vercel',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://vercel.com/docs/rest-api',
    configFields: [
      { key: 'token', label: 'API Token', type: 'password', required: true },
      { key: 'teamId', label: 'Team ID (optional)', type: 'text', required: false },
    ],
  },
  netlify: {
    name: 'Netlify',
    description: 'Jamstack Deployment Platform',
    icon: 'netlify',
    iconSlug: 'netlify',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://docs.netlify.com/api/get-started/',
    configFields: [
      { key: 'accessToken', label: 'Personal Access Token', type: 'password', required: true },
    ],
  },
  render: {
    name: 'Render',
    description: 'Cloud Application Platform',
    icon: 'render',
    iconSlug: 'render',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://api-docs.render.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  hetzner: {
    name: 'Hetzner Cloud',
    description: 'European Cloud Provider',
    icon: 'hetzner',
    iconSlug: 'hetzner',
    category: 'Cloud Infrastructure',
    apiDocs: 'https://docs.hetzner.cloud/',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },

  // ============================================
  // DEVELOPER TOOLS
  // ============================================
  github: {
    name: 'GitHub',
    description: 'Branch protection, Dependabot, Code scanning, Secret scanning',
    icon: 'github',
    iconSlug: 'github',
    category: 'Developer Tools',
    apiDocs: 'https://docs.github.com/en/rest',
    configFields: [
      { key: 'token', label: 'Personal Access Token', type: 'password', required: true },
      { key: 'organization', label: 'Organization', type: 'text', required: false },
      { key: 'repositories', label: 'Repositories (comma-separated, or * for all)', type: 'text', required: false },
    ],
  },
  gitlab: {
    name: 'GitLab',
    description: 'Project settings, CI/CD configuration, Security scanning',
    icon: 'gitlab',
    iconSlug: 'gitlab',
    category: 'Developer Tools',
    apiDocs: 'https://docs.gitlab.com/api/rest/',
    configFields: [
      { key: 'token', label: 'Personal Access Token', type: 'password', required: true },
      { key: 'baseUrl', label: 'GitLab URL (for self-hosted)', type: 'text', required: false },
      { key: 'groups', label: 'Groups (comma-separated)', type: 'text', required: false },
    ],
  },
  bitbucket: {
    name: 'Bitbucket',
    description: 'Git repository hosting and CI/CD',
    icon: 'bitbucket',
    iconSlug: 'bitbucket',
    category: 'Developer Tools',
    apiDocs: 'https://developer.atlassian.com/cloud/bitbucket/rest/',
    configFields: [
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'appPassword', label: 'App Password', type: 'password', required: true },
      { key: 'workspace', label: 'Workspace', type: 'text', required: true },
    ],
  },
  docker_hub: {
    name: 'Docker Hub',
    description: 'Container Registry',
    icon: 'docker',
    iconSlug: 'docker',
    category: 'Developer Tools',
    apiDocs: 'https://docs.docker.com/registry/spec/api/',
    configFields: [
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  jenkins: {
    name: 'Jenkins',
    description: 'CI/CD Automation Server',
    icon: 'jenkins',
    iconSlug: 'jenkins',
    category: 'Developer Tools',
    apiDocs: 'https://www.jenkins.io/doc/book/using/remote-access-api/',
    configFields: [
      { key: 'url', label: 'Jenkins URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  circleci: {
    name: 'CircleCI',
    description: 'Continuous Integration and Delivery',
    icon: 'circleci',
    iconSlug: 'circleci',
    category: 'Developer Tools',
    apiDocs: 'https://circleci.com/docs/api/v2/',
    configFields: [
      { key: 'personalToken', label: 'Personal API Token', type: 'password', required: true },
    ],
  },
  travis_ci: {
    name: 'Travis CI',
    description: 'Hosted Continuous Integration',
    icon: 'travis',
    iconSlug: 'travisci',
    category: 'Developer Tools',
    apiDocs: 'https://docs.travis-ci.com/api/',
    configFields: [
      { key: 'token', label: 'API Token', type: 'password', required: true },
    ],
  },
  azure_devops: {
    name: 'Azure DevOps',
    description: 'DevOps Toolchain',
    icon: 'azuredevops',
    iconSlug: 'azuredevops',
    category: 'Developer Tools',
    apiDocs: 'https://learn.microsoft.com/en-us/rest/api/azure/devops/',
    configFields: [
      { key: 'organization', label: 'Organization', type: 'text', required: true },
      { key: 'personalAccessToken', label: 'Personal Access Token', type: 'password', required: true },
    ],
  },
  jfrog: {
    name: 'JFrog Artifactory',
    description: 'Universal Artifact Repository',
    icon: 'jfrog',
    iconSlug: 'jfrog',
    category: 'Developer Tools',
    apiDocs: 'https://www.jfrog.com/confluence/display/JFROG/Artifactory+REST+API',
    configFields: [
      { key: 'url', label: 'Artifactory URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  sonatype_nexus: {
    name: 'Sonatype Nexus',
    description: 'Repository Manager',
    icon: 'sonatype',
    iconSlug: 'sonatype',
    category: 'Developer Tools',
    apiDocs: 'https://help.sonatype.com/repomanager3/rest-and-integration-api',
    configFields: [
      { key: 'url', label: 'Nexus URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  codeclimate: {
    name: 'Code Climate',
    description: 'Code Quality and Test Coverage',
    icon: 'codeclimate',
    iconSlug: 'codeclimate',
    category: 'Developer Tools',
    apiDocs: 'https://developer.codeclimate.com/',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  sonarqube: {
    name: 'SonarQube',
    description: 'Code Quality and Security',
    icon: 'sonarqube',
    iconSlug: 'sonarqube',
    category: 'Developer Tools',
    apiDocs: 'https://docs.sonarqube.org/latest/extend/web-api/',
    configFields: [
      { key: 'url', label: 'SonarQube URL', type: 'text', required: true },
      { key: 'token', label: 'User Token', type: 'password', required: true },
    ],
  },
  pagerduty: {
    name: 'PagerDuty',
    description: 'Incident Management',
    icon: 'pagerduty',
    iconSlug: 'pagerduty',
    category: 'Developer Tools',
    apiDocs: 'https://developer.pagerduty.com/api-reference/',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  launchdarkly: {
    name: 'LaunchDarkly',
    description: 'Feature Flag Management',
    icon: 'launchdarkly',
    iconSlug: 'launchdarkly',
    category: 'Developer Tools',
    apiDocs: 'https://apidocs.launchdarkly.com/',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  sentry: {
    name: 'Sentry',
    description: 'Error Tracking and Performance Monitoring',
    icon: 'sentry',
    iconSlug: 'sentry',
    category: 'Developer Tools',
    apiDocs: 'https://docs.sentry.io/api/',
    configFields: [
      { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
      { key: 'organization', label: 'Organization Slug', type: 'text', required: true },
    ],
  },

  // ============================================
  // IDENTITY PROVIDERS
  // ============================================
  okta: {
    name: 'Okta',
    description: 'Users, MFA status, Authentication policies, System logs',
    icon: 'okta',
    iconSlug: 'okta',
    category: 'Identity Providers',
    apiDocs: 'https://developer.okta.com/docs/reference/',
    configFields: [
      { key: 'domain', label: 'Okta Domain', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  azure_ad: {
    name: 'Azure Active Directory',
    description: 'Users, Groups, Conditional Access Policies, Sign-in logs',
    icon: 'microsoft',
    iconSlug: 'microsoftazure',
    category: 'Identity Providers',
    apiDocs: 'https://learn.microsoft.com/en-us/entra/identity/',
    configFields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  google_workspace: {
    name: 'Google Workspace',
    description: 'Identity, SSO, and Access Logs',
    icon: 'google',
    iconSlug: 'google',
    category: 'Identity Providers',
    apiDocs: 'https://developers.google.com/admin-sdk',
    configFields: [
      { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', type: 'textarea', required: true },
      { key: 'adminEmail', label: 'Admin Email', type: 'text', required: true },
    ],
  },
  onelogin: {
    name: 'OneLogin',
    description: 'Identity and Access Management',
    icon: 'onelogin',
    iconSlug: 'onelogin',
    category: 'Identity Providers',
    apiDocs: 'https://developers.onelogin.com/api-docs/',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'region', label: 'Region (us or eu)', type: 'text', required: true },
    ],
  },
  auth0: {
    name: 'Auth0',
    description: 'Authentication and Authorization Platform',
    icon: 'auth0',
    iconSlug: 'auth0',
    category: 'Identity Providers',
    apiDocs: 'https://auth0.com/docs/api',
    configFields: [
      { key: 'domain', label: 'Auth0 Domain', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  ping_identity: {
    name: 'Ping Identity',
    description: 'Enterprise Identity Solutions',
    icon: 'ping',
    iconSlug: 'pingidentity',
    category: 'Identity Providers',
    apiDocs: 'https://apidocs.pingidentity.com/',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  jumpcloud: {
    name: 'JumpCloud',
    description: 'Directory-as-a-Service',
    icon: 'jumpcloud',
    iconSlug: 'jumpcloud',
    category: 'Identity Providers',
    apiDocs: 'https://docs.jumpcloud.com/api/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  duo_security: {
    name: 'Duo Security',
    description: 'Multi-Factor Authentication',
    icon: 'duo',
    iconSlug: 'duo',
    category: 'Identity Providers',
    apiDocs: 'https://duo.com/docs/adminapi',
    configFields: [
      { key: 'integrationKey', label: 'Integration Key', type: 'text', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
      { key: 'apiHostname', label: 'API Hostname', type: 'text', required: true },
    ],
  },
  lastpass: {
    name: 'LastPass',
    description: 'Password Management',
    icon: 'lastpass',
    iconSlug: 'lastpass',
    category: 'Identity Providers',
    apiDocs: 'https://support.lastpass.com/help/use-the-lastpass-provisioning-api',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'cid', label: 'Company ID (CID)', type: 'text', required: true },
    ],
  },
  one_password: {
    name: '1Password',
    description: 'Password and Secrets Management',
    icon: '1password',
    iconSlug: '1password',
    category: 'Identity Providers',
    apiDocs: 'https://developer.1password.com/',
    configFields: [
      { key: 'bearerToken', label: 'Bearer Token', type: 'password', required: true },
      { key: 'subdomain', label: 'Subdomain', type: 'text', required: true },
    ],
  },
  cyberark: {
    name: 'CyberArk',
    description: 'Privileged Access Management',
    icon: 'cyberark',
    iconSlug: 'cyberark',
    category: 'Identity Providers',
    apiDocs: 'https://docs.cyberark.com/Product-Doc/OnlineHelp/PAS/Latest/en/Content/WebServices/Implementing%20Privileged%20Account%20Security%20Web%20Services%20.htm',
    configFields: [
      { key: 'baseUrl', label: 'PVWA URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  forgerock: {
    name: 'ForgeRock',
    description: 'Identity Platform',
    icon: 'forgerock',
    iconSlug: 'forgerock',
    category: 'Identity Providers',
    apiDocs: 'https://backstage.forgerock.com/docs/',
    configFields: [
      { key: 'tenantUrl', label: 'Tenant URL', type: 'text', required: true },
      { key: 'serviceAccountId', label: 'Service Account ID', type: 'text', required: true },
      { key: 'privateKey', label: 'Private Key (JWK)', type: 'textarea', required: true },
    ],
  },
  aws_cognito: {
    name: 'AWS Cognito',
    description: 'User Authentication Service',
    icon: 'aws',
    iconSlug: 'amazoncognito',
    category: 'Identity Providers',
    apiDocs: 'https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html',
    configFields: [
      { key: 'region', label: 'Region', type: 'text', required: true },
      { key: 'userPoolId', label: 'User Pool ID', type: 'text', required: true },
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', type: 'password', required: true },
    ],
  },
  keycloak: {
    name: 'Keycloak',
    description: 'Open Source Identity and Access Management',
    icon: 'keycloak',
    iconSlug: 'keycloak',
    category: 'Identity Providers',
    apiDocs: 'https://www.keycloak.org/docs-api/',
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'text', required: true },
      { key: 'realm', label: 'Realm', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  fusionauth: {
    name: 'FusionAuth',
    description: 'Customer Identity and Access Management',
    icon: 'fusionauth',
    iconSlug: 'fusionauth',
    category: 'Identity Providers',
    apiDocs: 'https://fusionauth.io/docs/v1/tech/apis/',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  // ============================================
  // MDM (Mobile Device Management)
  // ============================================
  jamf: {
    name: 'Jamf Pro',
    description: 'Apple device management - inventory, compliance, security configurations',
    icon: 'jamf',
    iconSlug: 'jamf',
    category: 'MDM',
    apiDocs: 'https://developer.jamf.com/jamf-pro/reference/classic-api',
    configFields: [
      { key: 'serverUrl', label: 'Jamf Pro Server URL', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  microsoft_intune: {
    name: 'Microsoft Intune',
    description: 'Unified Endpoint Management',
    icon: 'microsoft',
    iconSlug: 'microsoftintune',
    category: 'MDM',
    apiDocs: 'https://learn.microsoft.com/en-us/graph/api/resources/intune-graph-overview',
    configFields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  vmware_workspace_one: {
    name: 'VMware Workspace ONE',
    description: 'Digital Workspace Platform',
    icon: 'vmware',
    iconSlug: 'vmware',
    category: 'MDM',
    apiDocs: 'https://docs.vmware.com/en/VMware-Workspace-ONE-UEM/services/UEM_ConsoleBasics/GUID-BF20C949-5065-4DCF-889D-1E0151016B5A.html',
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  citrix_endpoint: {
    name: 'Citrix Endpoint Management',
    description: 'Mobile and Desktop Management',
    icon: 'citrix',
    iconSlug: 'citrix',
    category: 'MDM',
    apiDocs: 'https://developer.cloud.com/',
    configFields: [
      { key: 'customerId', label: 'Customer ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  ibm_maas360: {
    name: 'IBM MaaS360',
    description: 'Cloud-based UEM',
    icon: 'ibm',
    iconSlug: 'ibm',
    category: 'MDM',
    apiDocs: 'https://www.ibm.com/docs/en/maas360',
    configFields: [
      { key: 'billingId', label: 'Billing ID', type: 'text', required: true },
      { key: 'platformId', label: 'Platform ID', type: 'text', required: true },
      { key: 'appId', label: 'App ID', type: 'text', required: true },
      { key: 'appVersion', label: 'App Version', type: 'text', required: true },
      { key: 'appAccessKey', label: 'App Access Key', type: 'password', required: true },
    ],
  },
  blackberry_uem: {
    name: 'BlackBerry UEM',
    description: 'Unified Endpoint Management',
    icon: 'blackberry',
    iconSlug: 'blackberry',
    category: 'MDM',
    apiDocs: 'https://docs.blackberry.com/en/unified-endpoint-management/blackberry-uem',
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  manageengine_mdm: {
    name: 'ManageEngine MDM',
    description: 'Mobile Device Manager Plus',
    icon: 'manageengine',
    iconSlug: 'zoho',
    category: 'MDM',
    apiDocs: 'https://www.manageengine.com/mobile-device-management/api/',
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  miradore: {
    name: 'Miradore',
    description: 'Cloud-based MDM',
    icon: 'miradore',
    
    
    category: 'MDM',
    apiDocs: 'https://online.miradore.com/API/APIDocumentation',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  kandji: {
    name: 'Kandji',
    description: 'Apple Device Management',
    icon: 'kandji',
    
    
    category: 'MDM',
    apiDocs: 'https://api.kandji.io/',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'subdomain', label: 'Subdomain', type: 'text', required: true },
    ],
  },

  // ============================================
  // WORKFLOW & PROJECT MANAGEMENT
  // ============================================
  jira: {
    name: 'Jira',
    description: 'Issues, Projects, Workflows for remediation tracking',
    icon: 'jira',
    iconSlug: 'jira',
    category: 'Workflow Management',
    apiDocs: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/',
    configFields: [
      { key: 'baseUrl', label: 'Jira URL', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'projectKey', label: 'Default Project Key', type: 'text', required: false },
    ],
  },
  asana: {
    name: 'Asana',
    description: 'Work Management Platform',
    icon: 'asana',
    iconSlug: 'asana',
    category: 'Workflow Management',
    apiDocs: 'https://developers.asana.com/docs',
    configFields: [
      { key: 'personalAccessToken', label: 'Personal Access Token', type: 'password', required: true },
    ],
  },
  trello: {
    name: 'Trello',
    description: 'Project Boards',
    icon: 'trello',
    iconSlug: 'trello',
    category: 'Workflow Management',
    apiDocs: 'https://developer.atlassian.com/cloud/trello/rest/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'text', required: true },
      { key: 'token', label: 'Token', type: 'password', required: true },
    ],
  },
  monday: {
    name: 'Monday.com',
    description: 'Work OS',
    icon: 'monday',
    iconSlug: 'monday',
    category: 'Workflow Management',
    apiDocs: 'https://developer.monday.com/api-reference/docs',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  clickup: {
    name: 'ClickUp',
    description: 'All-in-one Project Management',
    icon: 'clickup',
    iconSlug: 'clickup',
    category: 'Workflow Management',
    apiDocs: 'https://clickup.com/api/',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  wrike: {
    name: 'Wrike',
    description: 'Work Management Platform',
    icon: 'wrike',
    iconSlug: 'wrike',
    category: 'Workflow Management',
    apiDocs: 'https://developers.wrike.com/',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  smartsheet: {
    name: 'Smartsheet',
    description: 'Work Execution Platform',
    icon: 'smartsheet',
    iconSlug: 'smartsheet',
    category: 'Workflow Management',
    apiDocs: 'https://smartsheet.redoc.ly/',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  airtable: {
    name: 'Airtable',
    description: 'Collaborative Database',
    icon: 'airtable',
    iconSlug: 'airtable',
    category: 'Workflow Management',
    apiDocs: 'https://airtable.com/developers/web/api/introduction',
    configFields: [
      { key: 'personalAccessToken', label: 'Personal Access Token', type: 'password', required: true },
    ],
  },
  basecamp: {
    name: 'Basecamp',
    description: 'Project Management and Team Communication',
    icon: 'basecamp',
    iconSlug: 'basecamp',
    category: 'Workflow Management',
    apiDocs: 'https://github.com/basecamp/bc3-api',
    configFields: [
      { key: 'accountId', label: 'Account ID', type: 'text', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  linear: {
    name: 'Linear',
    description: 'Issue Tracking',
    icon: 'linear',
    iconSlug: 'linear',
    category: 'Workflow Management',
    apiDocs: 'https://developers.linear.app/docs',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  shortcut: {
    name: 'Shortcut',
    description: 'Project Management for Software Teams',
    icon: 'shortcut',
    
    
    category: 'Workflow Management',
    apiDocs: 'https://developer.shortcut.com/api/rest/v3',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  height: {
    name: 'Height',
    description: 'Autonomous Project Collaboration',
    icon: 'height',
    
    
    category: 'Workflow Management',
    apiDocs: 'https://www.height.app/developers',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  teamwork: {
    name: 'Teamwork',
    description: 'Project Management Software',
    icon: 'teamwork',
    iconSlug: 'teamwork',
    category: 'Workflow Management',
    apiDocs: 'https://apidocs.teamwork.com/',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'installationUrl', label: 'Installation URL', type: 'text', required: true },
    ],
  },
  podio: {
    name: 'Podio',
    description: 'Customizable Work Platform',
    icon: 'podio',
    iconSlug: 'podio',
    category: 'Workflow Management',
    apiDocs: 'https://developers.podio.com/doc',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },

  // ============================================
  // COLLABORATION
  // ============================================
  slack: {
    name: 'Slack',
    description: 'Notifications, alerts, and bot commands',
    icon: 'slack',
    iconSlug: 'slack',
    category: 'Collaboration',
    apiDocs: 'https://api.slack.com/web',
    configFields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
      { key: 'defaultChannel', label: 'Default Channel', type: 'text', required: false },
      { key: 'signingSecret', label: 'Signing Secret', type: 'password', required: false },
    ],
  },
  microsoft_teams: {
    name: 'Microsoft Teams',
    description: 'Enterprise Collaboration',
    icon: 'teams',
    iconSlug: 'microsoftteams',
    category: 'Collaboration',
    apiDocs: 'https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview',
    configFields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  zoom: {
    name: 'Zoom',
    description: 'Video Conferencing',
    icon: 'zoom',
    iconSlug: 'zoom',
    category: 'Collaboration',
    apiDocs: 'https://developers.zoom.us/docs/api/',
    configFields: [
      { key: 'accountId', label: 'Account ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  google_meet: {
    name: 'Google Meet',
    description: 'Video Meetings',
    icon: 'googlemeet',
    iconSlug: 'googlemeet',
    category: 'Collaboration',
    apiDocs: 'https://developers.google.com/meet/api',
    configFields: [
      { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', type: 'textarea', required: true },
    ],
  },
  discord: {
    name: 'Discord',
    description: 'Team Communication',
    icon: 'discord',
    iconSlug: 'discord',
    category: 'Collaboration',
    apiDocs: 'https://discord.com/developers/docs/intro',
    configFields: [
      { key: 'botToken', label: 'Bot Token', type: 'password', required: true },
    ],
  },
  webex: {
    name: 'Webex',
    description: 'Cisco Video Conferencing',
    icon: 'webex',
    iconSlug: 'webex',
    category: 'Collaboration',
    apiDocs: 'https://developer.webex.com/docs/api/getting-started',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  mattermost: {
    name: 'Mattermost',
    description: 'Open Source Messaging',
    icon: 'mattermost',
    iconSlug: 'mattermost',
    category: 'Collaboration',
    apiDocs: 'https://api.mattermost.com/',
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'text', required: true },
      { key: 'personalAccessToken', label: 'Personal Access Token', type: 'password', required: true },
    ],
  },
  ringcentral: {
    name: 'RingCentral',
    description: 'Unified Communications',
    icon: 'ringcentral',
    iconSlug: 'ringcentral',
    category: 'Collaboration',
    apiDocs: 'https://developers.ringcentral.com/',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'jwtToken', label: 'JWT Token', type: 'password', required: true },
    ],
  },
  gotomeeting: {
    name: 'GoToMeeting',
    description: 'Web Conferencing',
    icon: 'gotomeeting',
    iconSlug: 'gotomeeting',
    category: 'Collaboration',
    apiDocs: 'https://developer.goto.com/guides/HowTos/',
    configFields: [
      { key: 'accessToken', label: 'OAuth Access Token', type: 'password', required: true },
    ],
  },
  chanty: {
    name: 'Chanty',
    description: 'Team Chat',
    icon: 'chanty',
    
    
    category: 'Collaboration',
    apiDocs: 'https://www.chanty.com/api/',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  twist: {
    name: 'Twist',
    description: 'Asynchronous Communication',
    icon: 'twist',
    iconSlug: 'twist',
    category: 'Collaboration',
    apiDocs: 'https://developer.twist.com/v3/',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  workplace_meta: {
    name: 'Workplace by Meta',
    description: 'Enterprise Social Network',
    icon: 'workplace',
    iconSlug: 'workplace',
    category: 'Collaboration',
    apiDocs: 'https://developers.facebook.com/docs/workplace/',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'communityId', label: 'Community ID', type: 'text', required: true },
    ],
  },
  flock: {
    name: 'Flock',
    description: 'Team Messaging',
    icon: 'flock',
    iconSlug: 'flock',
    category: 'Collaboration',
    apiDocs: 'https://docs.flock.com/display/flockos/API+Overview',
    configFields: [
      { key: 'appId', label: 'App ID', type: 'text', required: true },
      { key: 'appSecret', label: 'App Secret', type: 'password', required: true },
      { key: 'userToken', label: 'User Token', type: 'password', required: true },
    ],
  },
  rocket_chat: {
    name: 'Rocket.Chat',
    description: 'Open Source Chat',
    icon: 'rocketchat',
    iconSlug: 'rocketdotchat',
    category: 'Collaboration',
    apiDocs: 'https://developer.rocket.chat/reference/api',
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'text', required: true },
      { key: 'userId', label: 'User ID', type: 'text', required: true },
      { key: 'authToken', label: 'Auth Token', type: 'password', required: true },
    ],
  },

  // Continuing with remaining categories...
  // Due to length, I'll include the structure for remaining categories

  salesforce: {
    name: 'Salesforce',
    description: 'Enterprise CRM',
    icon: 'salesforce',
    iconSlug: 'salesforce',
    category: 'CRM & Support',
    apiDocs: 'https://developer.salesforce.com/docs/apis',
    configFields: [
      { key: 'instanceUrl', label: 'Instance URL', type: 'text', required: true },
      { key: 'clientId', label: 'Consumer Key', type: 'text', required: true },
      { key: 'clientSecret', label: 'Consumer Secret', type: 'password', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'securityToken', label: 'Security Token', type: 'password', required: true },
    ],
  },
  hubspot: {
    name: 'HubSpot',
    description: 'Marketing and Sales CRM',
    icon: 'hubspot',
    iconSlug: 'hubspot',
    category: 'CRM & Support',
    apiDocs: 'https://developers.hubspot.com/docs/api/overview',
    configFields: [
      { key: 'accessToken', label: 'Private App Access Token', type: 'password', required: true },
    ],
  },
  zendesk: {
    name: 'Zendesk',
    description: 'Customer Support Platform',
    icon: 'zendesk',
    iconSlug: 'zendesk',
    category: 'CRM & Support',
    apiDocs: 'https://developer.zendesk.com/api-reference/',
    configFields: [
      { key: 'subdomain', label: 'Subdomain', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  servicenow: {
    name: 'ServiceNow',
    description: 'IT Service Management',
    icon: 'servicenow',
    iconSlug: 'servicenow',
    category: 'CRM & Support',
    apiDocs: 'https://developer.servicenow.com/dev.do#!/reference/api',
    configFields: [
      { key: 'instanceUrl', label: 'Instance URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  freshdesk: {
    name: 'Freshdesk',
    description: 'Customer Support Software',
    icon: 'freshdesk',
    iconSlug: 'freshdesk',
    category: 'CRM & Support',
    apiDocs: 'https://developers.freshdesk.com/api/',
    configFields: [
      { key: 'domain', label: 'Domain', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  intercom: {
    name: 'Intercom',
    description: 'Customer Messaging Platform',
    icon: 'intercom',
    iconSlug: 'intercom',
    category: 'CRM & Support',
    apiDocs: 'https://developers.intercom.com/',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  front: {
    name: 'Front',
    description: 'Shared Inbox',
    icon: 'front',
    iconSlug: 'frontapp',
    category: 'CRM & Support',
    apiDocs: 'https://dev.frontapp.com/',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  help_scout: {
    name: 'Help Scout',
    description: 'Help Desk Software',
    icon: 'helpscout',
    iconSlug: 'helpscout',
    category: 'CRM & Support',
    apiDocs: 'https://developer.helpscout.com/',
    configFields: [
      { key: 'appId', label: 'App ID', type: 'text', required: true },
      { key: 'appSecret', label: 'App Secret', type: 'password', required: true },
    ],
  },
  zoho_crm: {
    name: 'Zoho CRM',
    description: 'CRM Software',
    icon: 'zoho',
    iconSlug: 'zoho',
    category: 'CRM & Support',
    apiDocs: 'https://www.zoho.com/crm/developer/docs/api/v2/',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
    ],
  },
  pipedrive: {
    name: 'Pipedrive',
    description: 'Sales CRM',
    icon: 'pipedrive',
    iconSlug: 'pipedrive',
    category: 'CRM & Support',
    apiDocs: 'https://developers.pipedrive.com/docs/api/v1',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'companyDomain', label: 'Company Domain', type: 'text', required: true },
    ],
  },
  monday_crm: {
    name: 'Monday CRM',
    description: 'CRM Platform',
    icon: 'monday',
    iconSlug: 'monday',
    category: 'CRM & Support',
    apiDocs: 'https://developer.monday.com/api-reference/docs',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  dynamics_365: {
    name: 'Dynamics 365',
    description: 'Microsoft CRM',
    icon: 'microsoft',
    iconSlug: 'microsoftdynamics365',
    category: 'CRM & Support',
    apiDocs: 'https://learn.microsoft.com/en-us/dynamics365/',
    configFields: [
      { key: 'instanceUrl', label: 'Instance URL', type: 'text', required: true },
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  sugarcrm: {
    name: 'SugarCRM',
    description: 'CRM Platform',
    icon: 'sugarcrm',
    
    
    category: 'CRM & Support',
    apiDocs: 'https://support.sugarcrm.com/Documentation/Sugar_Developer/Sugar_Developer_Guide_12.0/Integration/Web_Services/REST_API/',
    configFields: [
      { key: 'url', label: 'SugarCRM URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  copper: {
    name: 'Copper',
    description: 'CRM for G Suite',
    icon: 'copper',
    iconSlug: 'copper',
    category: 'CRM & Support',
    apiDocs: 'https://developer.copper.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
    ],
  },
  pega: {
    name: 'Pega',
    description: 'CRM and BPM',
    icon: 'pega',
    
    
    category: 'CRM & Support',
    apiDocs: 'https://docs.pega.com/bundle/platform/page/platform/apis/pega-apis.html',
    configFields: [
      { key: 'baseUrl', label: 'Base URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },

  // Cybersecurity Tools
  crowdstrike: {
    name: 'CrowdStrike',
    description: 'EDR/XDR Platform',
    icon: 'crowdstrike',
    iconSlug: 'crowdstrike',
    category: 'Cybersecurity',
    apiDocs: 'https://falcon.crowdstrike.com/documentation/page/a2a7fc0e/crowdstrike-oauth2-based-apis',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'baseUrl', label: 'Base URL', type: 'text', required: true },
    ],
  },
  wiz: {
    name: 'Wiz',
    description: 'Cloud Security Platform',
    icon: 'wiz',
    iconSlug: 'wiz',
    category: 'Cybersecurity',
    apiDocs: 'https://docs.wiz.io/wiz-docs/docs/using-the-wiz-api',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'authUrl', label: 'Auth URL', type: 'text', required: true },
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
    ],
  },
  snyk: {
    name: 'Snyk',
    description: 'Application Security Platform',
    icon: 'snyk',
    iconSlug: 'snyk',
    category: 'Cybersecurity',
    apiDocs: 'https://snyk.docs.apiary.io/',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'organizationId', label: 'Organization ID', type: 'text', required: false },
    ],
  },
  tenable: {
    name: 'Tenable',
    description: 'Vulnerability Management',
    icon: 'tenable',
    iconSlug: 'tenable',
    category: 'Cybersecurity',
    apiDocs: 'https://developer.tenable.com/reference/navigate',
    configFields: [
      { key: 'accessKey', label: 'Access Key', type: 'text', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    ],
  },
  rapid7: {
    name: 'Rapid7',
    description: 'Vulnerability Management',
    icon: 'rapid7',
    iconSlug: 'rapid7',
    category: 'Cybersecurity',
    apiDocs: 'https://help.rapid7.com/insightvm/en-us/api/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'text', required: true },
    ],
  },
  qualys: {
    name: 'Qualys',
    description: 'Security & Compliance',
    icon: 'qualys',
    iconSlug: 'qualys',
    category: 'Cybersecurity',
    apiDocs: 'https://www.qualys.com/docs/qualys-api-vmpc-user-guide.pdf',
    configFields: [
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'platform', label: 'Platform URL', type: 'text', required: true },
    ],
  },
  prisma_cloud: {
    name: 'Prisma Cloud',
    description: 'Cloud Security',
    icon: 'prismacloud',
    iconSlug: 'prisma',
    
    category: 'Cybersecurity',
    apiDocs: 'https://prisma.pan.dev/api/cloud/',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'accessKeyId', label: 'Access Key ID', type: 'text', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    ],
  },
  sentinelone: {
    name: 'SentinelOne',
    description: 'Endpoint Security',
    icon: 'sentinelone',
    iconSlug: 'sentinelone',
    
    category: 'Cybersecurity',
    apiDocs: 'https://usea1-partners.sentinelone.net/docs/en/introduction.html',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'consoleUrl', label: 'Console URL', type: 'text', required: true },
    ],
  },
  splunk: {
    name: 'Splunk',
    description: 'SIEM Platform',
    icon: 'splunk',
    iconSlug: 'splunk',
    
    category: 'Cybersecurity',
    apiDocs: 'https://docs.splunk.com/Documentation/Splunk/latest/RESTREF/RESTprolog',
    configFields: [
      { key: 'host', label: 'Splunk Host', type: 'text', required: true },
      { key: 'port', label: 'Port', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  sumo_logic: {
    name: 'Sumo Logic',
    description: 'Log Management',
    icon: 'sumologic',
    iconSlug: 'sumologic',
    
    category: 'Cybersecurity',
    apiDocs: 'https://api.sumologic.com/docs/',
    configFields: [
      { key: 'accessId', label: 'Access ID', type: 'text', required: true },
      { key: 'accessKey', label: 'Access Key', type: 'password', required: true },
      { key: 'endpoint', label: 'API Endpoint', type: 'text', required: true },
    ],
  },
  lacework: {
    name: 'Lacework',
    description: 'Cloud Security',
    icon: 'lacework',
    
    
    category: 'Cybersecurity',
    apiDocs: 'https://docs.lacework.com/api',
    configFields: [
      { key: 'account', label: 'Account Name', type: 'text', required: true },
      { key: 'keyId', label: 'Key ID', type: 'text', required: true },
      { key: 'secret', label: 'Secret', type: 'password', required: true },
    ],
  },
  orca_security: {
    name: 'Orca Security',
    description: 'Cloud Security',
    icon: 'orca',
    
    
    category: 'Cybersecurity',
    apiDocs: 'https://docs.orcasecurity.io/reference',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  aqua_security: {
    name: 'Aqua Security',
    description: 'Container Security',
    icon: 'aqua',
    iconSlug: 'aquasecurity',
    
    category: 'Cybersecurity',
    apiDocs: 'https://docs.aquasec.com/reference',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  sysdig: {
    name: 'Sysdig',
    description: 'Container Security',
    icon: 'sysdig',
    iconSlug: 'sysdig',
    
    category: 'Cybersecurity',
    apiDocs: 'https://docs.sysdig.com/en/sysdig-rest-api-conventions.html',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'text', required: true },
    ],
  },
  checkmarx: {
    name: 'Checkmarx',
    description: 'Application Security',
    icon: 'checkmarx',
    iconSlug: 'checkmarx',
    category: 'Cybersecurity',
    apiDocs: 'https://checkmarx.com/resource/documents/en/34965-8150-rest-api.html',
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  armorcode: {
    name: 'ArmorCode',
    description: 'Application Security Posture Management',
    icon: 'armorcode',
    
    
    category: 'Cybersecurity',
    apiDocs: 'https://docs.armorcode.com/docs/api-documentation',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'accessKey', label: 'Access Key', type: 'text', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    ],
  },
  panther: {
    name: 'Panther',
    description: 'Cloud-Native SIEM',
    icon: 'panther',
    
    
    category: 'Cybersecurity',
    apiDocs: 'https://docs.panther.com/api-beta',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  // Data Analytics
  snowflake: {
    name: 'Snowflake',
    description: 'Cloud Data Warehouse',
    icon: 'snowflake',
    iconSlug: 'snowflake',
    category: 'Data Analytics',
    apiDocs: 'https://docs.snowflake.com/en/developer-guide/sql-api/index',
    configFields: [
      { key: 'account', label: 'Account Identifier', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'warehouse', label: 'Warehouse', type: 'text', required: true },
    ],
  },
  datadog: {
    name: 'Datadog',
    description: 'Monitoring and Analytics',
    icon: 'datadog',
    iconSlug: 'datadog',
    
    category: 'Data Analytics',
    apiDocs: 'https://docs.datadoghq.com/api/latest/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'appKey', label: 'Application Key', type: 'password', required: true },
    ],
  },
  tableau: {
    name: 'Tableau',
    description: 'Data Visualization',
    icon: 'tableau',
    iconSlug: 'tableau',
    category: 'Data Analytics',
    apiDocs: 'https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api.htm',
    configFields: [
      { key: 'serverUrl', label: 'Server URL', type: 'text', required: true },
      { key: 'siteName', label: 'Site Name', type: 'text', required: true },
      { key: 'personalAccessToken', label: 'Personal Access Token', type: 'password', required: true },
      { key: 'tokenName', label: 'Token Name', type: 'text', required: true },
    ],
  },
  power_bi: {
    name: 'Power BI',
    description: 'Business Analytics',
    icon: 'powerbi',
    iconSlug: 'powerbi',
    category: 'Data Analytics',
    apiDocs: 'https://learn.microsoft.com/en-us/rest/api/power-bi/',
    configFields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  looker: {
    name: 'Looker',
    description: 'Business Intelligence',
    icon: 'looker',
    iconSlug: 'looker',
    category: 'Data Analytics',
    apiDocs: 'https://cloud.google.com/looker/docs/reference/looker-api/latest',
    configFields: [
      { key: 'baseUrl', label: 'Base URL', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  grafana: {
    name: 'Grafana',
    description: 'Observability Platform',
    icon: 'grafana',
    iconSlug: 'grafana',
    
    category: 'Data Analytics',
    apiDocs: 'https://grafana.com/docs/grafana/latest/developers/http_api/',
    configFields: [
      { key: 'url', label: 'Grafana URL', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  elasticsearch: {
    name: 'Elasticsearch',
    description: 'Search Engine',
    icon: 'elasticsearch',
    iconSlug: 'elasticsearch',
    
    category: 'Data Analytics',
    apiDocs: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/rest-apis.html',
    configFields: [
      { key: 'url', label: 'Elasticsearch URL', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  new_relic: {
    name: 'New Relic',
    description: 'Observability Platform',
    icon: 'newrelic',
    iconSlug: 'newrelic',
    
    category: 'Data Analytics',
    apiDocs: 'https://docs.newrelic.com/docs/apis/intro-apis/introduction-new-relic-apis/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'accountId', label: 'Account ID', type: 'text', required: true },
    ],
  },
  mixpanel: {
    name: 'Mixpanel',
    description: 'Product Analytics',
    icon: 'mixpanel',
    iconSlug: 'mixpanel',
    category: 'Data Analytics',
    apiDocs: 'https://developer.mixpanel.com/reference/overview',
    configFields: [
      { key: 'projectToken', label: 'Project Token', type: 'text', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', required: true },
    ],
  },
  amplitude: {
    name: 'Amplitude',
    description: 'Product Analytics',
    icon: 'amplitude',
    iconSlug: 'amplitude',
    category: 'Data Analytics',
    apiDocs: 'https://www.docs.developers.amplitude.com/analytics/apis/http-v2-api/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    ],
  },
  segment: {
    name: 'Segment',
    description: 'Customer Data Platform',
    icon: 'segment',
    iconSlug: 'segment',
    category: 'Data Analytics',
    apiDocs: 'https://segment.com/docs/api/',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  redash: {
    name: 'Redash',
    description: 'Data Visualization',
    icon: 'redash',
    iconSlug: 'redash',
    
    category: 'Data Analytics',
    apiDocs: 'https://redash.io/help/user-guide/integrations-and-api/api',
    configFields: [
      { key: 'url', label: 'Redash URL', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  metabase: {
    name: 'Metabase',
    description: 'BI Tool',
    icon: 'metabase',
    iconSlug: 'metabase',
    
    category: 'Data Analytics',
    apiDocs: 'https://www.metabase.com/docs/latest/api-documentation',
    configFields: [
      { key: 'url', label: 'Metabase URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  superset: {
    name: 'Apache Superset',
    description: 'Data Visualization',
    icon: 'superset',
    iconSlug: 'apachesuperset',
    
    category: 'Data Analytics',
    apiDocs: 'https://superset.apache.org/docs/api',
    configFields: [
      { key: 'url', label: 'Superset URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  domo: {
    name: 'Domo',
    description: 'Business Intelligence',
    icon: 'domo',
    iconSlug: 'domo',
    category: 'Data Analytics',
    apiDocs: 'https://developer.domo.com/docs/dev-studio-references/api',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },

  // Financial Tools
  quickbooks: {
    name: 'QuickBooks',
    description: 'Accounting Software',
    icon: 'quickbooks',
    iconSlug: 'quickbooks',
    category: 'Financial Tools',
    apiDocs: 'https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/account',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'realmId', label: 'Realm ID', type: 'text', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
    ],
  },
  stripe: {
    name: 'Stripe',
    description: 'Payment Processing',
    icon: 'stripe',
    iconSlug: 'stripe',
    category: 'Financial Tools',
    apiDocs: 'https://stripe.com/docs/api',
    configFields: [
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    ],
  },
  xero: {
    name: 'Xero',
    description: 'Accounting Software',
    icon: 'xero',
    iconSlug: 'xero',
    category: 'Financial Tools',
    apiDocs: 'https://developer.xero.com/documentation/api/api-overview',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
    ],
  },
  netsuite: {
    name: 'NetSuite',
    description: 'ERP System',
    icon: 'netsuite',
    iconSlug: 'netsuite',
    category: 'Financial Tools',
    apiDocs: 'https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html',
    configFields: [
      { key: 'accountId', label: 'Account ID', type: 'text', required: true },
      { key: 'consumerKey', label: 'Consumer Key', type: 'text', required: true },
      { key: 'consumerSecret', label: 'Consumer Secret', type: 'password', required: true },
      { key: 'tokenId', label: 'Token ID', type: 'text', required: true },
      { key: 'tokenSecret', label: 'Token Secret', type: 'password', required: true },
    ],
  },
  sap: {
    name: 'SAP',
    description: 'Enterprise Software',
    icon: 'sap',
    
    
    iconSlug: 'sap',
    category: 'Financial Tools',
    apiDocs: 'https://api.sap.com/',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  bill_com: {
    name: 'Bill.com',
    description: 'Accounts Payable',
    icon: 'bill',
    
    
    category: 'Financial Tools',
    apiDocs: 'https://developer.bill.com/hc/en-us/articles/215407628-API-Documentation',
    configFields: [
      { key: 'userName', label: 'User Name', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
      { key: 'devKey', label: 'Developer Key', type: 'password', required: true },
      { key: 'orgId', label: 'Organization ID', type: 'text', required: true },
    ],
  },
  expensify: {
    name: 'Expensify',
    description: 'Expense Management',
    icon: 'expensify',
    iconSlug: 'expensify',
    category: 'Financial Tools',
    apiDocs: 'https://integrations.expensify.com/Integration-Server/doc/',
    configFields: [
      { key: 'partnerUserId', label: 'Partner User ID', type: 'text', required: true },
      { key: 'partnerUserSecret', label: 'Partner User Secret', type: 'password', required: true },
    ],
  },
  concur: {
    name: 'SAP Concur',
    description: 'Travel & Expense',
    icon: 'concur',
    iconSlug: 'sap',
    category: 'Financial Tools',
    apiDocs: 'https://developer.concur.com/api-reference/',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
    ],
  },
  freshbooks: {
    name: 'FreshBooks',
    description: 'Accounting Software',
    icon: 'freshbooks',
    iconSlug: 'freshbooks',
    
    category: 'Financial Tools',
    apiDocs: 'https://www.freshbooks.com/api/start',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  wave: {
    name: 'Wave',
    description: 'Accounting Software',
    icon: 'wave',
    iconSlug: 'wave',
    category: 'Financial Tools',
    apiDocs: 'https://developer.waveapps.com/hc/en-us/articles/360019968212-API-Overview',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
      { key: 'businessId', label: 'Business ID', type: 'text', required: true },
    ],
  },
  ziphq: {
    name: 'Zip',
    description: 'Procurement & Spend Management - Sync vendors, contracts, and spend data',
    icon: 'ziphq',
    category: 'Financial Tools',
    apiDocs: 'https://developers.ziphq.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, description: 'Your Zip API key from Settings > API' },
      { key: 'environment', label: 'Environment', type: 'select', required: false, options: ['production', 'sandbox'], default: 'production' },
      { key: 'syncVendors', label: 'Sync Vendors to TPRM', type: 'boolean', required: false, default: true },
      { key: 'syncContracts', label: 'Sync Contracts', type: 'boolean', required: false, default: true },
      { key: 'syncSpend', label: 'Sync Spend Data', type: 'boolean', required: false, default: true },
    ],
    evidenceTypes: [
      { key: 'vendors', label: 'Vendors/Suppliers', description: 'Import and sync vendors from Zip', defaultEnabled: true },
      { key: 'contracts', label: 'Contracts', description: 'Contract status and expiration tracking', defaultEnabled: true },
      { key: 'spend', label: 'Spend Analytics', description: 'Vendor spend summaries and trends', defaultEnabled: true },
      { key: 'compliance', label: 'Vendor Compliance', description: 'SOC2, ISO27001, and insurance status', defaultEnabled: true },
    ],
    capabilities: [
      'vendor_sync',
      'contract_tracking',
      'spend_analytics',
      'compliance_status',
      'risk_scoring',
    ],
  },

  // HR Tools
  bamboohr: {
    name: 'BambooHR',
    description: 'HR Management Software',
    icon: 'bamboohr',
    iconSlug: 'bamboo',
    category: 'HR Tools',
    apiDocs: 'https://documentation.bamboohr.com/docs',
    configFields: [
      { key: 'subdomain', label: 'Subdomain', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  workday: {
    name: 'Workday',
    description: 'Enterprise HCM',
    icon: 'workday',
    iconSlug: 'workday',
    category: 'HR Tools',
    apiDocs: 'https://community.workday.com/sites/default/files/file-hosting/restapi/index.html',
    configFields: [
      { key: 'tenantName', label: 'Tenant Name', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  adp: {
    name: 'ADP',
    description: 'Payroll & HR',
    icon: 'adp',
    iconSlug: 'adp',
    category: 'HR Tools',
    apiDocs: 'https://developers.adp.com/',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'sslCertPath', label: 'SSL Certificate Path', type: 'text', required: true },
    ],
  },
  gusto: {
    name: 'Gusto',
    description: 'Payroll & HR',
    icon: 'gusto',
    iconSlug: 'gusto',
    category: 'HR Tools',
    apiDocs: 'https://docs.gusto.com/',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  rippling: {
    name: 'Rippling',
    description: 'HR Platform',
    icon: 'rippling',
    iconSlug: 'rippling',
    category: 'HR Tools',
    apiDocs: 'https://developer.rippling.com/docs/rippling-api/',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  namely: {
    name: 'Namely',
    description: 'HR Platform',
    icon: 'namely',
    
    
    category: 'HR Tools',
    apiDocs: 'https://developers.namely.com/',
    configFields: [
      { key: 'subdomain', label: 'Subdomain', type: 'text', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  zenefits: {
    name: 'Zenefits',
    description: 'HR Software',
    icon: 'zenefits',
    iconSlug: 'zenefits',
    category: 'HR Tools',
    apiDocs: 'https://developers.zenefits.com/docs/getting-started',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  trinet: {
    name: 'TriNet',
    description: 'HR Solutions',
    icon: 'trinet',
    
    
    category: 'HR Tools',
    apiDocs: 'https://www.trinet.com/',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  paychex: {
    name: 'Paychex',
    description: 'Payroll Services',
    icon: 'paychex',
    iconSlug: 'paychex',
    category: 'HR Tools',
    apiDocs: 'https://developer.paychex.com/',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  ukg: {
    name: 'UKG',
    description: 'Workforce Management',
    icon: 'ukg',
    
    
    category: 'HR Tools',
    apiDocs: 'https://developer.ukg.com/',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  sap_successfactors: {
    name: 'SAP SuccessFactors',
    description: 'HCM',
    icon: 'sap',
    iconSlug: 'sap',
    
    category: 'HR Tools',
    apiDocs: 'https://api.sap.com/package/SAPSuccessFactors/',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'companyId', label: 'Company ID', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  oracle_hcm: {
    name: 'Oracle HCM',
    description: 'Human Capital Management',
    icon: 'oracle',
    iconSlug: 'oracle',
    
    category: 'HR Tools',
    apiDocs: 'https://docs.oracle.com/en/cloud/saas/human-resources/',
    configFields: [
      { key: 'baseUrl', label: 'Base URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  personio: {
    name: 'Personio',
    description: 'HR Management',
    icon: 'personio',
    iconSlug: 'personio',
    category: 'HR Tools',
    apiDocs: 'https://developer.personio.de/reference/getting-started',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  factorial: {
    name: 'Factorial',
    description: 'HR Software',
    icon: 'factorial',
    iconSlug: 'factorial',
    
    category: 'HR Tools',
    apiDocs: 'https://apidoc.factorialhr.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  charliehr: {
    name: 'Charlie HR',
    description: 'HR Platform',
    icon: 'charlie',
    
    
    category: 'HR Tools',
    apiDocs: 'https://www.charliehr.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },

  // Knowledge Management
  confluence: {
    name: 'Confluence',
    description: 'Team Collaboration and Documentation',
    icon: 'confluence',
    iconSlug: 'confluence',
    category: 'Knowledge Management',
    apiDocs: 'https://developer.atlassian.com/cloud/confluence/rest/v2/intro/',
    configFields: [
      { key: 'baseUrl', label: 'Confluence URL', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  sharepoint: {
    name: 'SharePoint',
    description: 'Document Management and Storage',
    icon: 'sharepoint',
    iconSlug: 'microsoftsharepoint',
    category: 'Knowledge Management',
    apiDocs: 'https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/sharepoint-net-server-csom-jsom-and-rest-api-index',
    configFields: [
      { key: 'tenantId', label: 'Tenant ID', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'siteUrl', label: 'Site URL', type: 'text', required: true },
    ],
  },
  google_drive: {
    name: 'Google Drive',
    description: 'Cloud Storage',
    icon: 'googledrive',
    iconSlug: 'googledrive',
    
    category: 'Knowledge Management',
    apiDocs: 'https://developers.google.com/drive/api/reference/rest/v3',
    configFields: [
      { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', type: 'textarea', required: true },
    ],
  },
  dropbox: {
    name: 'Dropbox',
    description: 'Cloud Storage',
    icon: 'dropbox',
    iconSlug: 'dropbox',
    
    category: 'Knowledge Management',
    apiDocs: 'https://www.dropbox.com/developers/documentation/http/documentation',
    configFields: [
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
  },
  box: {
    name: 'Box',
    description: 'Cloud Content Management',
    icon: 'box',
    iconSlug: 'box',
    
    category: 'Knowledge Management',
    apiDocs: 'https://developer.box.com/reference/',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'enterpriseId', label: 'Enterprise ID', type: 'text', required: true },
    ],
  },
  guru: {
    name: 'Guru',
    description: 'Knowledge Management',
    icon: 'guru',
    iconSlug: 'guru',
    category: 'Knowledge Management',
    apiDocs: 'https://developer.getguru.com/reference',
    configFields: [
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  document360: {
    name: 'Document360',
    description: 'Knowledge Base',
    icon: 'document360',
    
    
    category: 'Knowledge Management',
    apiDocs: 'https://apidocs.document360.io/',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  slab: {
    name: 'Slab',
    description: 'Knowledge Base',
    icon: 'slab',
    
    
    category: 'Knowledge Management',
    apiDocs: 'https://developers.slab.com/reference',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  tettra: {
    name: 'Tettra',
    description: 'Knowledge Base',
    icon: 'tettra',
    
    
    category: 'Knowledge Management',
    apiDocs: 'https://support.tettra.com/en/articles/3174930-api-documentation',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  bloomfire: {
    name: 'Bloomfire',
    description: 'Knowledge Sharing',
    icon: 'bloomfire',
    
    
    category: 'Knowledge Management',
    apiDocs: 'https://bloomfire.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'domain', label: 'Domain', type: 'text', required: true },
    ],
  },
  helpjuice: {
    name: 'Helpjuice',
    description: 'Knowledge Base',
    icon: 'helpjuice',
    
    
    category: 'Knowledge Management',
    apiDocs: 'https://help.helpjuice.com/en/articles/682251-api-overview',
    configFields: [
      { key: 'account', label: 'Account', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  knowledgeowl: {
    name: 'KnowledgeOwl',
    description: 'Knowledge Base',
    icon: 'knowledgeowl',
    
    
    category: 'Knowledge Management',
    apiDocs: 'https://docs.knowledgeowl.com/help/api',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  nuclino: {
    name: 'Nuclino',
    description: 'Team Knowledge Base',
    icon: 'nuclino',
    iconSlug: 'nuclino',
    category: 'Knowledge Management',
    apiDocs: 'https://www.nuclino.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  coda: {
    name: 'Coda',
    description: 'Doc Platform',
    icon: 'coda',
    iconSlug: 'coda',
    category: 'Knowledge Management',
    apiDocs: 'https://coda.io/developers/apis/v1',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },

  servicenow_itam: {
    name: 'ServiceNow ITAM',
    description: 'IT Asset Management',
    icon: 'servicenow',
    iconSlug: 'servicenow',
    category: 'Asset Management',
    apiDocs: 'https://docs.servicenow.com/',
    configFields: [
      { key: 'instanceUrl', label: 'Instance URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  snow_software: {
    name: 'Snow Software',
    description: 'Software Asset Management',
    icon: 'snow',
    
    
    category: 'Asset Management',
    apiDocs: 'https://docs-snow.flexera.com/snow-atlas-api/resources/',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  flexera: {
    name: 'Flexera',
    description: 'IT Asset Management & Optimization',
    icon: 'flexera',
    iconSlug: 'flexera',
    category: 'Asset Management',
    apiDocs: 'https://developer.flexera.com/',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  lansweeper: {
    name: 'Lansweeper',
    description: 'IT Discovery & Asset Management',
    icon: 'lansweeper',
    iconSlug: 'lansweeper',
    category: 'Asset Management',
    apiDocs: 'https://developer.lansweeper.com/',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  asset_panda: {
    name: 'Asset Panda',
    description: 'Asset Tracking & Management',
    icon: 'assetpanda',
    
    
    category: 'Asset Management',
    apiDocs: 'https://docs.api.assetpanda.app/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'subdomain', label: 'Subdomain', type: 'text', required: true },
    ],
  },
  snipe_it: {
    name: 'Snipe-IT',
    description: 'Open Source Asset Management',
    icon: 'snipeit',
    
    
    category: 'Asset Management',
    apiDocs: 'https://snipe-it.readme.io/reference/api-overview',
    configFields: [
      { key: 'baseUrl', label: 'Base URL', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  ivanti: {
    name: 'Ivanti',
    description: 'IT Asset Management',
    icon: 'ivanti',
    iconSlug: 'ivanti',
    category: 'Asset Management',
    apiDocs: 'https://www.ivanti.com/support/api',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  manageengine_assetexplorer: {
    name: 'ManageEngine AssetExplorer',
    description: 'IT Asset Management',
    icon: 'manageengine',
    iconSlug: 'zoho',
    category: 'Asset Management',
    apiDocs: 'https://www.manageengine.com/products/asset-explorer/aecloud-v3-api/',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  oomnitza: {
    name: 'Oomnitza',
    description: 'Enterprise Technology Management',
    icon: 'oomnitza',
    
    
    category: 'Asset Management',
    apiDocs: 'https://oomnitza.zendesk.com/hc/en-us/articles/17200339347991-Oomnitza-REST-APIs',
    configFields: [
      { key: 'apiUrl', label: 'API URL', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  device42: {
    name: 'Device42',
    description: 'IT Infrastructure Management',
    icon: 'device42',
    
    
    category: 'Asset Management',
    apiDocs: 'https://api.device42.com/',
    configFields: [
      { key: 'baseUrl', label: 'Base URL', type: 'text', required: true },
      { key: 'username', label: 'Username', type: 'text', required: true },
      { key: 'password', label: 'Password', type: 'password', required: true },
    ],
  },
  freshservice: {
    name: 'Freshservice',
    description: 'IT Service Management & Asset Tracking',
    icon: 'freshservice',
    iconSlug: 'freshworks',
    category: 'Asset Management',
    apiDocs: 'https://api.freshservice.com/',
    configFields: [
      { key: 'domain', label: 'Domain', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  atlassian_assets: {
    name: 'Atlassian Assets',
    description: 'Asset & Configuration Management for Jira',
    icon: 'atlassian',
    iconSlug: 'atlassian',
    category: 'Asset Management',
    apiDocs: 'https://developer.atlassian.com/cloud/assets/',
    configFields: [
      { key: 'siteUrl', label: 'Jira Site URL', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  // BACKGROUND CHECK PROVIDERS
  certn: {
    name: 'Certn',
    description: 'AI-powered background checks, identity verification, and risk assessment',
    icon: 'certn',
    iconSlug: 'certn',
    category: 'Background Check',
    apiDocs: 'https://docs.certn.co/reference/getting-started',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  checkr: {
    name: 'Checkr',
    description: 'Comprehensive background checks, screening, and compliance verification',
    icon: 'checkr',
    iconSlug: 'checkr',
    category: 'Background Check',
    apiDocs: 'https://docs.checkr.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  sterling: {
    name: 'Sterling',
    description: 'Background screening, identity verification, and workforce monitoring',
    icon: 'sterling',
    iconSlug: 'sterling',
    category: 'Background Check',
    apiDocs: 'https://developer.sterlingcheck.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
    ],
  },
  goodhire: {
    name: 'GoodHire',
    description: 'Employment background checks and screening services',
    icon: 'goodhire',
    iconSlug: 'goodhire',
    category: 'Background Check',
    apiDocs: 'https://developers.goodhire.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  hireright: {
    name: 'HireRight',
    description: 'Global background screening and employment verification',
    icon: 'hireright',
    iconSlug: 'hireright',
    category: 'Background Check',
    apiDocs: 'https://developer.hireright.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'accountId', label: 'Account ID', type: 'text', required: true },
    ],
  },
  intelifi: {
    name: 'Intelifi',
    description: 'Background verification and due diligence screening',
    icon: 'intelifi',
    iconSlug: 'intelifi',
    category: 'Background Check',
    apiDocs: 'https://www.intelifi.com/api-documentation/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'companyId', label: 'Company ID', type: 'text', required: true },
    ],
  },
  // =========================================================================
  // Additional Integrations (previously missing from backend DTO)
  // =========================================================================
  
  brex: {
    name: 'Brex',
    description: 'Corporate credit card and spend management',
    icon: 'brex',
    iconSlug: 'brex',
    category: 'Finance',
    apiDocs: 'https://developer.brex.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  checkpoint: {
    name: 'Check Point',
    description: 'Network security and firewall management',
    icon: 'checkpoint',
    iconSlug: 'checkpoint',
    category: 'Network Security',
    apiDocs: 'https://sc1.checkpoint.com/documents/latest/APIs/',
    configFields: [
      { key: 'serverUrl', label: 'Management Server URL', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  close: {
    name: 'Close',
    description: 'CRM for sales teams',
    icon: 'close',
    iconSlug: 'close',
    category: 'CRM',
    apiDocs: 'https://developer.close.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  cofense: {
    name: 'Cofense',
    description: 'Phishing defense and security awareness',
    icon: 'cofense',
    iconSlug: 'cofense',
    category: 'Security Awareness',
    apiDocs: 'https://cofense.com/product-services/phishme-simulator/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
    ],
  },
  culture_amp: {
    name: 'Culture Amp',
    description: 'Employee engagement and performance platform',
    icon: 'cultureamp',
    iconSlug: 'cultureamp',
    category: 'HR',
    apiDocs: 'https://developers.cultureamp.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  curricula: {
    name: 'Curricula',
    description: 'Security awareness training platform',
    icon: 'curricula',
    iconSlug: 'curricula',
    category: 'Security Awareness',
    apiDocs: 'https://www.curricula.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  databricks: {
    name: 'Databricks',
    description: 'Unified analytics platform',
    icon: 'databricks',
    iconSlug: 'databricks',
    category: 'Data & Analytics',
    apiDocs: 'https://docs.databricks.com/dev-tools/api/',
    configFields: [
      { key: 'workspaceUrl', label: 'Workspace URL', type: 'url', required: true },
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
    ],
  },
  divvy: {
    name: 'Divvy',
    description: 'Expense management and corporate cards',
    icon: 'divvy',
    iconSlug: 'divvy',
    category: 'Finance',
    apiDocs: 'https://developer.divvy.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  drata: {
    name: 'Drata',
    description: 'Security and compliance automation',
    icon: 'drata',
    iconSlug: 'drata',
    category: 'GRC',
    apiDocs: 'https://drata.com/product/integrations',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  fivetran: {
    name: 'Fivetran',
    description: 'Automated data integration',
    icon: 'fivetran',
    iconSlug: 'fivetran',
    category: 'Data & Analytics',
    apiDocs: 'https://fivetran.com/docs/rest-api',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'apiSecret', label: 'API Secret', type: 'password', required: true },
    ],
  },
  fortinet: {
    name: 'Fortinet',
    description: 'Network security solutions',
    icon: 'fortinet',
    iconSlug: 'fortinet',
    category: 'Network Security',
    apiDocs: 'https://docs.fortinet.com/',
    configFields: [
      { key: 'serverUrl', label: 'FortiGate URL', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  heap: {
    name: 'Heap',
    description: 'Digital insights platform',
    icon: 'heap',
    iconSlug: 'heap',
    category: 'Data & Analytics',
    apiDocs: 'https://developers.heap.io/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  hibob: {
    name: 'HiBob',
    description: 'HR platform for modern businesses',
    icon: 'hibob',
    iconSlug: 'hibob',
    category: 'HR',
    apiDocs: 'https://apidocs.hibob.com/',
    configFields: [
      { key: 'apiToken', label: 'API Token', type: 'password', required: true },
      { key: 'serviceUserId', label: 'Service User ID', type: 'text', required: true },
    ],
  },
  hoxhunt: {
    name: 'Hoxhunt',
    description: 'Human risk management platform',
    icon: 'hoxhunt',
    iconSlug: 'hoxhunt',
    category: 'Security Awareness',
    apiDocs: 'https://www.hoxhunt.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  incidentio: {
    name: 'incident.io',
    description: 'Incident management platform',
    icon: 'incidentio',
    iconSlug: 'incidentio',
    category: 'Incident Management',
    apiDocs: 'https://api-docs.incident.io/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  infosec_iq: {
    name: 'Infosec IQ',
    description: 'Security awareness and training',
    icon: 'infoseciq',
    iconSlug: 'infoseciq',
    category: 'Security Awareness',
    apiDocs: 'https://www.infosecinstitute.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  insightly: {
    name: 'Insightly',
    description: 'CRM and project management',
    icon: 'insightly',
    iconSlug: 'insightly',
    category: 'CRM',
    apiDocs: 'https://api.insightly.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  justworks: {
    name: 'Justworks',
    description: 'HR and payroll platform',
    icon: 'justworks',
    iconSlug: 'justworks',
    category: 'HR',
    apiDocs: 'https://justworks.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  lattice: {
    name: 'Lattice',
    description: 'People management platform',
    icon: 'lattice',
    iconSlug: 'lattice',
    category: 'HR',
    apiDocs: 'https://developers.lattice.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  mimecast_awareness: {
    name: 'Mimecast Awareness Training',
    description: 'Cyber awareness training',
    icon: 'mimecast',
    iconSlug: 'mimecast',
    category: 'Security Awareness',
    apiDocs: 'https://integrations.mimecast.com/',
    configFields: [
      { key: 'baseUrl', label: 'Base URL', type: 'url', required: true },
      { key: 'accessKey', label: 'Access Key', type: 'password', required: true },
      { key: 'secretKey', label: 'Secret Key', type: 'password', required: true },
    ],
  },
  mosyle: {
    name: 'Mosyle',
    description: 'Apple device management',
    icon: 'mosyle',
    iconSlug: 'mosyle',
    category: 'Endpoint Management',
    apiDocs: 'https://business.mosyle.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  notion: {
    name: 'Notion',
    description: 'Connected workspace for notes and docs',
    icon: 'notion',
    iconSlug: 'notion',
    category: 'Knowledge Management',
    apiDocs: 'https://developers.notion.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  palo_alto: {
    name: 'Palo Alto Networks',
    description: 'Next-generation firewall and security',
    icon: 'paloalto',
    iconSlug: 'paloalto',
    category: 'Network Security',
    apiDocs: 'https://docs.paloaltonetworks.com/',
    configFields: [
      { key: 'serverUrl', label: 'Panorama/Firewall URL', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  knowbe4: {
    name: 'KnowBe4',
    description: 'Security awareness training platform',
    icon: 'knowbe4',
    iconSlug: 'knowbe4',
    category: 'Security Awareness',
    apiDocs: 'https://developer.knowbe4.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  proofpoint_sat: {
    name: 'Proofpoint Security Awareness',
    description: 'Security awareness training',
    icon: 'proofpoint',
    iconSlug: 'proofpoint',
    category: 'Security Awareness',
    apiDocs: 'https://proofpoint.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'text', required: true },
    ],
  },
  qlik: {
    name: 'Qlik',
    description: 'Data analytics platform',
    icon: 'qlik',
    iconSlug: 'qlik',
    category: 'Data & Analytics',
    apiDocs: 'https://qlik.dev/',
    configFields: [
      { key: 'tenantUrl', label: 'Tenant URL', type: 'url', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  ramp: {
    name: 'Ramp',
    description: 'Corporate cards and spend management',
    icon: 'ramp',
    iconSlug: 'ramp',
    category: 'Finance',
    apiDocs: 'https://docs.ramp.com/',
    configFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
    ],
  },
  terranova: {
    name: 'Terranova Security',
    description: 'Security awareness training',
    icon: 'terranova',
    iconSlug: 'terranova',
    category: 'Security Awareness',
    apiDocs: 'https://terranovasecurity.com/',
    configFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  veracode: {
    name: 'Veracode',
    description: 'Application security testing',
    icon: 'veracode',
    iconSlug: 'veracode',
    category: 'Application Security',
    apiDocs: 'https://docs.veracode.com/',
    configFields: [
      { key: 'apiId', label: 'API ID', type: 'text', required: true },
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
  },
  custom: {
    name: 'Custom Integration',
    description: 'Webhook-based custom integration',
    icon: 'webhook',
    iconSlug: 'webhook',
    category: 'Custom',
    apiDocs: '',
    configFields: [
      { key: 'webhookUrl', label: 'Webhook URL', type: 'text', required: false },
      { key: 'authHeader', label: 'Authorization Header', type: 'password', required: false },
    ],
  },
};
