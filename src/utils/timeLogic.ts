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
  startFromScheduledTime: boolean; // whether autostart counts from the set time or moment of opening
  lastTriggeredDate: string | null; // YYYY-MM-DD
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
  // Sort descending by weekKey (newest first)
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

  // Only archive if the previous week had entries or if it was a past week
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
 * Evaluates whether autostart should trigger right now.
 * Stop is ALWAYS manual ("stop jest zawsze w moim zakresie").
 */
export function evaluateAutostart(
  autostart: AutostartConfig,
  activeSession: ActiveSession | null,
  now: Date
): { shouldStart: boolean; startTimestamp: number; startTimeFormatted: string } {
  if (!autostart.enabled || !autostart.time) {
    return { shouldStart: false, startTimestamp: 0, startTimeFormatted: '' };
  }
  if (activeSession && activeSession.isRunning) {
    return { shouldStart: false, startTimestamp: 0, startTimeFormatted: '' };
  }

  const todayStr = toDateString(now);
  if (autostart.lastTriggeredDate === todayStr) {
    return { shouldStart: false, startTimestamp: 0, startTimeFormatted: '' };
  }

  const [targetH, targetM] = autostart.time.split(':').map(Number);
  if (!Number.isFinite(targetH) || !Number.isFinite(targetM)) {
    return { shouldStart: false, startTimestamp: 0, startTimeFormatted: '' };
  }

  const scheduledDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    targetH,
    targetM,
    0,
    0
  );

  if (now.getTime() >= scheduledDate.getTime()) {
    const startTs = autostart.startFromScheduledTime ? scheduledDate.getTime() : now.getTime();
    const startD = new Date(startTs);
    const hh = String(startD.getHours()).padStart(2, '0');
    const mm = String(startD.getMinutes()).padStart(2, '0');
    return {
      shouldStart: true,
      startTimestamp: startTs,
      startTimeFormatted: `${hh}:${mm}`,
    };
  }

  return { shouldStart: false, startTimestamp: 0, startTimeFormatted: '' };
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
 * Generates initial seed data with 3 previous weeks in archive and sample entries in current week
 * so the user immediately sees the weekly chart and 3-week history archive in action.
 */
export function createInitialSeedState(now: Date): AppStorageState {
  const { monday: currentMonday } = getWeekBounds(now);
  const currentMondayDate = parseDateString(currentMonday);

  // Create 3 previous weeks
  const prevWeeks: ArchivedWeek[] = [1, 2, 3].map((weeksAgo) => {
    const mDate = new Date(currentMondayDate);
    mDate.setDate(currentMondayDate.getDate() - weeksAgo * 7);
    const { monday, sunday } = getWeekBounds(mDate);
    const hoursMap: Record<number, number> = { 1: 40, 2: 38.5, 3: 42 };
    const totalSeconds = Math.round((hoursMap[weeksAgo] || 40) * 3600);
    return {
      weekKey: monday,
      startDate: monday,
      endDate: sunday,
      totalSeconds,
      totalEarnings: calculateEarnings(totalSeconds, DEFAULT_HOURLY_RATE),
      entriesCount: 5,
    };
  });

  // Create 2 entries in the current week (Monday & Tuesday if applicable, or Monday)
  const monStr = currentMonday;
  const tueDate = new Date(currentMondayDate);
  tueDate.setDate(currentMondayDate.getDate() + 1);
  const tueStr = toDateString(tueDate);

  const sampleEntries: WorkEntry[] = [
    {
      id: 'seed-mon-1',
      date: monStr,
      startTime: '08:00',
      endTime: '16:00',
      durationSeconds: 8 * 3600,
      note: 'Praca standardowa (zmiana dzienna)',
    },
    {
      id: 'seed-tue-1',
      date: tueStr,
      startTime: '08:00',
      endTime: '15:30',
      durationSeconds: 7.5 * 3600,
      note: 'Realizacja zadań + raport',
    },
  ];

  return {
    hourlyRate: DEFAULT_HOURLY_RATE,
    currentWeekKey: currentMonday,
    entries: sampleEntries,
    archivedWeeks: prevWeeks,
    autostart: {
      enabled: false,
      time: '08:00',
      startFromScheduledTime: true,
      lastTriggeredDate: null,
    },
    activeSession: null,
  };
}
