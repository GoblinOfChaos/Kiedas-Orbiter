import test from 'node:test';
import assert from 'node:assert/strict';
import {
  candidateEeLogPaths,
  formatEeLogStatus,
  parseSteamLibraryFolders,
} from '../../src/lib/eeLogPaths.js';

test('parses and de-duplicates Steam library folder paths', () => {
  assert.deepEqual(parseSteamLibraryFolders(
    '"libraryfolders" { "0" { "path" "/home/test/.local/share/Steam" } "1" { "path" "D:\\\\SteamLibrary" } }'
  ), ['/home/test/.local/share/Steam', 'D:\\SteamLibrary']);
});

test('orders Linux candidates from the default through Steam alternatives and libraries', () => {
  assert.deepEqual(candidateEeLogPaths({
    home: '/home/test',
    libraryFoldersVdf: '"0" { "path" "/mnt/games" } "1" { "path" "/home/test/.local/share/Steam" }',
  }), [
    '/home/test/.local/share/Steam/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log',
    '/home/test/.steam/steam/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log',
    '/home/test/.var/app/com.valvesoftware.Steam/.local/share/Steam/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log',
    '/mnt/games/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log',
  ]);
});

test('handles platform-specific candidate rules', () => {
  assert.deepEqual(candidateEeLogPaths({ platform: 'win32', localAppData: 'C:\\Users\\Test\\AppData\\Local' }), ['C:\\Users\\Test\\AppData\\Local/Warframe/EE.log']);
  assert.deepEqual(candidateEeLogPaths({ platform: 'darwin', home: '/Users/test' }), []);
});

test('formats status text', () => {
  assert.equal(formatEeLogStatus({ exists: true, readable: true, modifiedAgoSecs: 12.9 }), 'Found, updated 12 s ago');
  assert.equal(formatEeLogStatus({ exists: true, readable: false }), 'Not readable');
  assert.equal(formatEeLogStatus({ exists: false, readable: false }), 'File not found');
});
