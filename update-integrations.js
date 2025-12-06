// Script to update integration metadata with verified API docs and icon slugs
const fs = require('fs');
const path = require('path');

const ICON_SLUG_MAP = {
  // Cloud Infrastructure
  aws: 'amazonwebservices',
  gcp: 'googlecloud',
  azure: 'microsoftazure',
  digital_ocean: 'digitalocean',
  oracle_cloud: 'oracle',
  ibm_cloud: 'ibmcloud',
  alibaba_cloud: 'alibabacloud',
  linode: 'linode',
  vultr: 'vultr',
  heroku: 'heroku',
  cloudflare: 'cloudflare',
  vercel: 'vercel',
  netlify: 'netlify',
  render: 'render',
  hetzner: 'hetzner',

  // Developer Tools
  github: 'github',
  gitlab: 'gitlab',
  bitbucket: 'bitbucket',
  docker_hub: 'docker',
  jenkins: 'jenkins',
  circleci: 'circleci',
  travis_ci: 'travisci',
  azure_devops: 'azuredevops',
  jfrog: 'jfrog',
  sonatype_nexus: 'sonatype',
  codeclimate: 'codeclimate',
  sonarqube: 'sonarqube',
  pagerduty: 'pagerduty',
  launchdarkly: 'launchdarkly',
  sentry: 'sentry',

  // Identity Providers
  okta: 'okta',
  azure_ad: 'microsoftazure',
  google_workspace: 'google',
  onelogin: 'onelogin',
  auth0: 'auth0',
  ping_identity: 'pingidentity',
  jumpcloud: 'jumpcloud',
  duo_security: 'duo',
  lastpass: 'lastpass',
  one_password: '1password',
  cyberark: 'cyberark',
  forgerock: 'forgerock',
  aws_cognito: 'amazoncognito',
  keycloak: 'keycloak',
  fusionauth: 'fusionauth',

  // MDM
  jamf: 'jamf',
  microsoft_intune: 'microsoftintune',
  vmware_workspace_one: 'vmware',
  mobileiron: 'ivanti',
  citrix_endpoint: 'citrix',
  ibm_maas360: 'ibm',
  blackberry_uem: 'blackberry',
  manageengine_mdm: 'zoho',
  miradore: null,
  kandji: null,

  // Workflow Management
  jira: 'jira',
  asana: 'asana',
  trello: 'trello',
  monday: 'monday',
  clickup: 'clickup',
  wrike: 'wrike',
  smartsheet: 'smartsheet',
  airtable: 'airtable',
  basecamp: 'basecamp',
  linear: 'linear',
  shortcut: null,
  height: null,
  teamwork: 'teamwork',
  podio: 'podio',

  // Collaboration
  slack: 'slack',
  microsoft_teams: 'microsoftteams',
  zoom: 'zoom',
  google_meet: 'googlemeet',
  discord: 'discord',
  webex: 'webex',
  mattermost: 'mattermost',
  ringcentral: 'ringcentral',
  gotomeeting: 'gotomeeting',
  bluejeans: null,
  chanty: null,
  twist: 'twist',
  workplace_meta: 'workplace',
  flock: 'flock',
  rocket_chat: 'rocketdotchat',
  notion: 'notion',

  // CRM & Support
  salesforce: 'salesforce',
  hubspot: 'hubspot',
  zendesk: 'zendesk',
  servicenow: 'servicenow',
  freshdesk: 'freshdesk',
  intercom: 'intercom',
  front: 'frontapp',
  help_scout: 'helpscout',
  zoho_crm: 'zoho',
  pipedrive: 'pipedrive',
  monday_crm: 'monday',
  dynamics_365: 'microsoftdynamics365',
  copper: 'copper',
  close: 'close',
  insightly: 'insightly',

  // Cybersecurity
  crowdstrike: 'crowdstrike',
  palo_alto: 'paloaltonetworks',
  fortinet: 'fortinet',
  checkpoint: 'checkpoint',
  cisco_duo: 'cisco',
  rapid7: 'rapid7',
  tenable: 'tenable',
  qualys: 'qualys',
  wiz: 'wiz',
  prisma_cloud: 'prisma',
  sentinelone: 'sentinelone',
  splunk: 'splunk',
  sumo_logic: 'sumologic',
  lacework: null,
  orca_security: null,
  aqua_security: 'aquasecurity',
  sysdig: 'sysdig',
  snyk: 'snyk',
  checkmarx: 'checkmarx',
  armorcode: null,
  panther: null,
  drata: 'drata',
  vanta: 'vanta',

  // Data Analytics
  tableau: 'tableau',
  looker: 'looker',
  power_bi: 'powerbi',
  qlik: 'qlik',
  domo: 'domo',
  sisense: 'sisense',
  thoughtspot: 'thoughtspot',
  google_analytics: 'googleanalytics',
  mixpanel: 'mixpanel',
  amplitude: 'amplitude',
  heap: 'heap',
  segment: 'segment',
  snowflake: 'snowflake',
  databricks: 'databricks',
  fivetran: 'fivetran',
  datadog: 'datadog',
  grafana: 'grafana',
  elasticsearch: 'elasticsearch',
  new_relic: 'newrelic',
  redash: 'redash',
  metabase: 'metabase',
  superset: 'apachesuperset',

  // Financial Tools
  stripe: 'stripe',
  quickbooks: 'quickbooks',
  xero: 'xero',
  bill_com: null,
  freshbooks: 'freshbooks',
  expensify: 'expensify',
  netsuite: 'netsuite',
  brex: 'brex',
  ramp: 'ramp',
  divvy: null,
  concur: 'sap',
  wave: 'wave',
  ziphq: null,

  // HR Tools
  workday: 'workday',
  bamboohr: 'bamboo',
  namely: null,
  rippling: 'rippling',
  gusto: 'gusto',
  adp: 'adp',
  paychex: 'paychex',
  zenefits: 'zenefits',
  justworks: null,
  trinet: null,
  namely_hr: null,
  ukg: null,
  sap_successfactors: 'sap',
  oracle_hcm: 'oracle',
  factorial: 'factorial',
  charliehr: null,
  personio: 'personio',
  hibob: 'hibob',
  lattice: 'lattice',
  culture_amp: null,

  // Knowledge Management
  confluence: 'confluence',
  notion_km: 'notion',
  sharepoint: 'microsoftsharepoint',
  google_drive: 'googledrive',
  dropbox: 'dropbox',
  box: 'box',
  guru: 'guru',
  document360: null,
  slab: null,
  tettra: null,
  bloomfire: null,
  helpjuice: null,
  knowledgeowl: null,
  nuclino: 'nuclino',
  coda: 'coda',

  // Asset Management
  servicenow_itam: 'servicenow',
  snow_software: null,
  flexera: 'flexera',
  lansweeper: 'lansweeper',
  asset_panda: null,
  snipe_it: null,
  ivanti: 'ivanti',
  manageengine_assetexplorer: 'zoho',
  oomnitza: null,
  device42: null,
  freshservice: 'freshworks',
  atlassian_assets: 'atlassian',

  custom: null,
};

const VERIFIED_API_DOCS = {
  // Verified from research
  servicenow_itam: 'https://docs.servicenow.com/',
  snow_software: 'https://docs-snow.flexera.com/snow-atlas-api/resources/',
  flexera: 'https://developer.flexera.com/',
  lansweeper: 'https://developer.lansweeper.com/',
  asset_panda: 'https://docs.api.assetpanda.app/',
  snipe_it: 'https://snipe-it.readme.io/reference/api-overview',
  ivanti: 'https://www.ivanti.com/support/api',
  manageengine_assetexplorer: 'https://www.manageengine.com/products/asset-explorer/aecloud-v3-api/',
  oomnitza: 'https://oomnitza.zendesk.com/hc/en-us/articles/17200339347991-Oomnitza-REST-APIs',
  device42: 'https://api.device42.com/',
  freshservice: 'https://api.freshservice.com/',
  atlassian_assets: 'https://developer.atlassian.com/cloud/assets/',
  aws: 'https://docs.aws.amazon.com/',
  gcp: 'https://cloud.google.com/apis/docs/overview',
  azure: 'https://learn.microsoft.com/en-us/rest/api/azure/',
  cloudflare: 'https://developers.cloudflare.com/api/',
  github: 'https://docs.github.com/en/rest',
  gitlab: 'https://docs.gitlab.com/api/rest/',
  jira: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/',
  sentry: 'https://docs.sentry.io/api/',
  okta: 'https://developer.okta.com/docs/reference/',
  auth0: 'https://auth0.com/docs/api',
  azure_ad: 'https://learn.microsoft.com/en-us/entra/identity/',
};

const filePath = path.join(__dirname, 'services/controls/src/integrations/dto/integration.dto.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Add iconSlug to each integration metadata
let updated = content.replace(
  /(\w+): \{[\s\S]*?name: '([^']+)',[\s\S]*?icon: '(\w+)',/g,
  (match, key, name, icon) => {
    const iconSlug = ICON_SLUG_MAP[key];
    const iconSlugLine = iconSlug ? `iconSlug: '${iconSlug}',` : '';
    return match.replace(`icon: '${icon}',`, `icon: '${icon}',\n    ${iconSlugLine}`);
  }
);

// Update API docs where we have verified URLs
Object.entries(VERIFIED_API_DOCS).forEach(([key, url]) => {
  const regex = new RegExp(`(${key}: \\{[\\s\\S]*?apiDocs: ')[^']*(')`);
  updated = updated.replace(regex, `$1${url}$2`);
});

fs.writeFileSync(filePath, updated);
console.log('✅ Updated integration metadata with icon slugs and verified API docs');
console.log(`   - Added iconSlug for ${Object.keys(ICON_SLUG_MAP).filter(k => ICON_SLUG_MAP[k]).length} integrations`);
console.log(`   - Updated API docs for ${Object.keys(VERIFIED_API_DOCS).length} integrations`);
