import React, { useState, useMemo } from 'react';
import { BookOpen, Search, ChevronRight } from 'lucide-react';
import { TERMS_KNOWLEDGE } from '../data/termsKnowledge';
import { KnowledgeTerm } from '../types/wifi';
import { TermExplainerModal } from './TermExplainerModal';

export const KnowledgeBaseView: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [activeModalTerm, setActiveModalTerm] = useState<KnowledgeTerm | null>(null);

  const categories = [
    'Все', 
    'Физика радиосигнала', 
    'Параметры Wi-Fi', 
    'Скорость и QoS', 
    'Безопасность и NAT', 
    'Оборудование и Сеть'
  ];

  const filteredTerms = useMemo(() => {
    return TERMS_KNOWLEDGE.filter(item => {
      const matchesCategory = selectedCategory === 'Все' || item.category === selectedCategory;
      const matchesSearch = 
        item.term.toLowerCase().includes(search.toLowerCase()) ||
        (item.termEn && item.termEn.toLowerCase().includes(search.toLowerCase())) ||
        item.shortDesc.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-bold text-slate-100">Энциклопедия терминов связи и Wi-Fi</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">Профессиональный справочник инженера интернет-провайдера</p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Поиск термина (RSSI, DFS, QAM)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {categories.map(cat => {
            const count = cat === 'Все' 
              ? TERMS_KNOWLEDGE.length 
              : TERMS_KNOWLEDGE.filter(t => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25'
                    : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === cat ? 'bg-white/25 text-white' : 'bg-slate-700 text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTerms.map(item => (
          <div
            key={item.id}
            onClick={() => setActiveModalTerm(item)}
            className="p-5 rounded-2xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col justify-between group space-y-3"
          >
            <div>
              <div className="flex items-center justify-between text-[11px] text-cyan-400 font-semibold mb-1">
                <span>{item.category}</span>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-sm text-slate-100 group-hover:text-cyan-300 transition-colors">
                {item.term}
              </h3>
              {item.termEn && (
                <div className="text-[11px] text-slate-500 font-mono">
                  {item.termEn}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                {item.shortDesc}
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-400 font-mono"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <TermExplainerModal
        term={activeModalTerm}
        onClose={() => setActiveModalTerm(null)}
      />
    </div>
  );
};
