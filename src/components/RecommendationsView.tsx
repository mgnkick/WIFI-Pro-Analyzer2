import React, { useMemo, useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Compass, 
  ArrowRight, 
  Sparkles, 
  Zap, 
  Router, 
  RotateCw, 
  BookOpen, 
  Wifi, 
  WifiOff, 
  Layers, 
  Settings 
} from 'lucide-react';
import { WifiNetwork, DiagnosticRecommendation } from '../types/wifi';
import { NON_OVERLAPPING_2_4GHZ } from '../utils/channelAdvice';
import { getRandomAuditTips, RandomAuditTip } from '../data/randomAuditTips';
import { androidSystem } from '../services/androidSystem';

interface RecommendationsViewProps {
  networks: WifiNetwork[];
  onNavigateToRouter?: (band: '2.4GHz' | '5GHz') => void;
  isCellular?: boolean;
}

export const RecommendationsView: React.FC<RecommendationsViewProps> = ({ 
  networks,
  onNavigateToRouter,
  isCellular = false,
}) => {
  const connectedNet = networks.find(n => n.isConnected) || null;
  const [randomTips, setRandomTips] = useState<RandomAuditTip[]>(() => getRandomAuditTips(2));
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setRandomTips(getRandomAuditTips(2));
  }, []);

  const handleRefreshRandomTips = () => {
    setIsRefreshing(true);
    const currentIds = randomTips.map(t => t.id);
    const newTips = getRandomAuditTips(2, currentIds);
    setRandomTips(newTips);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  const recommendations: DiagnosticRecommendation[] = useMemo(() => {
    if (networks.length === 0 || !connectedNet) {
      return [];
    }
    const list: DiagnosticRecommendation[] = [];
    const current: WifiNetwork = connectedNet;

    if (current.level < -75) {
      list.push({
        id: 'rec_signal_weak',
        category: 'placement',
        severity: 'critical',
        title: 'Слишком слабый уровень сигнала Wi-Fi',
        description: `Уровень RSSI равен ${current.level} dBm. На таком расстоянии потери кадров могут достигать 40%.`,
        actionStep: 'Перенесите роутер ближе к центру комнаты или установите Mesh-систему.',
        impact: 'Рост скорости в 2-3 раза',
      });
    } else if (current.level < -67) {
      list.push({
        id: 'rec_signal_moderate',
        category: 'placement',
        severity: 'warning',
        title: 'Умеренный уровень сигнала Wi-Fi',
        description: `Уровень RSSI равен ${current.level} dBm. Возможны периодические просадки пинга в играх.`,
        actionStep: 'Измените положение роутера или поднимите его выше от пола (на 1.5м).',
        impact: '+30% к стабильности соединения',
      });
    } else {
      list.push({
        id: 'rec_signal_ok',
        category: 'placement',
        severity: 'success',
        title: 'Отличный уровень сигнала Wi-Fi',
        description: `Уровень RSSI составляет ${current.level} dBm. Радиомодуль работает на максимальной скорости.`,
        actionStep: 'Дополнительных вмешательств не требуется.',
        impact: 'Максимальная пропускная способность',
      });
    }

    if (current.band === '2.4GHz') {
      const neighbor5G = networks.some(n => n.ssid.includes(current.ssid) && n.band === '5GHz');
      list.push({
        id: 'rec_switch_5g',
        category: 'band',
        severity: 'warning',
        title: 'Использование перегруженного диапазона 2.4 ГГц',
        description: 'Диапазон 2.4 ГГц сильно зашумлен соседями и бытовыми приборами (Bluetooth, микроволновки).',
        actionStep: neighbor5G 
          ? 'Переключите устройство на 5 ГГц (или настройте Band Steering на роутере).' 
          : 'Активируйте сеть 5 ГГц на вашем роутере для тяжелого контента.',
        impact: 'Увеличение скорости в 3–5 раз',
      });
    } else {
      list.push({
        id: 'rec_band_5g_ok',
        category: 'band',
        severity: 'success',
        title: 'Использование скоростного диапазона 5 ГГц',
        description: `Клиент подключен на частоте ${current.frequency} МГц (канал ${current.channel}).`,
        actionStep: 'Отличное решение для стриминга и игр.',
        impact: 'Минимальные задержки',
      });
    }

    if (current.band === '2.4GHz') {
      const isBadChannel = !NON_OVERLAPPING_2_4GHZ.includes(current.channel);
      if (isBadChannel) {
        list.push({
          id: 'rec_bad_channel_24',
          category: 'channel',
          severity: 'critical',
          title: `Использование пересекающегося канала ${current.channel}`,
          description: `Канал ${current.channel} накладывается на соседние частоты, вызывая постоянные коллизии и падение скорости.`,
          actionStep: 'Зайдите в настройки роутера и жестко зафиксируйте канал: 1, 6 или 11.',
          impact: 'Исчезновение микролагов эфира',
        });
      } else {
        list.push({
          id: 'rec_clean_channel',
          category: 'channel',
          severity: 'success',
          title: `Оптимальный канал ${current.channel} в 2.4 ГГц`,
          description: `Выбран непересекающийся канал ${current.channel}, эфир используется эффективно.`,
          actionStep: 'Сохраняйте текущую конфигурацию.',
          impact: 'Чистый радиоэфир',
        });
      }
    } else {
      if (current.channel >= 52 && current.channel <= 144) {
        list.push({
          id: 'rec_dfs_channel_5g',
          category: 'channel',
          severity: 'info',
          title: `Использование DFS канала ${current.channel} (5 ГГц)`,
          description: 'DFS каналы могут сканироваться на предмет метеорадарных помех при перезагрузке.',
          actionStep: 'При долгом старте Wi-Fi переключитесь на каналы 36, 40, 44 или 48 (UNII-1).',
          impact: 'Моментальный старт роутера',
        });
      } else {
        list.push({
          id: 'rec_clean_unii1_5g',
          category: 'channel',
          severity: 'success',
          title: `Использование канала ${current.channel} (UNII-1)`,
          description: `Канал ${current.channel} в диапазоне 5150-5250 МГц не требует проверки DFS и работает со 100% стабильностью.`,
          actionStep: 'Отличный выбор для дома.',
          impact: 'Стабильность соединения',
        });
      }
    }

    if (current.securityType === 'Open') {
      list.push({
        id: 'rec_sec_open',
        category: 'security',
        severity: 'critical',
        title: 'Сеть без шифрования (Открытая)',
        description: 'Ваш трафик передается в открытом виде и может быть перехвачен злоумышленниками.',
        actionStep: 'Установите протокол безопасности WPA2-PSK (AES).',
        impact: 'Защита конфиденциальных данных',
      });
    } else {
      list.push({
        id: 'rec_sec_ok',
        category: 'security',
        severity: 'success',
        title: 'Надежное шифрование WPA2/WPA3',
        description: 'Беспроводная сеть защищена современным алгоритмом шифрования AES.',
        actionStep: 'Безопасность на высоком уровне.',
        impact: 'Защита от перехвата пакетов',
      });
    }

    return list;
  }, [connectedNet, networks]);

  const severityBadges = {
    critical: {
      bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
      icon: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      border: 'border-rose-500/30',
      headerTag: 'Критично',
    },
    warning: {
      bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      border: 'border-amber-500/30',
      headerTag: 'Внимание',
    },
    info: {
      bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
      icon: <Layers className="w-5 h-5 text-cyan-400 shrink-0" />,
      border: 'border-cyan-500/30',
      headerTag: 'Совет',
    },
    success: {
      bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      border: 'border-emerald-500/30',
      headerTag: 'Отлично',
    },
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <div className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-slate-100 truncate">Экспертный аудит и рекомендации</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            {connectedNet ? (
              <>Анализ для сети <span className="font-semibold text-slate-300 font-mono">{connectedNet.ssid}</span>: уровень {connectedNet.level} dBm, диапазон {connectedNet.band}, канал {connectedNet.channel}.</>
            ) : (
              <>Подключитесь к Wi-Fi для получения персональных рекомендаций.</>
            )}
          </p>
        </div>
        {connectedNet && onNavigateToRouter && (
          <button
            onClick={() => onNavigateToRouter(connectedNet.band === '5GHz' ? '5GHz' : '2.4GHz')}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-95"
          >
            <Router className="w-4 h-4" />
            <span>Настроить роутер &rarr;</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-cyan-400 shrink-0" />
            <h3 className="text-sm font-bold text-slate-200">Рекомендации для вашей сети ({recommendations.length})</h3>
          </div>
        </div>

        {recommendations.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <WifiOff className="w-6 h-6 text-rose-400" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-200">Wi-Fi не подключен</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">Подключитесь к Wi-Fi для формирования персонального отчета аудита</p>
            </div>
            {isCellular && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Мобильная сеть (4G / 5G / LTE)</span>
              </div>
            )}
            <div className="pt-2">
              <a
                href={androidSystem.getWifiSettingsIntentUrl()}
                onClick={() => {
                  androidSystem.openWifiSettings();
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20 transition-all cursor-pointer active:scale-95"
              >
                <Settings className="w-4 h-4" />
                <span>Открыть настройки Wi-Fi</span>
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map(rec => {
              const badge = severityBadges[rec.severity] || severityBadges.info;
              return (
                <div
                  key={rec.id}
                  className={`p-4 sm:p-5 rounded-2xl bg-slate-900/70 border ${badge.border} flex flex-col justify-between space-y-4 transition-all hover:bg-slate-900/90 shadow-sm`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {badge.icon}
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-100 leading-snug break-words">
                            {rec.title}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mt-0.5">
                            Категория: {rec.category}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border shrink-0 ${badge.bg}`}>
                        {badge.headerTag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pt-1 break-words">
                      {rec.description}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-start gap-2 text-cyan-300">
                      <ArrowRight className="w-4 h-4 shrink-0 mt-0.5 text-cyan-400" />
                      <div className="min-w-0 break-words">
                        <span className="font-semibold text-slate-200">Действие: </span>
                        {rec.actionStep}
                      </div>
                    </div>
                    <div className="text-[11px] text-emerald-400 font-medium pl-6 break-words">
                      Эффект: {rec.impact}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="text-sm font-bold text-slate-200">Случайные советы профессионала</h3>
          </div>
          <button
            onClick={handleRefreshRandomTips}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-cyan-300 hover:text-cyan-200 border border-slate-700/80 transition-all cursor-pointer shadow-sm active:scale-95 group self-end sm:self-auto"
            title="Показать другие советы"
          >
            <RotateCw className={`w-3.5 h-3.5 transition-transform duration-300 ${isRefreshing ? 'rotate-180 text-cyan-400' : 'group-hover:rotate-45'}`} />
            <span>Обновить советы</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {randomTips.map((tip, idx) => (
            <div
              key={tip.id}
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/60 border border-amber-500/25 flex flex-col justify-between space-y-3 hover:border-amber-500/40 transition-all shadow-sm group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {tip.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Совет #{idx + 1}</span>
                </div>
                <h4 className="font-bold text-sm text-slate-100 group-hover:text-amber-200 transition-colors leading-snug break-words">
                  {tip.title}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed break-words">
                  {tip.description}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-800/80 flex items-start gap-2 text-xs">
                <Zap className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="text-[11px] text-amber-200/95 leading-relaxed break-words">
                  <span className="font-semibold text-amber-300">Суть: </span>
                  {tip.takeaway}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-400 shrink-0" />
          <h3 className="font-bold text-sm text-slate-100">Шпаргалка затухания радиоволн</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center space-y-1 min-w-0">
            <span className="text-slate-400 block text-[11px] truncate">Гипсокартон</span>
            <span className="font-bold text-emerald-400 block font-mono text-sm">-2...-4 dB</span>
            <span className="text-[10px] text-slate-500 block truncate">Минимум потерь</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center space-y-1 min-w-0">
            <span className="text-slate-400 block text-[11px] truncate">Деревянная дверь</span>
            <span className="font-bold text-cyan-400 block font-mono text-sm">-3...-5 dB</span>
            <span className="text-[10px] text-slate-500 block truncate">Слабое ослабление</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center space-y-1 min-w-0">
            <span className="text-slate-400 block text-[11px] truncate">Кирпичная стена</span>
            <span className="font-bold text-amber-400 block font-mono text-sm">-8...-14 dB</span>
            <span className="text-[10px] text-amber-300 block truncate">Среднее</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center space-y-1 min-w-0">
            <span className="text-slate-400 block text-[11px] truncate">Бетонная стена</span>
            <span className="font-bold text-rose-400 block font-mono text-sm">-12...-18 dB</span>
            <span className="text-[10px] text-slate-500 block truncate">Сильное</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center space-y-1 min-w-0">
            <span className="text-slate-400 block text-[11px] truncate">Зеркало</span>
            <span className="font-bold text-rose-400 block font-mono text-sm">-10...-20 dB</span>
            <span className="text-[10px] text-slate-500 block truncate">Отражение</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center space-y-1 min-w-0">
            <span className="text-slate-400 block text-[11px] truncate">Армированный бетон</span>
            <span className="font-bold text-rose-500 block font-mono text-sm">&gt; -25 dB</span>
            <span className="text-[10px] text-rose-300 block truncate">Мертвая зона</span>
          </div>
        </div>
      </div>
    </div>
  );
};
