import React from 'react';
import { AlarmClock } from 'lucide-react';
import {
  computeNextAutostartTimestamp,
  toDateString,
  type AutostartConfig,
  type ActiveSession,
} from '../utils/timeLogic';

interface AutostartCardProps {
  autostart: AutostartConfig;
  activeSession: ActiveSession | null;
  onUpdateAutostart: (updated: AutostartConfig) => void;
}

export const AutostartCard: React.FC<AutostartCardProps> = ({
  autostart,
  activeSession,
  onUpdateAutostart,
}) => {
  const handleToggle = (enabled: boolean) => {
    const now = new Date();
    onUpdateAutostart({
      ...autostart,
      enabled,
      nextTriggerTimestamp: enabled
        ? computeNextAutostartTimestamp(autostart.time, now)
        : null,
    });
  };

  const handleTimeChange = (newTime: string) => {
    const now = new Date();
    onUpdateAutostart({
      ...autostart,
      time: newTime,
      nextTriggerTimestamp: autostart.enabled
        ? computeNextAutostartTimestamp(newTime, now)
        : null,
    });
  };

  const getScheduleDescription = (): string => {
    if (activeSession?.isRunning && activeSession.autoStarted) {
      return `Włączono automatycznie o ${activeSession.startTimeFormatted} · Stop zawsze ręczny`;
    }
    if (!autostart.enabled || !autostart.nextTriggerTimestamp) {
      return 'Ustaw godzinę — licznik sam wystartuje w tle o tej porze';
    }
    const now = new Date();
    const triggerDate = new Date(autostart.nextTriggerTimestamp);
    const isToday = toDateString(now) === toDateString(triggerDate);
    const dayWord = isToday ? 'dzisiaj' : 'jutro';
    return `Zaplanowano start: ${dayWord} o ${autostart.time} (włączy się samo w tle)`;
  };

  return (
    <section
      id="autostart"
      aria-label="Autostart czasu pracy"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:px-6 sm:py-4 transition-colors overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <AlarmClock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Autostart pracy
            </h2>
            <p
              data-testid="autostart-status-text"
              className="text-xs text-slate-500 dark:text-slate-400 break-words"
            >
              {getScheduleDescription()}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <label
            htmlFor="autostart-toggle"
            className="inline-flex items-center gap-2 cursor-pointer select-none px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <input
              id="autostart-toggle"
              type="checkbox"
              checked={autostart.enabled}
              onChange={(e) => handleToggle(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer shrink-0"
            />
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
              {autostart.enabled ? 'Aktywny' : 'Wyłączony'}
            </span>
          </label>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
            <label
              htmlFor="autostart-time"
              className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap"
            >
              Godzina:
            </label>
            <input
              id="autostart-time"
              type="time"
              value={autostart.time}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="text-xs font-mono-tabular font-semibold text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
