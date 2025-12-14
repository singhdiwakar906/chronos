/**
 * Tests for utility helper functions
 * These tests don't require any database or Redis connection
 */

const helpers = require('../src/utils/helpers');

describe('Helper Functions', () => {
  
  describe('formatDuration', () => {
    it('should format milliseconds correctly', () => {
      expect(helpers.formatDuration(500)).toBe('500ms');
    });

    it('should format seconds correctly', () => {
      expect(helpers.formatDuration(1500)).toBe('1.50s');
      expect(helpers.formatDuration(5000)).toBe('5.00s');
    });

    it('should format minutes correctly', () => {
      expect(helpers.formatDuration(90000)).toBe('1.50m');
      expect(helpers.formatDuration(120000)).toBe('2.00m');
    });

    it('should format hours correctly', () => {
      expect(helpers.formatDuration(5400000)).toBe('1.50h');
      expect(helpers.formatDuration(7200000)).toBe('2.00h');
    });
  });

  describe('isEmpty', () => {
    it('should return true for null', () => {
      expect(helpers.isEmpty(null)).toBe(true);
    });

    it('should return true for undefined', () => {
      expect(helpers.isEmpty(undefined)).toBe(true);
    });

    it('should return true for empty string', () => {
      expect(helpers.isEmpty('')).toBe(true);
    });

    it('should return true for whitespace-only string', () => {
      expect(helpers.isEmpty('   ')).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(helpers.isEmpty([])).toBe(true);
    });

    it('should return true for empty object', () => {
      expect(helpers.isEmpty({})).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(helpers.isEmpty('hello')).toBe(false);
    });

    it('should return false for non-empty array', () => {
      expect(helpers.isEmpty([1, 2, 3])).toBe(false);
    });

    it('should return false for non-empty object', () => {
      expect(helpers.isEmpty({ a: 1 })).toBe(false);
    });
  });

  describe('percentage', () => {
    it('should calculate simple percentage', () => {
      expect(helpers.percentage(50, 100)).toBe(50);
    });

    it('should calculate percentage with decimals', () => {
      expect(helpers.percentage(1, 3, 2)).toBe(33.33);
    });

    it('should return 0 when total is 0', () => {
      expect(helpers.percentage(10, 0)).toBe(0);
    });

    it('should handle 100%', () => {
      expect(helpers.percentage(100, 100)).toBe(100);
    });

    it('should handle 0%', () => {
      expect(helpers.percentage(0, 100)).toBe(0);
    });
  });

  describe('paginate', () => {
    const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('should return first page correctly', () => {
      const result = helpers.paginate(testArray, 1, 3);
      expect(result.data).toEqual([1, 2, 3]);
      expect(result.pagination.page).toBe(1);
    });

    it('should return second page correctly', () => {
      const result = helpers.paginate(testArray, 2, 3);
      expect(result.data).toEqual([4, 5, 6]);
      expect(result.pagination.page).toBe(2);
    });

    it('should return correct total', () => {
      const result = helpers.paginate(testArray, 1, 3);
      expect(result.pagination.total).toBe(10);
    });

    it('should calculate pages correctly', () => {
      const result = helpers.paginate(testArray, 1, 3);
      expect(result.pagination.pages).toBe(4);
    });

    it('should handle last page with fewer items', () => {
      const result = helpers.paginate(testArray, 4, 3);
      expect(result.data).toEqual([10]);
    });
  });

  describe('randomString', () => {
    it('should generate string of specified length', () => {
      expect(helpers.randomString(16).length).toBe(16);
      expect(helpers.randomString(32).length).toBe(32);
      expect(helpers.randomString(8).length).toBe(8);
    });

    it('should generate different strings each time', () => {
      const str1 = helpers.randomString(32);
      const str2 = helpers.randomString(32);
      expect(str1).not.toBe(str2);
    });

    it('should only contain alphanumeric characters', () => {
      const str = helpers.randomString(100);
      expect(str).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON object', () => {
      expect(helpers.safeJsonParse('{"a":1}')).toEqual({ a: 1 });
    });

    it('should parse valid JSON array', () => {
      expect(helpers.safeJsonParse('[1,2,3]')).toEqual([1, 2, 3]);
    });

    it('should return fallback for invalid JSON', () => {
      expect(helpers.safeJsonParse('invalid', {})).toEqual({});
    });

    it('should return null fallback by default', () => {
      expect(helpers.safeJsonParse('invalid')).toBe(null);
    });

    it('should return custom fallback', () => {
      expect(helpers.safeJsonParse('invalid', 'default')).toBe('default');
    });
  });

  describe('sleep', () => {
    it('should wait for specified duration', async () => {
      const start = Date.now();
      await helpers.sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });
  });

  describe('describeCron', () => {
    it('should describe every minute', () => {
      const result = helpers.describeCron('* * * * *');
      expect(result).toBe('Every minute');
    });

    it('should describe every hour', () => {
      const result = helpers.describeCron('0 * * * *');
      expect(result).toBe('Every hour');
    });

    it('should handle invalid expressions', () => {
      const result = helpers.describeCron('invalid');
      expect(result).toBe('invalid');
    });
  });
});

