import { describe, expect, it } from 'vitest';
import { formatDisplayNo } from './ticket-number.js';

describe('formatDisplayNo', () => {
  it('menambahkan nol di depan sesuai jumlah digit', () => {
    expect(formatDisplayNo('A', 3, 12)).toBe('A-012');
    expect(formatDisplayNo('CS', 2, 7)).toBe('CS-07');
  });

  it('tidak memotong nomor yang lebih panjang dari jumlah digit', () => {
    expect(formatDisplayNo('A', 3, 1234)).toBe('A-1234');
  });

  it('menolak nomor tidak valid', () => {
    expect(() => formatDisplayNo('A', 3, -1)).toThrow(RangeError);
    expect(() => formatDisplayNo('A', 3, 1.5)).toThrow(RangeError);
  });
});
