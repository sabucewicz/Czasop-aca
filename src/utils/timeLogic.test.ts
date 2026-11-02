import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_HOURLY_RATE,
  calculateEarnings,
  getWeekBounds,
  archiveWeekWithCap,
  checkAndRolloverWeek,
  evaluateAutostart,
  computeNextAutostartTimestamp,
  computeDurationFromTimes,
  createInitialSeedState,
  formatHMS,
  type ArchivedWeek,
  type AppStorageState,
} from './timeLogic';

test('createInitialSeedState starts completely empty with 0 entries and 0 archived weeks', () => {
  const state = createInitialSeedState(new Date(2026, 10, 2, 10, 0, 0));
  assert.equal(state.entries.length, 0);
  assert.equal(state.archivedWeeks.length, 0);
  assert.equal(state.activeSession, null);
  assert.equal(state.autostart.enabled, false);
});

test('calculateEarnings multiplies worked hours by 31.50 PLN accurately', () => {
  assert.equal(calculateEarnings(3600, DEFAULT_HOURLY_RATE), 31.5);
  assert.equal(calculateEarnings(8 * 3600, DEFAULT_HOURLY_RATE), 252.0);
  assert.equal(calculateEarnings(40 * 3600, DEFAULT_HOURLY_RATE), 1260.0);
  assert.equal(calculateEarnings(1800, DEFAULT_HOURLY_RATE), 15.75);
});

test('getWeekBounds returns Monday to Sunday for any day of week including Sunday', () => {
  const sun = new Date(2026, 10, 1, 12, 0, 0);
  const bounds = getWeekBounds(sun);
  assert.equal(bounds.monday, '2026-10-26');
  assert.equal(bounds.sunday, '2026-11-01');

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
      nextTriggerTimestamp: null,
      lastTriggeredDate: null,
      lastStoppedDate: null,
    },
    activeSession: null,
  };

  const nextMonday = new Date(2026, 10, 2, 10, 0, 0);
  const rolled = checkAndRolloverWeek(initialState, nextMonday);

  assert.equal(rolled.currentWeekKey, '2026-11-02');
  assert.equal(rolled.entries.length, 0);
  assert.equal(rolled.archivedWeeks.length, 1);
  assert.equal(rolled.archivedWeeks[0].weekKey, '2026-10-26');
  assert.equal(rolled.archivedWeeks[0].totalEarnings, 252);
});

test('Autostart schedules for tomorrow when configured after target hour, and never re-triggers after Stop', () => {
  // User configures Autostart at 18:00 on Nov 1 for "08:00"
  const evening = new Date(2026, 10, 1, 18, 0, 0);
  const nextTrigger = computeNextAutostartTimestamp('08:00', evening);
  const expectedTomorrow8am = new Date(2026, 10, 2, 8, 0, 0).getTime();
  assert.equal(nextTrigger, expectedTomorrow8am);

  // At 18:05 on Nov 1, it must NOT start prematurely
  const eveningLater = new Date(2026, 10, 1, 18, 5, 0);
  const checkBefore = evaluateAutostart(
    {
      enabled: true,
      time: '08:00',
      nextTriggerTimestamp: nextTrigger,
      lastTriggeredDate: null,
      lastStoppedDate: null,
    },
    null,
    eveningLater
  );
  assert.equal(checkBefore.shouldStart, false);

  // Next day (Nov 2) at 10:30 AM (user didn't even open app at 08:00, opens it at 10:30 AM):
  // Autostart triggers from 08:00 AM!
  const nextMorning = new Date(2026, 10, 2, 10, 30, 0);
  const checkMorning = evaluateAutostart(
    {
      enabled: true,
      time: '08:00',
      nextTriggerTimestamp: nextTrigger,
      lastTriggeredDate: null,
      lastStoppedDate: null,
    },
    null,
    nextMorning
  );
  assert.equal(checkMorning.shouldStart, true);
  assert.equal(checkMorning.startTimestamp, expectedTomorrow8am);
  assert.equal(checkMorning.startTimeFormatted, '08:00');
  assert.equal(checkMorning.startDate, '2026-11-02');

  // After user clicks Stop at 16:00 on Nov 2, evaluateAutostart must NOT re-trigger on Nov 2!
  const afterStopTime = new Date(2026, 10, 2, 16, 1, 0);
  const checkAfterStop = evaluateAutostart(
    {
      enabled: true,
      time: '08:00',
      nextTriggerTimestamp: checkMorning.nextTriggerTimestamp,
      lastTriggeredDate: '2026-11-02',
      lastStoppedDate: '2026-11-02',
    },
    null,
    afterStopTime
  );
  assert.equal(checkAfterStop.shouldStart, false);
});

test('computeDurationFromTimes and formatHMS work accurately', () => {
  const dur = computeDurationFromTimes('08:00', '16:30');
  assert.equal(dur, 8.5 * 3600);
  assert.equal(formatHMS(dur), '08:30:00');
});
