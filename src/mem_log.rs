//! Reads Warframe's EE.log ring buffer directly out of the game process's
//! memory instead of tailing the file on disk. Ported from Cephalon
//! Kronos's proven approach (glowseeker/cephalon-kronos, log_scanner.rs /
//! memory_scan.rs / mem_reader.rs) - the game writes to this in-memory
//! buffer immediately and flushes to disk on its own schedule, so reading
//! memory directly closes whatever gap file-tailing has relative to it.
//! See the TODO.md entry dated 2026-07-30 for why this was taken on: it's
//! the likely real fix for the confirmed ~10s Riven trigger delay.

use std::fs;
use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, Instant};

pub struct MemOffsets {
    pub buffer_va: u64,
    pub buffer_size: usize,
}

struct PidCache {
    pid: u32,
    found_at: Instant,
}

static PID_CACHE: Mutex<Option<PidCache>> = Mutex::new(None);
const PID_CACHE_TTL: Duration = Duration::from_secs(5);

/// Returns the PID of the running Warframe game process (not the launcher),
/// if any. Cached briefly to avoid re-scanning every poll cycle.
pub fn get_warframe_pid() -> Option<u32> {
    if let Ok(cache) = PID_CACHE.lock() {
        if let Some(c) = cache.as_ref() {
            if c.found_at.elapsed() < PID_CACHE_TTL {
                return Some(c.pid);
            }
        }
    }
    let found = get_warframe_pid_uncached();
    if let (Ok(mut cache), Some(pid)) = (PID_CACHE.lock(), found) {
        *cache = Some(PidCache {
            pid,
            found_at: Instant::now(),
        });
    }
    found
}

#[cfg(target_os = "linux")]
fn get_warframe_pid_uncached() -> Option<u32> {
    // Collect all matching PIDs, preferring the actual game binary (which
    // typically has ".x64" in its name under Proton/Wine) over the
    // launcher - both contain "Warframe" in their name, but only the game
    // process has the EE.log ring buffer.
    let mut candidates: Vec<(u32, bool)> = Vec::new();
    let Ok(entries) = fs::read_dir("/proc") else {
        return None;
    };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let pid_str = name.to_string_lossy();
        if !pid_str.chars().all(|c| c.is_ascii_digit()) {
            continue;
        }
        let Ok(pid) = pid_str.parse::<u32>() else {
            continue;
        };
        let comm_path = Path::new("/proc").join(&name).join("comm");
        if let Ok(comm) = fs::read_to_string(&comm_path) {
            if comm.contains("Warframe") || comm.contains("warframe") {
                let is_game = comm.contains(".x64") || comm.contains(".X64");
                candidates.push((pid, is_game));
                continue;
            }
        }
        let cmd_path = Path::new("/proc").join(&name).join("cmdline");
        if let Ok(cmd) = fs::read_to_string(&cmd_path) {
            if cmd.contains("Warframe") || cmd.contains("warframe") {
                let is_game = cmd.contains(".x64") || cmd.contains(".X64");
                candidates.push((pid, is_game));
            }
        }
    }
    candidates.sort_by(|a, b| b.1.cmp(&a.1));
    candidates.into_iter().next().map(|(pid, _)| pid)
}

#[cfg(target_os = "windows")]
fn get_warframe_pid_uncached() -> Option<u32> {
    type Handle = *mut std::ffi::c_void;
    type Dword = u32;
    type Bool = i32;
    type Wchar = u16;

    const TH32CS_SNAPPROCESS: Dword = 0x00000002;
    const INVALID_HANDLE_VALUE: isize = -1;

    #[repr(C)]
    #[allow(non_snake_case)]
    struct PROCESSENTRY32W {
        dwSize: Dword,
        cntUsage: Dword,
        th32ProcessID: Dword,
        th32DefaultHeapID: *mut std::ffi::c_void,
        th32ModuleID: Dword,
        cntThreads: Dword,
        th32ParentProcessID: Dword,
        pcPriClassBase: i32,
        dwFlags: Dword,
        szExeFile: [Wchar; 260],
    }

    extern "system" {
        fn CreateToolhelp32Snapshot(dwFlags: Dword, th32ProcessID: Dword) -> Handle;
        fn Process32FirstW(hSnapshot: Handle, lppe: *mut PROCESSENTRY32W) -> Bool;
        fn Process32NextW(hSnapshot: Handle, lppe: *mut PROCESSENTRY32W) -> Bool;
        fn CloseHandle(hObject: Handle) -> Bool;
    }

    unsafe {
        let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if snapshot.is_null() || snapshot as isize == INVALID_HANDLE_VALUE {
            return None;
        }
        let mut entry: PROCESSENTRY32W = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as Dword;

        let mut candidates: Vec<(u32, bool)> = Vec::new();
        if Process32FirstW(snapshot, &mut entry) != 0 {
            loop {
                let name = String::from_utf16_lossy(
                    &entry.szExeFile[..entry
                        .szExeFile
                        .iter()
                        .position(|&c| c == 0)
                        .unwrap_or(entry.szExeFile.len())],
                );
                if name.to_lowercase().contains("warframe") {
                    let is_game = name.to_lowercase().contains(".x64");
                    candidates.push((entry.th32ProcessID, is_game));
                }
                if Process32NextW(snapshot, &mut entry) == 0 {
                    break;
                }
            }
        }
        CloseHandle(snapshot);
        candidates.sort_by(|a, b| b.1.cmp(&a.1));
        candidates.into_iter().next().map(|(pid, _)| pid)
    }
}

struct MemRegion {
    start: u64,
    end: u64,
}

#[cfg(target_os = "linux")]
fn readable_anonymous_regions(pid: u32) -> Option<Vec<MemRegion>> {
    let maps = fs::read_to_string(format!("/proc/{pid}/maps")).ok()?;
    let mut regions = Vec::new();
    for line in maps.lines() {
        let mut cols = line.split_whitespace();
        let range = cols.next()?;
        let perms = cols.next()?;
        if !perms.starts_with('r') {
            continue;
        }
        let _ = (cols.next(), cols.next(), cols.next());
        let path = cols.next().unwrap_or("");
        let is_anon = path.is_empty() || path.starts_with('[');
        let is_writable = perms.contains('w');
        if !is_anon && !is_writable {
            continue;
        }
        let (s, e) = range.split_once('-')?;
        let start = u64::from_str_radix(s, 16).ok()?;
        let end = u64::from_str_radix(e, 16).ok()?;
        regions.push(MemRegion { start, end });
    }
    Some(regions)
}

#[cfg(target_os = "windows")]
fn readable_anonymous_regions(pid: u32) -> Option<Vec<MemRegion>> {
    type Handle = *mut std::ffi::c_void;
    type Bool = i32;
    type Dword = u32;
    type Lpcvoid = *const std::ffi::c_void;
    type SizeT = usize;

    const PROCESS_QUERY_INFORMATION: Dword = 0x0400;
    const PROCESS_VM_READ: Dword = 0x0010;
    const MEM_COMMIT: Dword = 0x1000;
    const PAGE_READONLY: Dword = 0x02;
    const PAGE_READWRITE: Dword = 0x04;
    const PAGE_EXECUTE_READ: Dword = 0x20;
    const PAGE_EXECUTE_READWRITE: Dword = 0x40;

    #[repr(C)]
    struct MEMORY_BASIC_INFORMATION {
        base_address: Lpcvoid,
        allocation_base: Lpcvoid,
        allocation_protect: Dword,
        region_size: SizeT,
        state: Dword,
        protect: Dword,
        type_: Dword,
    }

    extern "system" {
        fn OpenProcess(dwDesiredAccess: Dword, bInheritHandle: Bool, dwProcessId: Dword) -> Handle;
        fn VirtualQueryEx(
            hProcess: Handle,
            lpAddress: Lpcvoid,
            lpBuffer: *mut MEMORY_BASIC_INFORMATION,
            dwLength: SizeT,
        ) -> SizeT;
        fn CloseHandle(hObject: Handle) -> Bool;
    }

    unsafe {
        let handle = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, 0, pid);
        if handle.is_null() {
            return None;
        }
        let mut regions = Vec::new();
        let mut addr: u64 = 0;
        loop {
            let mut info: MEMORY_BASIC_INFORMATION = std::mem::zeroed();
            let written = VirtualQueryEx(
                handle,
                addr as Lpcvoid,
                &mut info,
                std::mem::size_of::<MEMORY_BASIC_INFORMATION>(),
            );
            if written == 0 {
                break;
            }
            let readable = matches!(
                info.protect,
                PAGE_READONLY | PAGE_READWRITE | PAGE_EXECUTE_READ | PAGE_EXECUTE_READWRITE
            );
            if info.state == MEM_COMMIT && readable {
                let start = info.base_address as u64;
                let end = start + info.region_size as u64;
                regions.push(MemRegion { start, end });
            }
            let next = info.base_address as u64 + info.region_size as u64;
            if next <= addr {
                break;
            }
            addr = next;
        }
        CloseHandle(handle);
        Some(regions)
    }
}

fn ee_log_score(buf: &[u8]) -> usize {
    buf.split(|&b| b == b'\n')
        .filter(|l| l.len() > 12 && l[0].is_ascii_digit())
        .filter(|l| {
            let s = std::str::from_utf8(l).unwrap_or("");
            s.contains("EE [Info]: ")
                || s.contains("Sys [Info]: ")
                || s.contains("Script [Info]: ")
                || s.contains("Net [Info]: ")
                || s.contains("Game [Info]: ")
        })
        .count()
}

/// One-shot discovery: scan all readable/anonymous regions for EE.log ring
/// buffer content. Returns the VA + size of the best-scoring candidate.
/// buffer_size is capped at 1MB - real ring buffer allocations are
/// typically 128KB-512KB, and this cap matters: if the read window ends up
/// smaller than the actual ring buffer, log lines written outside it stay
/// invisible until the write cursor wraps around, producing exactly the
/// "hella delayed" symptom Kronos's own code comments describe hitting
/// before they widened this.
pub fn discover_ring_buffer(pid: u32) -> Option<(u64, usize)> {
    const MIN_LOG_SCORE: usize = 3;
    const CHUNK: u64 = 65536;
    const SCORE_OVERLAP: u64 = 256;
    const MAX_READ_SIZE: usize = 1024 * 1024;

    let regions = readable_anonymous_regions(pid)?;
    let mem_path = mem_read_handle_path(pid);
    let mut best_score = 0usize;
    let mut best_va = 0u64;
    let mut best_end = 0u64;
    let mut buf = vec![0u8; CHUNK as usize];
    let stride = CHUNK - SCORE_OVERLAP;

    for region in &regions {
        let total = region.end.saturating_sub(region.start);
        let mut offset = 0u64;
        while offset < total {
            let want = (total - offset).min(CHUNK) as usize;
            if read_process_memory_raw(&mem_path, pid, region.start + offset, &mut buf[..want])
                .is_err()
            {
                break;
            }
            let score = ee_log_score(&buf[..want]);
            if score > best_score {
                best_score = score;
                best_va = region.start + offset;
                best_end = region.end;
            }
            if want < CHUNK as usize {
                break;
            }
            offset += stride;
        }
    }

    if best_score < MIN_LOG_SCORE {
        return None;
    }
    let read_size = best_end.saturating_sub(best_va).min(MAX_READ_SIZE as u64) as usize;
    Some((best_va, read_size))
}

#[cfg(target_os = "linux")]
fn mem_read_handle_path(pid: u32) -> String {
    format!("/proc/{pid}/mem")
}

#[cfg(target_os = "linux")]
fn read_process_memory_raw(
    mem_path: &str,
    _pid: u32,
    va: u64,
    buf: &mut [u8],
) -> Result<(), &'static str> {
    use std::os::unix::fs::FileExt;
    let f = fs::File::open(mem_path).map_err(|_| "open_mem_failed")?;
    f.read_at(buf, va).map_err(|_| "read_failed")?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn mem_read_handle_path(_pid: u32) -> String {
    String::new()
}

#[cfg(target_os = "windows")]
fn read_process_memory_raw(
    _mem_path: &str,
    pid: u32,
    va: u64,
    buf: &mut [u8],
) -> Result<(), &'static str> {
    type Handle = *mut std::ffi::c_void;
    type Bool = i32;
    type Dword = u32;
    type Lpcvoid = *const std::ffi::c_void;
    type Lpvoid = *mut std::ffi::c_void;
    type SizeT = usize;
    type LpsizeT = *mut usize;

    const PROCESS_VM_READ: Dword = 0x0010;
    const PROCESS_QUERY_INFORMATION: Dword = 0x0400;

    extern "system" {
        fn OpenProcess(dwDesiredAccess: Dword, bInheritHandle: Bool, dwProcessId: Dword) -> Handle;
        fn ReadProcessMemory(
            hProcess: Handle,
            lpBaseAddress: Lpcvoid,
            lpBuffer: Lpvoid,
            nSize: SizeT,
            lpNumberOfBytesRead: LpsizeT,
        ) -> Bool;
        fn CloseHandle(hObject: Handle) -> Bool;
    }

    unsafe {
        let handle = OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, 0, pid);
        if handle.is_null() {
            return Err("open_mem_failed");
        }
        let mut read: usize = 0;
        let ok = ReadProcessMemory(
            handle,
            va as Lpcvoid,
            buf.as_mut_ptr() as Lpvoid,
            buf.len(),
            &mut read,
        );
        CloseHandle(handle);
        if ok == 0 || read != buf.len() {
            return Err("read_failed");
        }
        Ok(())
    }
}

/// Read the EE.log ring buffer at the configured VA.
pub fn read_ring_buffer(
    pid: u32,
    off: &MemOffsets,
    scratch: &mut Vec<u8>,
) -> Result<(), &'static str> {
    scratch.resize(off.buffer_size, 0);
    let path = mem_read_handle_path(pid);
    read_process_memory_raw(&path, pid, off.buffer_va, scratch)
}

/// Sanity check: does this buffer actually look like EE.log content?
pub fn validate_buffer(buf: &[u8]) -> bool {
    ee_log_score(buf) >= 3
}

pub fn load_offset_cache(cache_path: &Path) -> Option<MemOffsets> {
    let s = fs::read_to_string(cache_path).ok()?;
    let mut parts = s.trim().split(',');
    let buffer_va = u64::from_str_radix(parts.next()?.trim_start_matches("0x"), 16).ok()?;
    let buffer_size = parts.next()?.parse().ok()?;
    Some(MemOffsets {
        buffer_va,
        buffer_size,
    })
}

pub fn save_offset_cache(cache_path: &Path, offsets: &MemOffsets) {
    if let Some(parent) = cache_path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(
        cache_path,
        format!("{:#x},{}", offsets.buffer_va, offsets.buffer_size),
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ee_log_score_counts_recognizable_lines() {
        let buf = b"123.456 Sys [Info]: something happened\n\
                     789.012 Script [Info]: another line\n\
                     garbage garbage garbage\n\
                     345.678 Game [Info]: a third real line\n";
        assert_eq!(ee_log_score(buf), 3);
    }

    #[test]
    fn ee_log_score_ignores_non_digit_prefixed_lines() {
        let buf = b"not a real log line Sys [Info]: fake\n";
        assert_eq!(ee_log_score(buf), 0);
    }

    #[test]
    fn validate_buffer_requires_minimum_score() {
        let good = b"1.0 Sys [Info]: a\n2.0 Sys [Info]: b\n3.0 Sys [Info]: c\n";
        let bad = b"1.0 Sys [Info]: only one real line\n";
        assert!(validate_buffer(good));
        assert!(!validate_buffer(bad));
    }

    #[test]
    fn offset_cache_round_trips() {
        let dir = std::env::temp_dir().join(format!("mem_log_test_{}", std::process::id()));
        let path = dir.join("offset_cache.txt");
        let offsets = MemOffsets {
            buffer_va: 0x7f00_1234_5678,
            buffer_size: 131072,
        };
        save_offset_cache(&path, &offsets);
        let loaded = load_offset_cache(&path).expect("cache should load");
        assert_eq!(loaded.buffer_va, offsets.buffer_va);
        assert_eq!(loaded.buffer_size, offsets.buffer_size);
        let _ = std::fs::remove_dir_all(&dir);
    }
}
