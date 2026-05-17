let _digits = '';
export function setPendingPhone(digits: string) { _digits = digits; }
export function takePendingPhone(): string { const v = _digits; _digits = ''; return v; }
