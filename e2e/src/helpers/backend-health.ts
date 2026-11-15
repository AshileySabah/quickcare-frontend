import { envConfig } from '../config/env';

let cachedReachable: boolean | null = null;

/**
 * Verifica se a API backend do ambiente alvo responde em GET /ufs.
 * - No ambiente remoto (Render), aguarda até 45s para absorver eventual cold start.
 * - No ambiente local (Docker :8080), verifica rapidamente (4s) para não travar a suíte caso o container esteja desligado.
 */
export async function isBackendReachable(): Promise<boolean> {
  if (cachedReachable !== null) {
    return cachedReachable;
  }

  const timeoutMs = envConfig.isRemote ? 45_000 : 4_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${envConfig.apiUrl}/ufs`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    cachedReachable = response.ok;
    return cachedReachable;
  } catch {
    cachedReachable = false;
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function backendUnavailableReason(): string {
  if (envConfig.isLocal) {
    return `Backend local indisponível em ${envConfig.apiUrl}. Inicie o Docker no quickcare-backend (./dev.ps1 ou docker compose up -d) para executar os testes fullstack (@auth / @fluxo).`;
  }
  return `Backend remoto (${envConfig.apiUrl}) não respondeu dentro do tempo limite de warmup.`;
}
