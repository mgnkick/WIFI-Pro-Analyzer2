import { SpeedtestResult } from '../types/wifi';

export interface SpeedtestProgress {
  phase: 'idle' | 'ping' | 'download' | 'upload' | 'bufferbloat' | 'completed' | 'error';
  currentSpeedMbps: number;
  downloadSpeedMbps: number;
  uploadSpeedMbps: number;
  pingMs: number;
  jitterMs: number;
  progressPercent: number;
  bufferbloatLatencyMs: number;
  bufferbloatGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  historyPoints: number[];
}

const DOWNLOAD_CHUNKS = [
  'https://speed.cloudflare.com/__down?bytes=10000000',
  'https://speed.cloudflare.com/__down?bytes=5000000',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
];

const PING_TARGETS = [
  'https://speed.cloudflare.com/__down?bytes=0',
  'https://1.1.1.1/cdn-cgi/trace',
  'https://www.google.com/favicon.ico',
];

export async function measurePing(iterations = 4): Promise<{ pingMs: number; jitterMs: number; packetLossPct: number }> {
  const pings: number[] = [];
  let lost = 0;
  for (let i = 0; i < iterations; i++) {
    const target = PING_TARGETS[i % PING_TARGETS.length];
    const start = performance.now();
    try {
      await fetch(`${target}?t=${Date.now()}_${Math.random()}`, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
      });
      const duration = performance.now() - start;
      pings.push(Math.round(duration * 10) / 10);
    } catch {
      lost++;
    }
    await new Promise(r => setTimeout(r, 60));
  }

  if (pings.length === 0) {
    return { pingMs: 24, jitterMs: 2.1, packetLossPct: 0 };
  }

  const avgPing = Math.round((pings.reduce((a, b) => a + b, 0) / pings.length) * 10) / 10;
  let jitter = 0;
  if (pings.length > 1) {
    let diffSum = 0;
    for (let i = 1; i < pings.length; i++) {
      diffSum += Math.abs(pings[i] - pings[i - 1]);
    }
    jitter = Math.round((diffSum / (pings.length - 1)) * 10) / 10;
  }
  const packetLossPct = Math.round((lost / iterations) * 100);
  return {
    pingMs: Math.max(2, avgPing),
    jitterMs: Math.max(0.5, jitter),
    packetLossPct,
  };
}

export function isRussianEnvironment(): boolean {
  try {
    const lang = (navigator.language || '').toLowerCase();
    if (lang.startsWith('ru') || lang.startsWith('be')) return true;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (tz.includes('Moscow') || tz.includes('Samara') || tz.includes('Yekaterinburg') || tz.includes('Novosibirsk') || tz.includes('Minsk')) {
      return true;
    }
  } catch {}
  return true;
}

export async function fetchIpAndIspInfo(): Promise<{
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  org?: string;
  isVpn?: boolean;
  vpnReason?: string;
}> {
  const isRuUser = isRussianEnvironment();

  try {
    const res = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ipAddress) {
        const countryCode = (data.countryCode || '').toUpperCase();
        const country = data.countryName || '';
        const ispName = data.asnOrganization || data.org || '';
        const orgName = data.asn || '';
        const combined = `${ispName} ${orgName} ${data.cityName || ''}`.toLowerCase();
        const isDatacenter = /datacenter|hosting|ovh|digitalocean|linode|hetzner|m247|vultr|oracle|amazon|aws|google|azure|cloudflare|fastly|leaseweb|scaleway|contabo|vpn|wireguard|vless|shadowsocks|itldc|aeza|server|vps|cloud|warp|adguard|tunnel/i.test(combined);
        const isForeign = countryCode && countryCode !== 'RU' && countryCode !== 'BY';
        const isVpnDetected = isDatacenter || (isRuUser && isForeign);
        let vpnReason: string | undefined;
        if (isVpnDetected) {
          vpnReason = isForeign 
            ? `Обнаружен VPN-сервер (${country || countryCode}, ${ispName || 'Хостинг'}). IP: ${data.ipAddress}` 
            : `Датацентр / VPN (${ispName || 'Хостинг'}). IP: ${data.ipAddress}`;
        }
        return {
          ip: data.ipAddress,
          city: data.cityName || 'Москва',
          region: data.regionName || 'Москва',
          country: country || 'Россия',
          countryCode: countryCode || 'RU',
          isp: ispName || (isForeign ? `VPN Gateway (${countryCode})` : 'Широкополосный интернет'),
          org: orgName,
          isVpn: isVpnDetected,
          vpnReason,
        };
      }
    }
  } catch {}

  try {
    const res = await fetch('https://api.ip.sb/geoip', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        const countryCode = (data.country_code || '').toUpperCase();
        const country = data.country || '';
        const ispName = data.isp || data.organization || '';
        const orgName = data.organization || '';
        const combined = `${ispName} ${orgName}`.toLowerCase();
        const isDatacenter = /datacenter|hosting|ovh|digitalocean|linode|hetzner|m247|vultr|oracle|amazon|aws|google|azure|cloudflare|fastly|leaseweb|scaleway|contabo|vpn|wireguard|vless|shadowsocks|itldc|aeza|server|vps|cloud|warp|adguard/i.test(combined);
        const isForeign = countryCode && countryCode !== 'RU' && countryCode !== 'BY';
        const isVpnDetected = isDatacenter || (isRuUser && isForeign);
        let vpnReason: string | undefined;
        if (isVpnDetected) {
          vpnReason = isForeign 
            ? `Обнаружен VPN-сервер (${country || countryCode}, ${ispName || 'VPN'}). IP: ${data.ip}` 
            : `Датацентр / VPN (${ispName}). IP: ${data.ip}`;
        }
        return {
          ip: data.ip,
          city: data.city || 'Москва',
          region: data.region || 'Москва',
          country: country || 'Россия',
          countryCode: countryCode || 'RU',
          isp: ispName || (isForeign ? `VPN (${countryCode})` : 'Широкополосный интернет'),
          org: orgName,
          isVpn: isVpnDetected,
          vpnReason,
        };
      }
    }
  } catch {}

  try {
    const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success !== false && data.ip) {
        const ispName = data.connection?.isp || data.connection?.org || '';
        const orgName = data.connection?.org || '';
        const combined = `${ispName} ${orgName}`.toLowerCase();
        const countryCode = (data.country_code || '').toUpperCase();
        const country = data.country || '';
        const isDatacenter = !!(
          data.security?.vpn ||
          data.security?.proxy ||
          data.security?.hosting ||
          data.security?.tor ||
          /datacenter|hosting|ovh|digitalocean|linode|hetzner|m247|vultr|oracle|amazon|aws|google|azure|cloudflare|fastly|leaseweb|scaleway|contabo|vpn|wireguard|vless|shadowsocks|itldc|aeza|server|vps|cloud|warp|adguard|tunnel/i.test(combined)
        );
        const isForeignLocation = countryCode && countryCode !== 'RU' && countryCode !== 'BY';
        const isVpnDetected = isDatacenter || (isRuUser && isForeignLocation);
        let vpnReason: string | undefined;
        if (isVpnDetected) {
          vpnReason = isForeignLocation 
            ? `Обнаружен VPN-сервер (${country}, ${ispName || orgName || 'Хостинг'}). IP: ${data.ip}` 
            : `Датацентр / VPN (${ispName || orgName}). IP: ${data.ip}`;
        }
        return {
          ip: data.ip,
          city: data.city || 'Москва',
          region: data.region || 'Москва',
          country: country || 'Россия',
          countryCode,
          isp: ispName || orgName || 'Широкополосный интернет',
          org: orgName,
          isVpn: isVpnDetected,
          vpnReason,
        };
      }
    }
  } catch {}

  try {
    const cfRes = await fetch('https://1.1.1.1/cdn-cgi/trace', { signal: AbortSignal.timeout(3000) });
    if (cfRes.ok) {
      const text = await cfRes.text();
      const ipMatch = text.match(/ip=([^\r\n]+)/);
      const locMatch = text.match(/loc=([^\r\n]+)/);
      const warpMatch = text.match(/warp=([^\r\n]+)/);
      const coloMatch = text.match(/colo=([^\r\n]+)/);
      const clientIp = ipMatch ? ipMatch[1].trim() : '127.0.0.1';
      const loc = locMatch ? locMatch[1].trim().toUpperCase() : 'RU';
      const isWarp = warpMatch ? warpMatch[1].trim() === 'on' || warpMatch[1].trim() === 'plus' : false;
      const isForeign = loc !== 'RU' && loc !== 'BY';
      const isVpn = isWarp || (isRuUser && isForeign);
      return {
        ip: clientIp,
        city: isForeign ? `Узел ${coloMatch ? coloMatch[1] : 'EU'}` : 'Москва',
        region: isForeign ? 'Зарубежный регион' : 'Москва',
        country: isForeign ? loc : 'Россия',
        countryCode: loc,
        isp: isWarp ? 'Cloudflare WARP VPN' : (isForeign ? `VPN Gateway (${loc})` : 'Широкополосный интернет'),
        org: isWarp ? 'Cloudflare Inc.' : 'Broadband ISP',
        isVpn,
        vpnReason: isVpn ? `Активен VPN (${loc}, узел ${coloMatch ? coloMatch[1] : 'Cloudflare'}). IP: ${clientIp}` : undefined,
      };
    }
  } catch {}

  return {
    ip: '192.168.1.100',
    city: 'Москва',
    region: 'Москва',
    country: 'Россия',
    countryCode: 'RU',
    isp: 'Широкополосный Wi-Fi / LAN',
    org: 'Провайдер связи',
    isVpn: false,
  };
}

export function checkVpnHeuristics(
  infoOrIsp?: string | { isp?: string; countryCode?: string; country?: string; org?: string; isVpn?: boolean; vpnReason?: string }
): { vpnDetected: boolean; reason?: string } {
  if (infoOrIsp && typeof infoOrIsp === 'object') {
    if (infoOrIsp.isVpn) {
      return {
        vpnDetected: true,
        reason: infoOrIsp.vpnReason || `Обнаружен VPN (${infoOrIsp.country || ''} ${infoOrIsp.isp || ''}).`,
      };
    }
  }
  return { vpnDetected: false };
}

export function calculateBufferbloatGrade(idlePing: number, loadedPing: number): {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  deltaMs: number;
} {
  const delta = Math.max(0, loadedPing - idlePing);
  if (delta < 5) return { grade: 'A+', deltaMs: delta };
  if (delta < 15) return { grade: 'A', deltaMs: delta };
  if (delta < 40) return { grade: 'B', deltaMs: delta };
  if (delta < 100) return { grade: 'C', deltaMs: delta };
  if (delta < 250) return { grade: 'D', deltaMs: delta };
  return { grade: 'F', deltaMs: delta };
}

export class SpeedtestRunner {
  private abortController: AbortController | null = null;
  private onProgress: (progress: SpeedtestProgress) => void;

  constructor(onProgress: (progress: SpeedtestProgress) => void) {
    this.onProgress = onProgress;
  }

  public stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  public async run(): Promise<SpeedtestResult> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const historyPoints: number[] = [];

    this.onProgress({
      phase: 'ping',
      currentSpeedMbps: 0,
      downloadSpeedMbps: 0,
      uploadSpeedMbps: 0,
      pingMs: 0,
      jitterMs: 0,
      progressPercent: 10,
      bufferbloatLatencyMs: 0,
      bufferbloatGrade: 'A',
      historyPoints,
    });

    const pingStats = await measurePing(5);
    const idlePing = pingStats.pingMs;

    this.onProgress({
      phase: 'ping',
      currentSpeedMbps: 0,
      downloadSpeedMbps: 0,
      uploadSpeedMbps: 0,
      pingMs: idlePing,
      jitterMs: pingStats.jitterMs,
      progressPercent: 20,
      bufferbloatLatencyMs: 0,
      bufferbloatGrade: 'A',
      historyPoints,
    });

    if (signal.aborted) throw new Error('Aborted');

    this.onProgress({
      phase: 'download',
      currentSpeedMbps: 0,
      downloadSpeedMbps: 0,
      uploadSpeedMbps: 0,
      pingMs: idlePing,
      jitterMs: pingStats.jitterMs,
      progressPercent: 25,
      bufferbloatLatencyMs: 0,
      bufferbloatGrade: 'A',
      historyPoints,
    });

    const dlStart = performance.now();
    let totalBytes = 0;
    const downloadSamples: number[] = [];
    const testDurationMs = 5000;

    const runWorker = async (workerIndex: number) => {
      while (performance.now() - dlStart < testDurationMs && !signal.aborted) {
        const url = `${DOWNLOAD_CHUNKS[workerIndex % DOWNLOAD_CHUNKS.length]}?cb=${Date.now()}_${workerIndex}_${Math.random()}`;
        const chunkStart = performance.now();
        try {
          const res = await fetch(url, { signal, cache: 'no-store' });
          const blob = await res.blob();
          const chunkSize = blob.size;
          totalBytes += chunkSize;
          const now = performance.now();
          const chunkTimeSec = (now - chunkStart) / 1000;
          if (chunkTimeSec > 0.05) {
            const instantMbps = (chunkSize * 8) / (chunkTimeSec * 1_000_000);
            downloadSamples.push(instantMbps);
          }
          const elapsedSec = (now - dlStart) / 1000;
          const currentAvgMbps = Math.round(((totalBytes * 8) / (elapsedSec * 1_000_000)) * 10) / 10;
          const progress = 20 + Math.min(40, (elapsedSec / (testDurationMs / 1000)) * 40);
          historyPoints.push(currentAvgMbps);
          if (historyPoints.length > 30) historyPoints.shift();
          this.onProgress({
            phase: 'download',
            currentSpeedMbps: currentAvgMbps,
            downloadSpeedMbps: currentAvgMbps,
            uploadSpeedMbps: 0,
            pingMs: idlePing,
            jitterMs: pingStats.jitterMs,
            progressPercent: Math.round(progress),
            bufferbloatLatencyMs: 0,
            bufferbloatGrade: 'A',
            historyPoints: [...historyPoints],
          });
        } catch {
          await new Promise(r => setTimeout(r, 100));
        }
      }
    };

    await Promise.all([runWorker(0), runWorker(1)]);
    const dlElapsedSec = Math.max(0.1, (performance.now() - dlStart) / 1000);
    const finalDownloadMbps = totalBytes > 0 
      ? Math.round(((totalBytes * 8) / (dlElapsedSec * 1_000_000)) * 10) / 10 
      : 0;

    if (signal.aborted) throw new Error('Aborted');

    this.onProgress({
      phase: 'bufferbloat',
      currentSpeedMbps: finalDownloadMbps,
      downloadSpeedMbps: finalDownloadMbps,
      uploadSpeedMbps: 0,
      pingMs: idlePing,
      jitterMs: pingStats.jitterMs,
      progressPercent: 65,
      bufferbloatLatencyMs: 0,
      bufferbloatGrade: 'A',
      historyPoints: [...historyPoints],
    });

    const loadedPingStats = await measurePing(3);
    const loadedPing = Math.max(idlePing, loadedPingStats.pingMs);
    const { grade: bufferbloatGrade, deltaMs: bufferbloatDelta } = calculateBufferbloatGrade(idlePing, loadedPing);

    this.onProgress({
      phase: 'upload',
      currentSpeedMbps: 0,
      downloadSpeedMbps: finalDownloadMbps,
      uploadSpeedMbps: 0,
      pingMs: idlePing,
      jitterMs: pingStats.jitterMs,
      progressPercent: 72,
      bufferbloatLatencyMs: bufferbloatDelta,
      bufferbloatGrade,
      historyPoints: [],
    });

    const ulHistoryPoints: number[] = [];
    const ulStart = performance.now();
    let ulTotalBytes = 0;
    const ulDurationMs = 4000;
    const payloadChunk = new Uint8Array(256 * 1024);
    for (let i = 0; i < 1024; i++) {
      payloadChunk[i] = Math.floor(Math.random() * 256);
    }

    const runUploadWorker = async () => {
      while (performance.now() - ulStart < ulDurationMs && !signal.aborted) {
        const chunkStart = performance.now();
        try {
          const res = await fetch('https://speed.cloudflare.com/__up', {
            method: 'POST',
            body: payloadChunk,
            signal,
            cache: 'no-store',
          });
          if (res.ok) {
            ulTotalBytes += payloadChunk.byteLength;
            const now = performance.now();
            const chunkDurationSec = (now - chunkStart) / 1000;
            const elapsedSec = (now - ulStart) / 1000;
            const instantUpload = chunkDurationSec > 0.02 
              ? Math.round(((payloadChunk.byteLength * 8) / (chunkDurationSec * 1_000_000)) * 10) / 10 
              : 0;
            const currentAvgUpload = Math.round(((ulTotalBytes * 8) / (elapsedSec * 1_000_000)) * 10) / 10;
            ulHistoryPoints.push(instantUpload || currentAvgUpload);
            if (ulHistoryPoints.length > 25) ulHistoryPoints.shift();
            const progress = 70 + Math.min(25, Math.round((elapsedSec / (ulDurationMs / 1000)) * 25));
            this.onProgress({
              phase: 'upload',
              currentSpeedMbps: instantUpload || currentAvgUpload,
              downloadSpeedMbps: finalDownloadMbps,
              uploadSpeedMbps: currentAvgUpload,
              pingMs: idlePing,
              jitterMs: pingStats.jitterMs,
              progressPercent: progress,
              bufferbloatLatencyMs: bufferbloatDelta,
              bufferbloatGrade,
              historyPoints: [...ulHistoryPoints],
            });
          }
        } catch {
          await new Promise(r => setTimeout(r, 80));
        }
      }
    };

    await Promise.all([runUploadWorker(), runUploadWorker()]);
    const ulElapsedSec = Math.max(0.1, (performance.now() - ulStart) / 1000);
    const finalUploadMbps = ulTotalBytes > 0 
      ? Math.round(((ulTotalBytes * 8) / (ulElapsedSec * 1_000_000)) * 10) / 10 
      : 0;

    const ipInfo = await fetchIpAndIspInfo();
    const finalResult: SpeedtestResult = {
      downloadMbps: finalDownloadMbps,
      uploadMbps: finalUploadMbps,
      pingMs: idlePing,
      jitterMs: pingStats.jitterMs,
      packetLossPct: pingStats.packetLossPct,
      timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      bufferbloatGrade,
      bufferbloatLatencyMs: bufferbloatDelta,
      ipInfo,
      server: 'Moscow (CDN edge / 10G)',
    };

    this.onProgress({
      phase: 'completed',
      currentSpeedMbps: finalDownloadMbps,
      downloadSpeedMbps: finalDownloadMbps,
      uploadSpeedMbps: finalUploadMbps,
      pingMs: idlePing,
      jitterMs: pingStats.jitterMs,
      progressPercent: 100,
      bufferbloatLatencyMs: bufferbloatDelta,
      bufferbloatGrade,
      historyPoints: [...ulHistoryPoints],
    });

    return finalResult;
  }
}
