/**
 * Normalizes Kenyan mobile phone input to E.164 format (+254XXXXXXXXX).
 * Accepts formats: "0712345678", "712345678", "254712345678", "+254712345678", with separators.
 * Only accepts numbers starting with 1 or 7 (Safaricom, Airtel, etc).
 *
 * @param input - Raw phone input string, possibly with spaces, dashes, parentheses.
 * @returns E.164 phone number, or null if the format is invalid or not Kenyan.
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, '').replace(/^\+/, '');
  let national: string;
  if (/^254\d{9}$/.test(digits)) national = digits.slice(3);
  else if (/^0\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^\d{9}$/.test(digits)) national = digits;
  else return null;
  if (!/^[17]\d{8}$/.test(national)) return null;
  return `+254${national}`;
}

/**
 * Masks an E.164 phone for display in the UI.
 * Shows only the first digit and last 3 digits: "+254 7•• ••• 312".
 *
 * @param e164 - E.164 formatted phone number ("+254712345312").
 * @returns Masked phone string.
 * @example
 * maskPhone("+254712345312") // "+254 7•• ••• 312"
 */
export function maskPhone(e164: string): string {
  const national = e164.replace(/^\+254/, '');
  return `+254 ${national.slice(0, 1)}•• ••• ${national.slice(-3)}`;
}

/**
 * Compact phone mask for space-constrained UI.
 * Shows only the last 3 digits preceded by bullets: "•••312".
 *
 * @param e164 - E.164 formatted phone number.
 * @returns Compact masked phone string.
 */
export function shortMaskPhone(e164: string): string {
  return `•••${e164.slice(-3)}`;
}

/**
 * Normalizes Ethiopian mobile input to E.164 (+251XXXXXXXXX).
 * Accepts "0911234678", "911234678", "251911234678", "+251 911 234 678", with separators.
 * National numbers must be 9 digits starting with 7 or 9. No carrier is assumed.
 *
 * @param input - Raw phone input string, possibly with spaces, dashes, parentheses.
 * @returns E.164 phone number, or null if the format is invalid or not Ethiopian.
 */
export function normalizeEthiopianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, '').replace(/^\+/, '');
  let national: string;
  if (/^251\d{9}$/.test(digits)) national = digits.slice(3);
  else if (/^0\d{9}$/.test(digits)) national = digits.slice(1);
  else if (/^\d{9}$/.test(digits)) national = digits;
  else return null;
  if (!/^[79]\d{8}$/.test(national)) return null;
  return `+251${national}`;
}

/**
 * Masks an Ethiopian E.164 phone for display.
 * Shows the first digit and last 3 digits: "+251 9•• ••• 678".
 *
 * @param e164 - E.164 formatted phone number ("+251911234678").
 * @returns Masked phone string.
 */
export function maskEthiopianPhone(e164: string): string {
  const national = e164.replace(/^\+251/, '');
  return `+251 ${national.slice(0, 1)}•• ••• ${national.slice(-3)}`;
}
