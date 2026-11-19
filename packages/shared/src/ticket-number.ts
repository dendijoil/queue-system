/** Format nomor tampil, mis. prefix "A", 3 digit, nomor 12 → "A-012". */
export function formatDisplayNo(prefix: string, digits: number, number: number): string {
  if (!Number.isInteger(number) || number < 0) {
    throw new RangeError(`Nomor tiket tidak valid: ${number}`);
  }
  return `${prefix}-${String(number).padStart(digits, '0')}`;
}
