import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 md:bottom-5 left-4 z-40 flex items-center gap-2 rounded-lg border border-[#B45309]/30 bg-[#FEF3C7] dark:bg-[#2E2111] px-3 py-2 text-xs font-medium text-[#92400E] dark:text-[#FCD34D] shadow-md"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode — Meal plan, pantry &amp; grocery list work locally</span>
    </div>
  );
};
