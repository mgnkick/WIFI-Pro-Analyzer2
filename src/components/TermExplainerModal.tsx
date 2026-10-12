import React from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { KnowledgeTerm } from '../types/wifi';

interface TermExplainerModalProps {
  term: KnowledgeTerm | null;
  onClose: () => void;
}

export const TermExplainerModal: React.FC<TermExplainerModalProps> = ({ term, onClose }) => {
  if (!term) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 inline-block mb-1">
              {term.category}
            </span>
            <h3 className="text-lg font-bold text-slate-100">
              {term.term}
            </h3>
            {term.termEn && (
              <p className="text-xs text-slate-400 font-mono">
                {term.termEn}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="whitespace-pre-line">
            {term.detailedDesc}
          </div>

          {term.recommendedValue && (
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
              <span className="font-semibold text-slate-200 block text-[11px] text-cyan-300 uppercase tracking-wider">Норма / Рекомендация:</span>
              <p className="font-mono text-slate-300">
                {term.recommendedValue}
              </p>
            </div>
          )}

          {term.practicalTip && (
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-emerald-300 block text-[11px]">Практический совет инженера:</span>
                <p className="text-slate-300 mt-0.5">
                  {term.practicalTip}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
          {term.tags.map(t => (
            <span
              key={t}
              className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-mono"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
