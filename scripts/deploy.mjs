import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

const wrangler = process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler';
const run = (args, capture = false) => execFileSync(wrangler, args, {
  encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
});
const dbName = 'studio-jl-agenda';
const remote = '.wrangler.remote.toml';
const localPlaceholder = '00000000-0000-4000-8000-000000000001';
if (existsSync(remote)) throw new Error('Remova .wrangler.remote.toml de uma execução anterior antes de continuar.');

run(['whoami']);
const getDatabase = () => JSON.parse(run(['d1', 'list', '--json'], true)).find(db => db.name === dbName);
let db = getDatabase();
if (!db) {
  run(['d1', 'create', dbName, '--update-config=false']);
  db = getDatabase();
}
if (!db?.uuid || !/^[a-f0-9-]{36}$/.test(db.uuid)) throw new Error('A Cloudflare não retornou o ID do banco D1.');

const base = readFileSync('wrangler.toml', 'utf8');
const config = base.replace(localPlaceholder, db.uuid);
if (config === base) throw new Error('Não foi possível configurar o vínculo com o D1.');
writeFileSync(remote, config, { flag: 'wx', mode: 0o600 });
try {
  run(['d1', 'migrations', 'apply', dbName, '--remote', '--config', remote]);
  const args = ['deploy', '--config', remote];
  if (process.env.AGENDA_SECRETS_FILE) args.push('--secrets-file', process.env.AGENDA_SECRETS_FILE);
  run(args);
} finally {
  unlinkSync(remote);
}
