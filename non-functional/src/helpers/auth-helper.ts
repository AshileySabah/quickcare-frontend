import { execSync } from 'child_process';
import { ENV, Credentials } from '../config/env';

export interface AuthSession {
  token: string;
  userId: number;
  email: string;
  body: any;
}

export async function loginApi(creds: Credentials, baseUrl = ENV.backendUrl): Promise<AuthSession> {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: creds.email, senha: creds.password }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha no login de ${creds.email}: HTTP ${res.status} - ${txt}`);
  }

  const token = res.headers.get('x-auth-token') || res.headers.get('X-Auth-Token') || '';
  const body: any = await res.json();
  if (!token) {
    throw new Error(`Header X-Auth-Token ausente no login de ${creds.email}`);
  }

  return {
    token,
    userId: body?.usuario?.id ?? body?.id ?? 0,
    email: creds.email,
    body,
  };
}

export interface DockerContainerMetric {
  name: string;
  cpuPct: string;
  memUsage: string;
  memPct: string;
}

export function captureDockerStats(): DockerContainerMetric[] {
  try {
    const raw = execSync(
      'docker stats --no-stream --format "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}" quickcare-backend quickcare-postgres',
      { encoding: 'utf-8', timeout: 8000 }
    );
    return raw
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [name, cpuPct, memUsage, memPct] = line.split('|');
        return { name, cpuPct, memUsage, memPct };
      });
  } catch {
    return [];
  }
}
