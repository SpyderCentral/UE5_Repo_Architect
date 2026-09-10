import React from 'react';
import { Sparkles, Cpu, Layers } from 'lucide-react';
import { BlueprintThumbnailMetadata } from '../../types';

interface BlueprintThumbnailBadgeProps {
  thumbnail?: BlueprintThumbnailMetadata | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isGenerating?: boolean;
  onClick?: () => void;
  showAiBadge?: boolean;
  fallbackIcon?: React.ReactNode;
  className?: string;
  altName?: string;
}

export const BlueprintThumbnailBadge: React.FC<BlueprintThumbnailBadgeProps> = ({
  thumbnail,
  size = 'sm',
  isGenerating = false,
  onClick,
  showAiBadge = true,
  fallbackIcon,
  className = '',
  altName = 'Blueprint'
}) => {
  const sizeMap = {
    xs: {
      container: 'w-6 h-6 rounded-md',
      img: 'w-6 h-6 rounded-md',
      badge: 'p-0.5 -bottom-1 -right-1',
      badgeIcon: 'w-2 h-2',
      glow: 4
    },
    sm: {
      container: 'w-8 h-8 rounded-lg',
      img: 'w-8 h-8 rounded-lg',
      badge: 'px-1 py-0.2 -bottom-1 -right-1',
      badgeIcon: 'w-2.5 h-2.5',
      glow: 6
    },
    md: {
      container: 'w-12 h-12 rounded-xl',
      img: 'w-12 h-12 rounded-xl',
      badge: 'px-1.5 py-0.5 -bottom-1.5 -right-1.5',
      badgeIcon: 'w-3 h-3',
      glow: 10
    },
    lg: {
      container: 'w-20 h-20 rounded-2xl',
      img: 'w-20 h-20 rounded-2xl',
      badge: 'px-2 py-0.5 -bottom-2 -right-2',
      badgeIcon: 'w-3.5 h-3.5',
      glow: 16
    },
    xl: {
      container: 'w-32 h-32 rounded-3xl',
      img: 'w-32 h-32 rounded-3xl',
      badge: 'px-2.5 py-1 -bottom-2.5 -right-2.5',
      badgeIcon: 'w-4 h-4',
      glow: 24
    }
  };

  const config = sizeMap[size];
  const accentColor = thumbnail?.accentHex || '#3b82f6';

  return (
    <div
      onClick={onClick}
      className={`relative group flex-shrink-0 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      title={thumbnail ? `${thumbnail.blueprintName} (${thumbnail.archetypeLabel})\nFunction: ${thumbnail.primaryFunction}\nKey Nodes: ${thumbnail.keyNodes.join(', ')}` : altName}
    >
      {/* Ambient Radial Aura Glow */}
      {thumbnail && (
        <div
          className="absolute inset-0 rounded-full opacity-35 blur-md pointer-events-none transition-opacity duration-300 group-hover:opacity-75"
          style={{
            backgroundColor: accentColor,
            transform: `scale(${size === 'xl' ? 1.25 : 1.15})`
          }}
        />
      )}

      {/* Main Thumbnail Container */}
      <div
        className={`relative ${config.container} overflow-hidden border transition-all duration-200 flex items-center justify-center ${
          thumbnail
            ? 'border-slate-700/80 group-hover:border-blue-400/80 shadow-md bg-slate-950'
            : 'border-slate-800 bg-slate-900/80'
        }`}
        style={thumbnail ? { borderColor: `${accentColor}55` } : {}}
      >
        {isGenerating ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xs">
            <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
            {size !== 'xs' && size !== 'sm' && (
              <span className="text-[9px] font-mono text-blue-300 mt-1 font-bold">GEN...</span>
            )}
          </div>
        ) : thumbnail?.imageUrl ? (
          <img
            src={thumbnail.imageUrl}
            alt={altName}
            className={`${config.img} object-cover transform transition-transform duration-300 group-hover:scale-105`}
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        ) : fallbackIcon ? (
          fallbackIcon
        ) : (
          <div className="text-slate-500">
            <Cpu className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* AI or Procedural Vector Indicator Badge */}
      {showAiBadge && thumbnail && !isGenerating && (
        <div
          className={`absolute ${config.badge} rounded-full border shadow-lg flex items-center gap-0.5 ${
            thumbnail.isAiGenerated
              ? 'bg-amber-500/90 text-slate-950 border-amber-300 font-black'
              : 'bg-blue-600/90 text-white border-blue-400 font-bold'
          }`}
          title={thumbnail.isAiGenerated ? 'AI Generated Icon' : 'Procedural Vector Icon'}
        >
          {thumbnail.isAiGenerated ? (
            <Sparkles className={config.badgeIcon} />
          ) : (
            <Layers className={config.badgeIcon} />
          )}
        </div>
      )}
    </div>
  );
};
