export const FAMILY_JOIN_CODE_LENGTH = 6;

/** Keep only digits, max 6 — matches server-generated numeric family codes. */
export function normalizeJoinCodeInput(value: string): string {
  return value.replace(/\D/g, '').slice(0, FAMILY_JOIN_CODE_LENGTH);
}

export function isValidJoinCode(code: string): boolean {
  return new RegExp(`^\\d{${FAMILY_JOIN_CODE_LENGTH}}$`).test(code);
}
