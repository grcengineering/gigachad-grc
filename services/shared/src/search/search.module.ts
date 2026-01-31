import { Module, DynamicModule, Global, Type, InjectionToken, OptionalFactoryDependency } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService, IPrismaService } from './search.service';

export const PRISMA_SERVICE = 'PRISMA_SERVICE';

@Global()
@Module({})
export class SearchModule {
  /**
   * Register SearchModule with a Prisma service provider
   * @param prismaProvider The Prisma service class to use for database queries
   */
  static forRoot(prismaProvider: Type<IPrismaService>): DynamicModule {
    return {
      module: SearchModule,
      controllers: [SearchController],
      providers: [
        {
          provide: PRISMA_SERVICE,
          useExisting: prismaProvider,
        },
        SearchService,
      ],
      exports: [SearchService],
    };
  }

  /**
   * Register SearchModule for async configuration
   */
  static forRootAsync(options: {
    imports?: Type<unknown>[];
    useFactory: (...args: unknown[]) => IPrismaService | Promise<IPrismaService>;
    inject?: (InjectionToken | OptionalFactoryDependency)[];
  }): DynamicModule {
    return {
      module: SearchModule,
      imports: options.imports || [],
      controllers: [SearchController],
      providers: [
        {
          provide: PRISMA_SERVICE,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        SearchService,
      ],
      exports: [SearchService],
    };
  }
}
