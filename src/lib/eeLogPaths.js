export const EE_LOG_SUFFIX = 'steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log';

export function parseSteamLibraryFolders(vdf = '') {
  const folders = [];
  const seen = new Set();
  const pathPattern = /"path"\s+"((?:\\.|[^"\\])*)"/g;
  let match;
  while ((match = pathPattern.exec(vdf)) !== null) {
    const path = match[1].replace(/\\\\/g, '\\').replace(/\\"/g, '"');
    if (path && !seen.has(path)) {
      seen.add(path);
      folders.push(path);
    }
  }
  return folders;
}

export function candidateEeLogPaths({ platform = 'linux', home = '', localAppData = '', libraryFoldersVdf = '' } = {}) {
  if (platform === 'darwin') return [];
  if (platform === 'win32') return localAppData ? [`${localAppData}/Warframe/EE.log`] : [];

  const roots = [
    `${home}/.local/share/Steam`,
    `${home}/.steam/steam`,
    `${home}/.var/app/com.valvesoftware.Steam/.local/share/Steam`,
    ...parseSteamLibraryFolders(libraryFoldersVdf),
  ];
  const seen = new Set();
  return roots
    .map((root) => `${root}/${EE_LOG_SUFFIX}`)
    .filter((path) => {
      if (!path || seen.has(path)) return false;
      seen.add(path);
      return true;
    });
}

export function eeLogDirectory(path) {
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return slash > 0 ? path.slice(0, slash) : undefined;
}

export function formatEeLogStatus({ exists, readable, modifiedAgoSecs } = {}) {
  if (!exists) return 'File not found';
  if (!readable) return 'Not readable';
  const age = Number.isFinite(modifiedAgoSecs) ? modifiedAgoSecs : 0;
  return `Found, updated ${Math.max(0, Math.floor(age))} s ago`;
}
