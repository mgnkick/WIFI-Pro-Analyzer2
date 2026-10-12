import { Network, ConnectionStatus } from '@capacitor/network';
import { Device, DeviceInfo } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';

export interface AndroidSystemStatus {
  isAndroid: boolean;
  deviceModel: string;
  osVersion: string;
  platform: string;
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'none' | 'unknown';
  hasLocationPermission: boolean | 'prompt' | 'denied';
  isLocationAvailable: boolean;
}

class AndroidSystemService {
  private lastStatus: AndroidSystemStatus = {
    isAndroid: false,
    deviceModel: 'Мобильное устройство',
    osVersion: '',
    platform: 'web',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
    hasLocationPermission: 'prompt',
    isLocationAvailable: false,
  };
  private listeners: ((status: AndroidSystemStatus) => void)[] = [];
  private settingsListeners: ((type: 'wifi' | 'vpn' | 'location') => void)[] = [];

  constructor() {
    this.init();
  }

  public onSettingsRequested(cb: (type: 'wifi' | 'vpn' | 'location') => void): () => void {
    this.settingsListeners.push(cb);
    return () => {
      this.settingsListeners = this.settingsListeners.filter(l => l !== cb);
    };
  }

  public notifySettingsRequested(type: 'wifi' | 'vpn' | 'location') {
    this.settingsListeners.forEach(cb => {
      try { cb(type); } catch {}
    });
  }

  private async init() {
    try {
      const info: DeviceInfo = await Device.getInfo();
      const isAndroid = info.platform === 'android' || /android/i.test(navigator.userAgent);
      
      this.lastStatus.isAndroid = isAndroid;
      this.lastStatus.deviceModel = info.model || (isAndroid ? 'Android-смартфон' : 'Браузер');
      this.lastStatus.osVersion = info.osVersion || (info.operatingSystem ? `${info.operatingSystem}` : '');
      this.lastStatus.platform = info.platform;

      const netStatus: ConnectionStatus = await Network.getStatus();
      this.lastStatus.isOnline = netStatus.connected;
      this.lastStatus.connectionType = netStatus.connectionType as any;

      Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
        this.lastStatus.isOnline = status.connected;
        this.lastStatus.connectionType = status.connectionType as any;
        this.notify();
      });

      if ('permissions' in navigator && (navigator as any).permissions.query) {
        try {
          const perm = await (navigator as any).permissions.query({ name: 'geolocation' });
          this.lastStatus.hasLocationPermission = perm.state === 'granted';
          perm.onchange = () => {
            this.lastStatus.hasLocationPermission = perm.state === 'granted';
            this.notify();
          };
        } catch {}
      }
    } catch {
      this.lastStatus.isOnline = navigator.onLine;
    }
    this.notify();
  }

  public getStatus(): AndroidSystemStatus {
    return { ...this.lastStatus, isOnline: navigator.onLine };
  }

  public subscribe(cb: (status: AndroidSystemStatus) => void): () => void {
    this.listeners.push(cb);
    cb(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter(s => s !== cb);
    };
  }

  private notify() {
    const s = this.getStatus();
    this.listeners.forEach(cb => cb(s));
  }

  public async requestAllStartupPermissions(): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => {
            this.lastStatus.hasLocationPermission = true;
            this.lastStatus.isLocationAvailable = true;
            this.notify();
          },
          () => {},
          { timeout: 7000, enableHighAccuracy: false, maximumAge: 300000 }
        );
      }
    } catch {}

    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    } catch {}
  }

  public async requestLocationPermission(): Promise<boolean> {
    return new Promise(resolve => {
      if (!('geolocation' in navigator)) {
        resolve(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        () => {
          this.lastStatus.hasLocationPermission = true;
          this.lastStatus.isLocationAvailable = true;
          this.notify();
          resolve(true);
        },
        () => {
          this.lastStatus.hasLocationPermission = 'denied';
          this.notify();
          resolve(false);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    });
  }

  public async getLocalLanIp(): Promise<string | null> {
    return new Promise(resolve => {
      try {
        const RTCPC = window.RTCPeerConnection || (window as any).webkitRTCPeerConnection;
        if (!RTCPC) {
          resolve(null);
          return;
        }
        const pc = new RTCPC({ iceServers: [] });
        let resolved = false;
        const timer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try { pc.close(); } catch {}
            resolve(null);
          }
        }, 1200);

        pc.createDataChannel('');
        pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timer);
            resolve(null);
          }
        });

        pc.onicecandidate = (event) => {
          if (!event || !event.candidate) return;
          const candidateStr = event.candidate.candidate;
          const ipMatch = candidateStr.match(/(?:192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+)/);
          if (ipMatch && !resolved) {
            resolved = true;
            clearTimeout(timer);
            try { pc.close(); } catch {}
            resolve(ipMatch[0]);
          }
        };
      } catch {
        resolve(null);
      }
    });
  }

  public async probeLocalGateway(): Promise<string | null> {
    const commonGateways = ['192.168.1.1', '192.168.0.1', '192.168.31.1', '192.168.8.1', '192.168.100.1', '10.0.0.1'];
    
    const probe = async (gw: string): Promise<string | null> => {
      try {
        const start = performance.now();
        await fetch(`http://${gw}/favicon.ico?_t=${Date.now()}`, {
          method: 'HEAD',
          mode: 'no-cors',
          signal: AbortSignal.timeout(500),
        });
        const elapsed = performance.now() - start;
        if (elapsed < 480) return gw;
      } catch {}
      return null;
    };

    const results = await Promise.all(commonGateways.map(gw => probe(gw)));
    const found = results.find(gw => gw !== null);
    return found || null;
  }

  public getIntentUrl(intentAction: string): string {
    return `intent:#Intent;action=${intentAction};category=android.intent.category.DEFAULT;package=com.android.settings;end`;
  }

  public getWifiSettingsIntentUrl(): string {
    return this.getIntentUrl('android.settings.WIFI_SETTINGS');
  }

  public getVpnSettingsIntentUrl(): string {
    return this.getIntentUrl('android.settings.VPN_SETTINGS');
  }

  public getLocationSettingsIntentUrl(): string {
    return this.getIntentUrl('android.settings.LOCATION_SOURCE_SETTINGS');
  }

  public launchIntent(intentAction: string): void {
    const intentUrl = this.getIntentUrl(intentAction);
    const fallbackWirelessUrl = `intent:#Intent;action=android.settings.WIRELESS_SETTINGS;category=android.intent.category.DEFAULT;package=com.android.settings;end`;

    if (intentAction.includes('WIFI')) {
      this.notifySettingsRequested('wifi');
    } else if (intentAction.includes('VPN')) {
      this.notifySettingsRequested('vpn');
    } else if (intentAction.includes('LOCATION')) {
      this.notifySettingsRequested('location');
    }

    if (Capacitor.isNativePlatform()) {
      AppLauncher.openUrl({ url: intentUrl })
        .catch(() => AppLauncher.openUrl({ url: fallbackWirelessUrl }))
        .catch(() => AppLauncher.openUrl({ url: 'intent:#Intent;action=android.settings.SETTINGS;package=com.android.settings;end' }))
        .catch(() => {});
      return;
    }

    try {
      window.location.href = intentUrl;
    } catch {
      try {
        const link = document.createElement('a');
        link.href = intentUrl;
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          try { document.body.removeChild(link); } catch {}
        }, 150);
      } catch {}
    }
  }

  public openWifiSettings(): void {
    this.launchIntent('android.settings.WIFI_SETTINGS');
  }

  public openLocationSettings(): void {
    this.launchIntent('android.settings.LOCATION_SOURCE_SETTINGS');
  }

  public openVpnSettings(): void {
    this.launchIntent('android.settings.VPN_SETTINGS');
  }
}

export const androidSystem = new AndroidSystemService();
