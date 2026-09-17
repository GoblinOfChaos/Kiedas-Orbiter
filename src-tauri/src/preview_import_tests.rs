use super::*;
use std::sync::atomic::{AtomicUsize, Ordering};
static NEXT: AtomicUsize = AtomicUsize::new(0);
struct Fixture(PathBuf);
impl Fixture {
    fn new() -> Self { let p = std::env::temp_dir().join(format!("preview-journal-test-{}-{}", std::process::id(), NEXT.fetch_add(1, Ordering::Relaxed))); fs::create_dir_all(&p).unwrap(); Self(p) }
    fn target(&self) -> PathBuf { self.0.join("target") }
    fn pending(&self) -> PathBuf {
        let t = self.target(); let b = t.join("preview-import-backup-test");
        fs::create_dir_all(t.join("notes")).unwrap(); fs::create_dir_all(b.join("notes")).unwrap();
        fs::write(b.join("notes/a.md"), "old a").unwrap(); fs::write(b.join("notes/b.md"), "old b").unwrap();
        fs::write(t.join("notes/a.md"), "new a").unwrap(); fs::write(t.join("notes/aa.md"), "new aa").unwrap();
        let j = Journal { version:1, files: vec![JournalFile { relative:"notes/a.md".into(),existed:true },JournalFile { relative:"notes/aa.md".into(),existed:false },JournalFile { relative:"notes/b.md".into(),existed:true }] };
        durable_new(&b.join("journal.json"), &serde_json::to_vec(&j).unwrap()).unwrap(); mark(&b,"ready").unwrap(); b
    }
}
impl Drop for Fixture { fn drop(&mut self) { let _ = fs::remove_dir_all(&self.0); } }
#[test] fn unfinished_restores_originals_removes_new_and_keeps_backups() {
    let f=Fixture::new();let b=f.pending();let _g=initialize(&f.target()).unwrap();
    assert_eq!(fs::read_to_string(f.target().join("notes/a.md")).unwrap(),"old a");assert_eq!(fs::read_to_string(f.target().join("notes/b.md")).unwrap(),"old b");assert!(!f.target().join("notes/aa.md").exists());assert!(b.join("notes/a.md").exists());assert!(marker(&b,"recovered").unwrap());
}
#[test] fn partially_recovered_transaction_can_restart() {
    let f=Fixture::new();let b=f.pending();fs::copy(b.join("notes/b.md"),f.target().join("notes/b.md")).unwrap();fs::remove_file(f.target().join("notes/aa.md")).unwrap();
    recover_locked(&f.target()).unwrap();recover_locked(&f.target()).unwrap();assert_eq!(fs::read_to_string(f.target().join("notes/a.md")).unwrap(),"old a");
}
#[test] fn completed_import_is_not_rolled_back() {
    let f=Fixture::new();let b=f.pending();mark(&b,"committed").unwrap();let _g=initialize(&f.target()).unwrap();assert_eq!(fs::read_to_string(f.target().join("notes/a.md")).unwrap(),"new a");assert!(f.target().join("notes/aa.md").exists());
}
#[test] fn preparing_transaction_never_restores_incomplete_backups() {
    let f=Fixture::new();let b=f.pending();fs::remove_file(b.join("ready")).unwrap();fs::remove_file(b.join("notes/a.md")).unwrap();recover_locked(&f.target()).unwrap();assert_eq!(fs::read_to_string(f.target().join("notes/a.md")).unwrap(),"new a");
}
#[test] fn missing_backup_blocks_recovery_before_changes_and_import() {
    let f=Fixture::new();let b=f.pending();fs::remove_file(b.join("notes/a.md")).unwrap();let e=initialize(&f.target()).unwrap_err();assert!(e.contains("Backup retained"));assert!(e.contains(&b.display().to_string()));assert!(import(&f.0,&f.target(),&["notes".into()],true).is_err());assert!(f.target().join("notes/aa.md").exists());
}
#[test] fn corrupt_journal_blocks() {
    let f=Fixture::new();let b=f.pending();fs::write(b.join("journal.json"),"{").unwrap();assert!(initialize(&f.target()).is_err());
}
#[test] fn traversal_duplicate_and_unknown_versions_rejected() {
    for (version,paths) in [(2,vec!["notes/a.md"]),(1,vec!["../outside"]),(1,vec!["notes/a.md","notes/a.md"])] {
        let f=Fixture::new();let b=f.pending();let j=Journal {version,files:paths.iter().map(|s|JournalFile{relative:(*s).into(),existed:false}).collect()};fs::write(b.join("journal.json"),serde_json::to_vec(&j).unwrap()).unwrap();assert!(initialize(&f.target()).is_err());
    }
}
#[test] fn profile_lock_prevents_second_instance_and_releases() {
    let f=Fixture::new();let g=initialize(&f.target()).unwrap();assert!(initialize(&f.target()).unwrap_err().contains("busy"));drop(g);assert!(initialize(&f.target()).is_ok());
}
#[test] fn import_lock_rejects_concurrent_import_or_recovery() {
    let f=Fixture::new();let g=lock(&f.target(),".preview-import.lock").unwrap();assert!(import(&f.0,&f.target(),&["notes".into()],true).unwrap_err().contains("busy"));assert!(initialize(&f.target()).is_err());drop(g);assert!(initialize(&f.target()).is_ok());
}
#[test] fn real_import_commits_and_survives_startup() {
    let f=Fixture::new();let source=f.0.join("source");fs::create_dir_all(source.join("notes")).unwrap();fs::write(source.join("notes/a.md"),"copied").unwrap();assert!(import(&source,&f.target(),&["notes".into()],false).is_ok());let _g=initialize(&f.target()).unwrap();assert_eq!(fs::read_to_string(f.target().join("notes/a.md")).unwrap(),"copied");assert_eq!(fs::read_to_string(source.join("notes/a.md")).unwrap(),"copied");
}
#[cfg(unix)] #[test] fn symlink_destination_or_backup_blocks_without_writing_through() {
    for at_backup in [false,true] { let f=Fixture::new();let b=f.pending();let outside=f.0.join("outside");fs::write(&outside,"untouched").unwrap();let path=if at_backup {b.join("notes/a.md")} else {f.target().join("notes/a.md")};fs::remove_file(&path).unwrap();std::os::unix::fs::symlink(&outside,path).unwrap();assert!(initialize(&f.target()).is_err());assert_eq!(fs::read_to_string(outside).unwrap(),"untouched"); }
}
#[test] fn legacy_partial_backup_blocks_but_empty_stage_does_not() {
    let f=Fixture::new();let b=f.target().join("preview-import-backup-old/staged/notes");fs::create_dir_all(&b).unwrap();fs::write(b.join("x.md"),"old partial").unwrap();assert!(initialize(&f.target()).is_err());fs::remove_file(b.join("x.md")).unwrap();assert!(initialize(&f.target()).is_ok());
}
#[test] fn subprocess_profile_lock_probe() {
    if let Some(path)=std::env::var_os("PREVIEW_TEST_LOCK_PATH") { assert!(initialize(Path::new(&path)).unwrap_err().contains("busy")); }
}
#[test] fn profile_lock_is_enforced_across_processes() {
    let f=Fixture::new();let _g=initialize(&f.target()).unwrap();
    let result=std::process::Command::new(std::env::current_exe().unwrap()).args(["--exact","preview_import::tests::subprocess_profile_lock_probe","--test-threads=1"]).env("PREVIEW_TEST_LOCK_PATH",f.target()).output().unwrap();assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stdout));
}
#[test] fn corrupt_marker_does_not_skip_recovery() {
    let f=Fixture::new();let b=f.pending();fs::write(b.join("committed"),"partial").unwrap();assert!(initialize(&f.target()).is_err());assert!(f.target().join("notes/aa.md").exists());
}
#[test] fn recovery_failure_can_be_repaired_and_retried() {
    let f=Fixture::new();let b=f.pending();fs::remove_file(b.join("notes/a.md")).unwrap();assert!(initialize(&f.target()).is_err());fs::write(b.join("notes/a.md"),"old a").unwrap();let _g=initialize(&f.target()).unwrap();assert_eq!(fs::read_to_string(f.target().join("notes/a.md")).unwrap(),"old a");
}
