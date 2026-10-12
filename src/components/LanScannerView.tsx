import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Network, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  Router, 
  Tv, 
  Server, 
  HardDrive, 
  Monitor, 
  Smartphone, 
  Video, 
  Printer, 
  Cpu, 
  WifiOff, 
  ChevronRight, 
  Info, 
  Activity, 
  X, 
  Settings 
} from 'lucide-react';
import { LanDevice, SubnetScanProgress, DeviceCategory } from '../types/lanDevice';
import { scanLocalSubnet, getSubnetFromGateway, pingLanDevice } from '../services/lanScannerService';
import { openRouterWebDirect } from '../utils/routerNav';
import { androidSystem } from '../services/androidSystem';

interface LanScannerViewProps {
  gatewayIp?: string;
  isWifiConnected?: boolean;
  isCellular?: boolean;
}

export const LanScannerView: React.FC<LanScannerViewProps> = ({
  gatewayIp = '192.168.1.1',
  isWifiConnected = true,
  isCellular = false,
}) => {
  const [currentGateway, setCurrentGateway] = useState<string>(() => {
    return localStorage.getItem('wifi-expert-gateway-ip') || gatewayIp;
  });

  useEffect(() => {
    if (currentGateway.trim()) {
      localStorage.setItem('wifi-expert-gateway-ip', currentGateway.trim());
    }
  }, [currentGateway]);

  const subnetInfo = useMemo(() => getSubnetFromGateway(currentGateway), [currentGateway]);
  const [devices, setDevices] = useState<LanDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<SubnetScanProgress>({
    gatewayIp: currentGateway,
    subnetPrefix: subnetInfo.prefix,
    scannedCount: 0,
    totalCount: 256,
    currentIp: `${subnetInfo.prefix}0`,
    progressPercent: 0,
    foundDevices: [],
    isScanning: false,
    scanDurationMs: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<LanDevice | null>(null);
  const [pingingIp, setPingingIp] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{ 
    ip: string; 
    avgMs: number; 
    samples: number[]; 
    isIcmp?: boolean;
    ttl?: number;
    protocol?: string;
    lossPct?: number;
  } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const startScan = useCallback(async () => {
    if (!isWifiConnected) return;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;
    setIsScanning(true);
    setDevices([]);

    try {
      const res = await scanLocalSubnet(
        currentGateway,
        (progress) => {
          setScanProgress(progress);
          setDevices(progress.foundDevices);
        },
        ac.signal
      );
      setDevices(res);
    } catch {
    } finally {
      setIsScanning(false);
      abortControllerRef.current = null;
    }
  }, [currentGateway, isWifiConnected]);

  useEffect(() => {
    if (isWifiConnected) {
      startScan();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isWifiConnected, currentGateway]);

  const handleCopyIp = (ip: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => {
      setCopiedIp(prev => (prev === ip ? null : prev));
    }, 2000);
  };

  const handlePingDevice = async (device: LanDevice, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPingingIp(device.ip);
    const res = await pingLanDevice(device.ip);
    setPingResult({
      ip: device.ip,
      avgMs: res.avgMs,
      samples: res.samples,
      isIcmp: res.isIcmp,
      ttl: res.ttl,
      protocol: res.protocol,
      lossPct: res.lossPct,
    });
    setPingingIp(null);
  };

  const filteredDevices = useMemo(() => {
    return devices.filter(dev => {
      if (selectedCategory !== 'all') {
        if (selectedCategory === 'pc' && dev.category !== 'pc') return false;
        if (selectedCategory === 'phone' && dev.category !== 'phone') return false;
        if (selectedCategory === 'router' && dev.category !== 'router') return false;
        if (selectedCategory === 'tv' && dev.category !== 'tv') return false;
        if (selectedCategory === 'printer_iot' && dev.category !== 'printer' && dev.category !== 'iot' && dev.category !== 'camera') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchIp = dev.ip.includes(q);
        const matchName = dev.hostname.toLowerCase().includes(q);
        const matchVendor = dev.vendor.toLowerCase().includes(q);
        const matchCategory = dev.categoryLabel.toLowerCase().includes(q);
        const matchPort = dev.openPorts.some(p => p.toString().includes(q));
        return matchIp || matchName || matchVendor || matchCategory || matchPort;
      }
      return true;
    });
  }, [devices, selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    return {
      all: devices.length,
      pc: devices.filter(d => d.category === 'pc').length,
      phone: devices.filter(d => d.category === 'phone').length,
      router: devices.filter(d => d.category === 'router').length,
      tv: devices.filter(d => d.category === 'tv').length,
      printer_iot: devices.filter(d => d.category === 'printer' || d.category === 'iot' || d.category === 'camera').length,
    };
  }, [devices]);

  const renderCategoryIcon = (category: DeviceCategory, isGateway?: boolean) => {
    if (isGateway) {
      return <Router className="w-5 h-5 text-indigo-400" />;
    }
    switch (category) {
      case 'router': return <Router className="w-5 h-5 text-indigo-400" />;
      case 'tv': return <Tv className="w-5 h-5 text-blue-400" />;
      case 'nas': return <HardDrive className="w-5 h-5 text-amber-400" />;
      case 'pc': return <Monitor className="w-5 h-5 text-cyan-400" />;
      case 'phone': return <Smartphone className="w-5 h-5 text-emerald-400" />;
      case 'camera': return <Video className="w-5 h-5 text-rose-400" />;
      case 'printer': return <Printer className="w-5 h-5 text-teal-400" />;
      case 'iot': return <Cpu className="w-5 h-5 text-purple-400" />;
      default: return <Server className="w-5 h-5 text-slate-400" />;
    }
  };

  if (!isWifiConnected) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
            <WifiOff className="w-8 h-8 text-rose-400" />
          </div>
          
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-100">Wi-Fi не подключен</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Для сканирования подсети ({subnetInfo.networkCidr}) и поиска устройств (смартфонов, ТВ, NAS) подключитесь к домашнему Wi-Fi.
            </p>
          </div>
          {isCellular && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold animate-pulse shadow-lg shadow-amber-500/10">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400 animate-ping" />
              <span>Мобильная сеть (4G / 5G / LTE)</span>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <a
              href={androidSystem.getWifiSettingsIntentUrl()}
              onClick={() => {
                androidSystem.openWifiSettings();
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Settings className="w-4 h-4" />
              <span>Настройки Wi-Fi</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      <div className="bg-slate-900/95 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25 shrink-0">
              <Network className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100">Сканер локальной сети (LAN)</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono font-bold">
                  {subnetInfo.networkCidr}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Поиск компьютеров, смарт-ТВ, NAS и гаджетов в диапазоне <span className="font-mono text-slate-300 font-semibold">{subnetInfo.startIp} — {subnetInfo.endIp}</span> (256 адресов)
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs font-mono text-slate-300 w-full sm:w-auto">
              <span className="text-slate-500 font-sans text-[11px] shrink-0">Шлюз:</span>
              <input
                type="text"
                value={currentGateway}
                onChange={e => setCurrentGateway(e.target.value)}
                placeholder="192.168.1.1"
                className="bg-transparent border-none outline-none font-bold text-cyan-300 w-full sm:w-28 text-xs font-mono"
              />
            </div>
            <button
              onClick={startScan}
              disabled={isScanning}
              className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0 ${
                isScanning
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 opacity-90'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25 active:scale-95'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isScanning ? 'Сканирование...' : 'Сканировать LAN'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
                <span>{isScanning ? `Проверка IP: ${scanProgress.currentIp}` : 'Сканирование завершено'}</span>
              </span>
              <span>•</span>
              <span>Проверено {scanProgress.scannedCount} из 256 IP</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold font-sans">
                Найдено устройств: {devices.length}
              </span>
              <span className="text-slate-500">({scanProgress.progressPercent}%)</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700/50">
            <div 
              className="bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 h-2 rounded-full transition-all duration-150"
              style={{ width: `${scanProgress.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 w-full max-w-full min-w-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full max-w-full min-w-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full max-w-full min-w-0">
            {[
              { id: 'all', label: 'Все', count: categoryCounts.all },
              { id: 'pc', label: 'Компьютеры', count: categoryCounts.pc },
              { id: 'phone', label: 'Смартфоны', count: categoryCounts.phone },
              { id: 'router', label: 'Роутеры', count: categoryCounts.router },
              { id: 'tv', label: 'Smart TV', count: categoryCounts.tv },
              { id: 'printer_iot', label: 'Принтеры / IoT', count: categoryCounts.printer_iot },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border shrink-0 ${
                  selectedCategory === tab.id
                    ? 'bg-cyan-500 text-white border-cyan-400 shadow-md shadow-cyan-500/25'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === tab.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Поиск IP, имени..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredDevices.map(device => {
          const isCopied = copiedIp === device.ip;
          const isPinging = pingingIp === device.ip;
          return (
            <div
              key={device.ip}
              onClick={() => setSelectedDevice(device)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 relative overflow-hidden group shadow-md ${
                device.isGateway
                  ? 'bg-indigo-950/20 border-indigo-500/40 hover:border-indigo-400 shadow-indigo-950/20'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700/80 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${
                    device.isGateway
                      ? 'bg-indigo-500/20 border-indigo-500/40'
                      : device.category === 'tv'
                      ? 'bg-blue-500/15 border-blue-500/30'
                      : device.category === 'nas'
                      ? 'bg-amber-500/15 border-amber-500/30'
                      : 'bg-slate-800 border-slate-700/60'
                  }`}>
                    {renderCategoryIcon(device.category, device.isGateway)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs sm:text-sm text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                        {device.hostname}
                      </h4>
                      {device.isGateway && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase">
                          Шлюз
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {device.vendor}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{device.latencyMs} мс</span>
                  </span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 font-mono text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans text-[11px]">IP-адрес:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-cyan-300">{device.ip}</span>
                    <button
                      onClick={(e) => handleCopyIp(device.ip, e)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      title="Копировать IP"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 font-sans">MAC-адрес:</span>
                  <span className="text-slate-400">{device.mac}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {device.openServices.slice(0, 3).map(service => (
                  <span
                    key={service}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60"
                  >
                    {service}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                <button
                  onClick={(e) => handlePingDevice(device, e)}
                  disabled={isPinging}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Пинговать устройство"
                >
                  <Activity className={`w-3.5 h-3.5 text-amber-400 ${isPinging ? 'animate-spin' : ''}`} />
                  <span>{isPinging ? 'Пинг...' : 'Пинг'}</span>
                </button>
                {device.details?.webUiUrl ? (
                  <a
                    href={`http://${device.ip}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (device.isGateway) {
                        openRouterWebDirect(device.ip);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Веб UI</span>
                    <ExternalLink className="w-3 h-3 text-cyan-400" />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-500 flex items-center gap-0.5">
                    <span>Подробнее</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredDevices.length === 0 && !isScanning && (
        <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
          <Info className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="font-semibold text-slate-300 text-sm">Устройства не найдены</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">По вашему запросу ничего не найдено в подсети {currentGateway}</p>
        </div>
      )}

      {selectedDevice && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedDevice(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  {renderCategoryIcon(selectedDevice.category, selectedDevice.isGateway)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">
                    {selectedDevice.hostname}
                  </h3>
                  <div className="text-xs text-slate-400">
                    {selectedDevice.categoryLabel} • {selectedDevice.vendor}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-sans">IP-адрес:</span>
                <span className="font-bold text-cyan-300">{selectedDevice.ip}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-sans">MAC-адрес:</span>
                <span className="text-slate-300">{selectedDevice.mac}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400 font-sans">Пинг:</span>
                <span className="text-emerald-400 font-bold">{selectedDevice.latencyMs} мс</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={(e) => handleCopyIp(selectedDevice.ip, e)}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedIp === selectedDevice.ip ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedIp === selectedDevice.ip ? 'IP скопирован!' : 'Копировать IP'}</span>
              </button>
              {selectedDevice.details?.webUiUrl && (
                <a
                  href={`http://${selectedDevice.ip}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (selectedDevice.isGateway) {
                      openRouterWebDirect(selectedDevice.ip);
                    }
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/25 transition-all cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Открыть Web UI</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {pingResult && (
        <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 z-50 bg-slate-900 border border-cyan-500/50 p-4 rounded-2xl shadow-2xl space-y-2.5 sm:w-84 max-w-sm animate-in slide-in-from-bottom">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-xs text-slate-100 truncate">Результат пинга {pingResult.ip}</div>
              </div>
            </div>
            <button
              onClick={() => setPingResult(null)}
              className="text-slate-400 hover:text-white cursor-pointer p-0.5 rounded hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-300 font-mono pt-0.5">
            <div>Среднее: <span className="font-bold text-emerald-400">{pingResult.avgMs} мс</span></div>
            <div className="text-[11px] text-slate-400">Потери: <strong className="text-emerald-400">{pingResult.lossPct || 0}%</strong></div>
          </div>
        </div>
      )}
    </div>
  );
};
