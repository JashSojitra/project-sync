/**
 * Demo time helpers. All demo times are minutes since midnight on the demo day;
 * values of 1440 or more are on the next day.
 */
export const DEMO_DATE_LABEL = "Sun, Nov 22, 2026";
export const DEMO_DAY_LABEL = "Sun";

/** "14:05", or with seconds "14:05:32". */
export function clockLabel(min: number, withSeconds = false): string {
  const whole = Math.floor(min);
  const h = Math.floor(whole / 60) % 24;
  const m = ((whole % 60) + 60) % 60;
  const base = `${pad(h)}:${pad(m)}`;
  if (!withSeconds) return base;
  const s = Math.floor((min - whole) * 60 + 1e-6);
  return `${base}:${pad(s)}`;
}

/** "2:00 PM" style, for guard-facing copy. */
export function clock12(min: number): string {
  const whole = Math.floor(min);
  const h24 = Math.floor(whole / 60) % 24;
  const m = whole % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${pad(m)} ${h24 < 12 ? "AM" : "PM"}`;
}

export function rangeLabel(start: number, end: number) {
  return `${clockLabel(start)}–${clockLabel(end)}`;
}

export function minutesUntilLabel(mins: number): string {
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} h` : `${h} h ${pad(r)} min`;
}

export function durationLabel(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function hoursBetween(start: number, end: number) {
  return Math.round(((end - start) / 60) * 10) / 10;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

const DEMO_EPOCH = Date.UTC(2026, 10, 22);
export const DAY_MINUTES = 1440;

export function demoDate(day: number) {
  return new Date(DEMO_EPOCH + day * 86400000);
}

export function dateOffset(date: Date) {
  return (date.getTime() - DEMO_EPOCH) / 86400000;
}

export function shiftDateLabel(min: number) {
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", timeZone: "UTC" }).format(demoDate(Math.floor(min / DAY_MINUTES)));
}
