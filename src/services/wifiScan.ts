import { WifiNetwork, RoomMeasurement } from '../types/wifi';
import { estimateDistanceMeters } from '../utils/signalQuality';
import { classifyWifiNetworks } from '../utils/meshDetector';

export class WifiScanService {
  private currentNetworks: WifiNetwork[] = [];
  private subscribers: ((networks: WifiNetwork[]) => void)[] = [];
  private roomMeasurements: RoomMeasurement[] = [];

  constructor() {
    this.currentNetworks = [];
  }

  public getNetworks(): WifiNetwork[] {
    return classifyWifiNetworks(this.currentNetworks);
  }

  public getConnectedNetwork(): WifiNetwork | undefined {
    return this.currentNetworks.find(n => n.isConnected);
  }

  public setNetworks(networks: WifiNetwork[]) {
    this.currentNetworks = networks;
    this.notify();
  }

  public subscribe(cb: (networks: WifiNetwork[]) => void): () => void {
    this.subscribers.push(cb);
    cb(this.getNetworks());
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== cb);
    };
  }

  private notify() {
    const data = this.getNetworks();
    this.subscribers.forEach(cb => cb(data));
  }

  public populateConnectedWifi(params?: {
    isp?: string;
    gatewayIp?: string;
    levelDbm?: number;
    ssid?: string;
  }) {
    const gw = params?.gatewayIp || '192.168.1.1';
    const level = params?.levelDbm ?? -48;
    const gatewayBssid = `50:D4:F7:2A:${gw.split('.').slice(-2).map(x => Number(x || 1).toString(16).padStart(2, '0')).join(':')}:9C`;

    let savedSsid = '';
    try {
      savedSsid = localStorage.getItem('wifi_expert_current_ssid') || '';
    } catch {}

    const connectedSsid = savedSsid.trim() 
      ? savedSsid.trim() 
      : (params?.ssid && params.ssid.trim() 
          ? params.ssid.trim() 
          : 'Домашний_Wi-Fi_5G');

    const connectedNet: WifiNetwork = {
      ssid: connectedSsid,
      bssid: gatewayBssid,
      level,
      frequency: 5180,
      channel: 36,
      channelWidth: 80,
      band: '5GHz',
      capabilities: '[WPA2-PSK-CCMP][WPA3-SAE][ESS]',
      standard: 'Wi-Fi 6 (802.11ax)',
      vendor: 'Keenetic (Основной)',
      securityType: 'WPA2',
      distanceMeters: estimateDistanceMeters(level, 5180),
      isConnected: true,
    };

    let savedVisible: WifiNetwork[] = [];
    try {
      const stored = localStorage.getItem('wifi_expert_saved_visible_networks');
      if (stored) savedVisible = JSON.parse(stored);
    } catch {}

    const defaultVisibleNets: WifiNetwork[] = [
      {
        ssid: savedSsid.trim() ? `${savedSsid.trim()} (2.4G)` : 'Домашний_Wi-Fi_2.4G',
        bssid: `50:D4:F7:2A:${gw.split('.').slice(-2).map(x => Number(x || 1).toString(16).padStart(2, '0')).join(':')}:9B`,
        level: level - 6,
        frequency: 2437,
        channel: 6,
        channelWidth: 20,
        band: '2.4GHz',
        capabilities: '[WPA2-PSK-CCMP][ESS]',
        standard: 'Wi-Fi 5 (802.11ac)',
        vendor: 'Keenetic (2.4G)',
        securityType: 'WPA2',
        distanceMeters: estimateDistanceMeters(level - 6, 2437),
        isConnected: false,
      },
      {
        ssid: 'RT-WiFi-4821',
        bssid: '2C:39:96:44:81:A2',
        level: -68,
        frequency: 2412,
        channel: 1,
        channelWidth: 20,
        band: '2.4GHz',
        capabilities: '[WPA2-PSK-CCMP][ESS]',
        standard: 'Wi-Fi 4 (802.11n)',
        vendor: 'TP-Link',
        securityType: 'WPA2',
        distanceMeters: estimateDistanceMeters(-68, 2412),
        isConnected: false,
      },
      {
        ssid: 'MGTS_GPON_2891',
        bssid: '00:11:32:9F:3B:11',
        level: -74,
        frequency: 2462,
        channel: 11,
        channelWidth: 20,
        band: '2.4GHz',
        capabilities: '[WPA2-PSK-CCMP][ESS]',
        standard: 'Wi-Fi 5 (802.11ac)',
        vendor: 'Sercomm',
        securityType: 'WPA2',
        distanceMeters: estimateDistanceMeters(-74, 2462),
        isConnected: false,
      },
      {
        ssid: 'Beeline-Smart-44',
        bssid: '14:49:E0:2B:64:1C',
        level: -79,
        frequency: 2422,
        channel: 3,
        channelWidth: 20,
        band: '2.4GHz',
        capabilities: '[WPA2-PSK-CCMP][ESS]',
        standard: 'Wi-Fi 4 (802.11n)',
        vendor: 'ZTE',
        securityType: 'WPA2',
        distanceMeters: estimateDistanceMeters(-79, 2422),
        isConnected: false,
      },
      {
        ssid: 'DomRu_WiFi_Home',
        bssid: 'D8:47:32:1A:88:5E',
        level: -72,
        frequency: 2437,
        channel: 6,
        channelWidth: 20,
        band: '2.4GHz',
        capabilities: '[WPA2-PSK-CCMP][ESS]',
        standard: 'Wi-Fi 5 (802.11ac)',
        vendor: 'Huawei',
        securityType: 'WPA2',
        distanceMeters: estimateDistanceMeters(-72, 2437),
        isConnected: false,
      },
      {
        ssid: 'Xiaomi_WiFi_Mesh',
        bssid: 'C4:AD:34:F0:19:22',
        level: -82,
        frequency: 2447,
        channel: 8,
        channelWidth: 20,
        band: '2.4GHz',
        capabilities: '[WPA2-PSK-CCMP][ESS]',
        standard: 'Wi-Fi 5 (802.11ac)',
        vendor: 'Xiaomi',
        securityType: 'WPA2',
        distanceMeters: estimateDistanceMeters(-82, 2447),
        isConnected: false,
      },
      {
        ssid: 'Free_Guest_WiFi',
        bssid: '9C:53:22:7E:11:04',
        level: -85,
        frequency: 2462,
        channel: 11,
        channelWidth: 20,
        band: '2.4GHz',
        capabilities: '[ESS]',
        standard: 'Wi-Fi 4 (802.11n)',
        vendor: 'MikroTik',
        securityType: 'Open',
        distanceMeters: estimateDistanceMeters(-85, 2462),
        isConnected: false,
      },
      {
        ssid: savedSsid.trim() ? `${savedSsid.trim()} (Mesh)` : 'Домашний_Wi-Fi_Mesh',
        bssid: `50:D4:F7:2A:${gw.split('.').slice(-2).map(x => Number(x || 1).toString(16).padStart(2, '0')).join(':')}:9D`,
        level: -62,
        frequency: 5220,
        channel: 44,
        channelWidth: 80,
        band: '5GHz',
        capabilities: '[WPA2-PSK-CCMP][WPA3-SAE][ESS]',
        standard: 'Wi-Fi 6 (802.11ax)',
        vendor: 'Keenetic (Mesh-сателлит)',
        securityType: 'WPA2',
        distanceMeters: estimateDistanceMeters(-62, 5220),
        isConnected: false,
      },
      {
        ssid: 'RT-WiFi-5G-90',
        bssid: '74:83:C2:55:10:90',
        level: -69,
        frequency: 5200,
        channel: 40,
        channelWidth: 80,
        band: '5GHz',
        capabilities: '[WPA2-PSK-CCMP][WPA3-SAE][ESS]',
        standard: 'Wi-Fi 6 (802.11ax)',
        vendor: 'Huawei',
        securityType: 'WPA2',
        distanceMeters: estimateDistanceMeters(-69, 5200),
        isConnected: false,
      },
      {
        ssid: 'TP-Link_Archer_5G',
        bssid: 'E0:D5:5E:12:43:55',
        level: -73,
        frequency: 5240,
        channel: 48,
        channelWidth: 80,
        band: '5GHz',
        capabilities: '[WPA2-PSK-CCMP][ESS]',
        standard: 'Wi-Fi 5 (802.11ac)',
        vendor: 'TP-Link',
        securityType: 'WPA2',
        distanceMeters: estimateDistanceMeters(-73, 5240),
        isConnected: false,
      },
      {
        ssid: 'ASUS_ZenWiFi_5G',
        bssid: '04:D9:F5:61:9A:88',
        level: -71,
        frequency: 5745,
        channel: 149,
        channelWidth: 80,
        band: '5GHz',
        capabilities: '[WPA2-PSK-CCMP][WPA3-SAE][ESS]',
        standard: 'Wi-Fi 6 (802.11ax)',
        vendor: 'ASUS',
        securityType: 'WPA2',
        distanceMeters: estimateDistanceMeters(-71, 5745),
        isConnected: false,
      },
      {
        ssid: 'ASUS_ROG_WiFi6E',
        bssid: '04:D9:F5:61:9A:90',
        level: -75,
        frequency: 5955,
        channel: 1,
        channelWidth: 160,
        band: '6GHz',
        capabilities: '[WPA3-SAE][ESS]',
        standard: 'Wi-Fi 6E (802.11ax)',
        vendor: 'ASUS',
        securityType: 'WPA2',
        distanceMeters: estimateDistanceMeters(-75, 5955),
        isConnected: false,
      }
    ];

    const combined = [connectedNet];
    const existingBssids = new Set([connectedNet.bssid]);
    for (const n of savedVisible) {
      if (!existingBssids.has(n.bssid)) {
        combined.push(n);
        existingBssids.add(n.bssid);
      }
    }
    for (const n of defaultVisibleNets) {
      if (!existingBssids.has(n.bssid)) {
        combined.push(n);
        existingBssids.add(n.bssid);
      }
    }

    this.currentNetworks = combined;
    this.notify();
  }

  public updateConnectedSsid(newSsid: string) {
    const trimmed = newSsid.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem('wifi_expert_current_ssid', trimmed);
    } catch {}
    this.currentNetworks = this.currentNetworks.map(n => {
      if (n.isConnected) {
        return { ...n, ssid: trimmed };
      }
      return n;
    });
    this.notify();
  }

  public clearNetworks() {
    this.currentNetworks = [];
    this.notify();
  }

  public triggerScan() {
    if (this.currentNetworks.length > 0) {
      this.currentNetworks = this.currentNetworks.map(n => ({
        ...n,
        level: Math.max(-88, Math.min(-30, n.level + (Math.floor(Math.random() * 3) - 1)))
      }));
    }
    this.notify();
  }

  public destroy() {
    this.subscribers = [];
  }
}

export const wifiScanner = new WifiScanService();
