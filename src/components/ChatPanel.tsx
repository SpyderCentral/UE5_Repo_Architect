
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { Send, Bot, User, Sparkles, ChevronRight, PanelRightClose, Mic, Eye, Monitor } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isTyping: boolean;
  onClose?: () => void;
  onStartVoice?: (useVision?: boolean) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, isTyping, onClose, onStartVoice }) => {
  const [input, setInput] = useState('');
  const [showVoiceOptions, setShowVoiceOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#0b0f19]/50 backdrop-blur-md z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
                <span className="font-bold text-slate-100 text-sm block tracking-wide">Design Assistant</span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1.5 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
                    Online
                </span>
            </div>
        </div>
        
        <div className="flex items-center gap-1">
            {onStartVoice && (
                <div className="relative">
                    <button
                        onClick={() => setShowVoiceOptions(!showVoiceOptions)}
                        className={`p-1.5 rounded-lg transition-all border ${
                            showVoiceOptions 
                            ? 'bg-blue-600/30 text-blue-300 border-blue-500/40' 
                            : 'text-blue-400 hover:text-white hover:bg-blue-600/20 border-transparent hover:border-blue-500/30'
                        }`}
                        title="Voice Services"
                    >
                        <Mic className="w-5 h-5" />
                    </button>

                    {showVoiceOptions && (
                        <div className="absolute top-full right-0 mt-2 w-48 glass-panel rounded-xl border-slate-700 shadow-2xl p-2 z-[60] animate-in slide-in-from-top-2 duration-200">
                             <button 
                                onClick={() => { onStartVoice(); setShowVoiceOptions(false); }}
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-all group"
                             >
                                <div className="p-1.5 bg-blue-500/10 rounded group-hover:bg-blue-500/20"><Mic className="w-4 h-4 text-blue-400" /></div>
                                <div className="text-left">
                                    <div className="text-xs font-bold">Live Voice</div>
                                    <div className="text-[9px] text-slate-500">Natural brainstorm</div>
                                </div>
                             </button>
                             <button 
                                onClick={() => { onStartVoice(true); setShowVoiceOptions(false); }}
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-slate-300 hover:text-white transition-all group"
                             >
                                <div className="p-1.5 bg-cyan-500/10 rounded group-hover:bg-cyan-500/20"><Eye className="w-4 h-4 text-cyan-400" /></div>
                                <div className="text-left">
                                    <div className="text-xs font-bold">Live Eyes</div>
                                    <div className="text-[9px] text-slate-500 tracking-tight">AI sees your screen</div>
                                </div>
                             </button>
                        </div>
                    )}
                </div>
            )}
            
            {onClose && (
                <button 
                    onClick={onClose}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
                    title="Collapse Panel"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="text-center py-20 text-slate-500 animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 bg-slate-800/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-inner">
                <Bot className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-sm font-medium text-slate-400">Ask me about the plan.</p>
            <p className="text-xs mt-2 text-slate-600">"How do I optimize this?"</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex gap-4 animate-in slide-in-from-bottom-2 fade-in duration-300 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white/5 ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-blue-600 to-cyan-500' 
                : 'bg-gradient-to-br from-violet-600 to-fuchsia-600'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
            </div>
            
            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-lg backdrop-blur-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600/90 text-white rounded-tr-sm border border-blue-400/30' 
                : 'bg-slate-800/60 border border-white/10 text-slate-200 rounded-tl-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-4 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-violet-600/50 flex items-center justify-center flex-shrink-0">
               <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-slate-800/50 border border-white/5 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-5 border-t border-white/5 bg-[#0b0f19]/80 backdrop-blur-lg shrink-0">
        <form onSubmit={handleSubmit} className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="w-full bg-slate-900/50 text-slate-200 text-sm rounded-xl pl-4 pr-12 py-4 border border-white/10 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 placeholder-slate-600 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
