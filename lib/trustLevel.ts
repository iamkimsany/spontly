export interface TrustLevel {
  name: string;
  color: string;
  bg: string;
  border: string;
  min: number;
  max: number;       // inclusive; 100 for Elite
  next: number | null; // points needed to reach next level (null at top)
}

export const TRUST_LEVELS: TrustLevel[] = [
  { name: 'New',      color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', border: 'rgba(156,163,175,0.30)', min: 0,   max: 39,  next: 40  },
  { name: 'Member',   color: '#2563EB', bg: 'rgba(37,99,235,0.12)',   border: 'rgba(37,99,235,0.30)',   min: 40,  max: 59,  next: 60  },
  { name: 'Trusted',  color: '#16a34a', bg: 'rgba(22,163,74,0.12)',   border: 'rgba(22,163,74,0.30)',   min: 60,  max: 79,  next: 80  },
  { name: 'Verified', color: '#D97706', bg: 'rgba(217,119,6,0.12)',   border: 'rgba(217,119,6,0.30)',   min: 80,  max: 99,  next: 100 },
  { name: 'Elite',    color: '#7C3AED', bg: 'rgba(124,58,237,0.12)',  border: 'rgba(124,58,237,0.30)',  min: 100, max: 100, next: null },
];

export function getTrustLevel(score: number): TrustLevel {
  const clamped = Math.max(0, Math.min(100, score));
  return TRUST_LEVELS.find((l) => clamped >= l.min && clamped <= l.max) ?? TRUST_LEVELS[0];
}

/** 0–1 progress within the current level band */
export function getLevelProgress(score: number): number {
  const level = getTrustLevel(score);
  if (level.max === level.min) return 1; // Elite
  return (score - level.min) / (level.max - level.min + 1);
}

/** Points needed to reach next level, or null if at Elite */
export function pointsToNext(score: number): number | null {
  const level = getTrustLevel(score);
  if (level.next === null) return null;
  return level.next - Math.min(score, level.max);
}

/** Registration bonus points */
export function registrationBonus(opts: {
  hasPhoto: boolean;
  hasTrustedContact: boolean;
  gpsGranted: boolean;
}): number {
  let pts = 40 + 5; // base 40 + phone verified
  if (opts.hasPhoto) pts += 3;
  if (opts.hasTrustedContact) pts += 5;
  if (opts.gpsGranted) pts += 2;
  return pts;
}

export const POINTS_FOR_STARS: Record<number, number> = { 5: 10, 4: 7, 3: 5, 2: 1, 1: 0 };
