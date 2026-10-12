import React from 'react';
import { Wifi, WifiLow, WifiZero } from 'lucide-react';
import { getSignalStatus, dbmToPercent } from '../utils/signalQuality';

interface SignalValueProps {
  levelDbm: number;
  showPercent?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const SignalValue: React.FC<SignalValueProps> = ({
  levelDbm,
  showPercent = true,
  showLabel = false,
  size = 'md',
}) => {
  const status = getSignalStatus(levelDbm);
  const percent = dbmToPercent(levelDbm);

  const getIcon = () => {
    if (percent > 65) return <Wifi className="w-4 h-4" />;
    if (percent > 30) return <WifiLow className="w-4 h-4" />;
    return <WifiZero className="w-4 h-4" />;
  };

  const sizeClasses = {
    sm: 'text-xs py-0.5 px-2 gap-1.5',
    md: 'text-xs py-1 px-2.5 gap-2 font-mono',
    lg: 'text-sm py-1.5 px-3 gap-2.5 font-mono font-medium',
  };

  return (
    <div
      className={`inline-flex items-center rounded-lg border ${status.badgeBg} ${sizeClasses[size]} transition-all`}
      title={`${status.label} сигнал: ${levelDbm} dBm (${percent}%). ${status.description}`}
    >
      <span className={status.badgeText}>{getIcon()}</span>
      <span className="font-semibold">{levelDbm} dBm</span>
      {showPercent && (
        <span className="opacity-80 text-[11px]">({percent}%)</span>
      )}
      {showLabel && (
        <span className="font-sans font-medium text-[11px] ml-1">{status.label}</span>
      )}
    </div>
  );
};
