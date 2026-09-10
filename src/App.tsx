
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import InputForm from './components/InputForm';
import PlanDisplay from './components/plan/PlanDisplay';
import ChatPanel from './components/ChatPanel';
import BlueprintArchitect from './components/BlueprintArchitect';
import ProjectLibrary from './components/ProjectLibrary';
import ExportModal from './components/ExportModal';
import VisionBoard from './components/VisionBoard';
import NarrativeWeaver from './components/NarrativeWeaver';
import Cartographer from './components/Cartographer';
import LiveVoiceMode from './components/LiveVoiceMode';
import DesignReviewPanel from './components/DesignReview';
import OverseerPanel from './components/OverseerPanel';
import MarketplaceScout from './components/MarketplaceScout';
import PerformanceAdvisor from './components/PerformanceAdvisor';
import ResourceTracker from './components/ResourceTracker';
import ReferenceHub from './components/ReferenceHub';
import ConfirmationModal from './components/ConfirmationModal';
import VersionComparisonModal from './components/VersionComparisonModal';
import { GddUploadSection } from './components/gdd/GddUploadSection';
import { GddDossierView } from './components/gdd/GddDossierView';
import { useGamePlan } from './hooks/useGamePlan';
import { useLiveSession } from './hooks/useLiveSession';
import { LevelLayout } from './types';
import { AlertCircle, Map, Cpu, Terminal, Image as ImageIcon, BookOpen, Globe, ClipboardCheck, ShoppingBag, Activity, Book, ShieldCheck, Gauge, FileText, Bot, Sparkles, Sliders } from 'lucide-react';

const App: React.FC = () => {
  const {
    step,
    loading,
    error,
    isSaving,
    plan,
    chatHistory,
    designReview,
    overseerReport,
    blueprints,
    behaviorTrees,
    materials,
    inputs,
    metaSounds,
    pcgs,
    cppCodes,
    t3dExports,
    visionBoardImages,
    suggestedPrompts,
    narrative,
    levelLayouts,
    performanceReports,
    driveStatus,
    drivePath,
    linkLocalDrive,
    unlinkLocalDrive,
    gddRecord,
    loadAutonomousGddProject,
    createNewLevelLayout,
    updatePOIPosition,
    performPerformanceAnalysis,
    performLayoutPerformanceAnalysis,
    fetchQuests,
    fetchNPCs,
    fetchDialogue,
    fetchVisualPrompts,
    generateImageFromPrompt,
    isAgentThinking,
    savedProjects,
    lastSavedTime,
    currentProjectId,
    startBuilding,
    generate,
    importProject,
    sendMessage,
    fetchDesignReview,
    fetchOverseerReport,
    fetchBlueprintSpec,
    registerBlueprintSpec,
    fetchBehaviorTreeSpec,
    fetchMaterialSpec,
    fetchInputSpec,
    fetchMetaSoundSpec,
    fetchPcgSpec,
    fetchCppCodeForAsset,
    fetchVerseCodeForAsset,
    batchSetVerseCodes,
    verseCodes,
    ue6Audit,
    setUe6Audit,
    fetchT3dForAsset,
    generateAutomationScript,
    manualSave,
    reset,
    goToLibrary,
    loadProject,
    deleteProject,
    addLevelLayout
  } = useGamePlan();

  const liveSession = useLiveSession();

  const [activeTab, setActiveTab] = useState<'roadmap' | 'blueprints' | 'vision' | 'story' | 'world' | 'review' | 'overseer' | 'scout' | 'performance' | 'resources' | 'docs' | 'gdd'>('roadmap');
  const [inputMethod, setInputMethod] = useState<'gdd' | 'manual'>('gdd');
  const [selectedBlueprint, setSelectedBlueprint] = useState<string | null>(null);
  const [selectedVisionLayout, setSelectedVisionLayout] = useState<LevelLayout | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(true);
  
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [exportScript, setExportScript] = useState('');
  const [exportGuide, setExportGuide] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Sync active project ID for export utility
  useEffect(() => {
      if (currentProjectId) {
          localStorage.setItem('last_active_project_id', currentProjectId);
      }
  }, [currentProjectId]);

  const handleNavigateToBlueprint = (assetName: string) => {
    setSelectedBlueprint(assetName);
    setActiveTab('blueprints');
  };

  const handleSafeAction = (action: () => void, title: string, message: string) => {
    // If we're in the workspace and have an active plan, confirm before leaving
    if (step === 'workspace' && plan) {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        onConfirm: action
      });
    } else {
      action();
    }
  };

  const handleOpenExport = async () => {
    setIsExportOpen(true);
    if (!exportScript) {
        setIsGeneratingScript(true);
        try {
            const result = await generateAutomationScript();
            if (result) {
                setExportScript(result.script);
                setExportGuide(result.usageGuide);
            }
        } catch (e) {
            console.error(e);
            setExportScript("# Error generating script. Please try again.");
        } finally {
            setIsGeneratingScript(false);
        }
    }
  };

  if (step === 'landing') {
    return <LandingPage onStart={startBuilding} />;
  }

  return (
    <div className="h-screen flex flex-col relative overflow-hidden font-sans text-slate-100 selection:bg-blue-500/30">
      <div className="bg-noise z-50 pointer-events-none"></div>

      <div className="fixed inset-0 bg-slate-950 -z-20"></div>
      <div className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] animate-float opacity-40 mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-float-slow opacity-40 mix-blend-screen" />
        <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] bg-cyan-500/5 rounded-full blur-[100px] animate-float opacity-30 mix-blend-screen" style={{ animationDelay: '3s' }} />
      </div>

      <Header 
        onGoToLibrary={() => handleSafeAction(goToLibrary, "Return to Library?", "Your current project progress will be saved, but you will leave the active workspace.")}
        onNewProject={() => handleSafeAction(reset, "Start New Project?", "This will discard the current workspace and take you back to the initialization form.")} 
        onSaveProject={manualSave}
        currentStep={step}
        isSaving={isSaving}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        driveStatus={driveStatus}
        drivePath={drivePath}
        onLinkDrive={linkLocalDrive}
        onUnlinkDrive={unlinkLocalDrive}
        onOpenVersions={() => setIsVersionModalOpen(true)}
      />
      
      {error && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] bg-red-500/90 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_10px_40px_rgba(239,68,68,0.4)] backdrop-blur-md animate-bounce border border-red-400/30">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {step === 'workspace' && lastSavedTime && (
          <div className="absolute top-20 right-8 z-[40] text-[10px] text-slate-500 font-mono pointer-events-none bg-slate-950/50 px-2 py-1 rounded border border-white/5 backdrop-blur-sm animate-in fade-in">
              {isSaving ? (
                <span className="text-emerald-400 animate-pulse">Syncing...</span>
              ) : (
                `Last saved ${new Date(lastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              )}
          </div>
      )}

      {liveSession.isActive && (
          <LiveVoiceMode 
              isActive={liveSession.isActive}
              status={liveSession.status}
              volume={liveSession.volume}
              videoStream={liveSession.videoStream}
              onClose={liveSession.disconnect}
          />
      )}

      {step === 'input' && (
        <main className="flex-1 overflow-y-auto relative z-10 scroll-smooth">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
             <div className="text-center mb-12 scale-in duration-700">
                <h1 className="text-5xl sm:text-8xl font-black text-white mb-6 tracking-tight drop-shadow-2xl">
                  Build Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-300 text-glow">UE5 Dream</span>
                </h1>
                <p className="text-lg sm:text-2xl text-slate-300 max-w-3xl mx-auto mb-10 leading-relaxed font-light drop-shadow-lg">
                  AI-powered Unreal Engine 5 development roadmap tailored to your exact vision and skill level.
                </p>
                
                {savedProjects.length > 0 && (
                  <button 
                    onClick={() => handleSafeAction(goToLibrary, "Return to Library?", "Navigate back to your project list.")}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700 hover:border-blue-400/50 transition-all text-sm mb-4 backdrop-blur-md shadow-lg"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Resume {savedProjects.length} Project{savedProjects.length !== 1 && 's'}
                  </button>
                )}
              </div>

              <div className="w-full max-w-5xl mx-auto flex flex-col items-center mb-6 relative z-20">
                {/* Mode Selector Toggle */}
                <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl mb-8">
                  <button
                    onClick={() => setInputMethod('gdd')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                      inputMethod === 'gdd'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/25 scale-[1.02]'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Bot className="w-4 h-4 text-cyan-300 animate-pulse" />
                    <span>Upload GDD (Autonomous AI)</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 text-white font-mono">Agentic</span>
                  </button>

                  <button
                    onClick={() => setInputMethod('manual')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                      inputMethod === 'manual'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Sliders className="w-4 h-4 text-indigo-300" />
                    <span>Manual Blueprint Form</span>
                  </button>
                </div>

                {/* Render Selected Method */}
                {inputMethod === 'gdd' ? (
                  <div className="w-full">
                    <GddUploadSection 
                      onProjectGenerated={loadAutonomousGddProject}
                      onSwitchToManual={() => setInputMethod('manual')}
                      isGenerating={loading}
                    />
                  </div>
                ) : (
                  <div className="w-full flex justify-center">
                    <InputForm 
                      onSubmit={generate} 
                      isLoading={loading} 
                      driveStatus={driveStatus}
                      drivePath={drivePath}
                      onLinkDrive={linkLocalDrive}
                      onUnlinkDrive={unlinkLocalDrive}
                      onSwitchToGdd={() => setInputMethod('gdd')}
                    />
                  </div>
                )}
              </div>

              {loading && (
                 <div className="text-center space-y-6 animate-pulse">
                   <p className="text-blue-400 font-mono text-sm tracking-[0.2em] uppercase glow-sm">Processing Neural Architecture...</p>
                 </div>
              )}
          </div>
        </main>
      )}

      {step === 'library' && (
        <ProjectLibrary 
          projects={savedProjects}
          onLoad={loadProject}
          onDelete={deleteProject}
          onCreateNew={() => handleSafeAction(reset, "Start New Project?", "Ready to draft a new architectural plan?")}
          onImport={importProject}
        />
      )}

      {step === 'workspace' && plan && (
        <div className="flex-1 flex overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="flex-1 flex flex-col min-w-0 relative transition-all">
             
             <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-slate-950/60 backdrop-blur-md sticky top-0 z-20 shadow-lg">
                <div className="flex items-center gap-6 overflow-x-auto custom-scrollbar-hidden">
                    <span className="font-bold text-slate-200 flex items-center gap-3 text-lg mr-4 tracking-tight shrink-0">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse"></div>
                        Project Workspace
                    </span>

                    <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/5 shadow-inner shrink-0">
                        <button 
                            onClick={() => setActiveTab('roadmap')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                                activeTab === 'roadmap' 
                                ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md border border-white/5' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Map className="w-3.5 h-3.5" /> Roadmap
                        </button>
                        <button 
                            onClick={() => setActiveTab('gdd')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                                activeTab === 'gdd' 
                                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span>GDD Dossier</span>
                            {gddRecord && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                        </button>
                        <button 
                            onClick={() => setActiveTab('overseer')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                                activeTab === 'overseer' 
                                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md border border-white/5' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <ShieldCheck className="w-3.5 h-3.5" /> Overseer
                        </button>
                        <button 
                            onClick={() => setActiveTab('docs')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                                activeTab === 'docs' 
                                ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md border border-white/5' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Book className="w-3.5 h-3.5" /> Nodes
                        </button>
                        <button 
                            onClick={() => setActiveTab('performance')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                                activeTab === 'performance' 
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md shadow-teal-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Activity className="w-3.5 h-3.5" /> Diagnose
                        </button>
                        <button 
                            onClick={() => setActiveTab('resources')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                                activeTab === 'resources' 
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Gauge className="w-3.5 h-3.5" /> Resources
                        </button>
                        <button 
                            onClick={() => setActiveTab('scout')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                                activeTab === 'scout' 
                                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <ShoppingBag className="w-3.5 h-3.5" /> Scout
                        </button>
                        <button 
                            onClick={() => setActiveTab('review')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                                activeTab === 'review' 
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md shadow-blue-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <ClipboardCheck className="w-3.5 h-3.5" /> Review
                        </button>
                        <button 
                            onClick={() => setActiveTab('story')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                                activeTab === 'story' 
                                ? 'bg-gradient-to-r from-yellow-600 to-orange-500 text-white shadow-md shadow-orange-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <BookOpen className="w-3.5 h-3.5" /> Story
                        </button>
                         <button 
                            onClick={() => setActiveTab('world')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                                activeTab === 'world' 
                                ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-md shadow-cyan-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Globe className="w-3.5 h-3.5" /> World
                        </button>
                        <button 
                            onClick={() => setActiveTab('blueprints')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                                activeTab === 'blueprints' 
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <Cpu className="w-3.5 h-3.5" /> 
                            <span>Architect</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 font-mono">UE6</span>
                        </button>
                         <button 
                            onClick={() => setActiveTab('vision')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300 ${
                                activeTab === 'vision' 
                                ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-md shadow-pink-500/20' 
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <ImageIcon className="w-3.5 h-3.5" /> Vision
                        </button>
                    </div>
                </div>

                <button 
                    onClick={handleOpenExport}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-300 hover:text-blue-200 rounded-lg text-xs font-bold border border-blue-500/20 shadow-sm transition-all"
                >
                    <Terminal className="w-3.5 h-3.5" />
                    Construct
                </button>
             </div>

             <div className="flex-1 overflow-hidden relative z-10 bg-slate-900/20">
               {activeTab === 'roadmap' && (
                   <div className="h-full overflow-y-auto p-4 sm:p-10 scroll-smooth">
                        <div className="max-w-5xl mx-auto">
                            <PlanDisplay 
                                plan={plan} 
                                onNavigateToBlueprint={handleNavigateToBlueprint}
                            />
                        </div>
                        <div className="h-24" />
                   </div>
               )}
               {activeTab === 'overseer' && (
                   <div className="h-full animate-in fade-in duration-300">
                       <OverseerPanel 
                            report={overseerReport}
                            onGenerate={fetchOverseerReport}
                            isLoading={loading}
                            plan={plan}
                            blueprints={blueprints}
                            verseCodes={verseCodes}
                       />
                   </div>
               )}
               {activeTab === 'docs' && (
                   <div className="h-full animate-in fade-in duration-300">
                       <ReferenceHub />
                   </div>
               )}
               {activeTab === 'performance' && (
                   <div className="h-full animate-in fade-in duration-300">
                       <PerformanceAdvisor 
                           reports={performanceReports}
                           onAnalyze={performPerformanceAnalysis}
                           isLoading={loading}
                       />
                   </div>
               )}
               {activeTab === 'resources' && (
                   <div className="h-full animate-in fade-in duration-300">
                       <ResourceTracker 
                           plan={plan}
                           savedBlueprints={blueprints}
                           savedBehaviorTrees={behaviorTrees}
                           savedMaterials={materials}
                           savedInputs={inputs}
                           savedMetaSounds={metaSounds}
                           savedPcgs={pcgs}
                           onNavigateToBlueprint={handleNavigateToBlueprint}
                       />
                   </div>
               )}
               {activeTab === 'scout' && (
                   <div className="h-full animate-in fade-in duration-300">
                       <MarketplaceScout />
                   </div>
               )}
               {activeTab === 'review' && (
                   <div className="h-full animate-in fade-in duration-300">
                       <DesignReviewPanel 
                            review={designReview}
                            onGenerate={fetchDesignReview}
                            isLoading={loading}
                       />
                   </div>
               )}
               {activeTab === 'blueprints' && (
                   <div className="h-full animate-in fade-in duration-300">
                       <BlueprintArchitect 
                           plan={plan} 
                           onGenerateBlueprint={fetchBlueprintSpec}
                           onGenerateBehaviorTree={fetchBehaviorTreeSpec}
                           onGenerateMaterial={fetchMaterialSpec}
                           onGenerateInput={fetchInputSpec}
                           onGenerateMetaSound={fetchMetaSoundSpec}
                           onGeneratePcg={fetchPcgSpec}
                           onGenerateCpp={fetchCppCodeForAsset}
                           onGenerateT3d={fetchT3dForAsset}
                           selectedAsset={selectedBlueprint}
                           onSelectAsset={setSelectedBlueprint}
                           onNavigateToResources={() => setActiveTab('resources')}
                           savedBlueprints={blueprints}
                           savedBehaviorTrees={behaviorTrees}
                           savedMaterials={materials}
                           savedInputs={inputs}
                           savedMetaSounds={metaSounds}
                           savedPcgs={pcgs}
                           savedCppCodes={cppCodes}
                           savedVerseCodes={verseCodes}
                           onGenerateVerse={fetchVerseCodeForAsset}
                           batchSetVerseCodes={batchSetVerseCodes}
                           ue6Audit={ue6Audit}
                           onUpdateUE6Audit={setUe6Audit}
                           onRegisterBlueprint={registerBlueprintSpec}
                       />
                   </div>
               )}
               {activeTab === 'vision' && (
                   <div className="h-full animate-in fade-in duration-300">
                       <VisionBoard
                          plan={plan}
                          images={visionBoardImages}
                          suggestedPrompts={suggestedPrompts}
                          levelLayouts={levelLayouts}
                          selectedLayout={selectedVisionLayout}
                          onFetchPrompts={fetchVisualPrompts}
                          onGenerateImage={generateImageFromPrompt}
                          onNavigateToWorld={() => setActiveTab('world')}
                          onAddLevelLayout={addLevelLayout}
                       />
                   </div>
               )}
               {activeTab === 'story' && (
                   <div className="h-full animate-in fade-in duration-300">
                       <NarrativeWeaver
                           narrative={narrative}
                           onFetchQuests={fetchQuests}
                           onFetchNPCs={fetchNPCs}
                           onFetchDialogue={fetchDialogue}
                           onGenerateImage={generateImageFromPrompt}
                       />
                   </div>
               )}
               {activeTab === 'world' && (
                   <div className="h-full animate-in fade-in duration-300">
                       <Cartographer
                           layouts={levelLayouts}
                           onGenerateLayout={createNewLevelLayout}
                           onUpdatePosition={updatePOIPosition}
                           onAnalyzePerformance={performLayoutPerformanceAnalysis}
                           onNavigateToVision={(layout) => {
                               setSelectedVisionLayout(layout || null);
                               setActiveTab('vision');
                           }}
                       />
                   </div>
               )}
               {activeTab === 'gdd' && (
                   <div className="h-full animate-in fade-in duration-300">
                       <GddDossierView 
                           gddRecord={gddRecord}
                           plan={plan}
                           onNavigateToBlueprint={handleNavigateToBlueprint}
                           onProjectUpdated={loadAutonomousGddProject}
                       />
                   </div>
               )}
             </div>
          </div>

          <div 
             className={`flex-col z-30 relative transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] border-l border-white/10 bg-[#0b0f19]/95 backdrop-blur-xl shadow-2xl overflow-hidden ${
               isChatOpen ? 'w-[420px] translate-x-0' : 'w-0 translate-x-full border-none opacity-0'
             }`}
          >
             <div className="w-[420px] h-full flex flex-col">
                <ChatPanel 
                  messages={chatHistory} 
                  onSendMessage={sendMessage}
                  isTyping={isAgentThinking}
                  onClose={() => setIsChatOpen(false)}
                  onStartVoice={liveSession.connect}
                />
             </div>
          </div>

        </div>
      )}

      <ExportModal 
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        script={exportScript}
        usageGuide={exportGuide}
        isLoading={isGeneratingScript}
      />

      {plan && (
        <VersionComparisonModal 
          isOpen={isVersionModalOpen}
          onClose={() => setIsVersionModalOpen(false)}
          currentPlan={plan}
          projectId={currentProjectId || plan.title || 'default_project'}
          onRestoreSnapshot={(snapshot) => {
            // Restore snapshot plan
            if (snapshot && snapshot.plan) {
              // Trigger project save with restored plan
              manualSave();
            }
          }}
        />
      )}

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
};

export default App;
