import { Module, DynamicModule, Global } from '@nestjs/common';
import { SecretsService, SECRETS_PROVIDER } from './secrets.service';

@Global()
@Module({})
export class SecretsModule {
  static forRoot(): DynamicModule {
    return {
      module: SecretsModule,
      providers: [
        {
          provide: SECRETS_PROVIDER,
          useFactory: () => new SecretsService(),
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
