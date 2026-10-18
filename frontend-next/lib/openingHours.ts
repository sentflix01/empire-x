/**
 * Opening hours as owners fill them in Studio: one entry per weekday, open or
 * closed, with a from/to time ("08:00"–"18:00"; "to" earlier than "from"
 * means the business closes after midnight).
 */
export interface DayHours { day: string; open: boolean; from: string; to: string }

export const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const DEFAULT_WEEK: DayHours[] = WEEK.map((day) => ({ day, open: day !== "Sunday", from: "08:00", to: "18:00" }));

/** A saved value, or null when the owner has not set hours. */
export function readOpeningHours(raw: unknown): DayHours[] | null {
  if (!Array.isArray(raw) || raw.length !== 7) return null;
  return WEEK.map((day, i) => {
    const d = (raw[i] ?? {}) as Partial<DayHours>;
    return { day, open: Boolean(d.open), from: String(d.from || "08:00"), to: String(d.to || "18:00") };
  });
}

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** "8:00 AM" style for visitors. */
export function formatTime(hhmm: string): string {
  const total = minutes(hhmm);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Monday = 0 … Sunday = 6. */
const weekdayIndex = (date: Date) => (date.getDay() + 6) % 7;

/** Whether the business is open at `now` (the visitor's local time), including hours past midnight. */
export function isOpenNow(week: DayHours[], now = new Date()): boolean {
  const today = weekdayIndex(now);
  const yesterday = (today + 6) % 7;
  const t = now.getHours() * 60 + now.getMinutes();
  const d = week[today];
  if (d.open) {
    const from = minutes(d.from), to = minutes(d.to);
    if (to > from ? t >= from && t < to : t >= from) return true;
  }
  const y = week[yesterday];
  if (y.open) {
    const from = minutes(y.from), to = minutes(y.to);
    if (to <= from && t < to) return true;
  }
  return false;
}

export function todayIndex(now = new Date()): number {
  return weekdayIndex(now);
}
