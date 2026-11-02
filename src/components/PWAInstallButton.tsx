import React, { useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Zainstaluj aplikację na telefonie"
        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Zainstaluj</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src="./icon.svg"
                  alt="Ikona aplikacji CzasoPłaca"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl shadow-sm shrink-0 bg-slate-950"
                />
                <div>
                  <h3
                    id="pwa-install-title"
                    className="text-base font-bold text-slate-900 dark:text-white"
                  >
                    Zainstaluj CzasoPłaca
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dodaj ikonę aplikacji na ekran główny telefonu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Zamknij"
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Instalacja na iPhone / iPad (Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                  <li>
                    Kliknij ikonę <strong>Udostępnij</strong> na dolnym pasku przeglądarki Safari.
                  </li>
                  <li>
                    Przewiń w dół i wybierz <strong>Dodaj do ekranu początkowego</strong>.
                  </li>
                  <li>
                    Potwierdź przyciskiem <strong>Dodaj</strong> w prawym górnym rogu.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Instalacja na telefonie (Android / Chrome):</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                  <li>
                    Kliknij ikonę menu przeglądarki <strong>⋮</strong> (trzy kropki w prawym górnym rogu Chrome).
                  </li>
                  <li>
                    Wybierz opcję <strong>Zainstaluj aplikację</strong> lub{' '}
                    <strong>Dodaj do ekranu głównego</strong>.
                  </li>
                  <li>
                    Zatwierdź — na pulpicie telefonu pojawi się ikona <strong>CzasoPłaca</strong>.
                  </li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors cursor-pointer"
            >
              Rozumiem
            </button>
          </div>
        </div>
      )}
    </>
  );
};
