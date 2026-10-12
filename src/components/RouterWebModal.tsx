import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Router, 
  Copy, 
  Check, 
  Globe, 
  ShieldAlert, 
  KeyRound 
} from 'lucide-react';

interface RouterWebModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultGateway?: string;
  isWifiConnected?: boolean;
}

const COMMON_GATEWAYS = [
  { ip: '192.168.1.1', desc: 'Keenetic, ASUS, Zyxel' },
  { ip: '192.168.0.1', desc: 'TP-Link, D-Link, Mercusys' },
  { ip: '192.168.31.1', desc: 'Xiaomi, Redmi' },
  { ip: '192.168.8.1', desc: 'Huawei, 4G-модемы' },
  { ip: '10.0.0.1', desc: 'MikroTik, провайдеры' },
];

export const RouterWebModal: React.FC<RouterWebModalProps> = ({
  isOpen,
  onClose,
  defaultGateway = '192.168.1.1',
  isWifiConnected = true,
}) => {
  const [gatewayIp, setGatewayIp] = useState<string>(() => {
    return localStorage.getItem('wifi-expert-gateway-ip') || defaultGateway;
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem('wifi-expert-gateway-ip', gatewayIp);
  }, [gatewayIp]);

  if (!isOpen) return null;

  const targetUrl = `http://${gatewayIp.trim()}`;

  const handleCopyIp = () => {
    navigator.clipboard.writeText(gatewayIp.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectOpen = () => {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
              <Router className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <span>Веб-интерфейс роутера</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">1-Click Web UI</span>
              </h3>
              <p className="text-xs text-slate-400">Быстрый переход к панели управления шлюзом</p>
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

        {!isWifiConnected && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-200">Внимание: Wi-Fi не подключен!</strong>
              <p className="mt-0.5 text-amber-300/90 leading-relaxed">
                Доступ к панели роутера ({gatewayIp}) возможен только при активном подключении к домашней Wi-Fi сети.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-300">
            IP-адрес шлюза (роутера)
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Globe className="w-4 h-4 text-cyan-400" />
              </div>
              <input
                type="text"
                value={gatewayIp}
                onChange={e => setGatewayIp(e.target.value)}
                placeholder="192.168.1.1"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={handleCopyIp}
              title="Копировать IP"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] text-slate-400">Популярные шлюзы:</div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_GATEWAYS.map(item => (
                <button
                  key={item.ip}
                  onClick={() => setGatewayIp(item.ip)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                    gatewayIp === item.ip
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-700/80'
                  }`}
                  title={item.desc}
                >
                  <span>{item.ip}</span>
                  <span className="text-[10px] ml-1 opacity-60 font-sans">({item.desc.split(',')[0]})</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              handleDirectOpen();
            }}
            className="w-full py-3.5 px-4 rounded-2xl text-sm font-bold bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Открыть панель роутера ({targetUrl})</span>
          </a>
          <p className="text-[11px] text-center text-slate-400">Откроется в новой вкладке браузера</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1.5 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
            <span>Стандартные доступы:</span>
          </div>
          <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
            <li>Логин / Пароль: <strong className="text-slate-200 font-mono">admin / admin</strong> или <strong className="text-slate-200 font-mono">admin / 1234</strong></li>
            <li>Указаны на стикере на нижней крышке роутера.</li>
          </ul>
        </div>

        <div className="text-center pt-1">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-1"
          >
            Закрыть окно
          </button>
        </div>
      </div>
    </div>
  );
};
