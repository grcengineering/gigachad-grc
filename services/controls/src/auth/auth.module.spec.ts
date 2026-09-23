import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ApplicationAuthGuard, DevAuthGuard } from '@gigachad-grc/shared';
import { AuthModule } from './auth.module';

describe('AuthModule', () => {
  it('resolves the environment-aware guard without circular dependencies', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
    }).compile();

    expect(moduleRef.get(ApplicationAuthGuard)).toBeInstanceOf(ApplicationAuthGuard);
    expect(moduleRef.get(DevAuthGuard)).toBe(moduleRef.get(ApplicationAuthGuard));

    await moduleRef.close();
  });
});
