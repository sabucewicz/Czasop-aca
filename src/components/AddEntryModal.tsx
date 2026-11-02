import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  computeDurationFromTimes,
  calculateEarnings,
  formatPLN,
  type WorkEntry,
} from '../utils/timeLogic';

interface AddEntryModalProps {
  isOpen: boolean;
  initialDate: string;
  hourlyRate: number;
  onClose: () => void;
  onAddEntry: (entry: Omit<WorkEntry, 'id'>) => void;
}

export const AddEntryModal: React.FC<AddEntryModalProps> = ({
  isOpen,
  initialDate,
  hourlyRate,
  onClose,
  onAddEntry,
}) => {
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [hours, setHours] = useState('8');
  const [minutes, setMinutes] = useState('0');

  useEffect(() => {
    if (isOpen) {
      setDate(initialDate);
      setStartTime('08:00');
      setEndTime('16:00');
      setHours('8');
      setMinutes('0');
    }
  }, [isOpen, initialDate]);

  if (!isOpen) return null;

  const handleTimeChange = (newStart: string, newEnd: string) => {
    setStartTime(newStart);
    setEndTime(newEnd);
    const dur = computeDurationFromTimes(newStart, newEnd);
    if (dur > 0) {
      setHours(String(Math.floor(dur / 3600)));
      setMinutes(String(Math.floor((dur % 3600) / 60)));
    }
  };

  const totalSeconds =
    Math.max(0, parseInt(hours || '0', 10) || 0) * 3600 +
    Math.max(0, parseInt(minutes || '0', 10) || 0) * 60;
  const previewEarnings = calculateEarnings(totalSeconds, hourlyRate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || totalSeconds <= 0) return;
    onAddEntry({
      date,
      startTime: startTime || '08:00',
      endTime: endTime || '16:00',
      durationSeconds: totalSeconds,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-entry-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3
            id="add-entry-modal-title"
            className="text-base font-bold text-slate-900 dark:text-white"
          >
            Dodaj godziny pracy
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label
              htmlFor="modal-date"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
            >
              Data
            </label>
            <input
              id="modal-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="modal-start"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Od
              </label>
              <input
                id="modal-start"
                type="time"
                value={startTime}
                onChange={(e) => handleTimeChange(e.target.value, endTime)}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="modal-end"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Do
              </label>
              <input
                id="modal-end"
                type="time"
                value={endTime}
                onChange={(e) => handleTimeChange(startTime, e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="modal-hours"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Godziny
              </label>
              <input
                id="modal-hours"
                type="number"
                min="0"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label
                htmlFor="modal-minutes"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Minuty
              </label>
              <input
                id="modal-minutes"
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-tabular border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">Kwota:</span>
            <span className="text-base font-bold font-mono-tabular text-emerald-600 dark:text-emerald-400">
              {formatPLN(previewEarnings)}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl cursor-pointer"
            >
              Zapisz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
