export function formatPhone(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function looksLikePhone(input: string): boolean {
  const trimmed = input.trimStart();
  if (!trimmed) return false;
  const first = trimmed[0];
  return /[0-9(+]/.test(first);
}

export function stripPhone(input: string): string {
  return input.replace(/\D/g, '').slice(0, 10);
}
