/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from '@nestjs/common';
import { 
  CircuitBreaker, 
  CircuitBreakerRegistry, 
  CircuitState,
  withRetry,
  RetryPolicies,
} from '@gigachad-grc/shared';

/**
 * Resilience configuration for integration connectors
 */
const CONNECTOR_RESILIENCE_CONFIG = {
  /** Request timeout for external API calls (ms) */
  timeout: 30000,
  /** Error threshold percentage to trip circuit */
  errorThresholdPercentage: 50,
  /** Time before attempting to reset circuit (ms) */
  resetTimeout: 60000,
  /** Minimum requests before calculating error percentage */
  volumeThreshold: 3,
};

// Import all connectors
import { AWSConnector } from './aws.connector';
import { AzureConnector } from './azure.connector';
import { GCPConnector } from './gcp.connector';
import { CloudflareConnector } from './cloudflare.connector';
import { OktaConnector } from './okta.connector';
import { AzureADConnector } from './azure-ad.connector';
import { GoogleWorkspaceConnector } from './google-workspace.connector';
import { OneLoginConnector } from './onelogin.connector';
import { DuoConnector } from './duo.connector';
import { JumpCloudConnector } from './jumpcloud.connector';
import { JamfConnector } from './jamf.connector';
import { IntuneConnector } from './intune.connector';
import { GitHubConnector } from './github.connector';
import { GitLabConnector } from './gitlab.connector';
import { BitbucketConnector } from './bitbucket.connector';
import { DockerHubConnector } from './docker-hub.connector';
import { CrowdStrikeConnector } from './crowdstrike.connector';
import { SnykConnector } from './snyk.connector';
import { WizConnector } from './wiz.connector';
import { SonarQubeConnector } from './sonarqube.connector';
import { TenableConnector } from './tenable.connector';
import { QualysConnector } from './qualys.connector';
import { SentinelOneConnector } from './sentinelone.connector';
import { LaceworkConnector } from './lacework.connector';
import { JiraConnector } from './jira.connector';
import { ServiceNowConnector } from './servicenow.connector';
import { ZendeskConnector } from './zendesk.connector';
import { FreshdeskConnector } from './freshdesk.connector';
import { PagerDutyConnector } from './pagerduty.connector';
import { SalesforceConnector } from './salesforce.connector';
import { HubSpotConnector } from './hubspot.connector';
import { SlackConnector } from './slack.connector';
import { MicrosoftTeamsConnector } from './microsoft-teams.connector';
import { ZoomConnector } from './zoom.connector';
import { AsanaConnector } from './asana.connector';
import { TrelloConnector } from './trello.connector';
import { MondayConnector } from './monday.connector';
import { ClickUpConnector } from './clickup.connector';
import { LinearConnector } from './linear.connector';
import { SentryConnector } from './sentry.connector';
import { DatadogConnector } from './datadog.connector';
import { NewRelicConnector } from './new-relic.connector';
import { SplunkConnector } from './splunk.connector';
import { BambooHRConnector } from './bamboohr.connector';
import { WorkdayConnector } from './workday.connector';
import { RipplingConnector } from './rippling.connector';
import { ZipConnector } from './zip.connector';

// Import batch connectors
import * as CloudConnectors from './cloud-connectors';
import * as DevOpsConnectors from './devops-connectors';
import * as HRConnectors from './hr-connectors';
import * as FinanceConnectors from './finance-connectors';
import * as ProductivityConnectors from './productivity-connectors';
import * as ITAMConnectors from './itam-connectors';
import * as AdditionalConnectors from './additional-connectors';
import * as GenericConnectors from './generic.connector';

export interface IConnector {
  testConnection(config: any): Promise<{ success: boolean; message: string; details?: any }>;
  sync(config: any): Promise<any>;
}

@Injectable()
export class ConnectorFactory {
  private readonly logger = new Logger(ConnectorFactory.name);
  private connectors: Map<string, IConnector> = new Map();
  private readonly circuitBreakers: CircuitBreakerRegistry = new CircuitBreakerRegistry();

  constructor() {
    this.initializeConnectors();
  }

  /**
   * Get or create a circuit breaker for a specific integration type
   */
  private getCircuitBreaker(integrationType: string): CircuitBreaker<any> {
    return this.circuitBreakers.getOrCreate(`integration:${integrationType}`, {
      timeout: CONNECTOR_RESILIENCE_CONFIG.timeout,
      errorThresholdPercentage: CONNECTOR_RESILIENCE_CONFIG.errorThresholdPercentage,
      resetTimeout: CONNECTOR_RESILIENCE_CONFIG.resetTimeout,
      volumeThreshold: CONNECTOR_RESILIENCE_CONFIG.volumeThreshold,
      onOpen: () => {
        this.logger.warn(`Circuit breaker OPENED for integration: ${integrationType}`);
      },
      onClose: () => {
        this.logger.log(`Circuit breaker CLOSED for integration: ${integrationType}`);
      },
    });
  }

  private initializeConnectors() {
    // Cloud Infrastructure
    this.connectors.set('aws', new AWSConnector());
    this.connectors.set('azure', new AzureConnector());
    this.connectors.set('gcp', new GCPConnector());
    this.connectors.set('cloudflare', new CloudflareConnector());
    this.connectors.set('digital_ocean', new CloudConnectors.DigitalOceanConnector());
    this.connectors.set('oracle_cloud', new CloudConnectors.OracleCloudConnector());
    this.connectors.set('ibm_cloud', new CloudConnectors.IBMCloudConnector());
    this.connectors.set('alibaba_cloud', new CloudConnectors.AlibabaCloudConnector());
    this.connectors.set('linode', new CloudConnectors.LinodeConnector());
    this.connectors.set('vultr', new CloudConnectors.VultrConnector());
    this.connectors.set('heroku', new CloudConnectors.HerokuConnector());
    this.connectors.set('vercel', new CloudConnectors.VercelConnector());
    this.connectors.set('netlify', new CloudConnectors.NetlifyConnector());
    this.connectors.set('render', new CloudConnectors.RenderConnector());
    this.connectors.set('hetzner', new CloudConnectors.HetznerConnector());

    // Identity & Access
    this.connectors.set('okta', new OktaConnector());
    this.connectors.set('azure_ad', new AzureADConnector());
    this.connectors.set('google_workspace', new GoogleWorkspaceConnector());
    this.connectors.set('onelogin', new OneLoginConnector());
    this.connectors.set('duo_security', new DuoConnector());
    this.connectors.set('jumpcloud', new JumpCloudConnector());
    this.connectors.set('aws_cognito', new ITAMConnectors.AWSCognitoConnector());
    this.connectors.set('keycloak', new ITAMConnectors.KeycloakConnector());
    this.connectors.set('fusionauth', new ITAMConnectors.FusionAuthConnector());
    this.connectors.set('ping_identity', new ITAMConnectors.PingIdentityConnector());
    this.connectors.set('forgerock', new ITAMConnectors.ForgeRockConnector());
    this.connectors.set('cyberark', new ITAMConnectors.CyberArkConnector());
    this.connectors.set('lastpass', new ITAMConnectors.LastPassConnector());
    this.connectors.set('one_password', new ITAMConnectors.OnePasswordConnector());
    this.connectors.set('auth0', new ITAMConnectors.Auth0Connector());

    // Endpoint & MDM
    this.connectors.set('jamf', new JamfConnector());
    this.connectors.set('microsoft_intune', new IntuneConnector());
    this.connectors.set('vmware_workspace_one', new ITAMConnectors.VMwareWorkspaceOneConnector());
    this.connectors.set('citrix_endpoint', new ITAMConnectors.CitrixEndpointConnector());
    this.connectors.set('blackberry_uem', new ITAMConnectors.BlackBerryUEMConnector());
    this.connectors.set('manageengine_mdm', new ITAMConnectors.ManageEngineMDMConnector());
    this.connectors.set('miradore', new ITAMConnectors.MiradoreConnector());
    this.connectors.set('kandji', new ITAMConnectors.KandjiConnector());
    this.connectors.set('mosyle', new AdditionalConnectors.MosyleConnector());
    this.connectors.set('ibm_maas360', new ITAMConnectors.IBMMaaS360Connector());

    // DevSecOps
    this.connectors.set('github', new GitHubConnector());
    this.connectors.set('gitlab', new GitLabConnector());
    this.connectors.set('bitbucket', new BitbucketConnector());
    this.connectors.set('docker_hub', new DockerHubConnector());
    this.connectors.set('jenkins', new DevOpsConnectors.JenkinsConnector());
    this.connectors.set('circleci', new DevOpsConnectors.CircleCIConnector());
    this.connectors.set('travis_ci', new DevOpsConnectors.TravisCIConnector());
    this.connectors.set('azure_devops', new DevOpsConnectors.AzureDevOpsConnector());
    this.connectors.set('jfrog', new DevOpsConnectors.JFrogConnector());
    this.connectors.set('sonatype_nexus', new DevOpsConnectors.SonatypeNexusConnector());
    this.connectors.set('codeclimate', new DevOpsConnectors.CodeClimateConnector());
    this.connectors.set('checkmarx', new DevOpsConnectors.CheckmarxConnector());
    this.connectors.set('aqua_security', new DevOpsConnectors.AquaSecurityConnector());
    this.connectors.set('prisma_cloud', new DevOpsConnectors.PrismaCloudConnector());
    this.connectors.set('orca_security', new DevOpsConnectors.OrcaSecurityConnector());
    this.connectors.set('sysdig', new DevOpsConnectors.SysdigConnector());
    this.connectors.set('panther', new DevOpsConnectors.PantherConnector());
    this.connectors.set('armorcode', new DevOpsConnectors.ArmorcodeConnector());
    this.connectors.set('launchdarkly', new DevOpsConnectors.LaunchDarklyConnector());

    // Security Scanning
    this.connectors.set('crowdstrike', new CrowdStrikeConnector());
    this.connectors.set('snyk', new SnykConnector());
    this.connectors.set('wiz', new WizConnector());
    this.connectors.set('sonarqube', new SonarQubeConnector());
    this.connectors.set('tenable', new TenableConnector());
    this.connectors.set('qualys', new QualysConnector());
    this.connectors.set('sentinelone', new SentinelOneConnector());
    this.connectors.set('lacework', new LaceworkConnector());
    this.connectors.set('veracode', new AdditionalConnectors.VeracodeConnector());
    this.connectors.set('rapid7', new AdditionalConnectors.Rapid7Connector());
    this.connectors.set('palo_alto', new AdditionalConnectors.PaloAltoConnector());
    this.connectors.set('fortinet', new AdditionalConnectors.FortinetConnector());
    this.connectors.set('checkpoint', new AdditionalConnectors.CheckpointConnector());

    // ITSM
    this.connectors.set('jira', new JiraConnector());
    this.connectors.set('servicenow', new ServiceNowConnector());
    this.connectors.set('zendesk', new ZendeskConnector());
    this.connectors.set('freshdesk', new FreshdeskConnector());
    this.connectors.set('pagerduty', new PagerDutyConnector());
    this.connectors.set('freshservice', new ITAMConnectors.FreshserviceConnector());
    this.connectors.set('ivanti', new ITAMConnectors.IvantiConnector());
    this.connectors.set('servicenow_itam', new ITAMConnectors.ServiceNowITAMConnector());
    this.connectors.set('incidentio', new AdditionalConnectors.IncidentIOConnector());

    // CRM & Sales
    this.connectors.set('salesforce', new SalesforceConnector());
    this.connectors.set('hubspot', new HubSpotConnector());
    this.connectors.set('pipedrive', new FinanceConnectors.PipedriveConnector());
    this.connectors.set('zoho_crm', new FinanceConnectors.ZohoCRMConnector());
    this.connectors.set('sugarcrm', new FinanceConnectors.SugarCRMConnector());
    this.connectors.set('copper', new FinanceConnectors.CopperConnector());
    this.connectors.set('pega', new FinanceConnectors.PegaConnector());
    this.connectors.set('monday_crm', new FinanceConnectors.MondayCRMConnector());
    this.connectors.set('help_scout', new FinanceConnectors.HelpScoutConnector());
    this.connectors.set('front', new FinanceConnectors.FrontConnector());
    this.connectors.set('close', new AdditionalConnectors.CloseConnector());
    this.connectors.set('insightly', new AdditionalConnectors.InsightlyConnector());

    // Communication
    this.connectors.set('slack', new SlackConnector());
    this.connectors.set('microsoft_teams', new MicrosoftTeamsConnector());
    this.connectors.set('zoom', new ZoomConnector());
    this.connectors.set('discord', new ProductivityConnectors.DiscordConnector());
    this.connectors.set('webex', new ProductivityConnectors.WebexConnector());
    this.connectors.set('mattermost', new ProductivityConnectors.MattermostConnector());
    this.connectors.set('ringcentral', new ProductivityConnectors.RingCentralConnector());
    this.connectors.set('gotomeeting', new ProductivityConnectors.GoToMeetingConnector());
    this.connectors.set('google_meet', new ProductivityConnectors.GoogleMeetConnector());
    this.connectors.set('chanty', new ProductivityConnectors.ChantyConnector());
    this.connectors.set('twist', new ProductivityConnectors.TwistConnector());
    this.connectors.set('workplace_meta', new ProductivityConnectors.WorkplaceMetaConnector());
    this.connectors.set('flock', new ProductivityConnectors.FlockConnector());
    this.connectors.set('rocket_chat', new ProductivityConnectors.RocketChatConnector());

    // Project Management
    this.connectors.set('asana', new AsanaConnector());
    this.connectors.set('trello', new TrelloConnector());
    this.connectors.set('monday', new MondayConnector());
    this.connectors.set('clickup', new ClickUpConnector());
    this.connectors.set('linear', new LinearConnector());
    this.connectors.set('smartsheet', new ProductivityConnectors.SmartsheetConnector());
    this.connectors.set('wrike', new ProductivityConnectors.WrikeConnector());
    this.connectors.set('basecamp', new ProductivityConnectors.BasecampConnector());
    this.connectors.set('shortcut', new ProductivityConnectors.ShortcutConnector());
    this.connectors.set('height', new ProductivityConnectors.HeightConnector());
    this.connectors.set('teamwork', new ProductivityConnectors.TeamworkConnector());
    this.connectors.set('podio', new ProductivityConnectors.PodioConnector());
    this.connectors.set('coda', new ProductivityConnectors.CodaConnector());

    // Monitoring
    this.connectors.set('sentry', new SentryConnector());
    this.connectors.set('datadog', new DatadogConnector());
    this.connectors.set('new_relic', new NewRelicConnector());
    this.connectors.set('splunk', new SplunkConnector());
    this.connectors.set('grafana', new FinanceConnectors.GrafanaConnector());
    this.connectors.set('elasticsearch', new FinanceConnectors.ElasticsearchConnector());
    this.connectors.set('sumo_logic', new AdditionalConnectors.SumoLogicConnector());

    // HR & People
    this.connectors.set('bamboohr', new BambooHRConnector());
    this.connectors.set('workday', new WorkdayConnector());
    this.connectors.set('rippling', new RipplingConnector());
    this.connectors.set('gusto', new HRConnectors.GustoConnector());
    this.connectors.set('adp', new HRConnectors.ADPConnector());
    this.connectors.set('paychex', new HRConnectors.PaychexConnector());
    this.connectors.set('trinet', new HRConnectors.TriNetConnector());
    this.connectors.set('namely', new HRConnectors.NamelyConnector());
    this.connectors.set('personio', new HRConnectors.PersonioConnector());
    this.connectors.set('factorial', new HRConnectors.FactorialConnector());
    this.connectors.set('charliehr', new HRConnectors.CharlieHRConnector());
    this.connectors.set('zenefits', new HRConnectors.ZenefitsConnector());
    this.connectors.set('ukg', new HRConnectors.UKGConnector());
    this.connectors.set('sap_successfactors', new HRConnectors.SAPSuccessFactorsConnector());
    this.connectors.set('oracle_hcm', new HRConnectors.OracleHCMConnector());
    this.connectors.set('checkr', new HRConnectors.CheckrConnector());
    this.connectors.set('sterling', new HRConnectors.SterlingConnector());
    this.connectors.set('goodhire', new HRConnectors.GoodHireConnector());
    this.connectors.set('hireright', new HRConnectors.HireRightConnector());
    this.connectors.set('certn', new HRConnectors.CertnConnector());
    this.connectors.set('intelifi', new HRConnectors.IntelifiConnector());
    this.connectors.set('hibob', new AdditionalConnectors.HiBobConnector());
    this.connectors.set('lattice', new AdditionalConnectors.LatticeConnector());
    this.connectors.set('culture_amp', new AdditionalConnectors.CultureAmpConnector());
    this.connectors.set('justworks', new AdditionalConnectors.JustworksConnector());

    // Finance
    this.connectors.set('quickbooks', new FinanceConnectors.QuickBooksConnector());
    this.connectors.set('xero', new FinanceConnectors.XeroConnector());
    this.connectors.set('netsuite', new FinanceConnectors.NetSuiteConnector());
    this.connectors.set('freshbooks', new FinanceConnectors.FreshBooksConnector());
    this.connectors.set('wave', new FinanceConnectors.WaveConnector());
    this.connectors.set('sap', new FinanceConnectors.SAPConnector());
    this.connectors.set('expensify', new FinanceConnectors.ExpensifyConnector());
    this.connectors.set('concur', new FinanceConnectors.ConcurConnector());
    this.connectors.set('bill_com', new FinanceConnectors.BillConnector());
    this.connectors.set('stripe', new FinanceConnectors.StripePaymentsConnector());
    this.connectors.set('brex', new AdditionalConnectors.BrexConnector());
    this.connectors.set('ramp', new AdditionalConnectors.RampConnector());
    this.connectors.set('divvy', new AdditionalConnectors.DivvyConnector());

    // Analytics
    this.connectors.set('amplitude', new FinanceConnectors.AmplitudeConnector());
    this.connectors.set('mixpanel', new FinanceConnectors.MixpanelConnector());
    this.connectors.set('segment', new FinanceConnectors.SegmentConnector());
    this.connectors.set('tableau', new FinanceConnectors.TableauConnector());
    this.connectors.set('power_bi', new FinanceConnectors.PowerBIConnector());
    this.connectors.set('looker', new FinanceConnectors.LookerConnector());
    this.connectors.set('domo', new FinanceConnectors.DomoConnector());
    this.connectors.set('metabase', new FinanceConnectors.MetabaseConnector());
    this.connectors.set('redash', new FinanceConnectors.RedashConnector());
    this.connectors.set('superset', new FinanceConnectors.SupersetConnector());
    this.connectors.set('snowflake', new FinanceConnectors.SnowflakeConnector());
    this.connectors.set('databricks', new AdditionalConnectors.DatabricksConnector());
    this.connectors.set('fivetran', new AdditionalConnectors.FivetranConnector());
    this.connectors.set('heap', new AdditionalConnectors.HeapConnector());
    this.connectors.set('qlik', new AdditionalConnectors.QlikConnector());

    // ITAM
    this.connectors.set('snipe_it', new ITAMConnectors.SnipeITConnector());
    this.connectors.set('asset_panda', new ITAMConnectors.AssetPandaConnector());
    this.connectors.set('lansweeper', new ITAMConnectors.LansweperConnector());
    this.connectors.set('flexera', new ITAMConnectors.FlexeraConnector());
    this.connectors.set('snow_software', new ITAMConnectors.SnowSoftwareConnector());
    this.connectors.set('oomnitza', new ITAMConnectors.OomnitzaConnector());
    this.connectors.set('manageengine_assetexplorer', new ITAMConnectors.ManageEngineAssetExplorerConnector());
    this.connectors.set('atlassian_assets', new ITAMConnectors.AtlassianAssetsConnector());

    // Knowledge Management
    this.connectors.set('guru', new ProductivityConnectors.GuruConnector());
    this.connectors.set('tettra', new ProductivityConnectors.TettraConnector());
    this.connectors.set('slab', new ProductivityConnectors.SlabConnector());
    this.connectors.set('nuclino', new ProductivityConnectors.NuclinoConnector());
    this.connectors.set('bloomfire', new ProductivityConnectors.BloomfireConnector());
    this.connectors.set('helpjuice', new ProductivityConnectors.HelpjuiceConnector());
    this.connectors.set('knowledgeowl', new ProductivityConnectors.KnowledgeOwlConnector());
    this.connectors.set('notion', new AdditionalConnectors.NotionKMConnector());

    // Storage
    this.connectors.set('sharepoint', new ITAMConnectors.SharePointConnector());
    this.connectors.set('google_drive', new ITAMConnectors.GoogleDriveConnector());
    this.connectors.set('device42', new ITAMConnectors.Device42Connector());
    this.connectors.set('box', new GenericConnectors.BoxConnector());
    this.connectors.set('dropbox', new GenericConnectors.DropboxConnector());
    this.connectors.set('confluence', new GenericConnectors.ConfluenceConnector());

    // Security Awareness
    this.connectors.set('knowbe4', new AdditionalConnectors.KnowBe4Connector());
    this.connectors.set('proofpoint_sat', new AdditionalConnectors.ProofpointSATConnector());
    this.connectors.set('mimecast_awareness', new AdditionalConnectors.MimecastAwarenessConnector());
    this.connectors.set('cofense', new AdditionalConnectors.CofenseConnector());
    this.connectors.set('hoxhunt', new AdditionalConnectors.HoxhuntConnector());
    this.connectors.set('curricula', new AdditionalConnectors.CurriculaConnector());
    this.connectors.set('infosec_iq', new AdditionalConnectors.InfosecIQConnector());
    this.connectors.set('terranova', new AdditionalConnectors.TerranovaConnector());

    // GRC
    this.connectors.set('drata', new AdditionalConnectors.DrataConnector());

    // Procurement
    this.connectors.set('ziphq', new ZipConnector());

    // Generic
    this.connectors.set('airtable', new GenericConnectors.AirtableConnector());
    this.connectors.set('intercom', new GenericConnectors.IntercomConnector());
    this.connectors.set('custom', new ITAMConnectors.CustomIntegrationConnector());

    this.logger.log(`Initialized ${this.connectors.size} integration connectors`);
  }

  getConnector(integrationType: string): IConnector | null {
    return this.connectors.get(integrationType) || null;
  }

  hasConnector(integrationType: string): boolean {
    return this.connectors.has(integrationType);
  }

  getAllConnectorTypes(): string[] {
    return Array.from(this.connectors.keys());
  }

  /**
   * Test connection with circuit breaker and retry protection
   */
  async testConnection(integrationType: string, config: any): Promise<{ success: boolean; message: string; details?: any }> {
    const connector = this.getConnector(integrationType);
    
    if (!connector) {
      return { 
        success: true, 
        message: `Configuration validated (${integrationType} connector pending implementation)` 
      };
    }

    const circuitBreaker = this.getCircuitBreaker(integrationType);

    // Check if circuit is open (failing fast)
    if (circuitBreaker.getState() === CircuitState.OPEN) {
      this.logger.warn(`Circuit breaker is OPEN for ${integrationType}, failing fast`);
      return { 
        success: false, 
        message: `Integration temporarily unavailable (circuit breaker open). Try again later.`,
        details: { circuitState: 'OPEN' }
      };
    }

    try {
      // Execute with circuit breaker and retry
      const result = await circuitBreaker.fire(async () => {
        return await withRetry(
          () => connector.testConnection(config),
          {
            ...RetryPolicies.fast,
            operationName: `testConnection:${integrationType}`,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retrying testConnection for ${integrationType} (attempt ${attempt}): ${error.message}`);
            },
          }
        );
      });
      
      return result;
    } catch (error: any) {
      this.logger.error(`Connection test failed for ${integrationType}`, error);
      
      // Provide helpful error message based on error type
      if (error.name === 'CircuitBreakerOpenError') {
        return { 
          success: false, 
          message: 'Integration temporarily unavailable. Please try again later.',
          details: { circuitState: 'OPEN' }
        };
      }
      if (error.name === 'CircuitBreakerTimeoutError') {
        return { 
          success: false, 
          message: 'Connection timed out. The external service may be slow or unresponsive.',
          details: { timeout: CONNECTOR_RESILIENCE_CONFIG.timeout }
        };
      }
      
      return { success: false, message: error.message || 'Connection test failed' };
    }
  }

  /**
   * Sync data with circuit breaker and retry protection
   */
  async sync(integrationType: string, config: any): Promise<any> {
    const connector = this.getConnector(integrationType);
    
    if (!connector) {
      return { 
        success: false, 
        message: `No connector available for ${integrationType}`,
        collectedAt: new Date().toISOString(),
        errors: [`Connector not implemented for ${integrationType}`]
      };
    }

    const circuitBreaker = this.getCircuitBreaker(integrationType);

    // Check if circuit is open (failing fast)
    if (circuitBreaker.getState() === CircuitState.OPEN) {
      this.logger.warn(`Circuit breaker is OPEN for ${integrationType}, failing fast`);
      throw new Error(`Integration ${integrationType} is temporarily unavailable (circuit breaker open). Try again later.`);
    }

    try {
      // Execute with circuit breaker and retry (use standard policy for sync operations)
      return await circuitBreaker.fire(async () => {
        return await withRetry(
          () => connector.sync(config),
          {
            ...RetryPolicies.standard,
            operationName: `sync:${integrationType}`,
            onRetry: (error, attempt) => {
              this.logger.warn(`Retrying sync for ${integrationType} (attempt ${attempt}): ${error.message}`);
            },
          }
        );
      });
    } catch (error: any) {
      this.logger.error(`Sync failed for ${integrationType}`, error);
      throw error;
    }
  }

  /**
   * Get circuit breaker statistics for monitoring
   */
  getCircuitBreakerStats(): Record<string, any> {
    return this.circuitBreakers.getAllStats();
  }

  /**
   * Reset circuit breaker for a specific integration (admin use)
   */
  resetCircuitBreaker(integrationType: string): void {
    const breaker = this.circuitBreakers.getOrCreate(`integration:${integrationType}`);
    breaker.reset();
    this.logger.log(`Circuit breaker manually reset for integration: ${integrationType}`);
  }

  /**
   * Reset all circuit breakers (admin use)
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.resetAll();
    this.logger.log('All circuit breakers manually reset');
  }
}

