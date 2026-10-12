import { WifiNetwork, DeviceRole, SsidGroup } from '../types/wifi';

export function hasRoamingCapabilities(capabilities?: string): boolean {
  if (!capabilities) return false;
  const caps = capabilities.toUpperCase();
  return (
    caps.includes('RRM') ||
    caps.includes('FT-PSK') ||
    caps.includes('FT-SAE') ||
    caps.includes('802.11R') ||
    caps.includes('802.11K') ||
    caps.includes('802.11V') ||
    caps.includes('WNM')
  );
}

export function isRepeaterSsid(ssid: string): boolean {
  const lower = ssid.toLowerCase();
  return (
    lower.endsWith('_ext') ||
    lower.endsWith('-ext') ||
    lower.endsWith('_re') ||
    lower.endsWith('-re') ||
    lower.endsWith('_rpt') ||
    lower.endsWith('_repeater') ||
    lower.endsWith('_plus') ||
    lower.includes('repeater') ||
    lower.includes('extender')
  );
}

export function isLocallyAdministeredMac(bssid: string): boolean {
  if (!bssid || bssid.length < 2) return false;
  const firstByte = parseInt(bssid.slice(0, 2), 16);
  if (isNaN(firstByte)) return false;
  return (firstByte & 0x02) === 0x02;
}

export function isSameHardwareMac(bssid1: string, bssid2: string): boolean {
  if (!bssid1 || !bssid2) return false;
  const parts1 = bssid1.toLowerCase().split(':');
  const parts2 = bssid2.toLowerCase().split(':');
  if (parts1.length !== 6 || parts2.length !== 6) return false;
  for (let i = 0; i < 5; i++) {
    if (parts1[i] !== parts2[i]) return false;
  }
  const last1 = parseInt(parts1[5], 16);
  const last2 = parseInt(parts2[5], 16);
  return Math.abs(last1 - last2) <= 4;
}

export function classifyWifiNetworks(networks: WifiNetwork[]): WifiNetwork[] {
  const ssidMap = new Map<string, WifiNetwork[]>();
  networks.forEach(net => {
    const list = ssidMap.get(net.ssid) || [];
    list.push(net);
    ssidMap.set(net.ssid, list);
  });

  return networks.map(net => {
    const group = ssidMap.get(net.ssid) || [net];
    const hasRoaming = Boolean(
      hasRoamingCapabilities(net.capabilities) ||
      (net.vendor && /ubiquiti|unifi|keenetic|deco|aimesh|eero|mikrotik|cisco|aruba/i.test(net.vendor))
    );

    let role: DeviceRole = 'standalone';
    let label = `Точка (${net.band})`;
    let reason = 'Единственная точка с данным BSSID в радиусе';

    if (isRepeaterSsid(net.ssid)) {
      role = 'repeater';
      label = `Репитер (${net.band})`;
      reason = 'Суффикс SSID (_EXT / _re) указывает на беспроводной повторитель';
    } else if (group.length > 1) {
      const isDualBandSingleBox = group.length === 2 &&
        group[0].band !== group[1].band &&
        isSameHardwareMac(group[0].bssid, group[1].bssid);

      if (isDualBandSingleBox) {
        role = 'dual_band';
        label = `Двухдиапазонный роутер (${net.band})`;
        reason = 'Совпадение MAC-префикса (радиомодули 2.4ГГц и 5ГГц одного роутера).';
      } else {
        if (hasRoaming) {
          role = 'mesh';
          const sorted = [...group].sort((a, b) => b.level - a.level);
          const isPrimary = sorted[0].bssid === net.bssid;
          label = isPrimary ? `Mesh-контроллер (${net.band})` : `Mesh-узел (${net.band})`;
          reason = 'Одинаковый SSID, поддержка бесшовного роуминга 802.11k/v/r (Mesh-система).';
        } else if (isLocallyAdministeredMac(net.bssid)) {
          role = 'repeater';
          label = `Репитер (${net.band})`;
          reason = 'Общий SSID с клонированным MAC-адресом (ретранслятор).';
        } else {
          role = 'router_with_ap';
          const sorted = [...group].sort((a, b) => b.level - a.level);
          const isPrimary = sorted[0].bssid === net.bssid;
          label = isPrimary ? `Главный роутер (${net.band})` : `Дополнительная точка (${net.band})`;
          reason = 'Одинаковый SSID, несколько независимых точек доступа в эфире.';
        }
      }
    }

    return {
      ...net,
      deviceRole: role,
      roamingSupported: hasRoaming,
      nodeLabel: label,
      detectionReason: reason,
    };
  });
}

export function groupNetworksBySsid(classifiedNetworks: WifiNetwork[]): SsidGroup[] {
  const map = new Map<string, WifiNetwork[]>();
  classifiedNetworks.forEach(net => {
    const list = map.get(net.ssid) || [];
    list.push(net);
    map.set(net.ssid, list);
  });

  const groups: SsidGroup[] = [];
  map.forEach((nodes, ssid) => {
    nodes.sort((a, b) => b.level - a.level);
    const bestLevel = nodes[0].level;
    const hasConnectedNode = nodes.some(n => n.isConnected);
    const bands = Array.from(new Set(nodes.map(n => n.band)));
    const channels = Array.from(new Set(nodes.map(n => n.channel)));
    const vendors = Array.from(new Set(nodes.map(n => n.vendor).filter(Boolean))) as string[];
    const securityTypes = Array.from(new Set(nodes.map(n => n.securityType)));

    let groupRole: DeviceRole = 'standalone';
    let groupReason = 'Одиночная сеть BSSID.';
    if (nodes.some(n => n.deviceRole === 'mesh')) {
      groupRole = 'mesh';
      groupReason = 'Одна сеть SSID, объединяющая узлы Mesh-системы с поддержкой роуминга (802.11k/v/r).';
    } else if (nodes.some(n => n.deviceRole === 'router_with_ap')) {
      groupRole = 'router_with_ap';
      groupReason = 'Одна сеть SSID с несколькими точками доступа или повторителями.';
    } else if (nodes.some(n => n.deviceRole === 'repeater')) {
      groupRole = 'repeater';
      groupReason = 'Сеть расширена через беспроводной репитер.';
    } else if (nodes.some(n => n.deviceRole === 'dual_band')) {
      groupRole = 'dual_band';
      groupReason = 'Двухдиапазонный роутер (2.4 и 5 ГГц).';
    }

    const roamingSupported = nodes.some(n => n.roamingSupported);
    groups.push({
      ssid,
      deviceRole: groupRole,
      roamingSupported,
      bestLevel,
      totalNodes: nodes.length,
      nodes,
      hasConnectedNode,
      bands,
      channels,
      vendor: vendors[0] || 'Неизвестно',
      securityType: securityTypes[0] || 'WPA2',
      detectionReason: groupReason,
    });
  });

  groups.sort((a, b) => {
    if (a.hasConnectedNode && !b.hasConnectedNode) return -1;
    if (!a.hasConnectedNode && b.hasConnectedNode) return 1;
    return b.bestLevel - a.bestLevel;
  });

  return groups;
}
