export function formatBDT(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `৳${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatBDTCompact(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `৳${safe.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNumberEN(val: number): string {
  const safe = Number.isFinite(val) ? val : 0;
  return safe.toLocaleString('en-US');
}

export function normalizeBDPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length >= 13) {
    return `+${digits.slice(0, 13)}`;
  }
  if (digits.startsWith('01') && digits.length >= 11) {
    return `+880${digits.slice(1, 11)}`;
  }
  if (digits.startsWith('1') && digits.length >= 10) {
    return `+880${digits.slice(0, 10)}`;
  }
  return digits ? `+880${digits}` : '';
}

export function maskPhone(phone: string): string {
  const clean = phone.replace(/\s+/g, '');
  if (clean.length < 8) return clean;
  return `${clean.slice(0, 6)}****${clean.slice(-3)}`;
}

export function formatCountdown(targetIso: string, nowMs: number = Date.now()): string {
  const targetMs = new Date(targetIso).getTime();
  const diff = Math.max(0, targetMs - nowMs);
  const totalSec = Math.floor(diff / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
