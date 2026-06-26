/**
 * @format
 */

import { minutesFromWords } from '../src/lib/minutes';

describe('reading helpers', () => {
  it('estimates minutes from word count', () => {
    expect(minutesFromWords(440, 100)).toBe(2);
    expect(minutesFromWords(100, 50)).toBe(1);
    expect(minutesFromWords(0, 100)).toBe(0);
  });
});
