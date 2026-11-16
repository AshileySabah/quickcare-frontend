import * as http from 'http';
import * as https from 'https';
import { performance } from 'perf_hooks';

export interface HttpSample {
  timestampOffsetMs: number;
  durationMs: number;
  ttfbMs: number;
  statusCode: number;
  ok: boolean;
  bytes: number;
  error?: string;
}

export interface LatencyStats {
  totalRequests: number;
  successCount: number;
  errorCount: number;
  errorRatePct: number;
  durationTotalMs: number;
  throughputRps: number;
  minMs: number;
  avgMs: number;
  stdDevMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  ttfbAvgMs: number;
  statusHistogram: Record<string, number>;
}

export interface RequestSpec {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  expectedStatuses?: number[];
}

export function singleHttpRequest(
  spec: RequestSpec,
  agent?: http.Agent | https.Agent,
  suiteStartMs = performance.now()
): Promise<HttpSample> {
  return new Promise((resolve) => {
    const parsed = new URL(spec.url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;
    const start = performance.now();
    let ttfb = 0;
    let bytes = 0;
    let settled = false;

    const finish = (sample: HttpSample) => {
      if (!settled) {
        settled = true;
        resolve(sample);
      }
    };

    const headers: Record<string, string> = { ...(spec.headers || {}) };
    if (spec.body && !headers['Content-Length']) {
      headers['Content-Length'] = String(Buffer.byteLength(spec.body));
    }

    const req = lib.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: spec.method || 'GET',
        headers,
        agent,
        timeout: spec.timeoutMs || 15000,
      },
      (res) => {
        ttfb = performance.now() - start;
        res.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
        });
        res.on('end', () => {
          const durationMs = performance.now() - start;
          const code = res.statusCode || 0;
          const expected = spec.expectedStatuses || [200, 201, 204];
          finish({
            timestampOffsetMs: start - suiteStartMs,
            durationMs: round2(durationMs),
            ttfbMs: round2(ttfb),
            statusCode: code,
            ok: expected.includes(code),
            bytes,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('TIMEOUT'));
    });

    req.on('error', (err: Error) => {
      const durationMs = performance.now() - start;
      finish({
        timestampOffsetMs: start - suiteStartMs,
        durationMs: round2(durationMs),
        ttfbMs: round2(ttfb || durationMs),
        statusCode: 0,
        ok: false,
        bytes,
        error: err.message || 'NETWORK_ERROR',
      });
    });

    if (spec.body) {
      req.write(spec.body);
    }
    req.end();
  });
}

export function computeStats(samples: HttpSample[], wallDurationMs: number): LatencyStats {
  const n = samples.length;
  if (n === 0) {
    return {
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      errorRatePct: 0,
      durationTotalMs: round2(wallDurationMs),
      throughputRps: 0,
      minMs: 0,
      avgMs: 0,
      stdDevMs: 0,
      p50Ms: 0,
      p90Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      maxMs: 0,
      ttfbAvgMs: 0,
      statusHistogram: {},
    };
  }

  const durations = samples.map((s) => s.durationMs).sort((a, b) => a - b);
  const sum = durations.reduce((acc, v) => acc + v, 0);
  const avg = sum / n;
  const variance = durations.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / n;
  const ttfbAvg = samples.reduce((acc, s) => acc + s.ttfbMs, 0) / n;

  const statusHistogram: Record<string, number> = {};
  let successCount = 0;
  for (const s of samples) {
    const key = s.statusCode > 0 ? String(s.statusCode) : `ERR:${s.error || 'TIMEOUT'}`;
    statusHistogram[key] = (statusHistogram[key] || 0) + 1;
    if (s.ok) successCount++;
  }

  const errorCount = n - successCount;
  return {
    totalRequests: n,
    successCount,
    errorCount,
    errorRatePct: round2((errorCount / n) * 100),
    durationTotalMs: round2(wallDurationMs),
    throughputRps: round2(n / Math.max(wallDurationMs / 1000, 0.001)),
    minMs: round2(durations[0]),
    avgMs: round2(avg),
    stdDevMs: round2(Math.sqrt(variance)),
    p50Ms: percentile(durations, 50),
    p90Ms: percentile(durations, 90),
    p95Ms: percentile(durations, 95),
    p99Ms: percentile(durations, 99),
    maxMs: round2(durations[n - 1]),
    ttfbAvgMs: round2(ttfbAvg),
    statusHistogram,
  };
}

export async function runConcurrentWave(options: {
  concurrency: number;
  totalRequests: number;
  specFactory: (index: number) => RequestSpec;
  keepAlive?: boolean;
}): Promise<{ stats: LatencyStats; samples: HttpSample[] }> {
  const firstUrl = options.specFactory(0).url;
  const isHttps = firstUrl.startsWith('https:');
  const agent = isHttps
    ? new https.Agent({ keepAlive: options.keepAlive ?? true, maxSockets: options.concurrency })
    : new http.Agent({ keepAlive: options.keepAlive ?? true, maxSockets: options.concurrency });

  const samples: HttpSample[] = [];
  let cursor = 0;
  const startWall = performance.now();

  const worker = async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= options.totalRequests) break;
      const spec = options.specFactory(idx);
      const sample = await singleHttpRequest(spec, agent, startWall);
      samples.push(sample);
    }
  };

  const workers = Array.from(
    { length: Math.min(options.concurrency, options.totalRequests) },
    () => worker()
  );
  await Promise.all(workers);
  agent.destroy();

  const wallMs = performance.now() - startWall;
  return { stats: computeStats(samples, wallMs), samples };
}

export function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedValues.length) - 1;
  return round2(sortedValues[Math.max(0, Math.min(idx, sortedValues.length - 1))]);
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
