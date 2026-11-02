import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { TimerHero } from './components/TimerHero';
import { AutostartCard } from './components/AutostartCard';
import { WeeklySummaryChart } from './components/WeeklySummaryChart';
import { DailyEntriesSection } from './components/DailyEntriesSection';
import { PreviousWeeksArchive } from './components/PreviousWeeksArchive';
import { AddEntryModal } from './components/AddEntryModal';
import {
  DEFAULT_HOURLY_RATE,
  MAX_ARCHIVED_WEEKS,
  toDateString,
  toTimeString,
  getWeekBounds,
  checkAndRolloverWeek,
  evaluateAutostart,
  computeNextAutostartTimestamp,
  summarizeWeekEntries,
  archiveWeekWithCap,
  createInitialSeedState,
  type AppStorageState,
  type WorkEntry,
  type AutostartConfig,
} from './utils/timeLogic';

const LEGACY_STORAGE_KEY = 'czasoplaca_storage_v1';
const STORAGE_KEY = 'czasoplaca_storage_v2';
const THEME_KEY = 'czasoplaca_theme_v1';

function loadStateFromStorage(): AppStorageState {
  const now = new Date();
  try {
    // Clean up old v1 storage that contained demo seed entries
    localStorage.removeItem(LEGACY_STORAGE_KEY);

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const emptyState = createInitialSeedState(now);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyState));
      return emptyState;
    }
    const parsed = JSON.parse(raw) as Partial<AppStorageState>;
    const { weekKey } = getWeekBounds(now);
    const rawAutostart = parsed.autostart;
    const enabled = Boolean(rawAutostart?.enabled);
    const time = rawAutostart?.time || '08:00';

    const hydrated: AppStorageState = {
      hourlyRate:
        typeof parsed.hourlyRate === 'number' && parsed.hourlyRate > 0
          ? parsed.hourlyRate
          : DEFAULT_HOURLY_RATE,
      currentWeekKey: parsed.currentWeekKey || weekKey,
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      archivedWeeks: Array.isArray(parsed.archivedWeeks)
        ? parsed.archivedWeeks.slice(0, MAX_ARCHIVED_WEEKS)
        : [],
      autostart: {
        enabled,
        time,
        nextTriggerTimestamp:
          typeof rawAutostart?.nextTriggerTimestamp === 'number'
            ? rawAutostart.nextTriggerTimestamp
            : enabled
              ? computeNextAutostartTimestamp(time, now)
              : null,
        lastTriggeredDate: rawAutostart?.lastTriggeredDate || null,
        lastStoppedDate: rawAutostart?.lastStoppedDate || null,
      },
      activeSession: parsed.activeSession || null,
    };

    return checkAndRolloverWeek(hydrated, now);
  } catch {
    return createInitialSeedState(now);
  }
}

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  const [state, setState] = useState<AppStorageState>(() => loadStateFromStorage());
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState<string>(() => toDateString(new Date()));

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage errors
    }
  }, [isDark]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [state]);

  useEffect(() => {
    const tick = () => {
      const currentNow = new Date();
      setNowMs(currentNow.getTime());

      setState((prev) => {
        const afterRollover = checkAndRolloverWeek(prev, currentNow);
        const autoCheck = evaluateAutostart(
          afterRollover.autostart,
          afterRollover.activeSession,
          currentNow
        );

        if (autoCheck.shouldStart) {
          return {
            ...afterRollover,
            autostart: {
              ...afterRollover.autostart,
              nextTriggerTimestamp: autoCheck.nextTriggerTimestamp,
              lastTriggeredDate: autoCheck.startDate,
            },
            activeSession: {
              isRunning: true,
              startTimestamp: autoCheck.startTimestamp,
              startTimeFormatted: autoCheck.startTimeFormatted,
              date: autoCheck.startDate,
              autoStarted: true,
            },
          };
        }

        // If nextTriggerTimestamp was initialized or updated without starting
        if (autoCheck.nextTriggerTimestamp !== afterRollover.autostart.nextTriggerTimestamp) {
          return {
            ...afterRollover,
            autostart: {
              ...afterRollover.autostart,
              nextTriggerTimestamp: autoCheck.nextTriggerTimestamp,
            },
          };
        }

        return afterRollover;
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = toDateString(new Date(nowMs));

  const elapsedSeconds = state.activeSession?.isRunning
    ? Math.max(0, Math.floor((nowMs - state.activeSession.startTimestamp) / 1000))
    : 0;

  const todaySavedSeconds = state.entries
    .filter((e) => e.date === todayStr)
    .reduce((acc, item) => acc + Math.max(0, item.durationSeconds), 0);

  const weekSavedSeconds = state.entries.reduce(
    (acc, item) => acc + Math.max(0, item.durationSeconds),
    0
  );

  const handleStart = () => {
    const now = new Date();
    const dStr = toDateString(now);

    setNowMs(now.getTime());
    setState((prev) => ({
      ...prev,
      activeSession: {
        isRunning: true,
        startTimestamp: now.getTime(),
        startTimeFormatted: toTimeString(now),
        date: dStr,
        autoStarted: false,
      },
    }));
  };

  const handleStop = () => {
    const now = new Date();
    const todayDateStr = toDateString(now);

    setNowMs(now.getTime());
    setState((prev) => {
      if (!prev.activeSession?.isRunning) return prev;

      const durationSec = Math.max(
        1,
        Math.floor((now.getTime() - prev.activeSession.startTimestamp) / 1000)
      );

      const sessionDate = prev.activeSession.date || todayDateStr;

      const newEntry: WorkEntry = {
        id: `entry-${now.getTime()}`,
        date: sessionDate,
        startTime: prev.activeSession.startTimeFormatted,
        endTime: toTimeString(now),
        durationSeconds: durationSec,
        isAutoStarted: prev.activeSession.autoStarted,
      };

      // Advance autostart nextTriggerTimestamp strictly to the future (> now)
      // and record lastStoppedDate so it NEVER re-triggers after Stop!
      const nextFutureTrigger = prev.autostart.enabled
        ? computeNextAutostartTimestamp(prev.autostart.time, now)
        : null;

      return {
        ...prev,
        entries: [newEntry, ...prev.entries],
        activeSession: null,
        autostart: {
          ...prev.autostart,
          nextTriggerTimestamp: nextFutureTrigger,
          lastTriggeredDate: sessionDate,
          lastStoppedDate: todayDateStr,
        },
      };
    });
  };

  const handleUpdateAutostart = (updated: AutostartConfig) => {
    setState((prev) => ({
      ...prev,
      autostart: updated,
    }));
  };

  const handleUpdateEntry = (updated: WorkEntry) => {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => (e.id === updated.id ? updated : e)),
    }));
  };

  const handleDeleteEntry = (id: string) => {
    setState((prev) => ({
      ...prev,
      entries: prev.entries.filter((e) => e.id !== id),
    }));
  };

  const handleAddEntry = (entryData: Omit<WorkEntry, 'id'>) => {
    const newEntry: WorkEntry = {
      ...entryData,
      id: `manual-${Date.now()}`,
    };
    setState((prev) => ({
      ...prev,
      entries: [newEntry, ...prev.entries],
    }));
  };

  const handleRolloverCurrentWeek = () => {
    setState((prev) => {
      if (prev.entries.length === 0) return prev;
      const summary = summarizeWeekEntries(prev.currentWeekKey, prev.entries, prev.hourlyRate);
      const archiveEntry = prev.archivedWeeks.some((w) => w.weekKey === summary.weekKey)
        ? {
            ...summary,
            weekKey: `${summary.weekKey}-zapis-${Date.now().toString().slice(-3)}`,
          }
        : summary;

      const updatedArchive = archiveWeekWithCap(
        prev.archivedWeeks,
        archiveEntry,
        MAX_ARCHIVED_WEEKS
      );

      return {
        ...prev,
        entries: [],
        archivedWeeks: updatedArchive,
      };
    });
  };

  return (
    <div
      id="top"
      className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors"
    >
      <Header
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        onOpenAddModal={() => {
          setModalInitialDate(todayStr);
          setIsAddModalOpen(true);
        }}
      />

      <main className="flex-1 max-w-[960px] w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-5 min-w-0">
        <TimerHero
          activeSession={state.activeSession}
          elapsedSeconds={elapsedSeconds}
          todaySavedSeconds={todaySavedSeconds}
          weekSavedSeconds={weekSavedSeconds}
          hourlyRate={state.hourlyRate}
          onStart={handleStart}
          onStop={handleStop}
        />

        <AutostartCard
          autostart={state.autostart}
          activeSession={state.activeSession}
          onUpdateAutostart={handleUpdateAutostart}
        />

        <WeeklySummaryChart
          currentWeekKey={state.currentWeekKey}
          entries={state.entries}
          activeSession={state.activeSession}
          elapsedSeconds={elapsedSeconds}
          hourlyRate={state.hourlyRate}
          todayStr={todayStr}
          onRolloverCurrentWeek={handleRolloverCurrentWeek}
          onSelectDayToAdd={(dateStr) => {
            setModalInitialDate(dateStr);
            setIsAddModalOpen(true);
          }}
        />

        <DailyEntriesSection
          entries={state.entries}
          hourlyRate={state.hourlyRate}
          onUpdateEntry={handleUpdateEntry}
          onDeleteEntry={handleDeleteEntry}
          onOpenAddModal={() => {
            setModalInitialDate(todayStr);
            setIsAddModalOpen(true);
          }}
        />

        <PreviousWeeksArchive archivedWeeks={state.archivedWeeks} />
      </main>

      <AddEntryModal
        isOpen={isAddModalOpen}
        initialDate={modalInitialDate}
        hourlyRate={state.hourlyRate}
        onClose={() => setIsAddModalOpen(false)}
        onAddEntry={handleAddEntry}
      />
    </div>
  );
}
