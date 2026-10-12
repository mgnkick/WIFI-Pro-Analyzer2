export type RouterModel = 
  | 'keenetic'
  | 'openwrt'
  | 'mikrotik'
  | 'asus'
  | 'tplink'
  | 'xiaomi'
  | 'generic';

export interface RouterProfile {
  id: RouterModel;
  name: string;
  defaultIp: string;
  defaultPort: number;
  osName: string;
  authMethod: 'rci_json' | 'ubus_rpc' | 'rest_api' | 'web_form' | 'cli_only';
  icon: string;
  instructions: {
    sectionPath: string;
    description: string;
  };
  cliCommandTemplate: (channel: number, band: '2.4GHz' | '5GHz') => string;
}

export const ROUTER_PROFILES: RouterProfile[] = [
  {
    id: 'keenetic',
    name: 'Keenetic (KeeneticOS)',
    defaultIp: '192.168.1.1',
    defaultPort: 80,
    osName: 'KeeneticOS (RCI API)',
    authMethod: 'rci_json',
    icon: 'keenetic',
    instructions: {
      sectionPath: 'Wi-Fi -> Сеть Wi-Fi -> Точка доступа 2.4 / 5 ГГц -> Канал',
      description: 'Выберите свободный канал из списка или оставьте автовыбор.',
    },
    cliCommandTemplate: (channel, band) => {
      const iface = band === '5GHz' ? 'WifiMaster1' : 'WifiMaster0';
      return `# Команда CLI для Keenetic:
interface ${iface} channel ${channel}
system configuration save`;
    },
  },
  {
    id: 'openwrt',
    name: 'OpenWrt / LEDE',
    defaultIp: '192.168.1.1',
    defaultPort: 80,
    osName: 'LuCI (ubus / uci)',
    authMethod: 'ubus_rpc',
    icon: 'openwrt',
    instructions: {
      sectionPath: 'Network -> Wireless -> Edit (radio0/radio1) -> Device Configuration',
      description: 'Измените поле "Channel", нажмите "Save & Apply".',
    },
    cliCommandTemplate: (channel, band) => {
      const radio = band === '5GHz' ? 'radio1' : 'radio0';
      return `# Команда OpenWrt (через SSH):
uci set wireless.${radio}.channel='${channel}'
uci commit wireless
wifi reload`;
    },
  },
  {
    id: 'mikrotik',
    name: 'MikroTik (RouterOS)',
    defaultIp: '192.168.88.1',
    defaultPort: 80,
    osName: 'RouterOS v7 (REST API / Winbox)',
    authMethod: 'rest_api',
    icon: 'mikrotik',
    instructions: {
      sectionPath: 'Wireless -> WiFi Interfaces (или WiFiWave2) -> wlan1/wlan2 -> Channel',
      description: 'Задайте нужную частоту и ширину канала.',
    },
    cliCommandTemplate: (channel, band) => {
      const freq = band === '2.4GHz' ? 2412 + (channel - 1) * 5 : 5000 + channel * 5;
      const wlan = band === '5GHz' ? 'wlan2' : 'wlan1';
      return `# Команда Winbox / SSH:
/interface wireless set [find default-name=${wlan}] frequency=${freq} channel.width=20mhz`;
    },
  },
  {
    id: 'asus',
    name: 'ASUS (AsusWRT / Merlin)',
    defaultIp: '192.168.1.1',
    defaultPort: 80,
    osName: 'AsusWRT',
    authMethod: 'web_form',
    icon: 'asus',
    instructions: {
      sectionPath: 'Беспроводная сеть -> Профессионально -> Канал',
      description: 'Укажите номер оптимального непересекающегося канала.',
    },
    cliCommandTemplate: (channel, band) => {
      const prefix = band === '5GHz' ? 'wl1' : 'wl0';
      return `# Команда NVRAM через SSH ASUS:
nvram set ${prefix}_chanspec=${channel}
nvram commit
service restart_wireless`;
    },
  },
  {
    id: 'tplink',
    name: 'TP-Link (Archer / Deco)',
    defaultIp: '192.168.0.1',
    defaultPort: 80,
    osName: 'TP-Link Firmware',
    authMethod: 'web_form',
    icon: 'tplink',
    instructions: {
      sectionPath: 'Дополнительные настройки -> Беспроводной режим -> Настройки беспроводного режима',
      description: 'Выберите параметр "Канал" вместо Авто.',
    },
    cliCommandTemplate: (channel) => {
      return `# Перейдите в веб-интерфейс TP-Link Archer по адресу http://192.168.0.1 или http://tplinkwifi.net
# Беспроводной режим -> Канал -> Выберите ${channel}`;
    },
  },
  {
    id: 'xiaomi',
    name: 'Xiaomi / Redmi (MiWiFi)',
    defaultIp: '192.168.31.1',
    defaultPort: 80,
    osName: 'MiWiFi OS',
    authMethod: 'web_form',
    icon: 'xiaomi',
    instructions: {
      sectionPath: 'Настройки -> Wi-Fi -> Дополнительные настройки Wi-Fi',
      description: 'Измените канал для 2.4ГГц или 5ГГц.',
    },
    cliCommandTemplate: (channel) => {
      return `# Перейдите в MiWiFi http://192.168.31.1 -> Настройки Wi-Fi -> Канал -> ${channel}`;
    },
  },
  {
    id: 'generic',
    name: 'Другой (Ростелеком / D-Link / Tenda)',
    defaultIp: '192.168.1.1',
    defaultPort: 80,
    osName: 'Стандартный веб-интерфейс',
    authMethod: 'web_form',
    icon: 'generic',
    instructions: {
      sectionPath: 'Wi-Fi / WLAN / Wireless -> Основные настройки -> Номер канала',
      description: 'Установите фиксированный канал для снижения интерференции.',
    },
    cliCommandTemplate: (channel) => {
      return `# Откройте веб-интерфейс роутера (обычно http://192.168.1.1 или 192.168.0.1) и установите канал: ${channel}`;
    },
  },
];

export function generateNightCronScript(router: RouterModel, bestChannel24: number, bestChannel5: number): string {
  if (router === 'keenetic') {
    return `#!/bin/sh
# Keenetic Night Channel Optimizer (Запуск каждую ночь в 04:00 через /opt/etc/cron.daily/)
rci interface WifiMaster0 channel ${bestChannel24}
rci interface WifiMaster1 channel ${bestChannel5}
rci system configuration save
logger -t "WiFi-Expert" "Автонастройка каналов выполнена: 2.4G:${bestChannel24}, 5G:${bestChannel5}"
`;
  }
  if (router === 'openwrt') {
    return `#!/bin/sh
# OpenWrt Night Channel Tune Script для crontab: 0 4 * * * /etc/wifi-tune.sh
uci set wireless.radio0.channel='${bestChannel24}'
uci set wireless.radio1.channel='${bestChannel5}'
uci commit wireless
wifi reload
logger -t "WiFi-Expert" "Wi-Fi каналы оптимизированы: radio0=${bestChannel24}, radio1=${bestChannel5}"
`;
  }
  if (router === 'mikrotik') {
    return `# MikroTik RouterOS Script: wifi-auto-tune
/system script
/system scheduler
add interval=1d name=night-tune start-date=jan/01/2026 start-time=04:00 on-event="
/interface wireless set [find default-name=wlan1] frequency=${2412 + (bestChannel24 - 1) * 5}
/interface wireless set [find default-name=wlan2] frequency=${5000 + bestChannel5 * 5}
:log info \\"WiFi-Expert: Ночные каналы обновлены 2.4G:${bestChannel24}, 5G:${bestChannel5}\\"
"
`;
  }
  return `#!/bin/sh
# Универсальный скрипт оптимизации каналов
echo "Рекомендуемый канал 2.4 ГГц: ${bestChannel24}"
echo "Рекомендуемый канал 5 ГГц: ${bestChannel5}"
`;
}
