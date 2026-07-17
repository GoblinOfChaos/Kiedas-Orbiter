use std::fs;
use std::path::PathBuf;

/// VA offset config loaded from data/export/memory_offsets.json.
/// Pushed as a raw JSON file on the same cadence as other exports;
/// no release cycle needed to update.
///
/// `buffer_va` accepts either a decimal number (5805568) or a
/// hex string ("0x589000") for readability.
#[derive(Debug, Clone, serde::Serialize)]
pub struct MemOffsets {
    pub buffer_va: u64,
    pub buffer_size: usize,
}

impl<'de> serde::Deserialize<'de> for MemOffsets {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        #[derive(serde::Deserialize)]
        struct Raw {
            #[serde(rename = "buffer_va")]
            buffer_va: serde_json::Value,
            #[serde(rename = "buffer_size")]
            buffer_size: usize,
        }
        let raw = Raw::deserialize(deserializer)?;
        let buffer_va = match &raw.buffer_va {
            serde_json::Value::Number(n) => n.as_u64().ok_or_else(|| {
                serde::de::Error::custom("buffer_va must be a non-negative integer")
            })?,
            serde_json::Value::String(s) => {
                let s = s.trim();
                if let Some(hex) = s.strip_prefix("0x").or_else(|| s.strip_prefix("0X")) {
                    u64::from_str_radix(hex, 16).map_err(|_| {
                        serde::de::Error::custom(format!("invalid hex buffer_va: {s}"))
                    })?
                } else {
                    s.parse::<u64>().map_err(|_| {
                        serde::de::Error::custom(format!("invalid buffer_va: {s}"))
                    })?
                }
            }
            _ => return Err(serde::de::Error::custom("buffer_va must be a number or string")),
        };
        Ok(MemOffsets { buffer_va, buffer_size: raw.buffer_size })
    }
}

impl Default for MemOffsets {
    fn default() -> Self {
        Self {
            buffer_va: 0x589000,
            buffer_size: 0x4000,
        }
    }
}

/// Load memory offsets from the export directory, falling back to defaults.
pub fn load_offsets() -> MemOffsets {
    let path = offsets_path();
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str::<MemOffsets>(&s).ok())
        .unwrap_or_default()
}

fn offsets_path() -> PathBuf {
    crate::get_data_root().join("data/export/memory_offsets.json")
}

/// Path to the per-user offset override cache.
fn cache_offsets_path() -> PathBuf {
    crate::get_data_root().join("data/user/memory_offset_override.json")
}

/// Load offsets from the local disk cache (written after a successful
/// validation in a previous session).  Returns `None` if no cache exists.
pub fn load_offset_cache() -> Option<MemOffsets> {
    let path = cache_offsets_path();
    fs::read_to_string(&path).ok()
        .and_then(|s| serde_json::from_str::<MemOffsets>(&s).ok())
}

/// Persist validated offsets to the local cache so subsequent launches
/// skip discovery and go straight to the known-good VA.
pub fn save_offset_cache(offsets: &MemOffsets) {
    let path = cache_offsets_path();
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(offsets) {
        let _ = fs::write(&path, &json);
    }
}

/// Read the EE.log ring buffer from Warframe's process memory at the configured VA.
/// On failure returns a short `&'static str` error tag for UI mapping.
pub fn read_ring_buffer(pid: u32, off: &MemOffsets, scratch: &mut Vec<u8>) -> Result<(), &'static str> {
    scratch.resize(off.buffer_size, 0);
    read_process_memory(pid, off.buffer_va, scratch)
}

/// Validate that the buffer at the configured VA actually contains EE.log content.
/// Returns `Ok(())` if at least 3 lines match the expected log format.
pub fn validate_buffer(buf: &[u8]) -> Result<(), &'static str> {
    let valid = buf
        .split(|&b| b == b'\n')
        .filter(|l| l.len() > 12 && l[0].is_ascii_digit())
        .filter(|l| {
            let s = std::str::from_utf8(l).unwrap_or("");
            s.contains("EE [Info]: ")
                || s.contains("Sys [Info]: ")
                || s.contains("Script [Info]: ")
                || s.contains("Net [Info]: ")
                || s.contains("Game [Info]: ")
        })
        .count();
    if valid < 3 {
        return Err("stale_offset");
    }
    Ok(())
}

/// Delta-diff the current buffer against the previous snapshot.
/// Returns a byte slice of new/changed content since the last poll,
/// starting at the beginning of the line containing the first divergence.
///
/// Ported from helpers/main.cpp:645-667 (cursor-based incremental extraction).
pub fn extract_new<'a>(current: &'a [u8], previous: &[u8]) -> &'a [u8] {
    let check = current.len().min(previous.len());
    let divergence = (0..check)
        .find(|&i| current[i] != previous[i])
        .unwrap_or(check);

    if divergence >= current.len() {
        return &[];
    }

    // Rewind to start of line containing the divergence
    let line_start = (0..divergence)
        .rev()
        .find(|&i| current[i] == b'\n')
        .map(|i| i + 1)
        .unwrap_or(0);

    &current[line_start..]
}

// ── Platform-specific process memory reading ──────────────────────────────────

#[cfg(target_os = "linux")]
fn read_process_memory(pid: u32, va: u64, buf: &mut [u8]) -> Result<(), &'static str> {
    use std::os::unix::fs::FileExt;
    let path = format!("/proc/{pid}/mem");
    let f = fs::File::open(&path).map_err(|_| "open_mem_failed")?;
    f.read_at(buf, va).map_err(|_| "read_failed")?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn read_process_memory(pid: u32, va: u64, buf: &mut [u8]) -> Result<(), &'static str> {
    use std::mem;
    use std::ptr;

    type HANDLE = *mut std::ffi::c_void;
    type BOOL = i32;
    type DWORD = u32;
    type LPCVOID = *const std::ffi::c_void;
    type LPVOID = *mut std::ffi::c_void;
    type SIZE_T = usize;
    type LPSIZE_T = *mut usize;

    const PROCESS_VM_READ: DWORD = 0x0010;
    const PROCESS_QUERY_INFORMATION: DWORD = 0x0400;

    extern "system" {
        fn OpenProcess(dwDesiredAccess: DWORD, bInheritHandle: BOOL, dwProcessId: DWORD) -> HANDLE;
        fn ReadProcessMemory(
            hProcess: HANDLE,
            lpBaseAddress: LPCVOID,
            lpBuffer: LPVOID,
            nSize: SIZE_T,
            lpNumberOfBytesRead: LPSIZE_T,
        ) -> BOOL;
        fn CloseHandle(hObject: HANDLE) -> BOOL;
    }

    let handle = unsafe {
        OpenProcess(PROCESS_VM_READ | PROCESS_QUERY_INFORMATION, 0, pid)
    };
    if handle.is_null() {
        return Err("open_process_failed");
    }

    let mut bytes_read: SIZE_T = 0;
    let ok = unsafe {
        ReadProcessMemory(
            handle,
            va as LPCVOID,
            buf.as_mut_ptr() as LPVOID,
            buf.len(),
            &mut bytes_read as LPSIZE_T,
        )
    };

    unsafe { CloseHandle(handle) };

    if ok == 0 || bytes_read != buf.len() {
        return Err("read_failed");
    }
    Ok(())
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
fn read_process_memory(_pid: u32, _va: u64, _buf: &mut [u8]) -> Result<(), &'static str> {
    Err("unsupported_platform")
}
