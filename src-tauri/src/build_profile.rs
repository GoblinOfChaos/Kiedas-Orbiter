use std::path::PathBuf;
pub const IS_PREVIEW: bool = cfg!(feature = "preview");
pub fn preview_root(data_dir: Option<PathBuf>) -> Result<PathBuf, String> {
    data_dir.map(|p| p.join("kiedas-orbiter-preview"))
        .ok_or_else(|| "Preview cannot resolve the OS data directory; no legacy fallback is allowed".into())
}
pub fn require_live() -> Result<(), String> {
    Ok(()) // User requested live inventory sync in Preview
}
// Not called from production code yet - Preview's own update-checking flow
// is still fully disabled (no signing key, no published feed; see GitHub
// issue #109 SEC-UPD-001 follow-up), so this guard has nothing to protect
// until that channel exists. Kept (not deleted) since it's already tested
// and matches the require_live/require_preview policy-guard pattern.
#[allow(dead_code)]
pub fn require_updates() -> Result<(), String> {
    if IS_PREVIEW { Err("Application updates are disabled in Preview".into()) } else { Ok(()) }
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn missing_os_directory_has_no_fallback() { assert!(preview_root(None).is_err()); }
    #[test] fn root_is_isolated() { assert_eq!(preview_root(Some(PathBuf::from("profiles"))).unwrap(), PathBuf::from("profiles/kiedas-orbiter-preview")); }
    #[test] fn policy_matches_build() { assert_eq!(require_live().is_err(), IS_PREVIEW); assert_eq!(require_updates().is_err(), IS_PREVIEW); }
}

pub fn require_preview() -> Result<(), String> { if IS_PREVIEW { Ok(()) } else { Err("Profile copy import is Preview-only".into()) } }
