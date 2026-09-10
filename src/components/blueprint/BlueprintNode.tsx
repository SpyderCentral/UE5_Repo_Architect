
import React from 'react';
import { Play, Zap, Box, FunctionSquare, Workflow, Braces, Music, Grid, Flame } from 'lucide-react';
import { NodeData } from '../../types';

export interface NodeHeatmapIntensity {
  intensity: number;
  tier: 'cool' | 'warm' | 'hot';
}

interface BlueprintNodeProps {
  data: NodeData;
  connectedPins?: Set<string>; // Set of "pinName-direction"
  onNodeDown?: (e: React.MouseEvent, id: string) => void;
  heatmapIntensity?: NodeHeatmapIntensity;
}

const BlueprintNode: React.FC<BlueprintNodeProps> = ({ data, connectedPins, onNodeDown, heatmapIntensity }) => {
  
  // UE5 Style Colors & Gradients
  const getHeaderStyle = () => {
    switch (data.type) {
      case 'event': // Red
        return 'bg-gradient-to-b from-[#8B2323] via-[#700000] to-[#550000] border-[#FF4444] shadow-[0_2px_10px_rgba(255,0,0,0.2)]';
      case 'function': // Blue
        return 'bg-gradient-to-b from-[#2F5C8F] via-[#1F456E] to-[#183048] border-[#5CA3FF] shadow-[0_2px_10px_rgba(0,100,255,0.2)]';
      case 'audio': // MetaSound - Orange/Yellow
        return 'bg-gradient-to-b from-[#8F5B2F] via-[#6E451F] to-[#483018] border-[#FFA35C] shadow-[0_2px_10px_rgba(255,150,0,0.2)]';
      case 'pcg': // PCG - Cyan/Blue
        return 'bg-gradient-to-b from-[#2F8F8F] via-[#1F6E6E] to-[#184848] border-[#5CFFFF] shadow-[0_2px_10px_rgba(0,255,255,0.2)]';
      case 'macro': // Gray/Standard
        return 'bg-gradient-to-b from-[#555] via-[#444] to-[#333] border-[#AAAAAA]';
      case 'variable': // Variable Set/Get
        return 'bg-gradient-to-b from-[#1A6E55] via-[#104D3A] to-[#0A3326] border-[#30CFA0]'; 
      case 'flow': // Gray/Blue mix
        return 'bg-gradient-to-b from-[#404040] via-[#303030] to-[#202020] border-[#909090]';
      default: 
        return 'bg-gradient-to-b from-[#2F5C8F] to-[#183048] border-[#5CA3FF]';
    }
  };

  const getPinColorStyles = (type: string, isConnected: boolean) => {
    const baseClasses = "w-3.5 h-3.5 rounded-full border-[2px] transition-all group-hover/pin:scale-110";
    let colors = { border: '', fill: '', hover: '' };

    switch (type) {
      case 'exec': 
        return { wrapper: "-ml-[21px] mr-2 text-white drop-shadow-sm", icon: <Play className="w-5 h-5 fill-white" /> };
      case 'audio': // Yellow for MetaSound Audio
        colors = { border: 'border-[#FFB700]', fill: 'bg-[#FFB700]', hover: 'group-hover:bg-[#FFD620]' }; break;
      case 'pcg_data': // White/Cyan for PCG
        colors = { border: 'border-[#FFFFFF]', fill: 'bg-[#FFFFFF]', hover: 'group-hover:bg-[#E0FFFF]' }; break;
      case 'bool': // Red
        colors = { border: 'border-[#8A0000]', fill: 'bg-[#8A0000]', hover: 'group-hover:bg-[#AA0000]' }; break;
      case 'float': // Green
        colors = { border: 'border-[#35D048]', fill: 'bg-[#35D048]', hover: 'group-hover:bg-[#45E058]' }; break;
      case 'integer': // Cyan/Turquoise
        colors = { border: 'border-[#00E5CC]', fill: 'bg-[#00E5CC]', hover: 'group-hover:bg-[#20F5DC]' }; break;
      case 'vector': // Yellow/Orange
        colors = { border: 'border-[#FFC600]', fill: 'bg-[#FFC600]', hover: 'group-hover:bg-[#FFD620]' }; break;
      case 'object': // Blue
        colors = { border: 'border-[#00A8FF]', fill: 'bg-[#00A8FF]', hover: 'group-hover:bg-[#20B8FF]' }; break;
      case 'string': // Magenta
        colors = { border: 'border-[#FF00D4]', fill: 'bg-[#FF00D4]', hover: 'group-hover:bg-[#FF20E4]' }; break;
      case 'rotator': // Purple
         colors = { border: 'border-[#9933ff]', fill: 'bg-[#9933ff]', hover: 'group-hover:bg-[#b366ff]' }; break;
      case 'transform': // Orange
         colors = { border: 'border-[#ff6600]', fill: 'bg-[#ff6600]', hover: 'group-hover:bg-[#ff8533]' }; break;
      default: 
        colors = { border: 'border-slate-400', fill: 'bg-slate-400', hover: 'group-hover:bg-slate-300' };
    }

    const bgClass = isConnected ? colors.fill : 'bg-transparent';
    return {
        wrapper: "-ml-[18px] mr-2.5",
        element: <div className={`${baseClasses} ${colors.border} ${bgClass} ${colors.hover}`} title={type} />
    };
  };

  const HeaderIcon = () => {
    const iconClass = "w-5 h-5 text-white/90 drop-shadow-md";
    if (data.type === 'event') return <Zap className={iconClass} fill="currentColor" />;
    if (data.type === 'function') return <FunctionSquare className={iconClass} />;
    if (data.type === 'macro') return <Braces className={iconClass} />;
    if (data.type === 'variable') return <Box className={iconClass} />;
    if (data.type === 'flow') return <Workflow className={iconClass} />;
    if (data.type === 'audio') return <Music className={iconClass} />;
    if (data.type === 'pcg') return <Grid className={iconClass} />;
    return <FunctionSquare className={iconClass} />;
  };

  // Heatmap intensity border & ring styles
  const getHeatmapRingClass = () => {
    if (!heatmapIntensity) return 'ring-1 ring-white/5 hover:ring-white/20';
    if (heatmapIntensity.tier === 'hot') {
      return 'ring-2 ring-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.45)]';
    }
    if (heatmapIntensity.tier === 'warm') {
      return 'ring-2 ring-amber-500/80 shadow-[0_0_18px_rgba(245,158,11,0.35)]';
    }
    return 'ring-1 ring-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.25)]';
  };

  return (
    <div 
      onMouseDown={(e) => onNodeDown && onNodeDown(e, data.id)}
      className={`absolute flex flex-col w-[280px] rounded-[12px] overflow-hidden shadow-[8px_16px_30px_rgba(0,0,0,0.7)] font-sans select-none z-10 group transition-all cursor-default ${getHeatmapRingClass()}`}
      style={{ 
        left: data.x, 
        top: data.y,
        backgroundColor: 'rgba(15,15,15, 0.95)'
      }}
    >
      <div className={`px-3 py-2 flex items-center justify-between gap-2 border-b border-white/10 ${getHeaderStyle()}`}>
         <div className="flex items-center gap-2.5 min-w-0">
           <div className="flex-shrink-0"><HeaderIcon /></div>
           <span className="text-[13px] font-bold text-white drop-shadow-md truncate tracking-wide antialiased">{data.name}</span>
         </div>
         {heatmapIntensity && (
           <div className="flex-shrink-0 z-10">
             {heatmapIntensity.tier === 'hot' ? (
               <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-rose-500/40 text-rose-100 border border-rose-400/60 shadow-sm" title="High Usage / Perf Hotspot">
                 <Flame className="w-2.5 h-2.5 text-rose-300" />
                 {heatmapIntensity.intensity}%
               </span>
             ) : heatmapIntensity.tier === 'warm' ? (
               <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-amber-500/40 text-amber-100 border border-amber-400/60 shadow-sm" title="Moderate Flow Reference">
                 <Zap className="w-2.5 h-2.5 text-amber-300" />
                 {heatmapIntensity.intensity}%
               </span>
             ) : (
               <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-emerald-500/30 text-emerald-100 border border-emerald-400/50 shadow-sm" title="Cool / Pure Math">
                 {heatmapIntensity.intensity}%
               </span>
             )}
           </div>
         )}
         <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
      </div>
      <div className="p-3 space-y-4 relative bg-[#121212]/95 backdrop-blur-sm min-h-[60px]">
         <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
         <div className="flex justify-between items-start gap-4 relative z-10">
            <div className="space-y-4 flex flex-col items-start pt-1 w-1/2">
                {data.inputs.map((pin, idx) => {
                    const isLinked = connectedPins?.has(`${pin.name}-input`);
                    const style = getPinColorStyles(pin.type, !!isLinked);
                    return (
                        <div key={idx} className="flex items-center h-5 relative group/pin w-full">
                            {pin.type === 'exec' ? (
                                <div className="-ml-[21px] mr-2 text-white drop-shadow-sm transition-transform group-hover/pin:scale-110"><Play className="w-5 h-5 fill-white" /></div>
                            ) : (
                                <div className={style.wrapper}>{style.element}</div>
                            )}
                            <div className="flex flex-col justify-center min-w-0">
                                <span className="text-[11px] text-[#DDDDDD] font-medium leading-none tracking-tight group-hover/pin:text-white transition-colors truncate">{pin.name}</span>
                                {pin.value && <div className="mt-1 flex items-center"><span className="text-[9px] text-blue-200 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-blue-500/20 max-w-full truncate shadow-inner">{pin.value}</span></div>}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="space-y-4 flex flex-col items-end pt-1 w-1/2">
                {data.outputs.map((pin, idx) => {
                    const isLinked = connectedPins?.has(`${pin.name}-output`);
                    const style = getPinColorStyles(pin.type, !!isLinked);
                    return (
                        <div key={idx} className="flex items-center h-5 relative group/pin justify-end w-full">
                            <span className="text-[11px] text-[#DDDDDD] font-medium leading-none mr-2.5 tracking-tight group-hover/pin:text-white transition-colors text-right truncate">{pin.name}</span>
                            {pin.type === 'exec' ? (
                                <div className="-mr-[21px] ml-0 text-white drop-shadow-sm transition-transform group-hover/pin:scale-110"><Play className="w-5 h-5 fill-white" /></div>
                            ) : (
                                <div className={`-mr-[18px] ml-2.5`}>{style.element}</div>
                            )}
                        </div>
                    );
                })}
            </div>
         </div>
      </div>
    </div>
  );
};

export default BlueprintNode;
