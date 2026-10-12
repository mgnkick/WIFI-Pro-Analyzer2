import React, { useState } from 'react';
import { X, Heart, Copy, Check, CreditCard, ExternalLink, Send, Mail } from 'lucide-react';

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DonateModal: React.FC<DonateModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const cardNumber = '5336690304351846';
  const formattedCard = '5336 6903 0435 1846';

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(cardNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
              <Heart className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-1.5">
                <span>Поддержать автора</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">Сбербанк</span>
              </h3>
              <p className="text-xs text-slate-400">Благодарность за развитие проекта</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
          <p className="text-sm font-medium text-slate-200">Спасибо за использование WiFi Expert!</p>
          <p className="text-xs text-slate-400 mt-1">Вы можете поддержать автора переводом на карту Сбербанка:</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-5 text-white shadow-xl shadow-emerald-950/40 border border-emerald-400/30 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xs tracking-tighter">СБЕР</div>
              <span className="font-extrabold text-sm tracking-wide text-white drop-shadow">Сбербанк</span>
            </div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100 bg-white/15 px-2 py-0.5 rounded-md">RUB</div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="w-8 h-6 rounded bg-amber-200/90 border border-amber-300 shadow-inner flex items-center justify-center">
              <div className="w-6 h-4 border border-amber-400/80 rounded-sm opacity-60" />
            </div>
            <CreditCard className="w-4 h-4 text-emerald-100/70" />
          </div>

          <div>
            <div className="text-[10px] text-emerald-200 uppercase tracking-wider font-medium">Номер карты</div>
            <div className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-white mt-0.5 select-all drop-shadow">
              {formattedCard}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/15 text-[11px] text-emerald-100">
            <span>Получатель: ПЕРЕВОД ПО НОМЕРУ</span>
            <span className="font-bold tracking-wide">МИР / Visa / MC</span>
          </div>
        </div>

        {/* Author Contacts Block */}
        <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-xs space-y-2 text-slate-300">
          <div className="font-semibold text-slate-200">Контакты разработчика:</div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-cyan-400" />
              <span>Telegram:</span>
            </span>
            <a href="https://t.me/mgnkick" target="_blank" rel="noopener noreferrer" className="font-mono font-bold text-cyan-400 hover:underline">
              @mgnkick
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>Email:</span>
            </span>
            <a href="mailto:mgn.kick@gmail.com" className="font-mono text-cyan-300 hover:underline">
              mgn.kick@gmail.com
            </a>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleCopy}
            className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              copied
                ? 'bg-emerald-500 text-white shadow-emerald-500/25'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25 active:scale-[0.99]'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Номер скопирован! (5336 6903 0435 1846)</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Копировать номер карты</span>
              </>
            )}
          </button>
          
          <a
            href="https://online.sberbank.ru"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-3 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Открыть СберБанк Онлайн</span>
          </a>
        </div>
      </div>
    </div>
  );
};
