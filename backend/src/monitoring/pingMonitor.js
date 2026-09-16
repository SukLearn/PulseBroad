import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export function parsePingOutput(output, platform = process.platform) {
  const text = String(output ?? '');
  let sent = 3, received = 0, loss = 100, min = null, max = null, avg = null;
  if (platform === 'win32') {
    const packets = text.match(/Sent = (\d+), Received = (\d+), Lost = \d+ \((\d+)% loss\)/i);
    const times = text.match(/Minimum = (\d+)ms, Maximum = (\d+)ms, Average = (\d+)ms/i);
    if (packets) [, sent, received, loss] = packets.map(Number);
    if (times) [, min, max, avg] = times.map(Number);
  } else {
    const packets = text.match(/(\d+) packets transmitted, (\d+) (?:packets )?received, ([\d.]+)% packet loss/i);
    const times = text.match(/(?:round-trip|rtt) min\/avg\/max\/(?:mdev|stddev) = ([\d.]+)\/([\d.]+)\/([\d.]+)/i);
    if (packets) [, sent, received, loss] = packets.map(Number);
    if (times) { min = Number(times[1]); avg = Number(times[2]); max = Number(times[3]); }
  }
  return { packetsSent: Number(sent), packetsReceived: Number(received), packetLoss: Number(loss),
    minimumLatency: min, maximumLatency: max, averageLatency: avg };
}

export async function monitorPing(service, { exec = execFileAsync, platform = process.platform } = {}) {
  const checkedAt = new Date().toISOString();
  const timeout = service.timeout_ms ?? 10000;
  const args = platform === 'win32' ? ['-n', '3', '-w', String(Math.min(timeout, 10000)), service.address]
    : ['-c', '3', '-W', String(Math.max(1, Math.ceil(timeout / 3000))), service.address];
  try {
    const { stdout = '', stderr = '' } = await exec('ping', args, { timeout: timeout + 2000, windowsHide: true, maxBuffer: 1024 * 1024 });
    const metrics = parsePingOutput(`${stdout}\n${stderr}`, platform);
    return { checkedAt, status: metrics.packetsReceived > 0 ? 'UP' : 'DOWN', ...metrics,
      responseTime: metrics.averageLatency, errorMessage: metrics.packetsReceived > 0 ? null : '100% packet loss' };
  } catch (error) {
    const metrics = parsePingOutput(`${error.stdout ?? ''}\n${error.stderr ?? ''}`, platform);
    const reachable = metrics.packetsReceived > 0;
    return { checkedAt, status: reachable ? 'UP' : 'DOWN', ...metrics, responseTime: metrics.averageLatency,
      errorMessage: reachable ? null : metrics.packetLoss === 100 ? '100% packet loss' : 'Ping failed' };
  }
}
