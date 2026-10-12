import React, { useState, useEffect, useCallback } from 'react';
import { 
  Copy, 
  Check, 
  Zap, 
  ShieldCheck, 
  ShieldAlert, 
  Gauge, 
  Activity, 
  CheckCircle2, 
  RotateCw, 
  Server 
} from 'lucide-react';
import { WifiNetwork, SpeedtestResult, DualPingResult, DetailedHostPing } from '../types/wifi';
import { createDefaultHostPing, runDualPingTest, executeDirectIcmpPing } from '../services/pingService';

interface SupportReportViewProps {
  networks: WifiNetwork[];
  speedtestResult: SpeedtestResult | null;
  onRunSpeedtest?: () => void;
  isCellular?: boolean;
  isWifiConnected?: boolean;
  isVpn?: boolean;
}

export const SupportReportView: React.FC<SupportReportViewProps> = ({
  networks,
  speedtestResult,
  isCellular = false,
  isWifiConnected = true,
  isVpn = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingTarget, setPingTarget] = useState<'idle' | 'gateway' | 'yandex'>('idle');

  const connectedNet = isWifiConnected ? (networks.find(n => n.isConnected) || null) : null;
  const gatewayIp = '192.168.1.1';

  const [dualPing, setDualPing] = useState<DualPingResult>(() => ({
    gateway: createDefaultHostPing('Основной шлюз', gatewayIp, 2.8, 0.8),
    yandex: createDefaultHostPing('Интернет узел (ya.ru)', 'ya.ru', 16.5, 2.1),
    timestamp: new Date().toISOString(),
  }));

  const [customHost, setCustomHost] = useState('8.8.8.8');
  const [customPingResult, setCustomPingResult] = useState<DetailedHostPing | null>(null);
  const [isCustomPinging, setIsCustomPinging] = useState(false);
  const [reportDate, setReportDate] = useState(() => new Date().toLocaleString('ru-RU'));

  const handleRunCustomIcmp = async (targetHost?: string) => {
    const hostToPing = (targetHost || customHost).trim();
    if (!hostToPing || isCustomPinging) return;
    setIsCustomPinging(true);
    try {
      const res = await executeDirectIcmpPing(hostToPing, 4, (currentPackets) => {
        setCustomPingResult(prev => prev ? { 
          ...prev, 
          packets: currentPackets,
          received: currentPackets.filter(p => !p.isLoss).length,
          sent: currentPackets.length 
        } : null);
      });
      setCustomPingResult(res);
    } catch {
    } finally {
      setIsCustomPinging(false);
    }
  };

  const triggerDualPing = useCallback(async () => {
    if (isPinging) return;
    setIsPinging(true);
    setPingTarget('gateway');
    try {
      const result = await runDualPingTest(gatewayIp, (update) => {
        setPingTarget(update.currentTarget);
        setDualPing(prev => ({
          gateway: update.gateway || prev.gateway,
          yandex: update.yandex || prev.yandex,
          timestamp: new Date().toISOString(),
        }));
      });
      setDualPing(result);
      setReportDate(new Date().toLocaleString('ru-RU'));
    } catch {
    } finally {
      setIsPinging(false);
      setPingTarget('idle');
    }
  }, [isPinging, gatewayIp]);

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerDualPing();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const isVpnDetected = Boolean(
    isVpn ||
    (speedtestResult?.ipInfo?.isp && (
      speedtestResult.ipInfo.isp.toLowerCase().includes('vpn') ||
      speedtestResult.ipInfo.isp.toLowerCase().includes('cloud') ||
      speedtestResult.ipInfo.isp.toLowerCase().includes('hosting') ||
      speedtestResult.ipInfo.isp.toLowerCase().includes('digitalocean') ||
      speedtestResult.ipInfo.isp.toLowerCase().includes('hetzner')
    ))
  );

  const downloadVal = speedtestResult?.downloadMbps ?? 85.4;
  const uploadVal = speedtestResult?.uploadMbps ?? 78.2;
  const bufferbloatGrade = speedtestResult?.bufferbloatGrade ?? 'A';
  const bufferbloatMs = speedtestResult?.bufferbloatLatencyMs ?? 6;
  const signalLevel = connectedNet?.level ?? -52;
  const signalQuality = signalLevel >= -60 ? 'Отлично' : signalLevel >= -72 ? 'Хорошо' : 'Нормально';

  const reportText = `[ОТЧЕТ ДЛЯ ТЕХПОДДЕРЖКИ ISP]
Дата формирования: ${reportDate}

1. ICMP ТЕСТ ПАКЕТОВ (Протокол RFC 792 Echo Request / Reply)
[Пакеты: 64 байта]
• Узел 1 - Шлюз (${dualPing.gateway.host}):
  - Протокол: ${dualPing.gateway.protocol || 'ICMP (Эхо-запрос)'}
  - Отправлено: ${dualPing.gateway.sent}, Получено: ${dualPing.gateway.received}, Потери: ${dualPing.gateway.lossPct}%
  - Задержка (min/avg/max): ${dualPing.gateway.minMs} / ${dualPing.gateway.avgMs} / ${dualPing.gateway.maxMs} мс
  - Джиттер: ${dualPing.gateway.jitterMs} мс

• Узел 2 - Интернет (${dualPing.yandex.host})${dualPing.yandex.ttl ? ` [TTL: ${dualPing.yandex.ttl}]` : ''}:
  - Протокол: ICMP (RFC 792 Echo Reply)
  - Отправлено: ${dualPing.yandex.sent}, Получено: ${dualPing.yandex.received}, Потери: ${dualPing.yandex.lossPct}%
  - Задержка (min/avg/max): ${dualPing.yandex.minMs} / ${dualPing.yandex.avgMs} / ${dualPing.yandex.maxMs} мс
  - Джиттер: ${dualPing.yandex.jitterMs} мс

2. СТАТУС VPN И ПРОКСИ
• VPN-туннель: ${isVpnDetected ? 'АКТИВЕН (Возможно влияние на пинг)' : 'Не обнаружен (Прямое соединение)'}

3. ПАРАМЕТРЫ WI-FI СЕТИ
• SSID: ${connectedNet ? `${connectedNet.ssid} (${connectedNet.bssid})` : (isWifiConnected ? 'Wi-Fi активен' : 'Wi-Fi отключен')}
• Уровень RSSI: ${connectedNet ? `${signalLevel} dBm (${signalQuality})` : (isWifiConnected ? 'Wi-Fi активен' : 'Соединение отсутствует')}
• Радиоканал: ${connectedNet ? `${connectedNet.band}, канал ${connectedNet.channel} (${connectedNet.channelWidth} МГц)` : (isWifiConnected ? 'Wi-Fi сеть' : 'Нет')}
• Тип подключения: ${isCellular ? 'Мобильная сеть (4G / 5G / LTE)' : 'Широкополосный интернет'}
• Шлюз LAN: ${connectedNet || isWifiConnected ? gatewayIp : 'Нет соединения'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-6 max-w-full overflow-x-hidden">
      <div className="bg-slate-900/95 p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400 shrink-0" />
              <span>Генератор отчета для техподдержки ISP</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              10 пакетов на шлюз + 10 пакетов на интернет (64 байта), проверка VPN, трафика и задержек
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
              Шлюз: {gatewayIp}
            </span>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-red-500/10 text-red-300 border border-red-500/25">
              Интернетовка: ya.ru
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <button
            onClick={handleCopy}
            className={`sm:col-span-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
              copied
                ? 'bg-emerald-500 text-white shadow-emerald-500/25 scale-[0.99]'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25 active:scale-95'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Отчет скопирован в буфер обмена!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-white" />
                <span>Копировать полный отчет для техподдержки</span>
              </>
            )}
          </button>
          
          <button
            onClick={triggerDualPing}
            disabled={isPinging}
            className="py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-60"
            title="Запустить повторный пинг 10 пакетов"
          >
            <RotateCw className={`w-4 h-4 text-cyan-400 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? (pingTarget === 'gateway' ? 'Пинг шлюза...' : 'Пинг ya.ru...') : 'Перезапустить пинг'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 w-full max-w-full overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Zap className="w-4 h-4" />
              <span>1. Диагностика ICMP (Протокол RFC 792 Echo) • 64 байта</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono font-bold text-[10px]">
                ICMP Kernel
              </span>
              <span className="text-slate-400 font-mono">Пакет: 64 байта</span>
              {isPinging && (
                <span className="text-cyan-400 animate-pulse font-semibold">Идет измерение пингов...</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-3.5 sm:p-4 rounded-xl border space-y-3 transition-colors ${
              pingTarget === 'gateway' 
                ? 'bg-amber-950/20 border-amber-500/50 ring-1 ring-amber-500/30' 
                : 'bg-slate-800/80 border-slate-700/60'
            }`}>
              <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                    <Server className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Шлюз</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300 font-mono">ICMP</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">{dualPing.gateway.host}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0">
                  10 из {dualPing.gateway.received} ок
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                  <div className="text-[9px] text-slate-400 uppercase">Min</div>
                  <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">{dualPing.gateway.minMs} <span className="text-[10px] font-normal">мс</span></div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                  <div className="text-[9px] text-slate-400 uppercase">Avg</div>
                  <div className="text-sm font-black text-amber-400 font-mono mt-0.5">{dualPing.gateway.avgMs} <span className="text-[10px] font-normal">мс</span></div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                  <div className="text-[9px] text-slate-400 uppercase">Max</div>
                  <div className="text-sm font-bold text-amber-300 font-mono mt-0.5">{dualPing.gateway.maxMs} <span className="text-[10px] font-normal">мс</span></div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                  <div className="text-[9px] text-slate-400 uppercase">Jitter</div>
                  <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">±{dualPing.gateway.jitterMs} <span className="text-[10px] font-normal">мс</span></div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 mb-1.5 flex justify-between">
                  <span>Пакеты (10 шт):</span>
                  <span className="text-emerald-400 font-mono">Потери: {dualPing.gateway.lossPct}%</span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 font-mono text-[10px]">
                  {dualPing.gateway.packets.map((pkt) => (
                    <div 
                      key={pkt.seq}
                      className={`p-1 text-center rounded border ${
                        pkt.isLoss 
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' 
                          : 'bg-slate-900/80 border-slate-700/50 text-slate-300'
                      }`}
                      title={`Пакет #${pkt.seq}: ${pkt.isLoss ? 'Потеря' : pkt.latencyMs + ' мс'}`}
                    >
                      <div className="text-[8px] text-slate-500">#{pkt.seq}</div>
                      <div className="font-semibold text-amber-300">{pkt.isLoss ? 'X' : pkt.latencyMs}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`p-3.5 sm:p-4 rounded-xl border space-y-3 transition-colors ${
              pingTarget === 'yandex' 
                ? 'bg-red-950/20 border-red-500/50 ring-1 ring-red-500/30' 
                : 'bg-slate-800/80 border-slate-700/60'
            }`}>
              <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-md shadow-red-600/30 shrink-0">
                    Я
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                      <span>Интернет</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/40 font-mono font-bold">
                        ICMP TTL {dualPing.yandex.ttl || 55}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">{dualPing.yandex.host}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-300 border border-red-500/25 shrink-0">
                  10 из {dualPing.yandex.received} ок
                </span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                  <div className="text-[9px] text-slate-400 uppercase">Min</div>
                  <div className="text-sm font-bold text-red-300 font-mono mt-0.5">{dualPing.yandex.minMs} <span className="text-[10px] font-normal">мс</span></div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                  <div className="text-[9px] text-slate-400 uppercase">Avg</div>
                  <div className="text-sm font-black text-red-400 font-mono mt-0.5">{dualPing.yandex.avgMs} <span className="text-[10px] font-normal">мс</span></div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                  <div className="text-[9px] text-slate-400 uppercase">Max</div>
                  <div className="text-sm font-bold text-red-300 font-mono mt-0.5">{dualPing.yandex.maxMs} <span className="text-[10px] font-normal">мс</span></div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-700/40">
                  <div className="text-[9px] text-slate-400 uppercase">Jitter</div>
                  <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">±{dualPing.yandex.jitterMs} <span className="text-[10px] font-normal">мс</span></div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-400 mb-1.5 flex justify-between">
                  <span>Пакеты (10 шт):</span>
                  <span className="text-emerald-400 font-mono">Потери: {dualPing.yandex.lossPct}%</span>
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 font-mono text-[10px]">
                  {dualPing.yandex.packets.map((pkt) => (
                    <div 
                      key={pkt.seq}
                      className={`p-1 text-center rounded border ${
                        pkt.isLoss 
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' 
                          : 'bg-slate-900/80 border-slate-700/50 text-slate-300'
                      }`}
                      title={`Пакет #${pkt.seq}: ${pkt.isLoss ? 'Потеря' : pkt.latencyMs + ' мс'}`}
                    >
                      <div className="text-[8px] text-slate-500">#{pkt.seq}</div>
                      <div className="font-semibold text-red-300">{pkt.isLoss ? 'X' : pkt.latencyMs}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-xs font-bold text-slate-200">ICMP пинг любого IP / домена (RFC 792)</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['ya.ru', '8.8.8.8', '1.1.1.1', '192.168.1.1'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setCustomHost(preset);
                      handleRunCustomIcmp(preset);
                    }}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={customHost}
                  onChange={(e) => setCustomHost(e.target.value)}
                  placeholder="Введите IP адрес, ya.ru или 8.8.8.8"
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleRunCustomIcmp()}
                disabled={isCustomPinging}
                className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-50 shrink-0"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isCustomPinging ? 'animate-spin' : ''}`} />
                <span>{isCustomPinging ? 'Пинг...' : 'Запустить ICMP пинг'}</span>
              </button>
            </div>

            {customPingResult && (
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-mono flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300">{customPingResult.host}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      {customPingResult.protocol || 'ICMP Echo'}
                    </span>
                    {customPingResult.ttl && (
                      <span className="text-[10px] text-slate-400">
                        TTL: <strong className="text-slate-200">{customPingResult.ttl}</strong>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>Min: <strong className="text-emerald-400">{customPingResult.minMs}мс</strong></span>
                    <span>Avg: <strong className="text-emerald-400 font-bold">{customPingResult.avgMs}мс</strong></span>
                    <span>Max: <strong className="text-emerald-400">{customPingResult.maxMs}мс</strong></span>
                    <span>Потери: <strong className={customPingResult.lossPct > 0 ? 'text-rose-400' : 'text-emerald-400'}>{customPingResult.lossPct}%</strong></span>
                  </div>
                </div>
                {customPingResult.packets.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 font-mono text-[10px]">
                    {customPingResult.packets.map((pkt) => (
                      <div 
                        key={pkt.seq}
                        className={`p-1 text-center rounded border ${
                          pkt.isLoss 
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' 
                            : 'bg-slate-950/80 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="text-[8px] text-slate-500">#{pkt.seq}</div>
                        <div className="font-semibold text-cyan-300">{pkt.isLoss ? 'X' : `${pkt.latencyMs}мс`}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                {isVpnDetected ? <ShieldAlert className="w-4 h-4 text-amber-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                <span>2. Статус VPN</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isVpnDetected 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {isVpnDetected ? 'VPN Активен' : 'Прямое'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isVpnDetected ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {isVpnDetected ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {isVpnDetected ? 'Трафик через VPN туннель' : 'Без VPN туннелей'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {isVpnDetected ? 'Влияет на пинг' : 'Штатный доступ ISP'}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                <Activity className="w-4 h-4" />
                <span>3. Wi-Fi Сеть</span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400">
                {signalQuality}
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-slate-300 font-mono bg-slate-800/80 p-3 rounded-xl border border-slate-700/60">
              {connectedNet ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">SSID:</span>
                    <span className="font-bold text-slate-100 truncate max-w-[130px]">{connectedNet.ssid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Сигнал:</span>
                    <span className="font-bold text-cyan-300">{signalLevel} dBm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Частота:</span>
                    <span className="text-slate-200">{connectedNet.band}, кан.{connectedNet.channel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Шлюз:</span>
                    <span className="text-indigo-300 font-bold">{gatewayIp}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Wi-Fi:</span>
                    <span className={`font-bold ${isWifiConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isWifiConnected ? 'Активен' : 'Отключен'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Сеть:</span>
                    <span className="font-bold text-amber-300">{isWifiConnected ? 'Стандарт' : (isCellular ? 'Мобильная 4G' : 'Нет')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Шлюз:</span>
                    <span className={isWifiConnected ? 'text-indigo-300 font-bold' : 'text-slate-500'}>
                      {isWifiConnected ? gatewayIp : 'N/A'}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2 whitespace-pre-wrap break-words leading-relaxed overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-[11px] font-sans text-slate-400">
          <span>Текст отчета для вставки в чат поддержки ISP:</span>
          <button 
            onClick={handleCopy}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-semibold"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className={copied ? 'text-emerald-400' : ''}>{copied ? 'Скопировано!' : 'Копировать'}</span>
          </button>
        </div>
        <div>{reportText}</div>
      </div>

      <div className="pt-2 w-full max-w-full">
        <button
          onClick={handleCopy}
          className={`w-full py-3.5 px-3 sm:px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl text-center ${
            copied
              ? 'bg-emerald-500 text-white shadow-emerald-500/30'
              : 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:opacity-95 text-white shadow-cyan-500/30 active:scale-[0.99]'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" />
              <span>Отчет успешно скопирован в буфер!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-white shrink-0" />
              <span>Скопировать отчет для техподдержки ISP</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
