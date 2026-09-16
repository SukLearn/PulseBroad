import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePingOutput } from '../src/monitoring/pingMonitor.js';

test('parses Linux ping metrics', () => {
  const result = parsePingOutput('3 packets transmitted, 3 received, 0% packet loss, time 2002ms\nrtt min/avg/max/mdev = 3.900/4.800/5.700/0.700 ms', 'linux');
  assert.deepEqual(result, { packetsSent: 3, packetsReceived: 3, packetLoss: 0, minimumLatency: 3.9, maximumLatency: 5.7, averageLatency: 4.8 });
});

test('parses Windows ping metrics', () => {
  const result = parsePingOutput('Packets: Sent = 3, Received = 2, Lost = 1 (33% loss),\nMinimum = 24ms, Maximum = 33ms, Average = 28ms', 'win32');
  assert.equal(result.packetsReceived, 2); assert.equal(result.packetLoss, 33); assert.equal(result.averageLatency, 28);
});

test('failed ping defaults to total packet loss', () => {
  const result = parsePingOutput('ping: unknown host nowhere.invalid', 'linux');
  assert.equal(result.packetLoss, 100); assert.equal(result.packetsReceived, 0);
});

