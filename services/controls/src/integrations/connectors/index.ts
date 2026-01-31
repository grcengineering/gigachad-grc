 
// =============================================================================
// GigaChad GRC - Integration Connectors
// =============================================================================
// All 185+ integration connectors organized by category
// Each connector implements testConnection() and sync() methods

// -----------------------------------------------------------------------------
// CLOUD PROVIDERS (15)
// -----------------------------------------------------------------------------
export * from './aws.connector';
export * from './azure.connector';
export * from './gcp.connector';
export * from './cloudflare.connector';
export * from './cloud-connectors';
// Includes: DigitalOcean, OracleCloud, IBMCloud, AlibabaCloud, Linode, Vultr,
//           Heroku, Vercel, Netlify, Render, Hetzner

// -----------------------------------------------------------------------------
// IDENTITY & ACCESS MANAGEMENT (18)
// -----------------------------------------------------------------------------
export * from './okta.connector';
export * from './azure-ad.connector';
export * from './google-workspace.connector';
export * from './onelogin.connector';
export * from './duo.connector';
export * from './jumpcloud.connector';
export * from './itam-connectors';
// Includes: AWSCognito, Keycloak, FusionAuth, PingIdentity, ForgeRock,
//           CyberArk, LastPass, 1Password

// -----------------------------------------------------------------------------
// ENDPOINT & MDM (8)
// -----------------------------------------------------------------------------
export * from './jamf.connector';
export * from './intune.connector';
// Via itam-connectors: VMwareWorkspaceOne, CitrixEndpoint, BlackBerryUEM,
//                      ManageEngineMDM, Miradore, Kandji

// -----------------------------------------------------------------------------
// DEVSECOPS & VERSION CONTROL (16)
// -----------------------------------------------------------------------------
export * from './github.connector';
export * from './gitlab.connector';
export * from './bitbucket.connector';
export * from './docker-hub.connector';
export * from './devops-connectors';
// Includes: Jenkins, CircleCI, TravisCI, AzureDevOps, JFrog, SonatypeNexus,
//           CodeClimate, Checkmarx, AquaSecurity, PrismaCloud, OrcaSecurity,
//           Sysdig, Panther, ArmorCode, LaunchDarkly

// -----------------------------------------------------------------------------
// SECURITY & VULNERABILITY SCANNING (10)
// -----------------------------------------------------------------------------
export * from './crowdstrike.connector';
export * from './snyk.connector';
export * from './wiz.connector';
export * from './sonarqube.connector';
export * from './tenable.connector';
export * from './qualys.connector';
export * from './sentinelone.connector';
export * from './lacework.connector';

// -----------------------------------------------------------------------------
// IT SERVICE MANAGEMENT (8)
// -----------------------------------------------------------------------------
export * from './jira.connector';
export * from './servicenow.connector';
export * from './zendesk.connector';
export * from './freshdesk.connector';
export * from './pagerduty.connector';
// Via itam-connectors: Freshservice, Ivanti

// -----------------------------------------------------------------------------
// CRM & SALES (10)
// -----------------------------------------------------------------------------
export * from './salesforce.connector';
export * from './hubspot.connector';
export * from './finance-connectors';
// Includes: Pipedrive, ZohoCRM, SugarCRM, Copper, Pega, MondayCRM, HelpScout, Front

// -----------------------------------------------------------------------------
// COMMUNICATION & COLLABORATION (15)
// -----------------------------------------------------------------------------
export * from './slack.connector';
export * from './microsoft-teams.connector';
export * from './zoom.connector';
export * from './productivity-connectors';
// Includes: Discord, Webex, Mattermost, RingCentral, GoToMeeting, GoogleMeet,
//           Chanty, Twist, WorkplaceMeta, Flock, RocketChat

// -----------------------------------------------------------------------------
// PROJECT MANAGEMENT (12)
// -----------------------------------------------------------------------------
export * from './asana.connector';
export * from './trello.connector';
export * from './monday.connector';
export * from './clickup.connector';
export * from './linear.connector';
// Via productivity-connectors: Smartsheet, Wrike, Basecamp, Shortcut, Height,
//                              Teamwork, Podio, Coda

// -----------------------------------------------------------------------------
// MONITORING & OBSERVABILITY (8)
// -----------------------------------------------------------------------------
export * from './sentry.connector';
export * from './datadog.connector';
export * from './new-relic.connector';
export * from './splunk.connector';
// Via finance-connectors: Grafana, Elasticsearch

// -----------------------------------------------------------------------------
// HR & PEOPLE MANAGEMENT (18)
// -----------------------------------------------------------------------------
export * from './bamboohr.connector';
export * from './workday.connector';
export * from './rippling.connector';
export * from './hr-connectors';
// Includes: Gusto, ADP, Paychex, TriNet, Namely, Personio, Factorial, CharlieHR,
//           Zenefits, UKG, SAPSuccessFactors, OracleHCM, Checkr, Sterling,
//           GoodHire, HireRight, Certn, Intelifi

// -----------------------------------------------------------------------------
// FINANCE & ACCOUNTING (12)
// -----------------------------------------------------------------------------
// Via finance-connectors: QuickBooks, Xero, NetSuite, FreshBooks, Wave, SAP,
//                         Expensify, Concur, Bill.com, Stripe

// -----------------------------------------------------------------------------
// ANALYTICS & BI (10)
// -----------------------------------------------------------------------------
// Via finance-connectors: Amplitude, Mixpanel, Segment, Tableau, PowerBI,
//                         Looker, Domo, Metabase, Redash, Superset, Snowflake

// -----------------------------------------------------------------------------
// IT ASSET MANAGEMENT (10)
// -----------------------------------------------------------------------------
// Via itam-connectors: SnipeIT, AssetPanda, Lansweeper, ServiceNowITAM, Flexera,
//                      SnowSoftware, Oomnitza, ManageEngineAssetExplorer, AtlassianAssets

// -----------------------------------------------------------------------------
// KNOWLEDGE MANAGEMENT (8)
// -----------------------------------------------------------------------------
// Via productivity-connectors: Guru, Tettra, Slab, Nuclino, Bloomfire,
//                              Helpjuice, KnowledgeOwl

// -----------------------------------------------------------------------------
// STORAGE & FILE SHARING (4)
// -----------------------------------------------------------------------------
// Via itam-connectors: SharePoint, GoogleDrive
// Via generic.connector: Box, Dropbox, Confluence

// -----------------------------------------------------------------------------
// PROCUREMENT & FINANCE (1)
// -----------------------------------------------------------------------------
export * from './zip.connector';

// -----------------------------------------------------------------------------
// GENERIC & CUSTOM (1)
// -----------------------------------------------------------------------------
export * from './generic.connector';
// Includes: Notion, Airtable, Box, Dropbox, Confluence, Intercom, Stripe, CustomIntegration

// -----------------------------------------------------------------------------
// ADDITIONAL INTEGRATIONS (28)
// -----------------------------------------------------------------------------
export * from './additional-connectors';
// Security Awareness: KnowBe4, ProofpointSAT, MimecastAwareness, Cofense, Hoxhunt, Curricula, InfosecIQ, Terranova
// GRC: Drata
// Network Security: PaloAlto, Fortinet, Checkpoint
// AppSec: Veracode
// Incident: incident.io
// MDM: Mosyle
// HR: HiBob, Lattice, CultureAmp, Justworks
// Finance: Brex, Ramp, Divvy
// Data: Databricks, Fivetran, Heap, Qlik
// CRM: Close, Insightly
// Knowledge: NotionKM

// =============================================================================
// CONNECTOR TYPE MAPPING
// =============================================================================
export const CONNECTOR_MAP = {
  // Cloud Infrastructure
  aws: 'AWSConnector', 
  azure: 'AzureConnector', 
  gcp: 'GCPConnector',
  cloudflare: 'CloudflareConnector', 
  digital_ocean: 'DigitalOceanConnector',
  oracle_cloud: 'OracleCloudConnector', 
  ibm_cloud: 'IBMCloudConnector',
  alibaba_cloud: 'AlibabaCloudConnector', 
  linode: 'LinodeConnector',
  vultr: 'VultrConnector', 
  heroku: 'HerokuConnector', 
  vercel: 'VercelConnector',
  netlify: 'NetlifyConnector', 
  render: 'RenderConnector', 
  hetzner: 'HetznerConnector',
  
  // Identity & Access Management
  okta: 'OktaConnector', 
  azure_ad: 'AzureADConnector',
  google_workspace: 'GoogleWorkspaceConnector', 
  onelogin: 'OneLoginConnector',
  duo_security: 'DuoConnector', 
  jumpcloud: 'JumpCloudConnector',
  aws_cognito: 'AWSCognitoConnector', 
  keycloak: 'KeycloakConnector',
  fusionauth: 'FusionAuthConnector', 
  ping_identity: 'PingIdentityConnector',
  forgerock: 'ForgeRockConnector', 
  cyberark: 'CyberArkConnector',
  lastpass: 'LastPassConnector', 
  one_password: 'OnePasswordConnector',
  
  // Endpoint/MDM
  jamf: 'JamfConnector', microsoft_intune: 'IntuneConnector',
  vmware_workspace_one: 'VMwareWorkspaceOneConnector',
  citrix_endpoint: 'CitrixEndpointConnector', blackberry_uem: 'BlackBerryUEMConnector',
  manageengine_mdm: 'ManageEngineMDMConnector', miradore: 'MiradoreConnector',
  kandji: 'KandjiConnector',
  
  // DevSecOps
  github: 'GitHubConnector', gitlab: 'GitLabConnector', bitbucket: 'BitbucketConnector',
  docker_hub: 'DockerHubConnector', jenkins: 'JenkinsConnector',
  circleci: 'CircleCIConnector', travis_ci: 'TravisCIConnector',
  azure_devops: 'AzureDevOpsConnector', jfrog: 'JFrogConnector',
  sonatype_nexus: 'SonatypeNexusConnector', codeclimate: 'CodeClimateConnector',
  checkmarx: 'CheckmarxConnector', aqua_security: 'AquaSecurityConnector',
  prisma_cloud: 'PrismaCloudConnector', orca_security: 'OrcaSecurityConnector',
  sysdig: 'SysdigConnector', panther: 'PantherConnector', armorcode: 'ArmorcodeConnector',
  launchdarkly: 'LaunchDarklyConnector',
  
  // Security
  crowdstrike: 'CrowdStrikeConnector', snyk: 'SnykConnector', wiz: 'WizConnector',
  sonarqube: 'SonarQubeConnector', tenable: 'TenableConnector',
  qualys: 'QualysConnector', sentinelone: 'SentinelOneConnector',
  lacework: 'LaceworkConnector',
  
  // ITSM
  jira: 'JiraConnector', servicenow: 'ServiceNowConnector',
  zendesk: 'ZendeskConnector', freshdesk: 'FreshdeskConnector',
  pagerduty: 'PagerDutyConnector', freshservice: 'FreshserviceConnector',
  ivanti: 'IvantiConnector',
  
  // CRM
  salesforce: 'SalesforceConnector', hubspot: 'HubSpotConnector',
  pipedrive: 'PipedriveConnector', zoho_crm: 'ZohoCRMConnector',
  sugarcrm: 'SugarCRMConnector', copper: 'CopperConnector',
  pega: 'PegaConnector', monday_crm: 'MondayCRMConnector',
  help_scout: 'HelpScoutConnector', front: 'FrontConnector',
  
  // Communication
  slack: 'SlackConnector', microsoft_teams: 'MicrosoftTeamsConnector',
  zoom: 'ZoomConnector', discord: 'DiscordConnector', webex: 'WebexConnector',
  mattermost: 'MattermostConnector', ringcentral: 'RingCentralConnector',
  gotomeeting: 'GoToMeetingConnector', google_meet: 'GoogleMeetConnector',
  chanty: 'ChantyConnector', twist: 'TwistConnector',
  workplace_meta: 'WorkplaceMetaConnector', flock: 'FlockConnector',
  rocket_chat: 'RocketChatConnector',
  
  // Project Management
  asana: 'AsanaConnector', trello: 'TrelloConnector', monday: 'MondayConnector',
  clickup: 'ClickUpConnector', linear: 'LinearConnector',
  smartsheet: 'SmartsheetConnector', wrike: 'WrikeConnector',
  basecamp: 'BasecampConnector', shortcut: 'ShortcutConnector',
  height: 'HeightConnector', teamwork: 'TeamworkConnector',
  podio: 'PodioConnector', coda: 'CodaConnector',
  
  // Monitoring
  sentry: 'SentryConnector', datadog: 'DatadogConnector',
  new_relic: 'NewRelicConnector', splunk: 'SplunkConnector',
  grafana: 'GrafanaConnector', elasticsearch: 'ElasticsearchConnector',
  
  // HR
  bamboohr: 'BambooHRConnector', workday: 'WorkdayConnector',
  rippling: 'RipplingConnector', gusto: 'GustoConnector', adp: 'ADPConnector',
  paychex: 'PaychexConnector', trinet: 'TriNetConnector', namely: 'NamelyConnector',
  personio: 'PersonioConnector', factorial: 'FactorialConnector',
  charliehr: 'CharlieHRConnector', zenefits: 'ZenefitsConnector',
  ukg: 'UKGConnector', sap_successfactors: 'SAPSuccessFactorsConnector',
  oracle_hcm: 'OracleHCMConnector', checkr: 'CheckrConnector',
  sterling: 'SterlingConnector', goodhire: 'GoodHireConnector',
  hireright: 'HireRightConnector', certn: 'CertnConnector', intelifi: 'IntelifiConnector',
  
  // Finance
  quickbooks: 'QuickBooksConnector', xero: 'XeroConnector',
  netsuite: 'NetSuiteConnector', freshbooks: 'FreshBooksConnector',
  wave: 'WaveConnector', sap: 'SAPConnector', expensify: 'ExpensifyConnector',
  concur: 'ConcurConnector', bill_com: 'BillConnector', stripe: 'StripePaymentsConnector',
  
  // Analytics
  amplitude: 'AmplitudeConnector', mixpanel: 'MixpanelConnector',
  segment: 'SegmentConnector', tableau: 'TableauConnector',
  power_bi: 'PowerBIConnector', looker: 'LookerConnector',
  domo: 'DomoConnector', metabase: 'MetabaseConnector',
  redash: 'RedashConnector', superset: 'SupersetConnector',
  snowflake: 'SnowflakeConnector',
  
  // ITAM
  snipe_it: 'SnipeITConnector', asset_panda: 'AssetPandaConnector',
  lansweeper: 'LansweperConnector', servicenow_itam: 'ServiceNowITAMConnector',
  flexera: 'FlexeraConnector', snow_software: 'SnowSoftwareConnector',
  oomnitza: 'OomnitzaConnector', manageengine_assetexplorer: 'ManageEngineAssetExplorerConnector',
  atlassian_assets: 'AtlassianAssetsConnector',
  
  // Knowledge
  guru: 'GuruConnector', tettra: 'TettraConnector', slab: 'SlabConnector',
  nuclino: 'NuclinoConnector', bloomfire: 'BloomfireConnector',
  helpjuice: 'HelpjuiceConnector', knowledgeowl: 'KnowledgeOwlConnector',
  
  // Storage
  sharepoint: 'SharePointConnector', google_drive: 'GoogleDriveConnector',
  box: 'BoxConnector', dropbox: 'DropboxConnector', confluence: 'ConfluenceConnector',
  
  // Procurement
  ziphq: 'ZipConnector',
  
  // Generic
  notion: 'NotionKMConnector', airtable: 'AirtableConnector',
  intercom: 'IntercomConnector', custom: 'CustomIntegrationConnector',
  
  // Security Awareness Training
  knowbe4: 'KnowBe4Connector', proofpoint_sat: 'ProofpointSATConnector',
  mimecast_awareness: 'MimecastAwarenessConnector', cofense: 'CofenseConnector',
  hoxhunt: 'HoxhuntConnector', curricula: 'CurriculaConnector',
  infosec_iq: 'InfosecIQConnector', terranova: 'TerranovaConnector',
  
  // GRC Platforms
  drata: 'DrataConnector',
  
  // Network Security
  palo_alto: 'PaloAltoConnector', fortinet: 'FortinetConnector',
  checkpoint: 'CheckpointConnector',
  
  // AppSec
  veracode: 'VeracodeConnector',
  
  // Incident Management
  incidentio: 'IncidentIOConnector',
  
  // MDM Additional
  mosyle: 'MosyleConnector',
  
  // HR Additional
  hibob: 'HiBobConnector', lattice: 'LatticeConnector',
  culture_amp: 'CultureAmpConnector', justworks: 'JustworksConnector',
  
  // Finance Additional
  brex: 'BrexConnector', ramp: 'RampConnector', divvy: 'DivvyConnector',
  
  // Data & Analytics
  databricks: 'DatabricksConnector', fivetran: 'FivetranConnector',
  heap: 'HeapConnector', qlik: 'QlikConnector',
  
  // CRM Additional
  close: 'CloseConnector', 
  insightly: 'InsightlyConnector',

  // =========================================================================
  // ADDITIONAL MAPPINGS - Filling gaps for complete UI coverage
  // =========================================================================
  
  // Monitoring (not yet in main sections)
  sumo_logic: 'GenericConnector',
} as const;

export type ConnectorType = keyof typeof CONNECTOR_MAP;

// Total: 185 integrations
