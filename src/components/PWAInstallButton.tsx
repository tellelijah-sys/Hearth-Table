import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleAction = async () => {
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
        onClick={handleAction}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-[#D4DDD6] dark:border-[#2B3731] bg-white dark:bg-[#171F1B] text-[#17211C] dark:text-[#ECF1EE] hover:bg-[#F2F5F2] dark:hover:bg-[#1E2823] transition-colors whitespace-nowrap shrink-0 min-h-[44px] ${
          compact ? 'px-3 py-2 text-xs font-medium' : 'px-4 py-2 text-sm font-medium'
        }`}
      >
        {isIOS ? <Smartphone className="w-4 h-4 text-[#1B5E3F] dark:text-[#6EE7B7]" /> : <Download className="w-4 h-4 text-[#1B5E3F] dark:text-[#6EE7B7]" />}
        <span>{isInstallable ? 'Install App' : isIOS ? 'Install on iOS' : 'Get Mobile App'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#171F1B] border border-[#E2E8E2] dark:border-[#242D29] p-6 shadow-xl">
            <div className="w-10 h-1.5 bg-[#D4DDD6] dark:bg-[#2F3B35] rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <h3
                id="pwa-install-title"
                className="font-display text-xl font-semibold text-[#17211C] dark:text-[#ECF1EE]"
              >
                Install Hearth &amp; Table
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install instructions"
                className="min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded-lg text-[#55655D] hover:bg-[#F2F5F2] dark:hover:bg-[#222D28]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-[#55655D] dark:text-[#A9B8B0] leading-relaxed">
              Add Hearth &amp; Table to your home screen for instant offline access to your weekly meal plan, pantry, and grocery list.
            </p>

            <div className="mt-5 space-y-4 text-sm text-[#17211C] dark:text-[#ECF1EE]">
              <div className="rounded-xl border border-[#E2E8E2] dark:border-[#242D29] p-4 bg-[#FAFBF9] dark:bg-[#111714]">
                <p className="font-semibold">iPhone &amp; iPad (Safari)</p>
                <ol className="mt-2 space-y-2 text-[#55655D] dark:text-[#A9B8B0]">
                  <li className="flex items-center gap-2">
                    <span className="font-mono text-xs tabular-nums">1.</span>
                    <span>Tap the <strong className="text-[#17211C] dark:text-white inline-flex items-center gap-1"><Share className="w-3.5 h-3.5" /> Share</strong> icon in Safari.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="font-mono text-xs tabular-nums">2.</span>
                    <span>Scroll and tap <strong className="text-[#17211C] dark:text-white inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5" /> Add to Home Screen</strong>.</span>
                  </li>
                </ol>
              </div>

              <div className="rounded-xl border border-[#E2E8E2] dark:border-[#242D29] p-4 bg-[#FAFBF9] dark:bg-[#111714]">
                <p className="font-semibold">Android &amp; Desktop (Chrome / Edge)</p>
                <p className="mt-1.5 text-[#55655D] dark:text-[#A9B8B0]">
                  Open the browser menu and select <strong>Install App</strong> or <strong>Add to Home screen</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full min-h-[44px] rounded-xl bg-[#1B5E3F] text-white font-medium text-sm hover:bg-[#164C33] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
