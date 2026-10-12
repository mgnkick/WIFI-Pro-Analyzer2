import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  CheckCircle2, 
  Copy, 
  Check, 
  GitBranch 
} from 'lucide-react';

interface WifiAccuracyDisclaimerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WifiAccuracyDisclaimer: React.FC<WifiAccuracyDisclaimerProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const workflowCode = `# Сборка APK через GitHub Actions:
# 1. Запушьте код в свой репозиторий GitHub
# 2. Перейдите во вкладку 'Actions' -> 'Сборка Android APK (WiFi Expert)'
# 3. Нажмите 'Run workflow' -> дождитесь окончания сборки
# 4. Скачайте готовый APK из раздела Artifacts: WiFiExpert-Android-Debug.apk`;

  const handleCopyInstructions = () => {
    navigator.clipboard.writeText(workflowCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div 
        className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>Сборка Android APK на GitHub</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">CI/CD Ready</span>
              </h3>
              <p className="text-xs text-slate-400">Автоматическая компиляция .apk через GitHub Actions</p>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-slate-200">GitHub Actions CI/CD</div>
              <div className="text-[11px] text-slate-400 font-mono">.github/workflows/build-apk.yml</div>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-slate-200">Capacitor Android Config</div>
              <div className="text-[11px] text-slate-400 font-mono">capacitor.config.json</div>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-xs text-slate-300">
          <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
            <span>Инструкция по получению APK через GitHub:</span>
          </h4>
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
              <div>
                <strong className="text-slate-100">Создайте репозиторий на GitHub</strong>
                <p className="text-slate-400 text-[11px] mt-0.5">Загрузите данный проект со всеми файлами Capacitor и конфигурацией.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
              <div>
                <strong className="text-slate-100">Запустите сборку</strong>
                <p className="text-slate-400 text-[11px] mt-0.5">После push в ветку main перейдите во вкладку <code className="text-cyan-300">Actions</code> и нажмите <code className="text-cyan-300">Run workflow</code>.</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
              <div>
                <strong className="text-slate-100">Скачайте готовый APK</strong>
                <p className="text-slate-400 text-[11px] mt-0.5">Из секции Artifacts загрузите <code className="text-emerald-400 font-mono">WiFiExpert-Android-Debug.zip</code> и установите APK на свой телефон.</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Локальная сборка в терминале:</span>
              <button
                onClick={handleCopyInstructions}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
              </button>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1 select-all">
              <div className="text-slate-500"># Сборка веб и синхронизация Capacitor:</div>
              <div>npm run build && npx cap sync android</div>
              <div className="text-slate-500 pt-1"># Открытие в Android Studio:</div>
              <div>npx cap open android</div>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25 hover:opacity-95 transition-all cursor-pointer"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};
