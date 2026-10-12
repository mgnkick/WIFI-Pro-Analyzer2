import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  Network, 
  Activity, 
  Lightbulb, 
  BookOpen, 
  FileText, 
  Sun, 
  Moon, 
  Heart, 
  Smartphone, 
  Router, 
  Wrench, 
  ShieldAlert 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type ActiveTab = 'analyzer' | 'scanner' | 'speedtest' | 'recommendations' | 'report' | 'knowledge';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenDonate: () => void;
  onOpenApkModal: () => void;
  onOpenRouterWeb: () => void;
  connectedSsid?: string;
  connectedSignalDbm?: number;
  isWifiConnected?: boolean;
  isCellular?: boolean;
  isVpn?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenDonate,
  onOpenApkModal,
  onOpenRouterWeb,
  connectedSsid,
  isWifiConnected = true,
  isCellular = false,
  isVpn = false,
}) => {
  const { theme, toggleTheme } = useTheme();

  const navItems: { id: ActiveTab; label: string; mobileLabel: string; icon: React.ReactNode }[] = [
    { id: 'analyzer', label: 'Wi-Fi Эфир', mobileLabel: 'Эфир', icon: <Wifi className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" /> },
    { id: 'scanner', label: 'LAN Сканер', mobileLabel: 'LAN', icon: <Network className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" /> },
    { id: 'speedtest', label: 'Спидтест', mobileLabel: 'Скорость', icon: <Activity className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" /> },
    { id: 'recommendations', label: 'Аудит', mobileLabel: 'Аудит', icon: <Lightbulb className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" /> },
    { id: 'report', label: 'Отчет ISP', mobileLabel: 'Отчет', icon: <FileText className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" /> },
    { id: 'knowledge', label: 'База Знаний', mobileLabel: 'База', icon: <BookOpen className="w-3.5 h-3.5 xs:w-4 xs:h-4 shrink-0" /> },
  ];

  return (
    <>
      <header 
        style={{
          paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 24px), 38px)',
        }}
        className="sticky top-0 z-40 bg-slate-900/98 backdrop-blur-md border-b border-slate-800 text-slate-100 transition-colors w-full max-w-full overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-2 sm:px-6">
          <div className="flex items-center justify-between min-h-[50px] sm:min-h-[60px] py-1 gap-1.5 w-full max-w-full overflow-hidden">
            
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <div className={`relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-white shadow-md shrink-0 ${
                !isWifiConnected 
                  ? (isCellular ? 'bg-amber-600 shadow-amber-600/30' : 'bg-slate-800 shadow-slate-900')
                  : 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-cyan-500/25'
              }`}>
                {!isWifiConnected ? (
                  isCellular ? <Smartphone className="w-4 h-4 sm:w-6 sm:h-6 text-white" /> : <WifiOff className="w-4 h-4 sm:w-6 sm:h-6 text-rose-300" />
                ) : (
                  <Wifi className="w-4 h-4 sm:w-6 sm:h-6" />
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 border-2 border-slate-900 rounded-full ${
                  !isWifiConnected 
                    ? (isCellular ? 'bg-amber-400 animate-ping' : 'bg-rose-500')
                    : 'bg-emerald-400'
                }`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xs sm:text-base tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent truncate">
                    WiFi Expert
                  </span>
                  <span className="px-1 py-0.2 text-[8px] sm:text-[9px] font-bold uppercase rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-0.5 shrink-0">
                    <Wrench className="w-2 h-2" />
                    <span className="hidden xs:inline">PRO</span>
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[240px]">
                  {!isWifiConnected ? (
                    isCellular ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>Мобильная сеть 4G/LTE</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 font-medium">Wi-Fi отключен</span>
                    )
                  ) : (
                    <span className="text-slate-400 font-mono truncate">
                      {connectedSsid ? `${connectedSsid}` : 'Wi-Fi активен'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map(item => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/25 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <button
                onClick={onOpenRouterWeb}
                title="Открыть веб-интерфейс роутера (192.168.1.1)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 hover:text-indigo-200 transition-all cursor-pointer whitespace-nowrap"
              >
                <Router className="w-4 h-4 text-indigo-400" />
                <span>Роутер (Web UI)</span>
              </button>
            </nav>

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {isCellular && (
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] sm:text-[10px] font-bold animate-pulse shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>4G</span>
                </div>
              )}
              {isVpn && (
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[9px] sm:text-[10px] font-bold animate-pulse shadow-sm">
                  <ShieldAlert className="w-3 h-3 text-indigo-400" />
                  <span>VPN</span>
                </div>
              )}
              <button
                onClick={onOpenDonate}
                title="Поддержать автора (Сбербанк)"
                className="flex items-center gap-1 px-1.5 py-1 xs:px-2.5 xs:py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer shrink-0"
              >
                <Heart className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400 shrink-0" />
                <span className="hidden xs:inline text-[10px] sm:text-[11px] font-bold">Донат</span>
              </button>
              <button
                onClick={onOpenApkModal}
                title="Сборка Android APK на GitHub"
                className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">APK</span>
              </button>
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Включить светлую тему' : 'Включить темную тему'}
                className="p-1 xs:p-1.5 sm:p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                aria-label="Сменить тему"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav 
        style={{
          paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 6px), 10px)'
        }}
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/98 backdrop-blur-2xl border-t border-slate-800/90 shadow-2xl px-1 py-1 min-h-[56px] grid grid-cols-7 gap-0.5 w-full max-w-full overflow-hidden select-none"
      >
        {navItems.map(item => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`min-w-0 py-1 px-0.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer touch-manipulation select-none active:scale-95 ${
                active
                  ? 'text-cyan-300 font-bold bg-slate-800/90 shadow-inner'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
              }`}
            >
              <div className={`p-1 rounded-lg transition-all flex items-center justify-center ${
                active 
                  ? 'bg-cyan-500/25 text-cyan-300 ring-1 ring-cyan-400/50 shadow-sm scale-105' 
                  : 'text-slate-300'
              }`}>
                {item.icon}
              </div>
              <span className={`text-[8.5px] xs:text-[9.5px] mt-0.5 tracking-tight leading-none text-center truncate w-full font-medium ${
                active ? 'text-cyan-300 font-bold' : 'text-slate-300'
              }`}>
                {item.mobileLabel}
              </span>
            </button>
          );
        })}
        <button
          onClick={onOpenRouterWeb}
          className="min-w-0 py-1 px-0.5 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer text-indigo-400 hover:text-indigo-200 touch-manipulation select-none active:scale-95 active:bg-indigo-950/60"
          title="Открыть роутер (192.168.1.1)"
        >
          <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center">
            <Router className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-indigo-400 shrink-0" />
          </div>
          <span className="text-[8.5px] xs:text-[9.5px] mt-0.5 tracking-tight leading-none font-bold text-center truncate w-full text-indigo-300">
            Роутер
          </span>
        </button>
      </nav>
    </>
  );
};
