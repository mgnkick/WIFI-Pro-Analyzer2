import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Radio, 
  Volume2, 
  VolumeX, 
  Search, 
  Star, 
  CheckCircle2, 
  Info, 
  Layers, 
  Repeat, 
  Router, 
  Share2, 
  Copy, 
  Check, 
  Settings, 
  RefreshCw, 
  ExternalLink,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { WifiNetwork, WifiBand } from '../types/wifi';
import { SignalValue } from './SignalValue';
import { getSignalStatus, playSignalBeep } from '../utils/signalQuality';
import { analyzeChannels, NON_OVERLAPPING_2_4GHZ } from '../utils/channelAdvice';
import { groupNetworksBySsid, classifyWifiNetworks } from '../utils/meshDetector';
import { wifiScanner } from '../services/wifiScan';
import { androidSystem } from '../services/androidSystem';

interface WifiAnalyzerViewProps {
  networks: WifiNetwork[];
  onNavigateToRouter?: (band: WifiBand) => void;
  isCellular?: boolean;
}

type AnalyzerBand = 'all' | '2.4GHz' | '5GHz' | '6GHz';

export const WifiAnalyzerView: React.FC<WifiAnalyzerViewProps> = ({ 
  networks,
  onNavigateToRouter,
  isCellular = false,
}) => {
  const [selectedBand, setSelectedBand] = useState<AnalyzerBand>('all');
  const [spectrumBand, setSpectrumBand] = useState<WifiBand>('2.4GHz');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSecurity, setFilterSecurity] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'signal' | 'channel' | 'ssid'>('signal');
  const [viewMode, setViewMode] = useState<'ssid' | 'bssid'>('ssid');
  const [expandedSsids, setExpandedSsids] = useState<Set<string>>(new Set());
  const [hoveredNetwork, setHoveredNetwork] = useState<WifiNetwork | null>(null);
  const [copiedBssid, setCopiedBssid] = useState<string | null>(null);

  const handleConnectNetwork = (ssid: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      navigator.clipboard.writeText(ssid);
    } catch {}
    androidSystem.openWifiSettings();
  };

  const handleCopyBssid = (bssid: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard?.writeText(bssid);
    setCopiedBssid(bssid);
    setTimeout(() => {
      setCopiedBssid(prev => prev === bssid ? null : prev);
    }, 1800);
  };

  const toggleSsidExpand = (ssid: string) => {
    setExpandedSsids(prev => {
      const next = new Set(prev);
      if (next.has(ssid)) next.delete(ssid);
      else next.add(ssid);
      return next;
    });
  };

  const connectedNet = networks.find(n => n.isConnected) || networks[0];
  const [signalHistory, setSignalHistory] = useState<number[]>([]);
  const lastLevelRef = useRef<number>(connectedNet ? connectedNet.level : -60);

  useEffect(() => {
    if (connectedNet) {
      lastLevelRef.current = connectedNet.level;
      setSignalHistory(prev => {
        const next = [...prev, connectedNet.level];
        if (next.length > 25) next.shift();
        return next;
      });
      if (soundEnabled) {
        playSignalBeep(connectedNet.level);
      }
    }
  }, [networks, connectedNet, soundEnabled]);

  const classifiedAllNetworks = useMemo(() => {
    return classifyWifiNetworks(networks);
  }, [networks]);

  const bandNetworks = useMemo(() => {
    if (selectedBand === 'all') return classifiedAllNetworks;
    return classifiedAllNetworks.filter(n => n.band === selectedBand);
  }, [classifiedAllNetworks, selectedBand]);

  const activeSpectrumBand: WifiBand = selectedBand === 'all' 
    ? spectrumBand 
    : (selectedBand === '6GHz' ? '2.4GHz' : selectedBand);

  const spectrumNetworks = useMemo(() => {
    return classifiedAllNetworks.filter(n => n.band === activeSpectrumBand);
  }, [classifiedAllNetworks, activeSpectrumBand]);

  const filteredNetworks = useMemo(() => {
    let result = bandNetworks.filter(n => {
      const matchesSearch = n.ssid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.bssid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.vendor && n.vendor.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSecurity = filterSecurity === 'all' || 
        (filterSecurity === 'open' && n.securityType === 'Open') ||
        (filterSecurity === 'wpa2' && n.securityType === 'WPA2');
      const matchesRole = filterRole === 'all' ||
        (filterRole === 'mesh' && n.deviceRole === 'mesh') ||
        (filterRole === 'router_with_ap' && n.deviceRole === 'router_with_ap') ||
        (filterRole === 'repeater' && n.deviceRole === 'repeater') ||
        (filterRole === 'dual_band' && n.deviceRole === 'dual_band') ||
        (filterRole === 'standalone' && n.deviceRole === 'standalone');
      return matchesSearch && matchesSecurity && matchesRole;
    });
    result.sort((a, b) => {
      if (sortBy === 'signal') return b.level - a.level;
      if (sortBy === 'channel') return a.channel - b.channel;
      return a.ssid.localeCompare(b.ssid);
    });
    return result;
  }, [bandNetworks, searchQuery, filterSecurity, filterRole, sortBy]);

  const filteredSsidGroups = useMemo(() => {
    const sourceNets = selectedBand === 'all' 
      ? classifiedAllNetworks 
      : classifiedAllNetworks.filter(n => n.band === selectedBand);
    const allFiltered = sourceNets.filter(n => {
      const matchesSearch = n.ssid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.bssid.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.vendor && n.vendor.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesSecurity = filterSecurity === 'all' || 
        (filterSecurity === 'open' && n.securityType === 'Open') ||
        (filterSecurity === 'wpa2' && n.securityType === 'WPA2');
      const matchesRole = filterRole === 'all' ||
        (filterRole === 'mesh' && n.deviceRole === 'mesh') ||
        (filterRole === 'router_with_ap' && n.deviceRole === 'router_with_ap') ||
        (filterRole === 'repeater' && n.deviceRole === 'repeater') ||
        (filterRole === 'dual_band' && n.deviceRole === 'dual_band') ||
        (filterRole === 'standalone' && n.deviceRole === 'standalone');
      return matchesSearch && matchesSecurity && matchesRole;
    });
    return groupNetworksBySsid(allFiltered);
  }, [classifiedAllNetworks, selectedBand, searchQuery, filterSecurity, filterRole]);

  const channelRatings = useMemo(() => {
    return analyzeChannels(networks, activeSpectrumBand);
  }, [networks, activeSpectrumBand]);

  const recommendedChannel = channelRatings.find(r => r.isRecommended);

  const svgWidth = 840;
  const svgHeight = 260;
  const paddingX = 45;
  const paddingBottom = 40;
  const paddingTop = 25;
  const minDbm = -100;
  const maxDbm = -30;

  const channelPositions = useMemo(() => {
    const list = channelRatings.map(r => r.channel);
    const minCh = Math.min(...list);
    const maxCh = Math.max(...list);
    const range = maxCh - minCh || 1;
    const map = new Map<number, number>();
    list.forEach(ch => {
      const x = paddingX + ((ch - minCh) / range) * (svgWidth - 2 * paddingX);
      map.set(ch, x);
    });
    return { map, minCh, maxCh };
  }, [channelRatings]);

  const dbmToY = (dbm: number) => {
    const clamped = Math.max(minDbm, Math.min(maxDbm, dbm));
    const ratio = (clamped - minDbm) / (maxDbm - minDbm);
    return (svgHeight - paddingBottom) - ratio * (svgHeight - paddingBottom - paddingTop);
  };

  const networkColors = [
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', 
    '#10b981', '#eab308', '#14b8a6', '#6366f1', '#f43f5e',
  ];

  if (networks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900/95 border-2 border-slate-800 rounded-3xl p-6 sm:p-10 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-slate-300 flex items-center justify-center mx-auto shadow-inner">
            <WifiOff className="w-8 h-8 text-rose-400 animate-pulse" />
          </div>
          
          <div className="space-y-2 max-w-lg mx-auto">
            <h3 className="text-lg sm:text-xl font-bold text-slate-100">
              Wi-Fi сети не обнаружены
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Для сканирования радиоэфира в Android требуется включить геолокацию (GPS) и разрешение на доступ к местоположению.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 max-w-md mx-auto text-left space-y-2.5 text-xs text-slate-300">
            <div className="font-bold text-slate-100 flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <span>Требования Android:</span>
            </div>
            <ul className="space-y-2 text-slate-300 pl-1">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                <span><strong className="text-white">Разрешение:</strong> Предоставьте приложению права <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded font-mono">ACCESS_FINE_LOCATION</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                <span><strong className="text-white">GPS:</strong> Включите службу геолокации в шторке Android.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                <span><strong className="text-white">Wi-Fi адаптер:</strong> Убедитесь, что модуль Wi-Fi включен.</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md mx-auto pt-1">
            <a
              href={androidSystem.getWifiSettingsIntentUrl()}
              onClick={() => {
                androidSystem.openWifiSettings();
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Settings className="w-4 h-4" />
              <span>Настройки Wi-Fi</span>
            </a>
            <a
              href={androidSystem.getLocationSettingsIntentUrl()}
              onClick={() => {
                androidSystem.openLocationSettings();
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-amber-400" />
              <span>Настройки GPS</span>
            </a>
            <button
              onClick={() => {
                wifiScanner.triggerScan();
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              <span>Обновить сканер</span>
            </button>
          </div>

          {isCellular && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold animate-pulse shadow-lg shadow-amber-500/10">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400 animate-ping" />
              <span>Мобильная сеть (4G / 5G / LTE) активна</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 dark:bg-slate-900/80 p-3 sm:p-4 rounded-2xl border border-slate-800 backdrop-blur-sm w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-1 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60 overflow-x-auto scrollbar-none max-w-full min-w-0">
          {(['all', '2.4GHz', '5GHz', '6GHz'] as (AnalyzerBand)[]).map(band => (
            <button
              key={band}
              onClick={() => setSelectedBand(band)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                selectedBand === band
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {band === 'all' ? 'Все диапазоны' : band}
              <span className="ml-1 opacity-75 text-[10px]">
                ({band === 'all' ? networks.length : networks.filter(n => n.band === band).length})
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 shrink-0">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700/80'
            }`}
            title="Звуковой локатор уровня сигнала"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            <span>Звуковой поиск {soundEnabled ? 'ВКЛ' : 'ВЫКЛ'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-slate-900/70 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Текущая сеть Wi-Fi</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">Live</span>
            </div>
            
            <div className="mt-3 flex items-center gap-2.5">
              <Wifi className="w-5 h-5 text-cyan-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-100 truncate text-base flex items-center gap-2">
                  <span className="truncate">{connectedNet ? connectedNet.ssid : 'Не подключено'}</span>
                  {connectedNet && (
                    <button
                      type="button"
                      onClick={() => {
                        const val = prompt('Введите имя (SSID):', connectedNet.ssid);
                        if (val && val.trim()) {
                          wifiScanner.updateConnectedSsid(val.trim());
                        }
                      }}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold underline shrink-0 cursor-pointer"
                      title="Изменить SSID"
                    >
                      [Изм. SSID]
                    </button>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-mono truncate flex items-center gap-1.5 mt-0.5">
                  <span>BSSID: {connectedNet ? connectedNet.bssid : 'N/A'}</span>
                  {connectedNet && (
                    <button
                      type="button"
                      onClick={(e) => handleCopyBssid(connectedNet.bssid, e)}
                      className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Копировать BSSID"
                    >
                      {copiedBssid === connectedNet.bssid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                  <span>Стандарт {connectedNet ? connectedNet.standard : ''}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="py-2 flex flex-col items-center justify-center">
            {connectedNet && (
              <div className="relative w-44 h-44 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#1e293b"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={getSignalStatus(connectedNet.level).color}
                    strokeWidth="8"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 * (1 - Math.max(0, Math.min(1, (connectedNet.level + 100) / 70)))}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black font-mono tracking-tight text-slate-100">
                    {connectedNet.level}
                  </span>
                  <span className="text-xs font-medium text-slate-400">dBm</span>
                  <span 
                    className="text-[11px] font-semibold mt-0.5 px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: `${getSignalStatus(connectedNet.level).color}20`,
                      color: getSignalStatus(connectedNet.level).color 
                    }}
                  >
                    {getSignalStatus(connectedNet.level).label}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Примерное расстояние:</span>
              <span className="font-semibold text-slate-200">
                ~ {connectedNet?.distanceMeters || 2.5} м от роутера
              </span>
            </div>
            <div className="h-8 flex items-end gap-1 px-1 bg-slate-950/60 rounded-lg p-1">
              {signalHistory.map((val, idx) => {
                const heightPct = Math.max(10, Math.min(100, ((val + 100) / 70) * 100));
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-cyan-500/80 hover:bg-cyan-400 rounded-t transition-all"
                    style={{ height: `${heightPct}%` }}
                    title={`${val} dBm`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-slate-900/70 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Анализ каналов ({selectedBand})
                </span>
              </div>
              {recommendedChannel && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Рекомендуемый: канал {recommendedChannel.channel}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {selectedBand === '2.4GHz' ? (
                <>В диапазоне 2.4 ГГц наименьшее число взаимных помех создают непересекающиеся каналы <strong>1, 6 и 11</strong>.</>
              ) : selectedBand === '5GHz' ? (
                <>В диапазоне 5 ГГц полосы 80/160 МГц эффективнее всего работают на каналах <strong>36–48</strong> (без DFS).</>
              ) : (
                <>Диапазон 6 ГГц (Wi-Fi 6E/7) предоставляет свободные широкие каналы без интерференции со старыми стандартами.</>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            {channelRatings.slice(0, 8).map(cr => (
              <div
                key={cr.channel}
                className={`p-3 rounded-xl border transition-all ${
                  cr.isRecommended
                    ? 'bg-emerald-500/10 border-emerald-500/40 shadow-sm shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                    : 'bg-slate-800/60 border-slate-700/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-100">
                    Канал {cr.channel}
                  </span>
                  {cr.isRecommended && (
                    <span className="text-[10px] font-bold text-emerald-400 uppercase">Лучший</span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 mt-1 text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${i < cr.stars ? 'fill-amber-400' : 'text-slate-600'}`}
                    />
                  ))}
                </div>
                <div className="text-[11px] text-slate-400 mt-2 truncate" title={cr.reason}>
                  {cr.networksCount === 0 ? 'Свободно' : `${cr.networksCount} сетей`}
                </div>
              </div>
            ))}
          </div>

          {recommendedChannel && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/40 to-indigo-950/40 border border-cyan-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-cyan-300">Совет инженера:</span>
                  <span className="text-slate-300 ml-1">
                    Установите фиксированный <strong>канал {recommendedChannel.channel}</strong> в настройках роутера для максимальной стабильности.
                  </span>
                </div>
              </div>
              {onNavigateToRouter && (
                <button
                  onClick={() => onNavigateToRouter(activeSpectrumBand)}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Router className="w-3.5 h-3.5" />
                  <span>Настроить роутер &rarr;</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900/80 p-3.5 sm:p-5 rounded-2xl border border-slate-800 space-y-3 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>Спектральный график каналов ({activeSpectrumBand})</span>
              </h3>
              {selectedBand === 'all' && (
                <div className="flex items-center gap-1 p-0.5 bg-slate-800 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSpectrumBand('2.4GHz')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      activeSpectrumBand === '2.4GHz' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2.4G
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpectrumBand('5GHz')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                      activeSpectrumBand === '5GHz' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    5G
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Уровень сигнала (dBm) и перекрытие частотных полос соседних точек</p>
          </div>
          {hoveredNetwork && (
            <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 font-mono flex items-center gap-2 flex-wrap">
              <span className="font-bold">{hoveredNetwork.ssid}</span>
              {hoveredNetwork.nodeLabel && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-cyan-500/20 text-cyan-200">
                  {hoveredNetwork.nodeLabel}
                </span>
              )}
              <span>Сигнал {hoveredNetwork.level} dBm • Кан. {hoveredNetwork.channel} ({hoveredNetwork.channelWidth} МГц)</span>
            </div>
          )}
        </div>

        <div className="w-full max-w-full min-w-0 overflow-x-auto scrollbar-none rounded-xl">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-[620px] sm:min-w-[680px] bg-slate-950/70 rounded-xl border border-slate-800/80 select-none"
          >
            {[-90, -80, -70, -60, -50, -40].map(dbm => {
              const y = dbmToY(dbm);
              return (
                <g key={dbm}>
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={svgWidth - paddingX}
                    y2={y}
                    stroke="#334155"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#64748b"
                    fontFamily="monospace"
                  >
                    {dbm}
                  </text>
                </g>
              );
            })}

            <rect x={paddingX} y={dbmToY(-55)} width={3} height={dbmToY(-95) - dbmToY(-55)} fill="#10b981" opacity="0.6" />
            <rect x={paddingX} y={dbmToY(-67)} width={3} height={dbmToY(-55) - dbmToY(-67)} fill="#06b6d4" opacity="0.6" />
            <rect x={paddingX} y={dbmToY(-75)} width={3} height={dbmToY(-67) - dbmToY(-75)} fill="#f59e0b" opacity="0.6" />
            <rect x={paddingX} y={dbmToY(-85)} width={3} height={dbmToY(-75) - dbmToY(-85)} fill="#ef4444" opacity="0.6" />

            {activeSpectrumBand === '2.4GHz' && NON_OVERLAPPING_2_4GHZ.map(ch => {
              const x = channelPositions.map.get(ch);
              if (x === undefined) return null;
              return (
                <rect
                  key={`nonov_${ch}`}
                  x={x - 22}
                  y={paddingTop}
                  width={44}
                  height={svgHeight - paddingBottom - paddingTop}
                  fill="#06b6d4"
                  fillOpacity="0.04"
                />
              );
            })}

            <line
              x1={paddingX}
              y1={svgHeight - paddingBottom}
              x2={svgWidth - paddingX}
              y2={svgHeight - paddingBottom}
              stroke="#475569"
              strokeWidth="1.5"
            />

            {channelRatings.map(cr => {
              const x = channelPositions.map.get(cr.channel);
              if (x === undefined) return null;
              const isNonOverlap = activeSpectrumBand === '2.4GHz' && NON_OVERLAPPING_2_4GHZ.includes(cr.channel);
              return (
                <g key={`tick_${cr.channel}`}>
                  <line
                    x1={x}
                    y1={svgHeight - paddingBottom}
                    x2={x}
                    y2={svgHeight - paddingBottom + 5}
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={svgHeight - paddingBottom + 17}
                    textAnchor="middle"
                    fontSize={isNonOverlap ? '11' : '10'}
                    fontWeight={isNonOverlap ? 'bold' : 'normal'}
                    fill={isNonOverlap ? '#38bdf8' : '#94a3b8'}
                  >
                    {cr.channel}
                  </text>
                  <text
                    x={x}
                    y={svgHeight - paddingBottom + 28}
                    textAnchor="middle"
                    fontSize="7"
                    fill="#64748b"
                    fontFamily="monospace"
                  >
                    {cr.frequency}
                  </text>
                </g>
              );
            })}

            {spectrumNetworks.map((net, idx) => {
              const centerX = channelPositions.map.get(net.channel);
              if (centerX === undefined) return null;
              const apexY = dbmToY(net.level);
              const baseY = svgHeight - paddingBottom;
              const color = networkColors[idx % networkColors.length];
              const widthRatio = net.channelWidth / 20;
              const halfWidthPx = (activeSpectrumBand === '2.4GHz' ? 36 : 28) * Math.sqrt(widthRatio);
              const leftX = centerX - halfWidthPx;
              const rightX = centerX + halfWidthPx;
              const pathD = `M ${leftX} ${baseY} Q ${centerX} ${apexY} ${rightX} ${baseY} Z`;
              const isConnected = net.isConnected;
              const isHovered = hoveredNetwork?.bssid === net.bssid;

              return (
                <g
                  key={net.bssid}
                  className="cursor-pointer transition-opacity"
                  opacity={hoveredNetwork ? (isHovered ? 1 : 0.25) : 0.85}
                  onMouseEnter={() => setHoveredNetwork(net)}
                  onMouseLeave={() => setHoveredNetwork(null)}
                >
                  <path
                    d={pathD}
                    fill={color}
                    fillOpacity={isConnected ? 0.35 : 0.18}
                  />
                  <path
                    d={`M ${leftX} ${baseY} Q ${centerX} ${apexY} ${rightX} ${baseY}`}
                    stroke={color}
                    strokeWidth={isConnected ? 3 : (isHovered ? 2.5 : 1.5)}
                    fill="none"
                  />
                  <g transform={`translate(${centerX}, ${Math.max(paddingTop + 10, apexY - 8)})`}>
                    <rect
                      x={-40}
                      y={-11}
                      width={80}
                      height={14}
                      rx={4}
                      fill="#0f172a"
                      fillOpacity={0.9}
                      stroke={color}
                      strokeWidth={isConnected ? 1.5 : 0.5}
                    />
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight={isConnected ? 'bold' : 'normal'}
                      fill="#f8fafc"
                      className="pointer-events-none"
                    >
                      {net.ssid.length > 12 ? `${net.ssid.slice(0, 11)}…` : net.ssid}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 pt-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Отлично (-30..-55 dBm)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
              Хорошо (-56..-67 dBm)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Нормально (-68..-75 dBm)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Слабо (&lt; -76 dBm)
            </span>
          </div>
          <div className="text-[11px] text-slate-500">
            Видимых сетей ({activeSpectrumBand}): {spectrumNetworks.length} (всего: {networks.length})
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 p-3.5 sm:p-5 rounded-2xl border border-slate-800 space-y-4 w-full max-w-full min-w-0 overflow-hidden">
        <div className="flex flex-col space-y-3 w-full max-w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full max-w-full min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <Wifi className="w-4 h-4 text-cyan-400 shrink-0" />
              <h3 className="font-bold text-sm text-slate-100 truncate">
                {viewMode === 'ssid' 
                  ? `Группы по SSID (${filteredSsidGroups.length})` 
                  : `Все BSSID точек (${filteredNetworks.length})`}
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:flex items-center p-1 bg-slate-800 rounded-xl border border-slate-700/80 text-xs w-full sm:w-auto shrink-0">
              <button
                onClick={() => setViewMode('ssid')}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer min-w-0 ${
                  viewMode === 'ssid'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  <span className="hidden sm:inline">По SSID (умно)</span>
                  <span className="sm:hidden">По SSID</span>
                </span>
              </button>
              <button
                onClick={() => setViewMode('bssid')}
                className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer min-w-0 ${
                  viewMode === 'bssid'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  <span className="hidden sm:inline">По BSSID (все)</span>
                  <span className="sm:hidden">По BSSID</span>
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 pt-1 w-full max-w-full min-w-0">
            <div className="relative flex-1 w-full min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Поиск по SSID, BSSID, вендору..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="w-full sm:w-auto max-w-full truncate px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/90 border border-slate-700 text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Все роли устройств</option>
              <option value="mesh">Mesh-узлы</option>
              <option value="router_with_ap">Главные роутеры</option>
              <option value="repeater">Репитеры</option>
              <option value="dual_band">Двухдиапазонные (2.4+5G)</option>
              <option value="standalone">Одиночные точки</option>
            </select>
            <select
              value={filterSecurity}
              onChange={e => setFilterSecurity(e.target.value)}
              className="w-full sm:w-auto max-w-full truncate px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/90 border border-slate-700 text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">Любая защита</option>
              <option value="wpa2">WPA2-PSK (AES) и выше</option>
              <option value="open">Открытые (Open)</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="w-full sm:w-auto max-w-full truncate px-2.5 py-1.5 rounded-lg text-xs bg-slate-800/90 border border-slate-700 text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="signal">Сортировка: по уровню сигнала</option>
              <option value="channel">Сортировка: по номеру канала</option>
              <option value="ssid">Сортировка: по имени (SSID)</option>
            </select>
          </div>
        </div>

        {viewMode === 'ssid' && (
          <div className="space-y-3">
            {filteredSsidGroups.map(group => {
              const isExpanded = expandedSsids.has(group.ssid);
              return (
                <div
                  key={group.ssid}
                  className={`rounded-xl border transition-all ${
                    group.hasConnectedNode
                      ? 'bg-cyan-950/20 border-cyan-500/40 ring-1 ring-cyan-500/20'
                      : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-700/60'
                  }`}
                >
                  <div
                    onClick={() => toggleSsidExpand(group.ssid)}
                    className="p-3.5 sm:p-4 flex flex-col gap-2.5 cursor-pointer w-full max-w-full overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3 w-full">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          group.deviceRole === 'mesh'
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : group.deviceRole === 'repeater'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-700/50 text-slate-300'
                        }`}>
                          {group.deviceRole === 'mesh' ? <Share2 className="w-4 h-4" /> :
                           group.deviceRole === 'repeater' ? <Repeat className="w-4 h-4" /> :
                           <Router className="w-4 h-4" />}
                        </div>
                        <div className="font-extrabold text-base sm:text-lg text-slate-100 break-words leading-snug">
                          {group.ssid}
                        </div>
                      </div>

                      {group.hasConnectedNode && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded bg-cyan-500 text-white shrink-0">
                          Активная
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/40 w-full gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <SignalValue levelDbm={group.bestLevel} size="md" showLabel={false} />
                        <span className="text-xs text-slate-400 font-mono truncate">
                          {group.bands.join(', ')} • кан. {group.channels.join(', ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const targetNode = group.nodes.find(n => n.isConnected) || group.nodes[0];
                            if (targetNode) handleConnectNetwork(targetNode.ssid, e);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/40 transition-all cursor-pointer active:scale-95"
                          title="Подключиться"
                        >
                          Wi-Fi
                        </button>
                        <div className="p-1 rounded text-slate-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-3.5 sm:px-4 pb-4 pt-2 border-t border-slate-700/50 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        <span>Точки доступа (BSSID):</span>
                        <span className="text-[10px] text-slate-500 lowercase">нажмите коприовать MAC</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {group.nodes.map(node => {
                          const isThisConnected = node.isConnected;
                          return (
                            <div
                              key={node.bssid}
                              className={`p-3 rounded-xl border text-xs transition-all ${
                                isThisConnected
                                  ? 'bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/30'
                                  : 'bg-slate-900/60 border-slate-700/70'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                    <span className="truncate">{node.nodeLabel || 'Точка'}</span>
                                    {isThisConnected && (
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-cyan-500 text-white shrink-0">
                                        Подключено
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="font-mono text-[11px] text-slate-300">
                                      {node.bssid}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyBssid(node.bssid, e)}
                                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                      title="Копировать BSSID"
                                    >
                                      {copiedBssid === node.bssid ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <SignalValue levelDbm={node.level} size="sm" />
                              </div>
                              <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                                  {node.band}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                                  кан. {node.channel} ({node.channelWidth} МГц)
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {node.standard}
                                </span>
                                <span className="ml-auto font-mono text-slate-400">
                                  ~{node.distanceMeters || 2}м
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {viewMode === 'bssid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredNetworks.map(net => {
              const isConnected = net.isConnected;
              return (
                <div
                  key={net.bssid}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                    isConnected
                      ? 'bg-cyan-950/20 border-cyan-500/40 ring-1 ring-cyan-500/20'
                      : 'bg-slate-800/50 hover:bg-slate-800/80 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-100 truncate block">
                          {net.ssid}
                        </span>
                        {isConnected && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-cyan-500 text-white shrink-0">
                            Текущая
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-slate-300 font-mono">
                          BSSID: {net.bssid}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyBssid(net.bssid, e)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Копировать BSSID"
                        >
                          {copiedBssid === net.bssid ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        {net.vendor && (
                          <span className="text-xs text-slate-400 truncate">
                            • {net.vendor}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          net.deviceRole === 'mesh'
                            ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                            : net.deviceRole === 'router_with_ap'
                              ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30'
                              : net.deviceRole === 'repeater'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-700/60 text-slate-300'
                        }`}>
                          {net.nodeLabel || 'Точка'}
                        </span>
                        {net.roamingSupported && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" title="Поддержка 802.11k/v/r">
                            802.11k/v/r
                          </span>
                        )}
                      </div>
                    </div>
                    <SignalValue levelDbm={net.level} size="sm" />
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 font-mono">
                      {net.band} • кан. {net.channel} ({net.channelWidth} МГц)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-300">
                      {net.standard}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-medium ${
                      net.securityType === 'Open'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {net.securityType === 'WPA2' ? 'WPA2-PSK (AES)' : net.securityType}
                    </span>
                    <span className="text-slate-400 ml-auto font-mono text-[10px]">
                      ~{net.distanceMeters || 3}м
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleConnectNetwork(net.ssid, e)}
                    className="w-full mt-3 py-1.5 px-3 rounded-xl text-xs font-bold bg-cyan-500/15 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span>{net.isConnected ? 'Настройки Wi-Fi' : 'Подключиться'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
