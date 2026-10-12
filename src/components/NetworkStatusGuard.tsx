import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Smartphone, 
  ShieldAlert, 
  Settings, 
  RefreshCw, 
  X, 
  ExternalLink, 
  Info 
} from 'lucide-react';
import { Network, ConnectionStatus } from '@capacitor/network';
import { fetchIpAndIspInfo, checkVpnHeuristics } from '../services/networkTester';
import { androidSystem } from '../services/androidSystem';

interface NetworkStatusGuardProps {
  ispName?: string;
  hasConnectedWifi: boolean;
  onRefreshWifiScan: () => void;
  onConnectionStatusChange?: (status: { isWifiConnected: boolean; isCellular: boolean; isVpn: boolean }) => void;
}

export const NetworkStatusGuard: React.FC<NetworkStatusGuardProps> = ({
  ispName: initialIspName,
  hasConnectedWifi,
  onRefreshWifiScan,
  onConnectionStatusChange,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [connectionType, setConnectionType] = useState<'wifi' | 'cellular' | 'none' | 'unknown'>('unknown');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    isWifiConnected: boolean;
    isCellular: boolean;
    isVpn: boolean;
  }>({
    isWifiConnected: true,
    isCellular: false,
    isVpn: false,
  });

  const [netInfo, setNetInfo] = useState<{
    ip: string;
    isp: string;
    city?: string;
    org?: string;
    country?: string;
    countryCode?: string;
    isVpn: boolean;
    vpnReason?: string;
  }>({
    ip: '',
    isp: initialIspName || '',
    isVpn: false,
  });

  const [showWifiSettingsModal, setShowWifiSettingsModal] = useState<boolean>(false);
  const [showVpnSettingsModal, setShowVpnSettingsModal] = useState<boolean>(false);

  const checkNetworkStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      const status: ConnectionStatus = await Network.getStatus();
      const online = Boolean(status.connected || navigator.onLine);
      const type = (status.connectionType || 'unknown') as 'wifi' | 'cellular' | 'none' | 'unknown';
      
      setIsOnline(online);
      setConnectionType(type);

      const info = await fetchIpAndIspInfo();
      const vpnCheck = checkVpnHeuristics(info);
      const isVpnDetected = Boolean(info.isVpn || vpnCheck.vpnDetected);
      const vpnReason = info.vpnReason || vpnCheck.reason;

      let wifiConnected = false;
      let isCellularActive = false;

      if (!online) {
        wifiConnected = false;
        isCellularActive = false;
      } else if (hasConnectedWifi || type === 'wifi') {
        wifiConnected = true;
        isCellularActive = false;
      } else if (type === 'cellular') {
        const gateway = await androidSystem.probeLocalGateway();
        const localIp = await androidSystem.getLocalLanIp();
        if (gateway || localIp || hasConnectedWifi) {
          wifiConnected = true;
          isCellularActive = false;
        } else {
          wifiConnected = false;
          isCellularActive = true;
        }
      } else {
        wifiConnected = true;
        isCellularActive = false;
      }

      setNetInfo({
        ip: info.ip,
        isp: info.isp || 'Провайдер',
        city: info.city,
        org: info.org,
        country: info.country,
        countryCode: info.countryCode,
        isVpn: isVpnDetected,
        vpnReason,
      });

      const nextStatus = {
        isWifiConnected: wifiConnected,
        isCellular: isCellularActive,
        isVpn: isVpnDetected,
      };
      setConnectionStatus(nextStatus);
      onConnectionStatusChange?.(nextStatus);
    } catch {
      const online = navigator.onLine;
      const navConn = (navigator as any).connection;
      const isCell = navConn?.type === 'cellular';
      setIsOnline(online);
      setConnectionType(isCell ? 'cellular' : (online ? 'wifi' : 'none'));
      const fallbackStatus = {
        isWifiConnected: online && !isCell,
        isCellular: Boolean(online && isCell),
        isVpn: false,
      };
      setConnectionStatus(fallbackStatus);
      onConnectionStatusChange?.(fallbackStatus);
    } finally {
      setIsChecking(false);
    }
  }, [hasConnectedWifi, onConnectionStatusChange]);

  useEffect(() => {
    checkNetworkStatus();
    const handler = Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
      setIsOnline(status.connected);
      setConnectionType(status.connectionType as any);
      checkNetworkStatus();
    });

    const handleOnline = () => checkNetworkStatus();
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionType('none');
      const offStatus = {
        isWifiConnected: false,
        isCellular: false,
        isVpn: false,
      };
      setConnectionStatus(offStatus);
      onConnectionStatusChange?.(offStatus);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubSettings = androidSystem.onSettingsRequested(type => {
      if (type === 'wifi') setShowWifiSettingsModal(true);
      if (type === 'vpn') setShowVpnSettingsModal(true);
    });

    return () => {
      handler.then(h => h.remove?.());
      unsubSettings();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkNetworkStatus, onConnectionStatusChange]);

  const handleOpenWifiSettings = () => {
    setShowWifiSettingsModal(true);
    androidSystem.openWifiSettings();
  };

  const handleOpenVpnSettings = () => {
    setShowVpnSettingsModal(true);
    androidSystem.openVpnSettings();
  };

  const handleRefreshAll = () => {
    checkNetworkStatus();
    onRefreshWifiScan();
  };

  const isWifiConnected = connectionStatus.isWifiConnected;
  const isCellularActive = connectionStatus.isCellular;
  const isVpnActive = connectionStatus.isVpn;

  return (
    <div className="space-y-3 w-full">
      {isWifiConnected && isOnline && (
        <div className="rounded-2xl p-3.5 sm:p-4 bg-slate-900/90 border border-emerald-500/40 shadow-lg text-slate-200 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <Wifi className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Wi-Fi подключен и активен</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30">
                    Broadband OK
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap font-mono">
                  <span>Провайдер: <strong className="text-slate-200">{netInfo.isp || initialIspName || 'Интернет'}</strong></span>
                  {netInfo.ip && <span>Внешний IP: <strong className="text-slate-200">{netInfo.ip}</strong></span>}
                  {netInfo.city && <span>Город: <strong className="text-slate-200">{netInfo.city}</strong></span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                onClick={handleRefreshAll}
                disabled={isChecking}
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Обновить статус"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
                <span>Обновить</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isWifiConnected && isCellularActive && isOnline && (
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-amber-950/85 via-orange-950/60 to-amber-950/85 border-2 border-amber-400/90 shadow-2xl shadow-amber-950/40 text-amber-100 animate-in fade-in ring-2 ring-amber-400/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/25 text-amber-300 border border-amber-400/50 shrink-0 shadow-lg shadow-amber-500/20 relative">
                <Smartphone className="w-6 h-6 text-amber-300" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm sm:text-base text-amber-200 tracking-wide uppercase">
                    Активна мобильная сеть (Wi-Fi отключен)
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black uppercase tracking-wider shadow-sm">
                    4G / LTE
                  </span>
                </div>
                <p className="text-xs text-amber-200/90 leading-relaxed max-w-2xl font-medium">
                  Смартфон использует мобильный интернет ({netInfo.isp || 'Мобильный оператор'}). Для анализа беспроводного эфира, пингов шлюза и сканирования LAN необходимо подключиться к домашнему Wi-Fi роутеру.
                </p>
                <div className="text-[11px] text-amber-300 font-semibold pt-0.5 flex items-center gap-1.5">
                  <span>Нажмите кнопку ниже, чтобы открыть настройки Wi-Fi в Android.</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0 shrink-0">
              <a
                href={androidSystem.getWifiSettingsIntentUrl()}
                onClick={handleOpenWifiSettings}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-400/30 transition-all cursor-pointer active:scale-95"
              >
                <Wifi className="w-4 h-4" />
                <span>Открыть Wi-Fi</span>
              </a>
              <button
                onClick={handleRefreshAll}
                disabled={isChecking}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-amber-400/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Проверить снова"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-cyan-400' : 'text-slate-300'}`} />
                <span>Проверить</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isOnline && (
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-rose-950/85 via-rose-900/65 to-rose-950/85 border-2 border-rose-500/80 shadow-2xl shadow-rose-950/50 text-rose-100 animate-in fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-rose-500/30 text-rose-300 border border-rose-400/50 shrink-0 shadow-lg shadow-rose-500/20">
                <WifiOff className="w-6 h-6 text-rose-300 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm sm:text-base text-white tracking-wide uppercase">
                    Отсутствует подключение к сети
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-bold uppercase tracking-wider shadow-sm">
                    Оффлайн
                  </span>
                </div>
                <p className="text-xs text-rose-200 leading-relaxed max-w-2xl font-medium">
                  Интернет-соединение не обнаружено. Проверьте кабель провайдера или включите Wi-Fi.
                </p>
                <div className="text-[11px] text-rose-300 font-semibold pt-0.5 flex items-center gap-1.5">
                  <span>Перейдите в настройки Android для подключения к Wi-Fi.</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0 shrink-0">
              <a
                href={androidSystem.getWifiSettingsIntentUrl()}
                onClick={handleOpenWifiSettings}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 transition-all cursor-pointer active:scale-95"
              >
                <Settings className="w-4 h-4" />
                <span>Открыть Wi-Fi</span>
              </a>
              <button
                onClick={handleRefreshAll}
                disabled={isChecking}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-rose-500/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Обновить"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-cyan-400' : 'text-slate-300'}`} />
                <span>Обновить</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isVpnActive && (
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-indigo-950/90 via-violet-950/70 to-indigo-950/90 border-2 border-indigo-400/90 shadow-2xl shadow-indigo-950/50 text-indigo-100 animate-in fade-in ring-2 ring-indigo-400/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-2xl bg-indigo-500/30 text-indigo-300 border border-indigo-400/50 shrink-0 shadow-lg shadow-indigo-500/20">
                <ShieldAlert className="w-6 h-6 text-indigo-300 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm sm:text-base text-white tracking-wide uppercase">
                    Активно VPN-соединение (Прокси / Туннель)
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500 text-white font-bold uppercase tracking-wider shadow-sm">
                    {netInfo.country || 'VPN'}
                  </span>
                </div>
                <p className="text-xs text-indigo-200 leading-relaxed max-w-2xl font-medium">
                  {netInfo.vpnReason || 'Обнаружен активный VPN-туннель.'} Пинги до внешних узлов и скорость спидтеста могут идти через удаленный узел VPN.
                </p>
                {netInfo.ip && (
                  <div className="text-[11px] text-indigo-300 font-mono font-medium">
                    Внешний IP VPN: <span className="font-bold text-white bg-slate-900/80 px-1.5 py-0.5 rounded border border-indigo-500/40">{netInfo.ip}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto pt-1 sm:pt-0 shrink-0">
              <a
                href={androidSystem.getVpnSettingsIntentUrl()}
                onClick={handleOpenVpnSettings}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transition-all cursor-pointer active:scale-95"
              >
                <Settings className="w-4 h-4" />
                <span>Настройки VPN</span>
              </a>
              <button
                onClick={handleRefreshAll}
                disabled={isChecking}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-indigo-500/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Проверить"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-cyan-400' : 'text-slate-300'}`} />
                <span>Обновить</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showWifiSettingsModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowWifiSettingsModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-100">
                    Настройки Wi-Fi в Android
                  </h3>
                  <div className="text-xs text-slate-400">Справка для подключения</div>
                </div>
              </div>
              <button
                onClick={() => setShowWifiSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs text-slate-300">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-cyan-400" />
                <span>Инструкция (в 1 тап):</span>
              </div>
              <ol className="space-y-2 list-decimal list-inside text-slate-300 pl-1">
                <li>Нажмите кнопку ниже для перехода в настройки Android.</li>
                <li>Выберите вашу сеть <code className="text-cyan-300 bg-slate-800 px-1 py-0.5 rounded font-bold">Wi-Fi</code> и введите пароль.</li>
                <li>Вернитесь обратно в приложение WiFi Expert.</li>
              </ol>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={androidSystem.getWifiSettingsIntentUrl()}
                onClick={() => {
                  androidSystem.openWifiSettings();
                }}
                className="w-full py-3 px-3 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center gap-2 shadow-md shadow-cyan-500/25 transition-all cursor-pointer select-none active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Открыть Wi-Fi в Android</span>
              </a>
              <button
                onClick={() => {
                  setShowWifiSettingsModal(false);
                  handleRefreshAll();
                }}
                className="w-full py-3 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4 text-white" />
                <span>Я подключился, обновить статус</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showVpnSettingsModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowVpnSettingsModal(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-100">
                    Управление VPN в Android
                  </h3>
                  <div className="text-xs text-slate-400">Настройки туннелей</div>
                </div>
              </div>
              <button
                onClick={() => setShowVpnSettingsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs text-slate-300">
              <p>
                Если у вас запущен VPN (WireGuard, VLESS, Outline, OpenVPN, WARP и др.), вы можете отключить его в настройках Android для проверки прямого соединения с провайдером.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href={androidSystem.getVpnSettingsIntentUrl()}
                onClick={() => {
                  androidSystem.openVpnSettings();
                }}
                className="w-full py-3 px-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-all cursor-pointer select-none active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Открыть настройки VPN</span>
              </a>
              <button
                onClick={() => {
                  setShowVpnSettingsModal(false);
                  handleRefreshAll();
                }}
                className="w-full py-3 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4 text-white" />
                <span>Проверить снова</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
