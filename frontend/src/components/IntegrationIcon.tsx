import { useState } from 'react';

interface IntegrationIconProps {
  iconSlug?: string;
  integrationName?: string;
  className?: string;
  fallback?: string;
}

// Map integration keys to their official domain names for logo fetching
const DOMAIN_MAP: Record<string, string> = {
  // Cloud Infrastructure
  aws: 'aws.amazon.com',
  amazonwebservices: 'aws.amazon.com',
  gcp: 'cloud.google.com',
  googlecloud: 'cloud.google.com',
  azure: 'azure.microsoft.com',
  microsoftazure: 'microsoft.com',
  digital_ocean: 'digitalocean.com',
  oracle_cloud: 'oracle.com',
  ibm_cloud: 'ibm.com',
  ibmcloud: 'ibm.com',
  alibaba_cloud: 'alibabacloud.com',
  linode: 'linode.com',
  vultr: 'vultr.com',
  heroku: 'heroku.com',
  cloudflare: 'cloudflare.com',
  vercel: 'vercel.com',
  netlify: 'netlify.com',
  render: 'render.com',
  hetzner: 'hetzner.com',

  // Developer Tools
  github: 'github.com',
  gitlab: 'gitlab.com',
  bitbucket: 'bitbucket.org',
  docker_hub: 'docker.com',
  jenkins: 'jenkins.io',
  circleci: 'circleci.com',
  travis_ci: 'app.travis-ci.com',
  azure_devops: 'azure.com',
  jfrog: 'jfrog.com',
  sonatype_nexus: 'sonatype.com',
  codeclimate: 'docs.codeclimate.com',
  sonarqube: 'sonarqube.org',
  pagerduty: 'pagerduty.com',
  launchdarkly: 'launchdarkly.com',
  sentry: 'sentry.io',

  // Identity Providers
  okta: 'okta.com',
  azure_ad: 'microsoft.com',
  google_workspace: 'google.com',
  onelogin: 'onelogin.com',
  auth0: 'auth0.com',
  ping_identity: 'pingidentity.com',
  jumpcloud: 'jumpcloud.com',
  duo_security: 'duo.com',
  lastpass: 'lastpass.com',
  one_password: '1password.com',
  cyberark: 'cyberark.com',
  forgerock: 'forgerock.com',
  aws_cognito: 'docs.aws.amazon.com',
  keycloak: 'keycloak.org',
  fusionauth: 'fusionauth.io',

  // MDM
  jamf: 'jamf.com',
  microsoft_intune: 'intune.microsoft.com',
  vmware_workspace_one: 'vmware.com',
  citrix_endpoint: 'citrix.com',
  ibm_maas360: 'ibm.com',
  blackberry_uem: 'blackberry.com',
  manageengine_mdm: 'manageengine.com',
  miradore: 'miradore.com',
  kandji: 'kandji.io',

  // Workflow Management
  jira: 'atlassian.com',
  asana: 'asana.com',
  trello: 'trello.com',
  monday: 'monday.com',
  clickup: 'clickup.com',
  wrike: 'wrike.com',
  smartsheet: 'smartsheet.com',
  airtable: 'airtable.com',
  basecamp: 'basecamp.com',
  linear: 'linear.app',
  shortcut: 'shortcut.com',
  height: 'height.app',
  teamwork: 'teamwork.com',
  podio: 'podio.com',

  // Collaboration
  slack: 'slack.com',
  microsoft_teams: 'microsoft.com',
  zoom: 'zoom.us',
  google_meet: 'apps.google.com',
  discord: 'discord.com',
  webex: 'webex.com',
  mattermost: 'about.mattermost.com',
  ringcentral: 'ringcentral.com',
  gotomeeting: 'gotomeeting.com',
  chanty: 'chanty.com',
  twist: 'twist.com',
  workplace_meta: 'workplace.com',
  flock: 'flock.com',
  rocket_chat: 'docs.rocket.chat',

  // CRM & Support
  salesforce: 'salesforce.com',
  hubspot: 'hubspot.com',
  zendesk: 'zendesk.com',
  servicenow: 'servicenow.com',
  freshdesk: 'freshworks.com',
  intercom: 'intercom.com',
  front: 'front.com',
  help_scout: 'helpscout.com',
  zoho_crm: 'zoho.com',
  pipedrive: 'pipedrive.com',
  monday_crm: 'monday.com',
  dynamics_365: 'microsoft.com',
  sugarcrm: 'sugarcrm.com',
  copper: 'copper.com',
  pega: 'pega.com',
  close: 'close.com',
  insightly: 'insightly.com',

  // Cybersecurity
  crowdstrike: 'crowdstrike.com',
  wiz: 'wiz.io',
  palo_alto: 'paloaltonetworks.com',
  fortinet: 'fortinet.com',
  checkpoint: 'checkpoint.com',
  cisco_duo: 'cisco.com',
  rapid7: 'rapid7.com',
  tenable: 'tenable.com',
  qualys: 'qualys.com',
  prisma_cloud: 'paloaltonetworks.com',
  sentinelone: 'sentinelone.com',
  splunk: 'splunk.com',
  sumo_logic: 'sumologic.com',
  lacework: 'lacework.com',
  orca_security: 'orca.security',
  aqua_security: 'blog.aquasec.com',
  sysdig: 'sysdig.com',
  snyk: 'snyk.io',
  checkmarx: 'checkmarx.com',
  armorcode: 'armorcode.com',
  panther: 'panther.com',
  drata: 'drata.com',
  vanta: 'vanta.com',

  // Data Analytics
  tableau: 'tableau.com',
  looker: 'looker.com',
  power_bi: 'microsoft.com',
  qlik: 'qlik.com',
  domo: 'domo.com',
  sisense: 'sisense.com',
  thoughtspot: 'thoughtspot.com',
  google_analytics: 'google.com',
  mixpanel: 'mixpanel.com',
  amplitude: 'amplitude.com',
  heap: 'heap.io',
  segment: 'twilio.com',
  snowflake: 'snowflake.com',
  databricks: 'databricks.com',
  fivetran: 'fivetran.com',
  datadog: 'datadoghq.com',
  grafana: 'grafana.com',
  elasticsearch: 'elastic.co',
  new_relic: 'newrelic.com',
  redash: 'redash.io',
  metabase: 'metabase.com',
  superset: 'github.com',

  // Financial Tools
  stripe: 'stripe.com',
  quickbooks: 'intuit.com',
  xero: 'xero.com',
  bill_com: 'bill.com',
  freshbooks: 'freshbooks.com',
  expensify: 'expensify.com',
  netsuite: 'netsuite.com',
  brex: 'brex.com',
  ramp: 'ramp.com',
  divvy: 'divvy.com',
  concur: 'concur.com',
  wave: 'waveapps.com',
  ziphq: 'ziphq.com',

  // HR Tools
  workday: 'workday.com',
  bamboohr: 'help.bamboohr.com',
  namely: 'namely.com',
  rippling: 'rippling.com',
  gusto: 'gusto.com',
  adp: 'adp.com',
  paychex: 'paychex.com',
  zenefits: 'zenefits.com',
  justworks: 'justworks.com',
  trinet: 'trinet.com',
  namely_hr: 'namely.com',
  ukg: 'ukg.com',
  sap_successfactors: 'sap.com',
  oracle_hcm: 'oracle.com',
  factorial: 'factorialhr.com',
  charliehr: 'charliehr.com',
  personio: 'personio.com',
  hibob: 'hibob.com',
  lattice: 'lattice.com',
  culture_amp: 'cultureamp.com',

  // Knowledge Management
  confluence: 'atlassian.com',
  notion_km: 'notion.so',
  sharepoint: 'products.office.com',
  google_drive: 'drive.google.com',
  dropbox: 'dropbox.com',
  box: 'box.com',
  guru: 'getguru.com',
  document360: 'document360.com',
  slab: 'slab.com',
  tettra: 'tettra.com',
  bloomfire: 'bloomfire.com',
  helpjuice: 'helpjuice.com',
  knowledgeowl: 'knowledgeowl.com',
  nuclino: 'nuclino.com',
  coda: 'coda.com',

  // Asset Management
  servicenow_itam: 'servicenow.com',
  snow_software: 'snowsoftware.com',
  flexera: 'flexera.com',
  lansweeper: 'lansweeper.com',
  asset_panda: 'www.assetpanda.com',
  snipe_it: 'snipeitapp.com',
  ivanti: 'www.ivanti.com',
  manageengine_assetexplorer: 'manageengine.com',
  oomnitza: 'oomnitza.com',
  device42: 'device42.com',
  freshservice: 'freshservice.com',
  atlassian_assets: 'atlassian.com',
};

// Direct logo URLs for integrations where favicon services don't work
const LOGO_URL_OVERRIDE: Record<string, string> = {
  google_meet: 'https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-512dp/logo_meet_2020q4_color_2x_web_512dp.png',
  rocket_chat: 'https://avatars.githubusercontent.com/u/12508788?s=200&v=4',
  mattermost: 'https://avatars.githubusercontent.com/u/9828093?s=200&v=4',
  aqua_security: 'https://avatars.githubusercontent.com/u/12783832?s=200&v=4',
  superset: 'https://avatars.githubusercontent.com/u/18100687?s=200&v=4',
  codeclimate: 'https://avatars.githubusercontent.com/u/1309077?s=200&v=4',
  travis_ci: 'https://avatars.githubusercontent.com/u/639823?s=200&v=4',
  bamboohr: 'https://www.bamboohr.com/favicon.ico',
  aws_cognito: 'https://d1.awsstatic.com/product-marketing/Cognito/Cognito.741f7afdb13b5db18b3e2de79c90a436cb00ce22.png',
  sharepoint: 'https://www.microsoft.com/favicon.ico',
  microsoft_intune: 'https://www.microsoft.com/favicon.ico',
};

export function IntegrationIcon({ iconSlug, integrationName, className = 'w-6 h-6', fallback = '🔗' }: IntegrationIconProps) {
  // All hooks must be at the top, before any early returns.
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Check if there's a direct logo URL override first
  if (iconSlug && LOGO_URL_OVERRIDE[iconSlug]) {
    return (
      <img
        src={LOGO_URL_OVERRIDE[iconSlug]}
        alt={integrationName || iconSlug || 'Integration logo'}
        className={className}
        style={{ objectFit: 'contain' }}
        onError={(e) => {
          // If override fails, fall back to favicon sources
          const target = e.target as HTMLImageElement;
          const domain = DOMAIN_MAP[iconSlug] || `${iconSlug}.com`;
          target.src = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`;
        }}
      />
    );
  }

  // Try to get domain from mapping first, then fall back to iconSlug as domain
  const domain = iconSlug ? (DOMAIN_MAP[iconSlug] || `${iconSlug}.com`) : integrationName?.toLowerCase().replace(/\s+/g, '') + '.com';

  if (!iconSlug && !integrationName) {
    return <span className={className}>{fallback}</span>;
  }

  // Multiple favicon sources to try
  const sources = [
    `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=128`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://${domain}/favicon.ico`,
  ];

  if (failedAttempts >= sources.length) {
    return <span className={className}>{fallback}</span>;
  }

  const logoUrl = sources[failedAttempts];

  return (
    <img
      src={logoUrl}
      alt={integrationName || iconSlug || 'Integration logo'}
      className={className}
      onError={() => setFailedAttempts(prev => prev + 1)}
      style={{ objectFit: 'contain' }}
    />
  );
}
