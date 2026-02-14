export { SecretsModule } from './secrets.module';
export { SecretsService, SECRETS_PROVIDER } from './secrets.service';
export type {
  SecretsProvider,
  SecretsProviderConfig,
  SecretsProviderConstructor,
} from './secrets.interface';
export { registerSecretsProvider, getRegisteredProviders } from './secrets.registry';
export { createSecretsProvider, getSecretsConfigFromEnv } from './secrets.factory';
