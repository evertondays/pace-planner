import {
  formatDecimal,
  formatDistanceKm,
  formatDuration,
  formatGrade,
  formatPace,
  formatSignedDuration,
  parseDecimal,
  parseDuration,
} from './formatters';

describe('formatters', () => {
  it('formats durations with and without hours', () => {
    expect(formatDuration(5400)).toBe('1:30:00');
    expect(formatDuration(1245)).toBe('20:45');
    expect(formatDuration(3599.6)).toBe('1:00:00');
  });

  it('formats pace, rounding to the second', () => {
    expect(formatPace(256)).toBe('4:16');
    expect(formatPace(299.6)).toBe('5:00');
  });

  it('formats signed durations', () => {
    expect(formatSignedDuration(12)).toBe('+0:12');
    expect(formatSignedDuration(-65)).toBe('−1:05');
    expect(formatSignedDuration(0.3)).toBe('0:00');
  });

  it('formats distance and grade in pt-BR', () => {
    expect(formatDistanceKm(21097.5)).toBe('21,1');
    expect(formatGrade(0.023)).toBe('+2,3%');
    expect(formatGrade(-0.01)).toBe('−1,0%');
    expect(formatGrade(-0.0001)).toBe('0,0%');
  });

  it('formats decimals without trailing zeros', () => {
    expect(formatDecimal(21.0975)).toBe('21,0975');
    expect(formatDecimal(10)).toBe('10');
    expect(formatDecimal(1000.5)).toBe('1000,5');
  });

  it('parses h:mm:ss and mm:ss', () => {
    expect(parseDuration('1:30:00')).toBe(5400);
    expect(parseDuration(' 40:00 ')).toBe(2400);
    expect(parseDuration('3:05:59')).toBe(11159);
  });

  it('rejects malformed durations', () => {
    for (const text of ['', '90', '1:60', '1:61:00', 'a:bc', '0:00', '1:2:3:4']) {
      expect(parseDuration(text)).toBeNull();
    }
  });

  it('parses decimals with comma or dot', () => {
    expect(parseDecimal('21,0975')).toBe(21.0975);
    expect(parseDecimal('10.5')).toBe(10.5);
    expect(parseDecimal('abc')).toBeNull();
  });
});
