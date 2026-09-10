
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Proceed",
  cancelText = "Cancel",
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const accentColor = type === 'danger' ? 'red' : 'amber';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-md glass-panel rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 bg-slate-900/90">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 rounded-2xl bg-${accentColor}-500/10 border border-${accentColor}-500/20`}>
              <AlertTriangle className={`w-6 h-6 text-${accentColor}-400`} />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">{title}</h2>
          </div>

          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            {message}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-widest transition-all border border-white/5"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 px-6 py-3 rounded-xl bg-${type === 'danger' ? 'red-600 hover:bg-red-500' : 'blue-600 hover:bg-blue-500'} text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg`}
            >
              {confirmText}
            </button>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default ConfirmationModal;
