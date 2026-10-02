import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const command = process.argv[2];
if (!['dev', 'build', 'deploy'].includes(command)) throw new Error('Expected dev, build, or deploy');

function deployLatestAppImage() {
  if (process.platform !== 'linux') throw new Error('deploy only supports the Linux AppImage target');
  const bundleDir = fileURLToPath(new URL('../src-tauri/target/release/bundle/appimage/', import.meta.url));
  const candidates = fs.readdirSync(bundleDir)
    .filter((f) => f.endsWith('.AppImage'))
    .map((f) => ({ file: f, mtime: fs.statSync(path.join(bundleDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (candidates.length === 0) throw new Error(`No .AppImage found in ${bundleDir} - run a build first`);
  const source = path.join(bundleDir, candidates[0].file);
  const target = path.join(os.homedir(), 'AppImages', 'kiedas_orbiter_preview.appimage');
  const backupPrefix = `${path.basename(target)}.bak-`;
  const backupRetention = 3;

  if (fs.existsSync(target)) {
    const stamp = new Date().toTimeString().slice(0, 5).replace(':', '');
    const backup = `${target}.bak-${stamp}`;
    fs.rmSync(backup, { force: true });
    fs.linkSync(target, backup);
    console.log(`Backed up existing AppImage -> ${backup}`);
  }
  fs.rmSync(target, { force: true });
  fs.linkSync(source, target);
  fs.chmodSync(target, 0o755);
  console.log(`Deployed ${source} -> ${target}`);

  const backups = fs.readdirSync(path.dirname(target))
    .filter((file) => file.startsWith(backupPrefix))
    .map((file) => {
      const backupPath = path.join(path.dirname(target), file);
      return { path: backupPath, mtimeMs: fs.statSync(backupPath).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const backup of backups.slice(backupRetention)) {
    fs.rmSync(backup.path);
    console.log(`Removed old AppImage backup -> ${backup.path}`);
  }
}

if (command === 'deploy') {
  deployLatestAppImage();
  process.exit(0);
}

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
const status = result.status ?? 1;
if (status !== 0) process.exit(status);

if (command === 'build') deployLatestAppImage();
