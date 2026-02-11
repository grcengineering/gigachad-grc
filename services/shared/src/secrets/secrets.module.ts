import { Module, DynamicModule, Global } from '@nestjs/common';
import { SecretsService, SecretsConfig, SECRETS_PROVIDER } from './secrets.service';

@Global()
@Module({})
export class SecretsModule {
  static forRoot(config?: SecretsConfig): DynamicModule {
    return {
      module: SecretsModule,
      providers: [
        {
          provide: SECRETS_PROVIDER,
          useFactory: () => new SecretsService(config),
        },
        {
          provide: SecretsService,
          useExisting: SECRETS_PROVIDER,
        },
      ],
      exports: [SECRETS_PROVIDER, SecretsService],
    };
  }
}
