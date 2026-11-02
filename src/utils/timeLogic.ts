export const DEFAULT_HOURLY_RATE = 31.5;
export const MAX_ARCHIVED_WEEKS = 3;

export interface WorkEntry {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationSeconds: number;
  note?: string;
  isAutoStarted?: boolean;
}

export interface ArchivedWeek {
  weekKey: string; // YYYY-MM-DD (Monday of that week)
  startDate: string; // YYYY-MM-DD (Monday)
  endDate: string; // YYYY-MM-DD (Sunday)
  totalSeconds: number;
  totalEarnings: number;
  entriesCount: number;
}

export interface AutostartConfig {
  enabled: boolean;
  time: string; // "HH:MM", e.g., "08:00"
  nextTriggerTimestamp: number | null; // Exact epoch ms when next autostart should fire
  lastTriggeredDate: string | null; // YYYY-MM-DD
  lastStoppedDate: string | null; // YYYY-MM-DD
}

export interface ActiveSession {
  isRunning: boolean;
  startTimestamp: number; // ms epoch when started
  startTimeFormatted: string; // HH:MM
  date: string; // YYYY-MM-DD
  autoStarted?: boolean;
}

export interface AppStorageState {
  hourlyRate: number;
  currentWeekKey: string; // Monday YYYY-MM-DD
  entries: WorkEntry[];
  archivedWeeks: ArchivedWeek[];
  autostart: AutostartConfig;
  activeSession: ActiveSession | null;
}

/**
 * Formats a Date object as local YYYY-MM-DD
 */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object as local HH:MM
 */
export function toTimeString(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Parses YYYY-MM-DD into a local Date at 00:00:00
 */
export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

/**
 * Returns the Monday and Sunday (YYYY-MM-DD) of the week containing the given date.
 * Weeks run Monday (1) to Sunday (0 -> 7).
 */
export function getWeekBounds(date: Date): { monday: string; sunday: string; weekKey: string } {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const mondayDate = new Date(d);
  mondayDate.setDate(d.getDate() + diffToMonday);

  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(mondayDate.getDate() + 6);

  const monday = toDateString(mondayDate);
  const sunday = toDateString(sundayDate);
  return { monday, sunday, weekKey: monday };
}

/**
 * Returns an array of all 7 days (Monday through Sunday) for a given weekKey (Monday YYYY-MM-DD)
 */
export function getWeekDays(weekKey: string): {
  date: string;
  dayNameShort: string;
  dayNameFull: string;
  dayMonthLabel: string;
}[] {
  const shortNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Niedz'];
  const fullNames = [
    'Poniedziałek',
    'Wtorek',
    'Środa',
    'Czwartek',
    'Piątek',
    'Sobota',
    'Niedziela',
  ];
  const monday = parseDateString(weekKey);
  return shortNames.map((shortName, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    const dateStr = toDateString(d);
    const dayNum = String(d.getDate()).padStart(2, '0');
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    return {
      date: dateStr,
      dayNameShort: shortName,
      dayNameFull: fullNames[idx],
      dayMonthLabel: `${dayNum}.${monthNum}`,
    };
  });
}

/**
 * Calculates earnings in PLN given duration in seconds and hourly rate.
 */
export function calculateEarnings(durationSeconds: number, hourlyRate = DEFAULT_HOURLY_RATE): number {
  if (durationSeconds <= 0 || hourlyRate <= 0) return 0;
  const hours = durationSeconds / 3600;
  return Math.round(hours * hourlyRate * 100) / 100;
}

/**
 * Formats PLN amount in Polish format, e.g. "126,00 zł"
 */
export function formatPLN(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return (
    safeAmount.toLocaleString('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' zł'
  );
}

/**
 * Formats seconds into HH:MM:SS for the live clock
 */
export function formatHMS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, '0')).join(':');
}

/**
 * Formats seconds into readable Polish hours & minutes, e.g. "8h 15m"
 */
export function formatDurationHM(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours === 0 && minutes === 0 && safe > 0) {
    return `${safe}s`;
  }
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * Archives a completed week into the history list and enforces the maximum of 3 previous weeks.
 * When a 4th week comes in, the oldest week is removed automatically.
 */
export function archiveWeekWithCap(
  existingArchive: ArchivedWeek[],
  newWeek: ArchivedWeek,
  maxWeeks: number = MAX_ARCHIVED_WEEKS
): ArchivedWeek[] {
  const filtered = existingArchive.filter((w) => w.weekKey !== newWeek.weekKey);
  const combined = [newWeek, ...filtered];
  combined.sort((a, b) => (a.weekKey < b.weekKey ? 1 : a.weekKey > b.weekKey ? -1 : 0));
  return combined.slice(0, maxWeeks);
}

/**
 * Summarizes a list of entries for a given weekKey into an ArchivedWeek record
 */
export function summarizeWeekEntries(
  weekKey: string,
  entries: WorkEntry[],
  hourlyRate = DEFAULT_HOURLY_RATE
): ArchivedWeek {
  const mondayDate = parseDateString(weekKey);
  const { monday, sunday } = getWeekBounds(mondayDate);
  const totalSeconds = entries.reduce((acc, item) => acc + Math.max(0, item.durationSeconds), 0);
  const totalEarnings = calculateEarnings(totalSeconds, hourlyRate);
  return {
    weekKey: monday,
    startDate: monday,
    endDate: sunday,
    totalSeconds,
    totalEarnings,
    entriesCount: entries.length,
  };
}

/**
 * Checks if the calendar week has changed compared to state.currentWeekKey.
 * If we are in a new week (Monday–Sunday), archives the previous week's entries
 * (keeping max 3 weeks in history) and resets current week entries.
 */
export function checkAndRolloverWeek(state: AppStorageState, now: Date): AppStorageState {
  const { weekKey: nowWeekKey } = getWeekBounds(now);
  if (!state.currentWeekKey) {
    return { ...state, currentWeekKey: nowWeekKey };
  }
  if (state.currentWeekKey === nowWeekKey) {
    return state;
  }

  let updatedArchive = state.archivedWeeks;
  if (state.entries.length > 0) {
    const summary = summarizeWeekEntries(state.currentWeekKey, state.entries, state.hourlyRate);
    updatedArchive = archiveWeekWithCap(state.archivedWeeks, summary, MAX_ARCHIVED_WEEKS);
  }

  return {
    ...state,
    currentWeekKey: nowWeekKey,
    entries: [],
    archivedWeeks: updatedArchive,
  };
}

/**
 * Computes the next upcoming timestamp for a given "HH:MM" time relative to `now`.
 * - If "HH:MM" today is still in the future (> now), returns today at HH:MM.
 * - If "HH:MM" today has already passed (<= now), returns tomorrow at HH:MM.
 */
export function computeNextAutostartTimestamp(timeStr: string, now: Date): number | null {
  if (!timeStr) return null;
  const [targetH, targetM] = timeStr.split(':').map(Number);
  if (!Number.isFinite(targetH) || !Number.isFinite(targetM)) {
    return null;
  }

  const candidate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    targetH,
    targetM,
    0,
    0
  );

  if (candidate.getTime() <= now.getTime()) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate.getTime();
}

/**
 * Evaluates whether autostart should trigger right now.
 *
 * How it works:
 * 1. User enables autostart for e.g. "08:00". `nextTriggerTimestamp` is set to the next upcoming 08:00.
 * 2. When `now >= nextTriggerTimestamp` (whether the app is open in the background at 08:00 OR the user opens
 *    the app later in the day after 08:00), the timer automatically starts counting from `nextTriggerTimestamp` (08:00)!
 * 3. `nextTriggerTimestamp` is immediately advanced to the following day's 08:00, so when the user clicks Stop,
 *    it will NEVER re-trigger for the same shift.
 */
export function evaluateAutostart(
  autostart: AutostartConfig,
  activeSession: ActiveSession | null,
  now: Date
): {
  shouldStart: boolean;
  startTimestamp: number;
  startTimeFormatted: string;
  startDate: string;
  nextTriggerTimestamp: number | null;
} {
  if (!autostart.enabled || !autostart.time) {
    return {
      shouldStart: false,
      startTimestamp: 0,
      startTimeFormatted: '',
      startDate: '',
      nextTriggerTimestamp: null,
    };
  }

  if (activeSession && activeSession.isRunning) {
    return {
      shouldStart: false,
      startTimestamp: 0,
      startTimeFormatted: '',
      startDate: '',
      nextTriggerTimestamp: autostart.nextTriggerTimestamp,
    };
  }

  // If nextTriggerTimestamp was not initialized yet, initialize it relative to now
  if (!autostart.nextTriggerTimestamp) {
    return {
      shouldStart: false,
      startTimestamp: 0,
      startTimeFormatted: '',
      startDate: '',
      nextTriggerTimestamp: computeNextAutostartTimestamp(autostart.time, now),
    };
  }

  if (now.getTime() >= autostart.nextTriggerTimestamp) {
    const startTs = autostart.nextTriggerTimestamp;
    const startD = new Date(startTs);
    const startDateStr = toDateString(startD);
    const nextFutureTs = computeNextAutostartTimestamp(autostart.time, now);

    // Prevent starting if user already manually stopped a session after this trigger time
    if (autostart.lastStoppedDate === startDateStr && autostart.lastTriggeredDate === startDateStr) {
      return {
        shouldStart: false,
        startTimestamp: 0,
        startTimeFormatted: '',
        startDate: '',
        nextTriggerTimestamp: nextFutureTs,
      };
    }

    return {
      shouldStart: true,
      startTimestamp: startTs,
      startTimeFormatted: toTimeString(startD),
      startDate: startDateStr,
      nextTriggerTimestamp: nextFutureTs,
    };
  }

  return {
    shouldStart: false,
    startTimestamp: 0,
    startTimeFormatted: '',
    startDate: '',
    nextTriggerTimestamp: autostart.nextTriggerTimestamp,
  };
}

/**
 * Computes duration in seconds between two HH:MM strings on the same day (or overnight if end < start)
 */
export function computeDurationFromTimes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  if (!Number.isFinite(sh) || !Number.isFinite(sm) || !Number.isFinite(eh) || !Number.isFinite(em)) {
    return 0;
  }
  const startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  return (endMinutes - startMinutes) * 60;
}

/**
 * Creates a clean, completely empty initial state (0 hours, 0 PLN, no demo entries)
 * when the user installs or opens the app for the first time.
 */
export function createInitialSeedState(now: Date): AppStorageState {
  const { monday: currentMonday } = getWeekBounds(now);

  return {
    hourlyRate: DEFAULT_HOURLY_RATE,
    currentWeekKey: currentMonday,
    entries: [],
    archivedWeeks: [],
    autostart: {
      enabled: false,
      time: '08:00',
      nextTriggerTimestamp: null,
      lastTriggeredDate: null,
      lastStoppedDate: null,
    },
    activeSession: null,
  };
}
