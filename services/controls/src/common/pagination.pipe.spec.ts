import { ArgumentMetadata, Logger } from '@nestjs/common';
import { PaginationLimitPipe, PaginationPagePipe, DEFAULT_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT } from './pagination.pipe';

describe('PaginationLimitPipe', () => {
  let pipe: PaginationLimitPipe;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    pipe = new PaginationLimitPipe();
    // Spy on the static logger's warn method
    loggerWarnSpy = jest.spyOn(PaginationLimitPipe['logger'], 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const metadata: ArgumentMetadata = {
    type: 'query',
    metatype: Number,
    data: 'limit',
  };

  describe('valid inputs', () => {
    it('should return valid number input', () => {
      expect(pipe.transform(10, metadata)).toBe(10);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should return valid string input as number', () => {
      expect(pipe.transform('25', metadata)).toBe(25);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should return default for undefined', () => {
      expect(pipe.transform(undefined, metadata)).toBe(DEFAULT_PAGINATION_LIMIT);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should return default for null', () => {
      expect(pipe.transform(null as any, metadata)).toBe(DEFAULT_PAGINATION_LIMIT);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should return default for empty string', () => {
      expect(pipe.transform('', metadata)).toBe(DEFAULT_PAGINATION_LIMIT);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should return default for NaN number', () => {
      expect(pipe.transform(NaN, metadata)).toBe(DEFAULT_PAGINATION_LIMIT);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('invalid inputs with logging', () => {
    it('should log warning and return default for invalid string', () => {
      const result = pipe.transform('invalid', metadata);
      expect(result).toBe(DEFAULT_PAGINATION_LIMIT);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Invalid limit value provided: "invalid". Falling back to default: ${DEFAULT_PAGINATION_LIMIT}`
      );
    });

    it('should log warning and return default for special characters', () => {
      const result = pipe.transform('abc123', metadata);
      expect(result).toBe(DEFAULT_PAGINATION_LIMIT);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Invalid limit value provided: "abc123". Falling back to default: ${DEFAULT_PAGINATION_LIMIT}`
      );
    });
  });

  describe('boundary enforcement with logging', () => {
    it('should log warning and clamp to minimum when below min', () => {
      const result = pipe.transform(0, metadata);
      expect(result).toBe(1);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Limit value 0 is below minimum 1. Clamping to minimum.'
      );
    });

    it('should log warning and clamp to minimum for negative values', () => {
      const result = pipe.transform(-5, metadata);
      expect(result).toBe(1);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Limit value -5 is below minimum 1. Clamping to minimum.'
      );
    });

    it('should log warning and clamp to maximum when above max', () => {
      const result = pipe.transform(200, metadata);
      expect(result).toBe(MAX_PAGINATION_LIMIT);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Limit value 200 exceeds maximum ${MAX_PAGINATION_LIMIT}. Clamping to maximum.`
      );
    });

    it('should accept value at maximum without warning', () => {
      const result = pipe.transform(MAX_PAGINATION_LIMIT, metadata);
      expect(result).toBe(MAX_PAGINATION_LIMIT);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should accept value at minimum without warning', () => {
      const result = pipe.transform(1, metadata);
      expect(result).toBe(1);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('custom options', () => {
    it('should use custom default value', () => {
      const customPipe = new PaginationLimitPipe({ default: 50 });
      expect(customPipe.transform(undefined, metadata)).toBe(50);
    });

    it('should use custom max value and log when exceeded', () => {
      const customPipe = new PaginationLimitPipe({ max: 50 });
      const result = customPipe.transform(75, metadata);
      expect(result).toBe(50);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Limit value 75 exceeds maximum 50. Clamping to maximum.'
      );
    });

    it('should use custom min value and log when below', () => {
      const customPipe = new PaginationLimitPipe({ min: 5 });
      const result = customPipe.transform(3, metadata);
      expect(result).toBe(5);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Limit value 3 is below minimum 5. Clamping to minimum.'
      );
    });
  });
});

describe('PaginationPagePipe', () => {
  let pipe: PaginationPagePipe;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    pipe = new PaginationPagePipe();
    // Spy on the static logger's warn method
    loggerWarnSpy = jest.spyOn(PaginationPagePipe['logger'], 'warn').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const metadata: ArgumentMetadata = {
    type: 'query',
    metatype: Number,
    data: 'page',
  };

  describe('valid inputs', () => {
    it('should return valid number input', () => {
      expect(pipe.transform(5, metadata)).toBe(5);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should return valid string input as number', () => {
      expect(pipe.transform('3', metadata)).toBe(3);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should return default for undefined', () => {
      expect(pipe.transform(undefined, metadata)).toBe(1);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should return default for null', () => {
      expect(pipe.transform(null as any, metadata)).toBe(1);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should return default for empty string', () => {
      expect(pipe.transform('', metadata)).toBe(1);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });

    it('should return default for NaN number', () => {
      expect(pipe.transform(NaN, metadata)).toBe(1);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('invalid inputs with logging', () => {
    it('should log warning and return default for invalid string', () => {
      const result = pipe.transform('invalid', metadata);
      expect(result).toBe(1);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Invalid page value provided: "invalid". Falling back to default: 1'
      );
    });

    it('should log warning and return default for special characters', () => {
      const result = pipe.transform('xyz', metadata);
      expect(result).toBe(1);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Invalid page value provided: "xyz". Falling back to default: 1'
      );
    });
  });

  describe('boundary enforcement with logging', () => {
    it('should log warning and clamp to minimum when below min', () => {
      const result = pipe.transform(0, metadata);
      expect(result).toBe(1);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Page value 0 is below minimum 1. Clamping to minimum.'
      );
    });

    it('should log warning and clamp to minimum for negative values', () => {
      const result = pipe.transform(-2, metadata);
      expect(result).toBe(1);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Page value -2 is below minimum 1. Clamping to minimum.'
      );
    });

    it('should accept value at minimum without warning', () => {
      const result = pipe.transform(1, metadata);
      expect(result).toBe(1);
      expect(loggerWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('custom options', () => {
    it('should use custom default value', () => {
      const customPipe = new PaginationPagePipe({ default: 2 });
      expect(customPipe.transform(undefined, metadata)).toBe(2);
    });

    it('should use custom min value and log when below', () => {
      const customPipe = new PaginationPagePipe({ min: 10 });
      const result = customPipe.transform(5, metadata);
      expect(result).toBe(10);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Page value 5 is below minimum 10. Clamping to minimum.'
      );
    });
  });
});
