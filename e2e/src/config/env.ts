import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

export type TargetEnvironment = 'local' | 'remote';
export type AccountRole = 'patient' | 'professional' | 'dual' | 'admin';

export interface AccountCredentials {
  email: string;
  password: string;
}

const rawTarget = (process.env.TARGET_ENV ?? 'local').trim().toLowerCase();
export const TARGET_ENV: TargetEnvironment = rawTarget === 'remote' ? 'remote' : 'local';

// Carrega .env.<target> (se existir) e depois .env genérico (sem sobrescrever variáveis já definidas no shell)
const e2eRoot = path.resolve(__dirname, '../..');
const targetEnvFile = path.join(e2eRoot, `.env.${TARGET_ENV}`);
const genericEnvFile = path.join(e2eRoot, '.env');

if (fs.existsSync(targetEnvFile)) {
  dotenv.config({ path: targetEnvFile });
}
if (fs.existsSync(genericEnvFile)) {
  dotenv.config({ path: genericEnvFile });
}

const DEFAULT_URLS: Record<TargetEnvironment, { baseUrl: string; apiUrl: string }> = {
  local: {
    baseUrl: 'http://localhost:4200',
    apiUrl: 'http://localhost:8080',
  },
  remote: {
    baseUrl: 'https://quickcare-frontend.vercel.app',
    apiUrl: 'https://quickcare-backend-b4a4.onrender.com',
  },
};

// Massa seed local definida em quickcare-backend/src/main/resources/db/seed-dev/R__massa_local.sql
const LOCAL_SEED_ACCOUNTS: Record<AccountRole, AccountCredentials> = {
  patient: {
    email: 'paciente@quickcare.dev',
    password: 'Senha@123',
  },
  professional: {
    email: 'profissional@quickcare.dev',
    password: 'Senha@123',
  },
  dual: {
    email: 'ambos@quickcare.dev',
    password: 'Senha@123',
  },
  admin: {
    email: 'admin@quickcare.dev',
    password: 'Senha@123',
  },
};

function resolveCredentials(role: AccountRole, envEmailKey: string, envPassKey: string): AccountCredentials {
  const emailFromEnv = process.env[envEmailKey]?.trim() ?? '';
  const passFromEnv = process.env[envPassKey]?.trim() ?? '';

  if (emailFromEnv && passFromEnv) {
    return { email: emailFromEnv, password: passFromEnv };
  }

  if (TARGET_ENV === 'local') {
    return LOCAL_SEED_ACCOUNTS[role];
  }

  return { email: '', password: '' };
}

export const envConfig = {
  target: TARGET_ENV,
  isLocal: TARGET_ENV === 'local',
  isRemote: TARGET_ENV === 'remote',
  baseUrl: (process.env.BASE_URL ?? DEFAULT_URLS[TARGET_ENV].baseUrl).replace(/\/+$/, ''),
  apiUrl: (process.env.API_URL ?? DEFAULT_URLS[TARGET_ENV].apiUrl).replace(/\/+$/, ''),
  videoMode: (process.env.E2E_VIDEO ?? 'retain-on-failure') as 'off' | 'on' | 'retain-on-failure',
  accounts: {
    patient: resolveCredentials('patient', 'E2E_PATIENT_EMAIL', 'E2E_PATIENT_PASSWORD'),
    professional: resolveCredentials('professional', 'E2E_PROFESSIONAL_EMAIL', 'E2E_PROFESSIONAL_PASSWORD'),
    dual: resolveCredentials('dual', 'E2E_DUAL_EMAIL', 'E2E_DUAL_PASSWORD'),
    admin: resolveCredentials('admin', 'E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'),
  },
  hasCredentials(role: AccountRole): boolean {
    const creds = this.accounts[role];
    return Boolean(creds.email && creds.password);
  },
};
