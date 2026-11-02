import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_HOURLY_RATE,
  calculateEarnings,
  getWeekBounds,
  archiveWeekWithCap,
  checkAndRolloverWeek,
  evaluateAutostart,
  computeDurationFromTimes,
  formatHMS,
  type ArchivedWeek,
  type AppStorageState,
} from './timeLogic';

test('calculateEarnings multiplies worked hours by 31.50 PLN accurately', () => {
  // 1 hour = 3600s -> 31.50 zł
  assert.equal(calculateEarnings(3600, DEFAULT_HOURLY_RATE), 31.5);
  // 8 hours = 28800s -> 252.00 zł
  assert.equal(calculateEarnings(8 * 3600, DEFAULT_HOURLY_RATE), 252.0);
  // 40 hours -> 1260.00 zł
  assert.equal(calculateEarnings(40 * 3600, DEFAULT_HOURLY_RATE), 1260.0);
  // 30 minutes -> 15.75 zł
  assert.equal(calculateEarnings(1800, DEFAULT_HOURLY_RATE), 15.75);
});

test('getWeekBounds returns Monday to Sunday for any day of week including Sunday', () => {
  // 2026-11-01 is a Sunday
  const sun = new Date(2026, 10, 1, 12, 0, 0);
  const bounds = getWeekBounds(sun);
  assert.equal(bounds.monday, '2026-10-26');
  assert.equal(bounds.sunday, '2026-11-01');

  // 2026-11-02 is a Monday
  const mon = new Date(2026, 10, 2, 9, 0, 0);
  const nextBounds = getWeekBounds(mon);
  assert.equal(nextBounds.monday, '2026-11-02');
  assert.equal(nextBounds.sunday, '2026-11-08');
});

test('archiveWeekWithCap keeps at most 3 previous weeks and removes the 4th oldest week', () => {
  const w1: ArchivedWeek = {
    weekKey: '2026-10-05',
    startDate: '2026-10-05',
    endDate: '2026-10-11',
    totalSeconds: 36000,
    totalEarnings: 315,
    entriesCount: 5,
  };
  const w2: ArchivedWeek = {
    weekKey: '2026-10-12',
    startDate: '2026-10-12',
    endDate: '2026-10-18',
    totalSeconds: 36000,
    totalEarnings: 315,
    entriesCount: 5,
  };
  const w3: ArchivedWeek = {
    weekKey: '2026-10-19',
    startDate: '2026-10-19',
    endDate: '2026-10-25',
    totalSeconds: 36000,
    totalEarnings: 315,
    entriesCount: 5,
  };
  const w4: ArchivedWeek = {
    weekKey: '2026-10-26',
    startDate: '2026-10-26',
    endDate: '2026-11-01',
    totalSeconds: 72000,
    totalEarnings: 630,
    entriesCount: 5,
  };

  const archive3 = [w3, w2, w1];
  const after4th = archiveWeekWithCap(archive3, w4, 3);

  assert.equal(after4th.length, 3);
  assert.equal(after4th[0].weekKey, '2026-10-26');
  assert.equal(after4th[1].weekKey, '2026-10-19');
  assert.equal(after4th[2].weekKey, '2026-10-12');
  // w1 ('2026-10-05') was pruned!
  assert.equal(after4th.some((w) => w.weekKey === '2026-10-05'), false);
});

test('checkAndRolloverWeek resets current week entries and pushes previous week to 3-week archive', () => {
  const initialState: AppStorageState = {
    hourlyRate: 31.5,
    currentWeekKey: '2026-10-26',
    entries: [
      {
        id: '1',
        date: '2026-10-27',
        startTime: '08:00',
        endTime: '16:00',
        durationSeconds: 8 * 3600,
      },
    ],
    archivedWeeks: [],
    autostart: {
      enabled: false,
      time: '08:00',
      startFromScheduledTime: true,
      lastTriggeredDate: null,
    },
    activeSession: null,
  };

  // Next Monday: 2026-11-02
  const nextMonday = new Date(2026, 10, 2, 10, 0, 0);
  const rolled = checkAndRolloverWeek(initialState, nextMonday);

  assert.equal(rolled.currentWeekKey, '2026-11-02');
  assert.equal(rolled.entries.length, 0);
  assert.equal(rolled.archivedWeeks.length, 1);
  assert.equal(rolled.archivedWeeks[0].weekKey, '2026-10-26');
  assert.equal(rolled.archivedWeeks[0].totalEarnings, 252);
});

test('evaluateAutostart triggers when enabled and current time >= target time and not triggered today', () => {
  const now = new Date(2026, 10, 1, 9, 30, 0); // 09:30
  const result = evaluateAutostart(
    {
      enabled: true,
      time: '08:00',
      startFromScheduledTime: true,
      lastTriggeredDate: null,
    },
    null,
    now
  );

  assert.equal(result.shouldStart, true);
  assert.equal(result.startTimeFormatted, '08:00');

  // Does not trigger again on the same day
  const secondCheck = evaluateAutostart(
    {
      enabled: true,
      time: '08:00',
      startFromScheduledTime: true,
      lastTriggeredDate: '2026-11-01',
    },
    null,
    now
  );
  assert.equal(secondCheck.shouldStart, false);
});

test('computeDurationFromTimes and formatHMS work accurately', () => {
  const dur = computeDurationFromTimes('08:00', '16:30');
  assert.equal(dur, 8.5 * 3600);
  assert.equal(formatHMS(dur), '08:30:00');
});
