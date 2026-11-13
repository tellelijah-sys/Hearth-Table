import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { CuisineRegion } from '../types/meal';

const CUISINE_GRADIENTS: Record<CuisineRegion, string> = {
  'West African': 'from-[#E8EFEA] to-[#D4E2D9] dark:from-[#1B2B23] dark:to-[#13201A]',
  'East Asian': 'from-[#ECEFE9] to-[#DCE4DA] dark:from-[#1C2822] dark:to-[#141E19]',
  'South Asian': 'from-[#F1EDE4] to-[#E5DFD0] dark:from-[#26231C] dark:to-[#1B1813]',
  'Mediterranean': 'from-[#EAF0EE] to-[#D7E3DF] dark:from-[#182624] dark:to-[#111C1A]',
  'Latin American': 'from-[#EDF0E6] to-[#DDE4D1] dark:from-[#20271B] dark:to-[#161B12]',
  'Middle Eastern': 'from-[#EFECE6] to-[#E2DCD1] dark:from-[#25221D] dark:to-[#1A1714]',
  'Caribbean': 'from-[#E9F0EC] to-[#D6E4DD] dark:from-[#192822] dark:to-[#121D18]',
  'European': 'from-[#EEF0EE] to-[#DFE3DF] dark:from-[#1E2320] dark:to-[#151916]',
  'North American': 'from-[#ECEFE9] to-[#DCE2D8] dark:from-[#1C221E] dark:to-[#131815]',
  'Southeast Asian': 'from-[#E8F0ED] to-[#D4E3DD] dark:from-[#182723] dark:to-[#111D1A]',
};

interface RecipeThumbnailProps {
  imageUrl?: string | null;
  title: string;
  cuisine: CuisineRegion;
  className?: string;
  compact?: boolean;
}

export const RecipeThumbnail: React.FC<RecipeThumbnailProps> = ({
  imageUrl,
  title,
  cuisine,
  className = 'w-full h-44',
  compact = false,
}) => {
  const [hasError, setHasError] = useState(false);

  if (imageUrl && !hasError) {
    return (
      <div className={`relative overflow-hidden bg-[#F2F5F2] dark:bg-[#19211D] ${className}`}>
        <img
          src={imageUrl}
          alt={title}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const gradient = CUISINE_GRADIENTS[cuisine] || CUISINE_GRADIENTS['Mediterranean'];

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${gradient} flex flex-col items-center justify-center ${
        compact ? 'p-2' : 'p-4'
      } text-center ${className}`}
      aria-label={`${title} — Image reference not available`}
    >
      <div
        className={`${
          compact ? 'w-7 h-7 mb-1' : 'w-9 h-9 mb-2'
        } rounded-full border border-[#1B5E3F]/20 dark:border-[#6EE7B7]/20 flex items-center justify-center text-[#55655D] dark:text-[#A9B8B0]`}
      >
        <ImageOff className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </div>
      <span
        className={`${
          compact ? 'text-[10px] leading-tight' : 'text-xs'
        } font-medium text-[#55655D] dark:text-[#A9B8B0]`}
      >
        Image reference not available
      </span>
    </div>
  );
};
