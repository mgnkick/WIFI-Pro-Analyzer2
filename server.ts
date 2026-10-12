import express from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execFileAsync = promisify(execFile);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json());

  // Real ICMP ping endpoint
  app.get('/api/ping', async (req, res) => {
    const rawHost = String(req.query.host || 'ya.ru').trim();
    const count = Math.min(10, Math.max(1, parseInt(String(req.query.count || '4'), 10)));

    // Strict validation to avoid command injection: only valid hostname or IP
    if (!/^[a-zA-Z0-9.-]+$/.test(rawHost) || rawHost.startsWith('-')) {
      return res.status(400).json({ error: 'Неверный хост для пинга' });
    }

    try {
      let stdout = '';
      try {
        const result = await execFileAsync('ping', ['-c', String(count), '-i', '0.2', '-W', '2', rawHost]);
        stdout = result.stdout;
      } catch (firstErr: any) {
        if (firstErr?.stdout && firstErr.stdout.includes('packet loss')) {
          stdout = firstErr.stdout;
        } else {
          try {
            const retry = await execFileAsync('ping', ['-c', String(count), '-W', '2', rawHost]);
            stdout = retry.stdout;
          } catch (secondErr: any) {
            stdout = secondErr?.stdout || '';
          }
        }
      }

      const packetLines = stdout.split('\n').filter(line => line.includes('bytes from') && line.includes('time='));
      const packets = packetLines.map((line, idx) => {
        const timeMatch = line.match(/time=([0-9.]+)\s*ms/);
        const ttlMatch = line.match(/ttl=([0-9]+)/i);
        const seqMatch = line.match(/icmp_seq=([0-9]+)/i);
        const bytesMatch = line.match(/^([0-9]+)\s*bytes/i);
        return {
          seq: seqMatch ? parseInt(seqMatch[1], 10) : idx + 1,
          sizeBytes: bytesMatch ? parseInt(bytesMatch[1], 10) : 64,
          latencyMs: timeMatch ? parseFloat(timeMatch[1]) : 0,
          ttl: ttlMatch ? parseInt(ttlMatch[1], 10) : 55,
          isLoss: false,
          timestamp: Date.now() - (packetLines.length - idx) * 100,
        };
      });

      const statsMatch = stdout.match(/rtt min\/avg\/max\/mdev = ([0-9.]+)\/([0-9.]+)\/([0-9.]+)\/([0-9.]+)/i);
      const lossMatch = stdout.match(/([0-9.]+)%\s*packet loss/i);

      const minMs = statsMatch ? parseFloat(statsMatch[1]) : (packets.length ? Math.min(...packets.map(p => p.latencyMs)) : 0);
      const avgMs = statsMatch ? parseFloat(statsMatch[2]) : (packets.length ? Math.round((packets.reduce((a, b) => a + b.latencyMs, 0) / packets.length) * 10) / 10 : 0);
      const maxMs = statsMatch ? parseFloat(statsMatch[3]) : (packets.length ? Math.max(...packets.map(p => p.latencyMs)) : 0);
      const jitterMs = statsMatch ? parseFloat(statsMatch[4]) : 0;
      const lossPct = lossMatch ? parseFloat(lossMatch[1]) : ((count - packets.length) / count) * 100;
      const ttl = packets[0]?.ttl ?? (rawHost.includes('.') ? 56 : undefined);

      return res.json({
        host: rawHost,
        protocol: 'ICMP (Протокол RFC 792)',
        isIcmp: true,
        sent: count,
        received: packets.length,
        lossPct: Math.round(lossPct * 10) / 10,
        minMs: Math.round(minMs * 10) / 10,
        avgMs: Math.round(avgMs * 10) / 10,
        maxMs: Math.round(maxMs * 10) / 10,
        jitterMs: Math.round(jitterMs * 10) / 10,
        ttl,
        packets,
        rawOutput: stdout,
      });
    } catch (err: any) {
      const stdout = err?.stdout || '';
      const lossMatch = stdout.match(/([0-9.]+)%\s*packet loss/i);
      return res.json({
        host: rawHost,
        protocol: 'ICMP (Протокол RFC 792)',
        isIcmp: true,
        sent: count,
        received: 0,
        lossPct: lossMatch ? parseFloat(lossMatch[1]) : 100,
        minMs: 0,
        avgMs: 0,
        maxMs: 0,
        jitterMs: 0,
        packets: [],
        error: 'Превышен тайм-аут ICMP Echo Request',
      });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WiFi Expert running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
