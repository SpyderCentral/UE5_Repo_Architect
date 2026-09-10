
import React from 'react';
import { Layers, Library, Plus, Save, MessageSquare, HardDrive, Unlink, Loader2, Sun, Moon, GitCompare } from 'lucide-react';
import { DriveSyncStatus, AppStep } from '../types';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onGoToLibrary: () => void;
  onNewProject: () => void;
  onSaveProject: () => void;
  currentStep: AppStep;
  isSaving?: boolean;
  isChatOpen?: boolean;
  onToggleChat?: () => void;
  driveStatus?: DriveSyncStatus;
  drivePath?: string | null;
  onLinkDrive?: () => void;
  onUnlinkDrive?: () => void;
  onOpenVersions?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  onGoToLibrary, 
  onNewProject, 
  onSaveProject, 
  currentStep, 
  isSaving,
  isChatOpen,
  onToggleChat,
  driveStatus,
  drivePath,
  onLinkDrive,
  onUnlinkDrive,
  onOpenVersions
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="sticky top-0 z-50 px-4 pt-4 pb-0 pointer-events-none">
        <header className="max-w-7xl mx-auto glass-panel rounded-2xl pointer-events-auto">
          <div className="px-6 h-16 flex items-center justify-between">
            
            {/* Logo Area */}
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={currentStep !== 'landing' ? onNewProject : undefined}
            >
              <div className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-lg opacity-40 group-hover:opacity-60 transition-opacity"></div>
                  <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-2 rounded-xl border border-white/10 shadow-xl group-hover:scale-105 transition-transform duration-300">
                    <Layers className="w-5 h-5 text-blue-400 group-hover:text-white transition-colors" />
                  </div>
              </div>
              <span className="text-lg font-bold text-slate-200 tracking-tight group-hover:text-white transition-colors">
                UE5 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Architect</span>
              </span>
            </div>
            
            {/* Navigation */}
            <nav className="flex items-center gap-2">
              
              {currentStep === 'workspace' && (
                <>
                   {/* Project Drive Sync Button */}
                   <div className="flex items-center gap-1.5 mr-2">
                        {driveStatus === DriveSyncStatus.Linked ? (
                            <div className="flex items-center bg-slate-900/60 rounded-lg border border-emerald-500/20 px-3 py-1.5 group/drive">
                                <div className="flex items-center gap-2">
                                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-[10px] font-mono font-bold text-emerald-300/80 truncate max-w-[100px]">{drivePath}</span>
                                </div>
                                <button 
                                    onClick={onUnlinkDrive}
                                    className="ml-2 p-1 hover:bg-red-500/10 rounded transition-colors text-slate-500 hover:text-red-400"
                                    title="Unlink Drive"
                                >
                                    <Unlink className="w-3 h-3" />
                                </button>
                            </div>
                        ) : driveStatus === DriveSyncStatus.Syncing ? (
                            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Syncing Drive
                            </div>
                        ) : (
                            <button
                                onClick={onLinkDrive}
                                className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 border border-white/5 rounded-lg transition-all"
                                title="Link Local Folder for Project Sync"
                            >
                                <HardDrive className="w-3.5 h-3.5" />
                                Link Drive
                            </button>
                        )}
                   </div>

                   {/* Version Comparison / History Button */}
                   {onOpenVersions && (
                     <button
                        onClick={onOpenVersions}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/40 hover:bg-slate-800 rounded-lg border border-white/5 hover:border-blue-500/30 transition-all mr-1 cursor-pointer"
                        title="Compare plan versions & snapshots"
                     >
                        <GitCompare className="w-4 h-4 text-blue-400" />
                        <span className="hidden sm:inline">Versions</span>
                     </button>
                   )}

                   <button
                      onClick={onSaveProject}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-emerald-300 bg-emerald-950/30 hover:bg-emerald-500/20 hover:text-emerald-200 rounded-lg border border-emerald-500/20 hover:border-emerald-500/50 transition-all shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] mr-2"
                      title="Save Project"
                   >
                      <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
                      <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
                   </button>

                   <div className="h-6 w-px bg-white/10 mx-2 hidden sm:block"></div>

                   <button
                      onClick={onToggleChat}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all border ${
                        isChatOpen 
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
                      }`}
                      title={isChatOpen ? "Collapse Assistant" : "Expand Assistant"}
                   >
                      <MessageSquare className="w-4 h-4" />
                      <span className="hidden sm:inline">Assistant</span>
                   </button>
                </>
              )}

              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all border border-transparent hover:border-white/10 cursor-pointer ml-1"
                title={theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
                aria-label="Toggle theme mode"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-300" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-400 animate-in spin-in-90 duration-300" />
                )}
              </button>

              {/* Show Library button whenever we're not in the Library or on the Landing page */}
              {currentStep !== 'library' && currentStep !== 'landing' && (
                <button 
                  onClick={onGoToLibrary}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                  <Library className="w-4 h-4" />
                  <span className="hidden sm:inline">Library</span>
                </button>
              )}

              {/* Show New Project button when in Library or Workspace */}
              {(currentStep === 'library' || currentStep === 'workspace') && (
                 <button 
                    onClick={onNewProject}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-600/20 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5 active:translate-y-0 ml-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">New Project</span>
                  </button>
              )}
            </nav>
          </div>
        </header>
    </div>
  );
};

export default Header;
