import React from 'react';
import {
  formatPLN,
  formatDurationHM,
  MAX_ARCHIVED_WEEKS,
  type ArchivedWeek,
} from '../utils/timeLogic';

interface PreviousWeeksArchiveProps {
  archivedWeeks: ArchivedWeek[];
}

export const PreviousWeeksArchive: React.FC<PreviousWeeksArchiveProps> = ({
  archivedWeeks,
}) => {
  const visibleWeeks = archivedWeeks.slice(0, MAX_ARCHIVED_WEEKS);

  return (
    <section
      id="archiwum"
      aria-label="Poprzednie 3 tygodnie"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4 transition-colors overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
          Poprzednie tygodnie (maks. 3 wstecz)
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          4. tydzień automatycznie usuwa najstarszy
        </span>
      </div>

      {visibleWeeks.length === 0 ? (
        <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400">
          Brak zapisanych poprzednich tygodni.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {visibleWeeks.map((week, index) => (
            <div
              key={week.weekKey}
              data-testid={`archived-week-card-${index}`}
              className="border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 rounded-xl p-4 space-y-1.5 min-w-0"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate">Tydzień -{index + 1}</span>
                <span className="font-mono-tabular shrink-0">
                  {week.startDate.slice(5)} – {week.endDate.slice(5)}
                </span>
              </div>

              <div className="text-lg sm:text-xl font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400 truncate">
                {formatPLN(week.totalEarnings)}
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-400 font-mono-tabular">
                Czas:{' '}
                <strong className="text-slate-900 dark:text-slate-200">
                  {formatDurationHM(week.totalSeconds)}
                </strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
