/**
 * Signal quality calculation utilities
 */
export function dbmToPercent(dbm: number): number {
  if (dbm >= -50) return 100;
  if (dbm <= -100) return 0;
  return Math.round(2 * (dbm + 100));
}

export interface SignalStatus {
  percent: number;
  label: 'Отлично' | 'Хорошо' | 'Нормально' | 'Слабо' | 'Плохо';
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
}

export function getSignalStatus(dbm: number): SignalStatus {
  const percent = dbmToPercent(dbm);
  if (dbm >= -55) {
    return {
      percent,
      label: 'Отлично',
      color: '#10b981', // emerald-500
      badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      badgeText: 'text-emerald-600 dark:text-emerald-400',
      description: 'Идеально для 4K/8K стриминга и игр без задержек',
    };
  }
  if (dbm >= -67) {
    return {
      percent,
      label: 'Хорошо',
      color: '#06b6d4', // cyan-500
      badgeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400',
      badgeText: 'text-cyan-600 dark:text-cyan-400',
      description: 'Отлично для видео (1080p/4K) и видеосвязи Zoom/Teams',
    };
  }
  if (dbm >= -75) {
    return {
      percent,
      label: 'Нормально',
      color: '#f59e0b', // amber-500
      badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
      badgeText: 'text-amber-600 dark:text-amber-400',
      description: 'Стабильный серфинг и соцсети, возможны редкие задержки',
    };
  }
  if (dbm >= -85) {
    return {
      percent,
      label: 'Слабо',
      color: '#f97316', // orange-500
      badgeBg: 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400',
      badgeText: 'text-orange-600 dark:text-orange-400',
      description: 'Медленная скорость, частые потери пакетов',
    };
  }
  return {
    percent,
    label: 'Плохо',
    color: '#ef4444', // red-500
    badgeBg: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
    badgeText: 'text-red-600 dark:text-red-400',
    description: 'Нестабильное соединение, частые обрывы Wi-Fi',
  };
}

export function estimateDistanceMeters(dbm: number, freqMHz: number = 2412): number {
  if (dbm >= -30) return 0.5;
  const exp = 3.0;
  const ratio = (-35 - dbm) / (10 * exp);
  const distance = Math.pow(10, ratio);
  return Math.max(0.5, Math.round(distance * 10) / 10);
}

let audioCtx: AudioContext | null = null;
export function playSignalBeep(dbm: number) {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const norm = Math.max(0, Math.min(1, (dbm + 90) / 55));
    const freq = 350 + norm * 850;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {}
}
