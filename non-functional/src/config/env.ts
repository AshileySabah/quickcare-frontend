import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

export type TestEnv = 'local' | 'remote';

const rawEnv = (process.env.TEST_ENV || 'local').toLowerCase();
export const TEST_ENV: TestEnv = rawEnv === 'remote' ? 'remote' : 'local';

const rootDir = path.resolve(__dirname, '../..');
const envFile = path.join(rootDir, TEST_ENV === 'remote' ? '.env.remote' : '.env.local');
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

export interface Credentials {
  email: string;
  password: string;
}

export const ENV = {
  mode: TEST_ENV,
  isLocal: TEST_ENV === 'local',
  isRemote: TEST_ENV === 'remote',
  frontendUrl:
    TEST_ENV === 'remote'
      ? process.env.REMOTE_FRONTEND_URL || 'https://quickcare-frontend.vercel.app'
      : process.env.LOCAL_FRONTEND_URL || 'http://localhost:4200',
  backendUrl:
    TEST_ENV === 'remote'
      ? process.env.REMOTE_BACKEND_URL || 'https://quickcare-backend-b4a4.onrender.com'
      : process.env.LOCAL_BACKEND_URL || 'http://localhost:8080',
  accounts: {
    patient: {
      email:
        TEST_ENV === 'remote'
          ? process.env.E2E_PATIENT_EMAIL || ''
          : process.env.LOCAL_PATIENT_EMAIL || 'paciente@quickcare.dev',
      password:
        TEST_ENV === 'remote'
          ? process.env.E2E_PATIENT_PASSWORD || ''
          : process.env.LOCAL_PATIENT_PASSWORD || 'Senha@123',
    },
    patientB: {
      email: process.env.LOCAL_PATIENT_B_EMAIL || 'maria@quickcare.dev',
      password: process.env.LOCAL_PATIENT_B_PASSWORD || 'Senha@123',
    },
    professional: {
      email:
        TEST_ENV === 'remote'
          ? process.env.E2E_PROFESSIONAL_EMAIL || ''
          : process.env.LOCAL_PROFESSIONAL_EMAIL || 'profissional@quickcare.dev',
      password:
        TEST_ENV === 'remote'
          ? process.env.E2E_PROFESSIONAL_PASSWORD || ''
          : process.env.LOCAL_PROFESSIONAL_PASSWORD || 'Senha@123',
    },
    dual: {
      email:
        TEST_ENV === 'remote'
          ? process.env.E2E_DUAL_EMAIL || ''
          : process.env.LOCAL_DUAL_EMAIL || 'ambos@quickcare.dev',
      password:
        TEST_ENV === 'remote'
          ? process.env.E2E_DUAL_PASSWORD || ''
          : process.env.LOCAL_DUAL_PASSWORD || 'Senha@123',
    },
    admin: {
      email:
        TEST_ENV === 'remote'
          ? process.env.E2E_ADMIN_EMAIL || ''
          : process.env.LOCAL_ADMIN_EMAIL || 'admin@quickcare.dev',
      password:
        TEST_ENV === 'remote'
          ? process.env.E2E_ADMIN_PASSWORD || ''
          : process.env.LOCAL_ADMIN_PASSWORD || 'Senha@123',
    },
  },
  rootDir,
  reportsDir: path.join(rootDir, 'relatorios'),
};

export function assertLocalOnly(suiteName: string): void {
  if (
    ENV.isRemote ||
    ENV.backendUrl.includes('onrender.com') ||
    ENV.frontendUrl.includes('vercel.app')
  ) {
    throw new Error(
      `[TRAVA DE SEGURANCA] A suite "${suiteName}" exige execucao exclusiva em ambiente Docker Local para nao sobrecarregar ou bloquear o ambiente gratuito Render/Vercel.`
    );
  }
}
