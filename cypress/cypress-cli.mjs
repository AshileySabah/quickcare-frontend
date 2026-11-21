import { spawn } from 'node:child_process';

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn('npx', ['cypress', ...process.argv.slice(2)], { env, stdio: 'inherit', shell: true });
child.on('exit', (code) => process.exit(code ?? 1));
