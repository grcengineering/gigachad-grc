import { BadRequestException } from '@nestjs/common';
import { ContractsController } from './contracts.controller';

describe('ContractsController uploads', () => {
  const contractsService = { uploadDocument: jest.fn() };
  const controller = new ContractsController(contractsService as never);
  const user = { organizationId: 'org-1', userId: 'user-1' } as never;

  beforeEach(() => jest.clearAllMocks());

  it('rejects a missing contract document with HTTP 400', () => {
    expect(() =>
      controller.uploadDocument(
        'contract-1',
        undefined as unknown as Express.Multer.File,
        user
      )
    ).toThrow(BadRequestException);
    expect(contractsService.uploadDocument).not.toHaveBeenCalled();
  });
});
