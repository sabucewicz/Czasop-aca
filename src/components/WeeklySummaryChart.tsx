import React from 'react';
import { RotateCcw } from 'lucide-react';
import {
  getWeekDays,
  calculateEarnings,
  formatPLN,
  formatDurationHM,
  type WorkEntry,
  type ActiveSession,
} from '../utils/timeLogic';

interface WeeklySummaryChartProps {
  currentWeekKey: string;
  entries: WorkEntry[];
  activeSession: ActiveSession | null;
  elapsedSeconds: number;
  hourlyRate: number;
  todayStr: string;
  onRolloverCurrentWeek: () => void;
  onSelectDayToAdd: (dateStr: string) => void;
}

export const WeeklySummaryChart: React.FC<WeeklySummaryChartProps> = ({
  currentWeekKey,
  entries,
  activeSession,
  elapsedSeconds,
  hourlyRate,
  todayStr,
  onRolloverCurrentWeek,
  onSelectDayToAdd,
}) => {
  const weekDays = getWeekDays(currentWeekKey);
  const firstDay = weekDays[0]?.dayMonthLabel || '';
  const lastDay = weekDays[6]?.dayMonthLabel || '';

  const dayData = weekDays.map((day) => {
    const savedSeconds = entries
      .filter((e) => e.date === day.date)
      .reduce((acc, item) => acc + Math.max(0, item.durationSeconds), 0);

    const liveBonus =
      activeSession?.isRunning && activeSession.date === day.date ? elapsedSeconds : 0;

    const totalSeconds = savedSeconds + liveBonus;
    const earnings = calculateEarnings(totalSeconds, hourlyRate);

    return {
      ...day,
      totalSeconds,
      earnings,
      isToday: day.date === todayStr,
    };
  });

  const maxDaySeconds = Math.max(8 * 3600, ...dayData.map((d) => d.totalSeconds));
  const weekTotalSeconds = dayData.reduce((acc, d) => acc + d.totalSeconds, 0);
  const weekTotalEarnings = calculateEarnings(weekTotalSeconds, hourlyRate);

  return (
    <section
      id="tydzien"
      aria-label="Podsumowanie bieżącego tygodnia"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 transition-colors overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
            Bieżący tydzień ({firstDay} – {lastDay})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Suma:{' '}
            <strong className="font-mono-tabular text-slate-800 dark:text-slate-200">
              {formatDurationHM(weekTotalSeconds)}
            </strong>{' '}
            ·{' '}
            <strong className="font-mono-tabular text-emerald-600 dark:text-emerald-400">
              {formatPLN(weekTotalEarnings)}
            </strong>
          </p>
        </div>

        <button
          type="button"
          onClick={onRolloverCurrentWeek}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
          <span>Zakończ tydzień</span>
        </button>
      </div>

      {/* 7-Day Bar Chart (Mon - Sun) */}
      <div className="grid grid-cols-7 gap-1 sm:gap-3 items-end h-40 sm:h-44 pt-3 px-1.5 sm:px-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl p-2 sm:p-3 border border-slate-100 dark:border-slate-800/80">
        {dayData.map((day) => {
          const heightPct =
            day.totalSeconds > 0
              ? Math.max(12, Math.round((day.totalSeconds / maxDaySeconds) * 100))
              : 4;

          const compactHours =
            day.totalSeconds > 0
              ? `${(day.totalSeconds / 3600).toLocaleString('pl-PL', {
                  maximumFractionDigits: 1,
                })}h`
              : '0h';

          const compactPLN =
            day.totalSeconds > 0 ? `${Math.round(day.earnings)} zł` : '—';

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDayToAdd(day.date)}
              aria-label={`${day.dayNameFull} (${day.dayMonthLabel}): ${formatDurationHM(day.totalSeconds)}, ${formatPLN(day.earnings)}`}
              className="group flex flex-col items-center justify-end h-full w-full min-w-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-500 rounded-lg"
            >
              {/* Desktop full PLN, Mobile compact PLN so it never overflows 1/7 column */}
              <div className="hidden sm:block text-[11px] font-mono-tabular font-semibold text-slate-700 dark:text-slate-200 mb-0.5 truncate max-w-full">
                {day.totalSeconds > 0 ? formatPLN(day.earnings) : '—'}
              </div>
              <div className="sm:hidden text-[9px] font-mono-tabular font-semibold text-slate-700 dark:text-slate-200 mb-0.5 truncate max-w-full">
                {compactPLN}
              </div>

              <div className="hidden sm:block text-[10px] font-mono-tabular text-slate-400 dark:text-slate-500 mb-1.5 truncate max-w-full">
                {day.totalSeconds > 0 ? formatDurationHM(day.totalSeconds) : '0h'}
              </div>
              <div className="sm:hidden text-[9px] font-mono-tabular text-slate-400 dark:text-slate-500 mb-1 truncate max-w-full">
                {compactHours}
              </div>

              <div className="w-full max-w-[38px] sm:max-w-[42px] flex-1 flex items-end bg-slate-200/70 dark:bg-slate-800/60 rounded-t-md overflow-hidden">
                <div
                  className={`w-full rounded-t-md transition-all duration-300 ${
                    day.totalSeconds > 0
                      ? day.isToday
                        ? 'bg-emerald-500 group-hover:bg-emerald-400'
                        : 'bg-emerald-600/80 dark:bg-emerald-500/80 group-hover:bg-emerald-500'
                      : 'bg-slate-300 dark:bg-slate-800'
                  }`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>

              <div className="mt-1.5 sm:mt-2 text-center w-full min-w-0">
                <div
                  className={`text-[10px] sm:text-xs font-semibold truncate ${
                    day.isToday
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {day.dayNameShort}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
