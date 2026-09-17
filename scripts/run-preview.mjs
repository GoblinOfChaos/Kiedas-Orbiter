import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const command = process.argv[2];
if (!['dev', 'build'].includes(command)) throw new Error('Expected dev or build');

// Validate all tauri.*.conf.json files before ever spawning tauri - see
// validate-tauri-configs.js for why. This is the actual enforcement point
// (not package.json's prebuild hook, which only auto-fires for `npm/pnpm
// run build`, not for this script) so it runs no matter how this file is
// invoked.
const validate = spawnSync(process.execPath, [fileURLToPath(new URL('./validate-tauri-configs.js', import.meta.url))], { stdio: 'inherit' });
if ((validate.status ?? 1) !== 0) process.exit(validate.status ?? 1);

const cli = fileURLToPath(new URL('../node_modules/@tauri-apps/cli/tauri.js', import.meta.url));
const args = [cli, command, '--features', 'preview', '--config', 'src-tauri/tauri.preview.conf.json', ...process.argv.slice(3)];
const env = { ...process.env, CARGO_BUILD_JOBS: '4', UV_THREADPOOL_SIZE: '2' };
const result = process.platform === 'win32'
  ? spawnSync(process.execPath, args, { env, stdio: 'inherit' })
  : spawnSync('nice', ['-n', '19', process.execPath, ...args], { env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
