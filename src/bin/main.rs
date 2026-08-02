use std::collections::HashSet;
use std::thread::sleep;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use std::{error::Error, str::FromStr};
use std::{fs::File, thread};
use std::{
    io::{BufRead, BufReader, Seek, SeekFrom, Write},
    sync::mpsc::channel,
};
use std::{
    path::PathBuf,
    sync::mpsc,
    sync::{
        atomic::{AtomicU64, Ordering},
        Mutex,
    },
};

use clap::Parser;
use env_logger::{Builder, Env};
use global_hotkey::{hotkey::HotKey, GlobalHotKeyEvent, GlobalHotKeyManager, HotKeyState};
use image::DynamicImage;
use log::{debug, error, info, warn};
use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use wfinfo::mem_log;
use wfinfo::ownership::{OwnedDb, Ownership};
use wfinfo::{
    database::Database,
    ocr::{
        image_to_rows, image_to_string, normalize_string, reward_image_to_reward_names,
        reward_image_to_reward_names_with_rects, score_rows, OCR,
    },
    utils::fetch_prices_and_items,
};

type FileSignature = (Option<SystemTime>, u64);
type RivenSignature = (RivenScreenMode, Vec<String>, String);

static SCREENSHOT_LOCK: Mutex<()> = Mutex::new(());

fn file_signature(path: &PathBuf) -> Option<FileSignature> {
    let metadata = std::fs::metadata(path).ok()?;
    Some((metadata.modified().ok(), metadata.len()))
}

fn monitor_geometry_from_env() -> (i32, i32, u32, u32) {
    if let Ok(s) = std::env::var("WFINFO_MONITOR_GEOMETRY") {
        let p: Vec<i32> = s.split(',').filter_map(|x| x.trim().parse().ok()).collect();
        if p.len() == 4 && p[2] > 0 && p[3] > 0 {
            return (p[0], p[1], p[2] as u32, p[3] as u32);
        }
    }

    let pt = std::env::var("WFINFO_MONITOR_POINT")
        .ok()
        .and_then(|s| {
            let p: Vec<i32> = s.split(',').filter_map(|x| x.trim().parse().ok()).collect();
            if p.len() == 2 {
                Some((p[0], p[1]))
            } else {
                None
            }
        })
        .unwrap_or((3200, 720));

    // Default setup: 2560x1440 Warframe monitor whose centre is WFINFO_MONITOR_POINT.
    (pt.0 - 1280, pt.1 - 720, 2560, 1440)
}

fn take_screenshot(save_debug: bool) -> Option<DynamicImage> {
    // Reward and Riven detection share a fixed portal output path.
    // Serialize captures so neither reader sees the other's partial file.
    let _capture_guard = SCREENSHOT_LOCK.lock().unwrap_or_else(|p| p.into_inner());
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    #[cfg(target_os = "windows")]
    {
        // On Windows: use xcap::Monitor directly — Windows GDI/DXGI API,
        // no focus stealing, no external tools needed.
        use xcap::Monitor;
        let (mx, my) = std::env::var("WFINFO_MONITOR_POINT")
            .ok()
            .and_then(|s| {
                let p: Vec<i32> = s.split(',').filter_map(|x| x.trim().parse().ok()).collect();
                if p.len() == 2 {
                    Some((p[0], p[1]))
                } else {
                    None
                }
            })
            .unwrap_or((960, 540)); // default: centre of primary 1920x1080

        let monitor = Monitor::from_point(mx, my)
            .or_else(|_| {
                Monitor::all().and_then(|m| {
                    m.into_iter()
                        .next()
                        .ok_or(xcap::XCapError::new("no monitors"))
                })
            })
            .ok()?;

        let frame = monitor.capture_image().ok()?;
        let (frame_width, frame_height) = frame.dimensions();
        let image = DynamicImage::ImageRgba8(image::RgbaImage::from_raw(
            frame_width,
            frame_height,
            frame.into_raw(),
        )?);
        info!("Screenshot via xcap: {}x{}", image.width(), image.height());
        if save_debug {
            let debug_path = format!(
                "{}\\wfinfo-capture-{ts}.png",
                std::env::temp_dir().display()
            );
            let _ = image.save(&debug_path);
            info!("Saved debug capture to {debug_path}");
        }
        return Some(image);
    }

    #[cfg(not(target_os = "windows"))]
    {
        // Prefer direct X11 monitor capture. Repeatedly launching Spectacle
        // monopolizes its single application instance, so the user's Print
        // Screen action is converted into our background autosave instead of
        // opening Spectacle's UI. xcap is already a project dependency and
        // avoids that process-level collision entirely.
        use xcap::Monitor;
        let (wx, wy, ww, wh) = monitor_geometry_from_env();
        let center_x = wx.saturating_add((ww / 2) as i32);
        let center_y = wy.saturating_add((wh / 2) as i32);
        if let Ok(monitor) = Monitor::from_point(center_x, center_y) {
            match monitor.capture_image() {
                Ok(frame) => {
                    let (frame_width, frame_height) = frame.dimensions();
                    if let Some(frame) =
                        image::RgbaImage::from_raw(frame_width, frame_height, frame.into_raw())
                    {
                        let image = DynamicImage::ImageRgba8(frame);
                        info!(
                            "Screenshot via xcap monitor {}: {}x{}",
                            monitor.name(),
                            image.width(),
                            image.height()
                        );
                        if save_debug {
                            let debug_path = format!("/tmp/wfinfo-capture-{ts}.png");
                            let _ = image.save(&debug_path);
                        }
                        return Some(image);
                    } else {
                        warn!("xcap returned an invalid RGBA buffer; falling back to portal");
                    }
                }
                Err(error) => warn!("direct xcap capture failed; falling back to portal: {error}"),
            }
        }

        // On Linux/macOS: use spectacle (KDE portal) or grim (wlroots).
        // These are Wayland-native and don't cause gamescope focus loss.
        let path = "/tmp/wfinfo-capture-portal.png";
        let _ = std::fs::remove_file(path);

        let screenshot_tools: &[(&str, &[&str])] = &[
            (
                "/run/host/usr/bin/spectacle",
                &["-b", "-n", "--no-decoration", "-o", path],
            ),
            ("spectacle", &["-b", "-n", "--no-decoration", "-o", path]),
            ("/run/host/usr/bin/grim", &[path]),
            ("grim", &[path]),
        ];

        let mut captured_by = None;
        for (tool, args) in screenshot_tools {
            let mut child = match std::process::Command::new(tool).args(*args).spawn() {
                Ok(child) => child,
                Err(_) => continue,
            };
            let deadline = Instant::now() + Duration::from_secs(2);
            let ok = loop {
                match child.try_wait() {
                    Ok(Some(status)) => break status.success(),
                    Ok(None) if Instant::now() < deadline => {
                        thread::sleep(Duration::from_millis(25));
                    }
                    Ok(None) => {
                        warn!("screenshot tool {tool} exceeded 2 seconds; abandoning this capture");
                        let _ = child.kill();
                        let _ = child.wait();
                        // Do not immediately invoke a second name for the same
                        // portal binary: that multiplied one live failure into
                        // an eight-second block and delayed EE.log events.
                        return None;
                    }
                    Err(error) => {
                        warn!("could not wait for screenshot tool {tool}: {error}");
                        let _ = child.kill();
                        let _ = child.wait();
                        break false;
                    }
                }
            };
            if ok {
                captured_by = Some(*tool);
                break;
            }
        }

        let Some(tool) = captured_by else {
            error!("screenshot failed: neither spectacle nor grim worked");
            return None;
        };

        // spectacle (KDE's screenshot portal) can exit successfully before
        // the file is actually flushed to disk - the CLI hands off the
        // save to the portal/compositor asynchronously. Confirmed live
        // 2026-07-20: exit status was success but image::open() failed
        // with "No such file or directory" immediately after. A short
        // retry loop (up to ~500ms total) covers this without meaningfully
        // slowing down the normal case where the file's already there.
        let mut image = None;
        for attempt in 0..10 {
            match image::open(path) {
                Ok(img) => {
                    image = Some(img);
                    break;
                }
                Err(e) if attempt < 9 => {
                    std::thread::sleep(std::time::Duration::from_millis(50));
                    let _ = e;
                }
                Err(e) => {
                    error!("screenshot tool {tool} ran but image could not be opened after retrying: {e}");
                    return None;
                }
            }
        }
        let mut image = image?;

        info!(
            "Screenshot captured by {tool}: {}x{}",
            image.width(),
            image.height()
        );

        let (wx, wy, ww, wh) = monitor_geometry_from_env();
        if wx >= 0
            && wy >= 0
            && image.width() >= (wx as u32 + ww)
            && image.height() >= (wy as u32 + wh)
            && (image.width() != ww || image.height() != wh)
        {
            image = image.crop_imm(wx as u32, wy as u32, ww, wh);
            info!("Cropped screenshot to monitor geometry ({wx},{wy}) {ww}x{wh}");
        }

        if save_debug {
            let debug_path = format!("/tmp/wfinfo-capture-{ts}.png");
            if let Err(e) = image.save(&debug_path) {
                warn!("Failed to save debug capture {debug_path}: {e}");
            } else {
                info!("Saved debug capture to {debug_path}");
            }
        }

        Some(image)
    }
}

// Monotonic per-process counter written alongside "timestamp" in
// latest-detection.json. The relic-recommend overlay already hit this
// exact bug (see overlay_gtk.py's RelicRecommendOverlay.__init__ comment,
// 2026-07-21) with its own whole-second timestamp: a fast bad-capture-
// then-good-capture pair landing in the same wall-clock second made the
// second (good) write look like a duplicate of the first (bad) one and
// get silently skipped by the Python side's `if ts != last_timestamp`
// check. A monotonic counter can't collide like that, unlike even a
// finer-grained clock read. Jacob 2026-07-24.
static DETECTION_SEQ: AtomicU64 = AtomicU64::new(0);

const SANDBOX_PATH_INDICATORS: [&str; 4] = [
    "com.visualstudio.code",
    "com.vscodium",
    "flatpak/exports",
    "io.github.vscodium",
];

fn is_sandbox_path(path: &str) -> bool {
    SANDBOX_PATH_INDICATORS
        .iter()
        .any(|part| path.contains(part))
}

fn home_dir() -> PathBuf {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
}

fn data_dir() -> PathBuf {
    let home = home_dir();
    let base = if cfg!(windows) {
        std::env::var("APPDATA")
            .ok()
            .filter(|value| !value.is_empty())
            .map(PathBuf::from)
            .unwrap_or_else(|| home.join("AppData/Roaming"))
    } else if cfg!(target_os = "macos") {
        home.join("Library/Application Support")
    } else {
        let xdg = std::env::var("XDG_DATA_HOME").ok();
        let usable_xdg = xdg
            .as_deref()
            .filter(|value| !value.is_empty() && !is_sandbox_path(value))
            .map(PathBuf::from);
        match usable_xdg {
            Some(path) => path,
            None => home.join(".local/share"),
        }
    };
    base.join("kiedas-orbiter")
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum RivenScreenMode {
    Cycle,
    Confirm,
}

impl RivenScreenMode {
    fn as_str(self) -> &'static str {
        match self {
            Self::Cycle => "cycle",
            Self::Confirm => "confirm",
        }
    }
}

fn relative_crop(
    image: &DynamicImage,
    left: f32,
    top: f32,
    width: f32,
    height: f32,
) -> DynamicImage {
    let iw = image.width();
    let ih = image.height();
    let x = (iw as f32 * left)
        .round()
        .clamp(0.0, iw.saturating_sub(1) as f32) as u32;
    let y = (ih as f32 * top)
        .round()
        .clamp(0.0, ih.saturating_sub(1) as f32) as u32;
    let w = (iw as f32 * width).round().max(1.0) as u32;
    let h = (ih as f32 * height).round().max(1.0) as u32;
    image.crop_imm(x, y, w.min(iw - x), h.min(ih - y))
}

fn riven_ocr_region(
    image: &DynamicImage,
    rect: (f32, f32, f32, f32),
) -> Result<String, anyhow::Error> {
    // Previously upscaled 2x here (a leftover from binarizing crops for
    // Tesseract, removed in the 2026-07-28 PaddleOCR swap) and then a
    // second time inside image_to_string() itself, which does its own 2x
    // enlarge before detection. Two chained Lanczos3 resamples (4x total)
    // compound interpolation artifacts - found live 2026-07-28 as the
    // cause of a spurious inserted character ("Arca Plasmor" reading as
    // "ArcaF Plasmor"). Every other OCR call site (reward detection) only
    // goes through image_to_string()'s single upscale; Riven crops now
    // match that.
    let crop = relative_crop(image, rect.0, rect.1, rect.2, rect.3);
    image_to_string(
        &mut OCR.lock().unwrap_or_else(|poisoned| poisoned.into_inner()),
        &crop,
    )
}

fn riven_card_rects(mode: RivenScreenMode) -> &'static [(f32, f32, f32, f32)] {
    match mode {
        RivenScreenMode::Cycle => &[(0.38, 0.52, 0.24, 0.31)],
        // A live test proved the previous y=0.64 start clipped the first line
        // of a two-line wrapped generated name (e.g. "Croni-" / "puratis"):
        // the raw OCR text came back as only "puratis", never "Croni-",
        // which then falsely conflicted with the visible stats and blocked
        // the grade forever. Raised the top edge by 0.05 (bottom edge, where
        // stats already parsed fine, is unchanged).
        RivenScreenMode::Confirm => &[(0.245, 0.59, 0.15, 0.21), (0.41, 0.59, 0.19, 0.21)],
    }
}

fn detect_riven_screen(image: &DynamicImage) -> Option<(RivenScreenMode, Vec<String>, String)> {
    // Both reroll states share INVENTORY / MODS at the top left. Requiring it
    // prevents generic CONFIRM buttons elsewhere in Warframe from triggering.
    let header = riven_ocr_region(image, (0.0, 0.0, 0.38, 0.13)).ok()?;
    let header_key = normalize_string(&header).to_ascii_uppercase();
    // Card/variant validation below still makes initial detection specific to
    // this screen.  Be tolerant of the exact live header misreads we see
    // (INVENTRY, MOOS, MOSI) so one decorative glyph does not cost another
    // full screenshot/OCR cycle.
    let header_ok = header_key.contains("INVENT")
        && (header_key.contains("MODS")
            || header_key.contains("MOS")
            || header_key.contains("MOO")
            || header_key.contains("MS"));
    if !header_ok {
        return None;
    }

    let action = riven_ocr_region(image, (0.37, 0.84, 0.27, 0.10)).ok()?;
    let action_key = normalize_string(&action).to_ascii_uppercase();
    let mode = if action_key.contains("CYCLEF") {
        RivenScreenMode::Cycle
    } else if action_key.contains("FIRM") {
        RivenScreenMode::Confirm
    } else {
        return None;
    };

    // Normalized regions from the supplied 2559x1440 fixtures. They scale with
    // resolution and cover only the text portions of the visible Riven cards.
    let card_rects = riven_card_rects(mode);
    let cards = card_rects
        .iter()
        .map(|rect| riven_ocr_region(image, *rect).unwrap_or_default())
        .collect();
    // Both states show the currently previewed compatible weapon below the
    // gold FITS IN heading. This identifies the exact variant (Prime/Tenet/etc.)
    // whose attenuation Warframe is displaying.
    let variant = riven_ocr_region(image, (0.835, 0.66, 0.16, 0.24)).unwrap_or_default();
    if !riven_variant_region_is_valid(&variant) {
        return None;
    }
    Some((mode, cards, variant))
}

/// Rescue check for riven_menu_anchor_present(): a missed header/action-row
/// OCR read should not, by itself, mean the Riven reroll screen closed -
/// TODO.md documents many live sessions where that exact assumption caused
/// false closes while the player never left the screen. If any of the
/// known card regions (Cycle's single card, or either of Confirm's two)
/// still contains confidently-recognized, stat-shaped rows, the screen is
/// still genuinely open: a card can't keep reading real stat text once
/// Warframe has actually navigated away from the reroll flow.
fn riven_card_region_looks_valid(image: &DynamicImage) -> bool {
    const SCORE_THRESHOLD: f32 = 0.5;
    const MIN_ROWS: usize = 2;

    let candidate_rects: Vec<(f32, f32, f32, f32)> = riven_card_rects(RivenScreenMode::Cycle)
        .iter()
        .chain(riven_card_rects(RivenScreenMode::Confirm).iter())
        .copied()
        .collect();

    let mut ocr = OCR.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
    for rect in candidate_rects {
        let crop = relative_crop(image, rect.0, rect.1, rect.2, rect.3);
        let rows = match image_to_rows(&mut ocr, &crop) {
            Ok(rows) => rows,
            Err(_) => continue,
        };
        if rows.len() >= MIN_ROWS && score_rows(&rows) >= SCORE_THRESHOLD {
            return true;
        }
    }
    false
}

fn riven_menu_anchor_present(image: &DynamicImage) -> bool {
    // INVENTORY / MODS alone is not specific enough: it is shown across the
    // entire inventory/mods menu, not just the two reroll sub-screens. A live
    // test showed backing out to the plain Riven list (still under
    // INVENTORY / MODS) kept this returning true forever, so the overlay
    // never closed. Also require the bottom action row to still read like the
    // reroll flow (CYCLE FOR.../CONFIRM), matching the same check
    // detect_riven_screen uses to pick a mode, so leaving the reroll screen
    // for anything else under the same header still counts as a miss.
    let header = riven_ocr_region(image, (0.0, 0.0, 0.38, 0.13)).unwrap_or_default();
    let header_key = normalize_string(&header).to_ascii_uppercase();
    // This is only the keep-alive/close guard after a Riven screen was
    // already positively detected; it must be more tolerant than initial
    // screen detection.  Live OCR commonly drops one letter here
    // ("INVENTORY MOS", "INVENTORY MOSI") even though the menu is still
    // unchanged.  Requiring the stable INVENTORY prefix plus the MODS/MOS
    // stem avoids turning those harmless reads into six false close misses.
    let header_ok = header_key.contains("INVENT")
        && (header_key.contains("MODS")
            || header_key.contains("MOS")
            || header_key.contains("MOO")
            || header_key.contains("MS"));
    if !header_ok {
        // Diagnostic: a live session showed the detector declaring the
        // Riven screen closed (and, separately, staying closed well past
        // the recovery window) while Jacob insisted he never left the
        // menu - meaning this OCR read is intermittently failing on a
        // screen that's still genuinely open. Logging the actual raw
        // text on every failure (not just a bare "closed" event) is the
        // only way to see WHY without guessing again. Jacob 2026-07-27
        // ("why is this so hard").
        warn!("Riven anchor miss (header): {header_key:?}");
        if riven_card_region_looks_valid(image) {
            info!("Riven anchor header miss rescued by still-valid card content");
            return true;
        }
        return false;
    }
    let action = riven_ocr_region(image, (0.37, 0.84, 0.27, 0.10)).unwrap_or_default();
    let action_key = normalize_string(&action).to_ascii_uppercase();
    // Same close-guard tolerance for the observed CYCLE FQR misread.  The
    // header has already matched, so the distinctive CYCLEF stem is enough
    // to prove we are still in the reroll flow without trusting this text as
    // card data.
    let action_ok = action_key.contains("CYCLEF") || action_key.contains("FIRM");
    if !action_ok {
        warn!("Riven anchor miss (action row): {action_key:?}");
        if riven_card_region_looks_valid(image) {
            info!("Riven anchor action-row miss rescued by still-valid card content");
            return true;
        }
    }
    action_ok
}

fn riven_variant_region_is_valid(text: &str) -> bool {
    normalize_string(text)
        .to_ascii_uppercase()
        .contains("FITSIN")
}

fn write_riven_screen_state(
    mode: Option<RivenScreenMode>,
    cards: &[String],
    variant: &str,
    stable: bool,
) {
    write_riven_screen_state_ex(mode, cards, variant, stable, false);
}

fn write_riven_screen_state_ex(
    mode: Option<RivenScreenMode>,
    cards: &[String],
    variant: &str,
    stable: bool,
    just_confirmed: bool,
) {
    let dir = data_dir();
    if let Err(e) = std::fs::create_dir_all(&dir) {
        warn!("Could not create Riven screen state directory: {e}");
        return;
    }
    let path = dir.join("riven-screen.json");
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let card_json = cards
        .iter()
        .map(|card| serde_json::to_string(card).unwrap_or_else(|_| "\"\"".to_string()))
        .collect::<Vec<_>>()
        .join(",");
    let mode_json = mode
        .map(|value| format!("\"{}\"", value.as_str()))
        .unwrap_or_else(|| "null".to_string());
    let variant_json = serde_json::to_string(variant).unwrap_or_else(|_| "\"\"".to_string());
    // just_confirmed distinguishes "this Cycle state is the direct result of
    // the player accepting a new roll" from every other, more common way the
    // screen ends up back in Cycle mode (backing out/cancelling included). A
    // live test showed the overlay promoting a merely-previewed (and then
    // cancelled) roll into CURRENT ROLL, because the Python consumer could
    // only see the mode go Confirm -> Cycle and had no way to tell that case
    // apart from an actual confirmation. This field lets it tell them apart.
    let state = format!(
        "{{\"written_at_ms\":{now_ms},\"visible\":{},\"stable\":{stable},\"mode\":{mode_json},\"variant\":{variant_json},\"cards\":[{card_json}],\"just_confirmed\":{just_confirmed}}}",
        mode.is_some(),
    );
    // Write to a same-directory temp file and rename over the real path
    // instead of writing riven-screen.json directly. A plain write() isn't
    // atomic - riven_grader_overlay.py polls this file on its own schedule
    // and can open it mid-write, reading a truncated/empty file. Confirmed
    // live 2026-07-28 (Codex review of `riven-overlay.log`): a real
    // `JSONDecodeError: Expecting value: line 1 column 1` from exactly this
    // race. rename() on the same filesystem is atomic, so a reader always
    // sees either the old complete file or the new complete file, never a
    // partial one.
    let tmp_path = dir.join(format!("riven-screen.json.tmp-{now_ms}"));
    if let Err(e) = std::fs::write(&tmp_path, state) {
        warn!("Could not publish Riven screen state: {e}");
        return;
    }
    if let Err(e) = std::fs::rename(&tmp_path, &path) {
        warn!("Could not publish Riven screen state (rename failed): {e}");
        let _ = std::fs::remove_file(&tmp_path);
    }
}

/// Fixes up common Tesseract misreads of Warframe riven card text before
/// tokenizing, so two OCR passes of the SAME real stat line consensus-match
/// as identical instead of looking like a changed roll. Patterns adapted
/// from hoeslovevid/everything-warframe's `scrubOcr()` (a much more mature
/// OCR-cleanup pass for this exact UI than anything we had), reimplemented
/// here rather than copied since that project has no license file. Jacob
/// 2026-07-27 ("we have so many issues with our riven overlay that kronos
/// doesn't... investigate why" - this specific fix targets OCR flakiness,
/// not the separate windowing-architecture issue also found that day).
fn scrub_riven_ocr(text: &str) -> String {
    let mut s = text.to_string();
    let replacements: &[(&str, &str)] = &[
        ("critica1", "critical"),
        ("critica|", "critical"),
        ("multish0t", "multishot"),
        ("mu1ti", "multi"),
        ("damageto", "damage to"),
        ("damag0", "damage"),
        ("damaqe", "damage"),
        ("h0t", "hot"),
        ("t0xin", "toxin"),
        ("toxln", "toxin"),
        ("grlneer", "grineer"),
        ("grinecr", "grineer"),
        ("corpu5", "corpus"),
        ("c0rpus", "corpus"),
        ("lnfested", "infested"),
        ("lnfeste", "infeste"),
        ("1nfested", "infested"),
        ("zo0m", "zoom"),
    ];
    let lower = s.to_lowercase();
    for (bad, good) in replacements {
        if lower.contains(bad) {
            // Case-insensitive replace while keeping the rest of the string
            // as-is - simplest correct approach given the small fixed list.
            s = case_insensitive_replace(&s, bad, good);
        }
    }
    s
}

fn case_insensitive_replace(haystack: &str, needle: &str, replacement: &str) -> String {
    let lower_haystack = haystack.to_lowercase();
    let lower_needle = needle.to_lowercase();
    let mut result = String::with_capacity(haystack.len());
    let mut last_end = 0;
    let mut search_start = 0;
    while let Some(pos) = lower_haystack[search_start..].find(&lower_needle) {
        let start = search_start + pos;
        let end = start + lower_needle.len();
        result.push_str(&haystack[last_end..start]);
        result.push_str(replacement);
        last_end = end;
        search_start = end;
    }
    result.push_str(&haystack[last_end..]);
    result
}

fn riven_ocr_tokens(text: &str) -> HashSet<String> {
    // The MR/reroll badge is animation-sensitive and its digits are often
    // read one frame apart (e.g. `MR 15 0100` vs `MR 15 0101`). It is metadata,
    // not card identity or stat content, so exclude that line from consensus.
    let card_text = text
        .lines()
        .filter(|line| !line.to_ascii_lowercase().contains("mr "))
        .collect::<Vec<_>>()
        .join("\n");
    let scrubbed = scrub_riven_ocr(&card_text);
    scrubbed
        .split(|ch: char| !ch.is_alphanumeric())
        .map(str::to_lowercase)
        .filter(|token| token.chars().count() >= 3 && token.chars().any(char::is_alphabetic))
        .collect()
}

fn riven_ocr_similar(left: &str, right: &str) -> bool {
    let left = riven_ocr_tokens(left);
    let right = riven_ocr_tokens(right);
    let smaller = left.len().min(right.len());
    if smaller < 2 {
        return false;
    }
    let common = left.intersection(&right).count();
    common >= 2 && common * 100 >= smaller * 60
}

fn riven_signatures_match(left: &RivenSignature, right: &RivenSignature) -> bool {
    left.0 == right.0
        && left.1.len() == right.1.len()
        && left
            .1
            .iter()
            .zip(&right.1)
            .all(|(a, b)| riven_ocr_similar(a, b))
        && riven_ocr_similar(&left.2, &right.2)
}

fn riven_screen_watcher(event_receiver: mpsc::Receiver<RivenLogEvent>) {
    thread::spawn(move || {
        let mut pending_signature: Option<RivenSignature> = None;
        let mut stable_signature: Option<RivenSignature> = None;
        let mut misses = 24_u8;
        let mut active = false;
        // Bounded grace period after a close, to catch a FALSE close
        // (e.g. the user's own manual screenshot momentarily disrupting
        // what our capture sees, making a single frame look like the
        // menu closed) without going back to screenshotting forever.
        // Counts down once `active` goes false; while it's still > 0,
        // one more capture is allowed at a slow cadence specifically to
        // self-correct a bad close. Hits 0 -> fully silent until a real
        // EE.log event fires again. Jacob 2026-07-26 ("when I take a
        // manual screenshot it closes the riven one, which then doesn't
        // reopen").
        let mut recovery_checks_remaining: u8 = 0;
        // Keep a short false-close grace period, but do not leave the
        // desktop capture indicator active for a full minute after the user
        // has genuinely left the menu. Lifecycle events are still handled
        // immediately by the receiver above, so this is only a bounded OCR
        // fallback for a missed/false close. (2026-07-27's widening to 60
        // was itself a real fix for real anchor-OCR flakiness - see
        // TODO.md - but a live 2026-07-31 session showed the user-visible
        // cost of a full 60s indicator was worse than the failure mode it
        // was guarding against, especially once close-detection delay
        // stacks on top of it.)
        const RECOVERY_CHECKS: u8 = 12;
        const RECOVERY_INTERVAL: Duration = Duration::from_secs(1);
        let mut last_capture = Instant::now() - Duration::from_secs(10);
        loop {
            // Handles one lifecycle event, mutating the loop's own state.
            // Defined fresh each iteration (cheap - no allocation captured)
            // so it can be reused both for the blocking receive below and
            // for draining any further already-queued events before this
            // iteration falls through to taking a screenshot.
            let mut handle_riven_event = |event: RivenLogEvent| {
                info!("Activating focused Riven capture from {event:?}");
                let was_active = active;
                active = true;
                misses = 0;
                last_capture = Instant::now() - Duration::from_secs(10);
                // The visual fallback can confirm the screen before the
                // corresponding EE.log write is flushed. A late Opened
                // event belongs to that same session and must not reset a
                // result which is already on screen.
                if event == RivenLogEvent::Opened && !was_active {
                    pending_signature = None;
                    stable_signature = None;
                    // The EE.log event is authoritative and arrives before
                    // OCR has finished.  Publish the lightweight shell
                    // immediately so the UI responds now, then replace it
                    // with confirmed card data after visual consensus.
                    write_riven_screen_state(Some(RivenScreenMode::Cycle), &[], "", false);
                }
                if event == RivenLogEvent::SelectionConfirmed {
                    // This dialog acceptance returns Warframe to its
                    // single-card Cycle screen. Collapse the comparison
                    // immediately instead of retaining the second panel
                    // until animated-screen OCR becomes readable again.
                    if let Some((_, confirmed_cards, confirmed_variant)) = &stable_signature {
                        // `confirmed_cards` is the just-finished Confirm
                        // screen's 2-element array, ordered [current/left,
                        // new-offer/right] (matches src/bin/main.rs's own
                        // `card_rects` order - see detect_riven_screen()).
                        // riven_grader_overlay.py's Cycle-mode renderer
                        // always reads index 0 as "the single displayed
                        // card" - passing the whole pair through meant a
                        // Cycle-mode write right after confirming showed
                        // index 0, the OLD pre-reroll card, not the one
                        // just selected. Live-confirmed 2026-07-28 (Jacob:
                        // "when I chose a card and it went back to one, it
                        // showed the old card for a second before
                        // refreshing"). Slice to just the new-offer card
                        // (index 1) so this transitional write shows the
                        // right one instead of relying on the next real
                        // Cycle-mode capture to correct it a moment later.
                        let new_offer_card = confirmed_cards.get(1).cloned().unwrap_or_default();
                        write_riven_screen_state_ex(
                            Some(RivenScreenMode::Cycle),
                            std::slice::from_ref(&new_offer_card),
                            confirmed_variant,
                            false,
                            true,
                        );
                    }
                    pending_signature = None;
                }
            };

            match event_receiver.recv_timeout(Duration::from_millis(100)) {
                Ok(event) => {
                    handle_riven_event(event);
                    // Drain every event already queued in this same batch
                    // before falling through to a screenshot capture below.
                    // Previously each event was handled one at a time with a
                    // real capture attempt sandwiched in between via that
                    // fallthrough, so two events landing in the same instant
                    // (e.g. SelectionConfirmed immediately followed by
                    // CycleRequested when the player rerolls again right
                    // after confirming) could have a stale/transitional
                    // screenshot land in the gap between them - live-
                    // confirmed 2026-07-28: the overlay flashed back to the
                    // previous roll's card data between a SelectionConfirmed
                    // and a same-millisecond CycleRequested. This matches
                    // Kronos's own design more closely too - its
                    // log_scanner.rs never interleaves a capture between
                    // processing consecutive log lines at all; state
                    // transitions there are pure log-parsing, fully
                    // decoupled from screenshotting. Jacob 2026-07-28
                    // ("go ahead and move to the kronos style").
                    while let Ok(event) = event_receiver.try_recv() {
                        handle_riven_event(event);
                    }
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {}
                Err(mpsc::RecvTimeoutError::Disconnected) => {
                    error!("Riven lifecycle channel disconnected");
                    return;
                }
            }

            // Event-driven only: no screenshot at all until a real EE.log
            // event (riven_log_event's Opened match) sets `active`. The
            // previous version took a full-desktop screenshot every
            // second even while completely inactive, as a "missed log
            // event" recovery probe - meaning the detector silently
            // screenshotted the whole desktop once a second forever,
            // regardless of whether Warframe was even running. The
            // `None` branch below already gates all its close-detection
            // logic behind `if !active`, so that recovery probe was the
            // *only* thing happening during "inactive" - removing it
            // trades away a small reliability safety net (a missed log
            // line means this session's reroll screen is never detected)
            // for not continuously screenshotting the user's desktop.
            // Jacob 2026-07-26 ("this looks like malware and it needs a
            // different program or something").
            if !active && recovery_checks_remaining == 0 {
                continue;
            }
            let interval = if active {
                Duration::from_millis(500)
            } else {
                RECOVERY_INTERVAL
            };
            if last_capture.elapsed() < interval {
                continue;
            }
            last_capture = Instant::now();
            if !active {
                recovery_checks_remaining -= 1;
            }
            // Do not PNG-encode and write every polling frame.  That temporary
            // diagnostic mode materially increased the time between OCR
            // samples and therefore the visible overlay lag.  Logs now give
            // us the required evidence; failed reward captures retain their
            // separate diagnostics.
            let screenshot = take_screenshot(false);
            let detected = screenshot
                .as_ref()
                .and_then(|image| detect_riven_screen(image));
            match detected {
                Some((mode, cards, variant)) => {
                    active = true;
                    recovery_checks_remaining = 0;
                    misses = 0;
                    let signature = (mode, cards.clone(), variant.clone());
                    let matches_pending = pending_signature
                        .as_ref()
                        .is_some_and(|pending| riven_signatures_match(pending, &signature));
                    if !matches_pending {
                        // Never expose an unconfirmed OCR frame as card text.
                        // The animated background routinely produces fragments
                        // such as "bh", currency symbols, and changing prose.
                        // Preserve the last confirmed cards while the new
                        // candidate is being verified; on the first screen,
                        // publish an empty fixed reading state.
                        info!("Riven reroll screen detected: {mode:?}; verifying OCR");
                        if let Some((_, confirmed_cards, confirmed_variant)) = &stable_signature {
                            write_riven_screen_state(
                                Some(mode),
                                confirmed_cards,
                                confirmed_variant,
                                false,
                            );
                        } else {
                            write_riven_screen_state(Some(mode), &[], &variant, false);
                        }
                        pending_signature = Some(signature);
                    } else if stable_signature
                        .as_ref()
                        .is_none_or(|confirmed| !riven_signatures_match(confirmed, &signature))
                    {
                        info!("Riven reroll OCR confirmed: {mode:?}");
                        write_riven_screen_state(Some(mode), &cards, &variant, true);
                        pending_signature = Some(signature.clone());
                        stable_signature = Some(signature);
                    } else {
                        // Refresh written_at_ms while the screen remains
                        // positively detected. The GTK consumer uses this as a
                        // heartbeat so a crashed/stopped detector cannot leave
                        // a stale overlay mapped forever.
                        // Heartbeats must repeat the canonical confirmed OCR,
                        // not whichever noisy frame happened to be captured
                        // most recently. This prevents visible text churn.
                        let confirmed = stable_signature.as_ref().unwrap();
                        write_riven_screen_state(
                            Some(confirmed.0),
                            &confirmed.1,
                            &confirmed.2,
                            true,
                        );
                    }
                }
                None => {
                    if !active {
                        continue;
                    }
                    let Some(image) = screenshot.as_ref() else {
                        // A capture backend failure says nothing about whether
                        // the menu closed; never hide from that alone.
                        continue;
                    };
                    if riven_menu_anchor_present(image) {
                        // The menu is definitely still open. Card/action OCR
                        // may be obscured by animation, so preserve consensus
                        // without accumulating close misses.
                        misses = 0;
                        continue;
                    }
                    misses = misses.saturating_add(1);
                    // A live test showed the header OCR itself intermittently
                    // failing on the Cycle screen even with no alt-tab and
                    // nothing changing on screen, so 2 misses (~1s) falsely
                    // closed and reopened the overlay in a tight loop. Widened
                    // to 6 (~3s) - still much faster than the original 24
                    // (~12s) - to tolerate that header-OCR flakiness without
                    // going back to the old sluggish close.
                    if misses == 6 {
                        if pending_signature.take().is_some() || stable_signature.is_some() {
                            info!("Riven reroll screen closed");
                            write_riven_screen_state(None, &[], "", false);
                        } else {
                            info!("Riven focused capture expired without a valid screen");
                        }
                        stable_signature = None;
                        active = false;
                        recovery_checks_remaining = RECOVERY_CHECKS;
                    }
                }
            }
        }
    });
}

/// Capture, OCR, and publish one reward screen. Returns true only when at
/// least one OCR result resolved to a real database item and state was written.
fn run_detection(db: &Database, owned: &OwnedDb) -> bool {
    let image = match take_screenshot(true) {
        Some(img) => img,
        None => return false,
    };
    info!("Captured");
    // Cloned purely for the debug rect visualization below - the original
    // `image` gets consumed by reward_image_to_reward_names_with_rects.
    // Added 2026-07-20: after several rounds of guessing at GTK-side
    // padding/spacing to fix visual misalignment, Jacob asked for real
    // measured numbers instead of more guessing. This draws the computed
    // rects directly onto the actual capture so it's possible to see
    // definitively whether Rust's rect math is wrong, or whether the
    // rects are already correct and the remaining misalignment is purely
    // in overlay_gtk.py's GTK rendering.
    let debug_rect_image = image.clone();
    let failed_capture_image = image.clone();
    // Rect is each reward box's on-screen pixel position (x, y, width,
    // height), threaded through from ocr.rs so the Python overlay can size
    // and position itself to match Warframe's own boxes instead of
    // guessing a fixed size - added 2026-07-20 after the fixed-size
    // overlay was confirmed visibly smaller than the real boxes.
    let raw_named_rects = reward_image_to_reward_names_with_rects(image, None);
    let cleaned: Vec<(String, (u32, u32, u32, u32))> = raw_named_rects
        .iter()
        .map(|(s, rect)| (normalize_string(s), *rect))
        .collect();
    debug!("OCR: {:#?}", cleaned);

    let resolved: Vec<(String, Ownership, (u32, u32, u32, u32))> = cleaned
        .iter()
        .map(|(s, rect)| match db.find_item(s, None) {
            Some(item) => {
                let own = owned.lookup(&item.drop_name);
                (item.drop_name.clone(), own, *rect)
            }
            None => {
                warn!("could not resolve OCR text {:?} to a known item", s);
                (format!("? {}", s), Ownership::Unknown, *rect)
            }
        })
        .collect();

    info!("--- relic reward ownership ---");
    for (name, own, _) in &resolved {
        info!("  {:<40}  {}", name, own.colored());
    }

    // Debug visualization: draw each computed rect as a red outline
    // directly on the actual capture, so it's possible to SEE whether the
    // rects line up with the real boxes instead of guessing. Overwrites
    // the same fixed path each time (not timestamped) so it's easy to
    // find without hunting for the latest filename.
    {
        let mut debug_rgb = debug_rect_image.into_rgb8();
        let red = image::Rgb([255u8, 0, 0]);
        for (_, _, (rx, ry, rw, rh)) in &resolved {
            let (rx, ry, rw, rh) = (*rx, *ry, *rw, *rh);
            let (x0, y0) = (rx, ry);
            let x1 = (rx + rw).saturating_sub(1);
            let y1 = (ry + rh).saturating_sub(1);
            for x in x0..=x1.min(debug_rgb.width().saturating_sub(1)) {
                if y0 < debug_rgb.height() {
                    debug_rgb.put_pixel(x, y0, red);
                }
                if y1 < debug_rgb.height() {
                    debug_rgb.put_pixel(x, y1, red);
                }
            }
            for y in y0..=y1.min(debug_rgb.height().saturating_sub(1)) {
                if x0 < debug_rgb.width() {
                    debug_rgb.put_pixel(x0, y, red);
                }
                if x1 < debug_rgb.width() {
                    debug_rgb.put_pixel(x1, y, red);
                }
            }
        }
        let debug_rects_path = "/tmp/wfinfo-debug-rects.png";
        if let Err(e) = debug_rgb.save(debug_rects_path) {
            warn!("Failed to save debug rect visualization {debug_rects_path}: {e}");
        } else {
            info!("Saved debug rect visualization to {debug_rects_path}");
        }
    }

    // Don't publish a detection at all if OCR resolved zero rewards - a
    // blank/mid-transition/misfired capture used to still get written as
    // a "valid" empty-rewards detection, which the overlay would then
    // dutifully (if briefly) act on. Skipping the write entirely means a
    // bad capture can never overwrite or block a real one. Jacob
    // 2026-07-24 ("Stop publishing empty/garbage OCR states as valid
    // detections").
    let known_reward_count = resolved
        .iter()
        .filter(|(_, ownership, _)| !matches!(ownership, Ownership::Unknown))
        .count();
    if known_reward_count == 0 {
        warn!(
            "OCR resolved zero known rewards ({} placeholder result(s)) - not publishing a detection",
            resolved.len()
        );
        let failed_dir = data_dir().join("failed-captures");
        if let Err(e) = std::fs::create_dir_all(&failed_dir) {
            warn!("Failed to create {}: {e}", failed_dir.display());
        } else {
            let ts_ms = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis();
            let failed_path = failed_dir.join(format!("reward-capture-{ts_ms}.png"));
            match failed_capture_image.save(&failed_path) {
                Ok(_) => info!("Saved rejected reward capture: {}", failed_path.display()),
                Err(e) => warn!(
                    "Failed to save rejected reward capture {}: {e}",
                    failed_path.display()
                ),
            }
        }
        return false;
    }

    // Desktop notifications are intentionally disabled. The overlay is the UI
    // for reward results, and host notifications steal focus from Warframe.
    // ── Write latest-detection.json for the Python overlay ───────────────
    let rewards_json: Vec<String> = resolved
        .iter()
        .filter(|(_, ownership, _)| !matches!(ownership, Ownership::Unknown))
        .map(|(name, own, (rx, ry, rw, rh))| {
            let (status, count) = match own {
                Ownership::Owned(n) => ("OWNED", *n),
                Ownership::Need => ("NEED", 0),
                Ownership::Unknown => ("UNKNOWN", 0),
            };
            format!(
                r#"{{"name":{},"status":"{}","count":{},"rect":{{"x":{rx},"y":{ry},"width":{rw},"height":{rh}}}}}"#,
                serde_json::to_string(name).unwrap_or_default(),
                status,
                count,
            )
        })
        .collect();

    let written_at_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    let ts = written_at_ms / 1000;
    let seq = DETECTION_SEQ.fetch_add(1, Ordering::SeqCst);
    // Use configured monitor point for warframe geometry hint to the overlay
    let (wx, wy, ww, wh) = monitor_geometry_from_env();
    let state_json = format!(
        r#"{{"timestamp":{ts},"written_at_ms":{written_at_ms},"seq":{seq},"warframe":{{"x":{x},"y":{y},"width":{w},"height":{h}}},"rewards":[{rewards}]}}"#,
        ts = ts,
        written_at_ms = written_at_ms,
        seq = seq,
        x = wx,
        y = wy,
        w = ww,
        h = wh,
        rewards = rewards_json.join(","),
    );

    // Must match paths.py's _get_data_dir() exactly, or the Python side
    // (overlay.py) polls a completely different file than this writes to.
    let data_dir = data_dir();
    let _ = std::fs::create_dir_all(&data_dir);
    let state_path = data_dir.join("latest-detection.json");
    match File::create(&state_path).and_then(|mut f| f.write_all(state_json.as_bytes())) {
        Ok(_) => {
            info!("Wrote state file: {}", state_path.display());
            true
        }
        Err(e) => {
            warn!("Failed to write state file: {}", e);
            false
        }
    }
}

const REWARD_SCREEN_OPEN_EVENT: &str = "VoidProjections: OpenVoidProjectionRewardScreenRMI";

fn is_reward_ready_line(line: &str) -> bool {
    line.contains(REWARD_SCREEN_OPEN_EVENT)
}

#[derive(Clone, Copy, Debug)]
enum CaptureRequest {
    Automatic,
    Manual,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum RivenLogEvent {
    Opened,
    CycleRequested,
    SelectionConfirmed,
}

fn riven_log_event(line: &str) -> Option<RivenLogEvent> {
    if line.contains("OmegaRerollSelection.lua: Diorama setup")
        || line.contains("Created /Lotus/Interface/OmegaRerollSelection.swf")
    {
        Some(RivenLogEvent::Opened)
    } else if line.contains("Dialog::CreateOkCancel(description=Are you sure you want to cycle") {
        Some(RivenLogEvent::CycleRequested)
    } else if line
        .contains("Dialog::CreateOkCancel(description=Cycle Riven into current selection?")
    {
        Some(RivenLogEvent::SelectionConfirmed)
    } else {
        None
    }
}

/// Re-establish the EE.log inotify watch after it's been dropped, retrying
/// for a bounded window instead of giving up on the first attempt. Found
/// live 2026-07-28: Warframe under Steam Proton actually deletes and
/// recreates EE.log at some point during startup rather than just
/// appending to it, and the recreate isn't instantaneous - a watch()
/// call made in the same instant the reopen failed can itself fail with
/// ENOENT because the file is still momentarily gone. Previously that was
/// a single attempt with no retry, so a rotation lasting even a few
/// hundred milliseconds longer than expected permanently killed all
/// further EE.log-driven detection (reward and Riven both, since they
/// share this one watcher thread) for the rest of the session, with no
/// crash to explain why - the thread just sat forever waiting on events
/// from a watch that no longer existed.
fn rewatch_with_retry(watcher: &mut RecommendedWatcher, path: &PathBuf, context: &str) {
    const MAX_ATTEMPTS: u32 = 20;
    const RETRY_DELAY: Duration = Duration::from_millis(250);
    for attempt in 1..=MAX_ATTEMPTS {
        match watcher.watch(path, RecursiveMode::NonRecursive) {
            Ok(()) => {
                info!("Re-established EE.log watch after {context} (attempt {attempt})");
                return;
            }
            Err(watch_err) if attempt < MAX_ATTEMPTS => {
                debug!(
                    "Re-watch attempt {attempt}/{MAX_ATTEMPTS} after {context} failed: {watch_err}"
                );
                thread::sleep(RETRY_DELAY);
            }
            Err(watch_err) => {
                error!(
                    "Failed to re-watch EE.log after {context} ({MAX_ATTEMPTS} attempts over \
                     {:?}): {watch_err}",
                    RETRY_DELAY * MAX_ATTEMPTS
                );
            }
        }
    }
}

/// Same trigger classification as log_watcher(), but reads EE.log directly
/// out of Warframe's process memory instead of tailing the file on disk.
/// Returns true if a validated memory read was established and the watcher
/// thread is now running; false if memory-based reading isn't usable right
/// now (caller must fall back to the file-based log_watcher() in that case
/// - this function never silently leaves both trigger paths inactive).
fn memory_log_watcher(
    event_sender: mpsc::Sender<CaptureRequest>,
    riven_sender: mpsc::Sender<RivenLogEvent>,
) -> bool {
    let Some(pid) = mem_log::get_warframe_pid() else {
        info!(
            "Memory-based EE.log watcher: Warframe process not found, falling back to file watch"
        );
        return false;
    };

    let cache_path = data_dir().join("memory_offset_cache.txt");
    let mut offsets = mem_log::load_offset_cache(&cache_path);
    let mut raw = Vec::new();

    let validated = match &offsets {
        Some(o) => match mem_log::read_ring_buffer(pid, o, &mut raw) {
            Ok(()) => mem_log::validate_buffer(&raw),
            Err(_) => false,
        },
        None => false,
    };

    if !validated {
        match mem_log::discover_ring_buffer(pid) {
            Some((va, size)) => {
                let found = mem_log::MemOffsets {
                    buffer_va: va,
                    buffer_size: size,
                };
                match mem_log::read_ring_buffer(pid, &found, &mut raw) {
                    Ok(()) if mem_log::validate_buffer(&raw) => {
                        mem_log::save_offset_cache(&cache_path, &found);
                        offsets = Some(found);
                    }
                    _ => {
                        info!("Memory-based EE.log watcher: discovered buffer failed validation, falling back to file watch");
                        return false;
                    }
                }
            }
            None => {
                info!("Memory-based EE.log watcher: could not discover ring buffer, falling back to file watch");
                return false;
            }
        }
    }

    let Some(offsets) = offsets else {
        return false;
    };
    info!(
        "Memory-based EE.log watcher active (VA {:#x}, {} bytes)",
        offsets.buffer_va, offsets.buffer_size
    );

    thread::spawn(move || {
        let mut seen: std::collections::HashSet<u64> = std::collections::HashSet::new();
        let mut seen_count = 0usize;
        const SEEN_RESET_THRESHOLD: usize = 16_384;
        let mut current_pid = pid;
        let mut current_offsets = offsets;
        let mut first_cycle = true;

        loop {
            if mem_log::read_ring_buffer(current_pid, &current_offsets, &mut raw).is_err() {
                // Process likely gone or PID reused - try to rediscover.
                thread::sleep(Duration::from_millis(500));
                match mem_log::get_warframe_pid() {
                    Some(new_pid) => {
                        current_pid = new_pid;
                        if let Some((va, size)) = mem_log::discover_ring_buffer(current_pid) {
                            current_offsets = mem_log::MemOffsets {
                                buffer_va: va,
                                buffer_size: size,
                            };
                            mem_log::save_offset_cache(&cache_path, &current_offsets);
                        }
                    }
                    None => {
                        thread::sleep(Duration::from_secs(2));
                    }
                }
                continue;
            }

            let text = String::from_utf8_lossy(&raw);
            let mut riven_events = Vec::new();
            let mut reward_screen_detected = false;

            for line in text.split('\n') {
                let line = line.trim_matches(|c: char| c.is_whitespace() || c == '\0');
                if line.is_empty() || !line.starts_with(|c: char| c.is_ascii_digit()) {
                    continue;
                }
                let mut hasher = std::collections::hash_map::DefaultHasher::new();
                std::hash::Hash::hash(&line, &mut hasher);
                let hash = std::hash::Hasher::finish(&hasher);
                if !seen.insert(hash) {
                    continue;
                }
                seen_count += 1;
                if seen_count >= SEEN_RESET_THRESHOLD {
                    seen.clear();
                    seen_count = 0;
                }

                // First full-buffer read is a backlog dump, not new activity -
                // classify lines to warm the hash set, but don't fire events.
                if first_cycle {
                    continue;
                }

                if is_reward_ready_line(line) {
                    reward_screen_detected = true;
                }
                if let Some(event) = riven_log_event(line) {
                    riven_events.push(event);
                }
            }

            first_cycle = false;

            for event in riven_events {
                info!("Riven EE.log lifecycle event (memory): {event:?}");
                if riven_sender.send(event).is_err() {
                    error!("Riven event receiver dropped - stopping memory log watcher thread");
                    return;
                }
            }
            if reward_screen_detected {
                info!("Reward-ready event detected (memory); starting adaptive capture");
                if event_sender.send(CaptureRequest::Automatic).is_err() {
                    error!("Event receiver dropped - stopping memory log watcher thread");
                    return;
                }
            }

            thread::sleep(Duration::from_millis(150));
        }
    });

    true
}

fn log_watcher(
    path: PathBuf,
    event_sender: mpsc::Sender<CaptureRequest>,
    riven_sender: mpsc::Sender<RivenLogEvent>,
) {
    debug!("Path: {}", path.display());
    let mut position = File::open(&path)
        .unwrap_or_else(|_| panic!("Couldn't open file {}", path.display()))
        .seek(SeekFrom::End(0))
        .unwrap();

    thread::spawn(move || {
        debug!("Position: {}", position);

        let (tx, rx) = mpsc::channel();
        let mut watcher = match RecommendedWatcher::new(
            tx,
            Config::default().with_poll_interval(Duration::from_millis(100)),
        ) {
            Ok(watcher) => watcher,
            Err(error) => {
                error!("Failed to create EE.log watcher: {error}");
                return;
            }
        };
        if let Err(error) = watcher.watch(&path, RecursiveMode::NonRecursive) {
            error!("Failed to watch EE.log {}: {error}", path.display());
            return;
        }

        loop {
            match rx.recv() {
                Ok(Ok(event))
                    if matches!(event.kind, EventKind::Modify(_) | EventKind::Create(_)) =>
                {
                    // EE.log can be briefly missing/replaced during
                    // Warframe's own log rotation (delete + recreate) -
                    // this used to unwrap() and permanently kill the
                    // whole watcher thread on that single transient
                    // failure, silently ending all future detections for
                    // the rest of the session. Log and wait for the next
                    // write event instead. Jacob 2026-07-24 ("harden the
                    // log watcher against EE.log truncation/rotation").
                    let mut f = match File::open(&path) {
                        Ok(f) => f,
                        Err(err) => {
                            // A real rotation (delete + recreate, not just
                            // truncate-in-place) leaves the notify crate's
                            // inotify watch pointing at the now-unlinked
                            // old inode - inotify watches are per-inode,
                            // not per-path, so it can permanently stop
                            // delivering events for whatever gets created
                            // at this same path afterward, even though
                            // this thread (and the rest of orbiter) keeps
                            // running with no crash. Confirmed live
                            // 2026-07-27: exactly one of these errors
                            // logged, then total silence from this thread
                            // for 2+ hours until the process was manually
                            // restarted. Re-establishing the watch here
                            // covers that case - Cephalon Kronos avoids
                            // this whole bug class by polling process
                            // memory directly instead of relying on
                            // filesystem watch events at all, which isn't
                            // a change we're making here, but re-watching
                            // after a failure closes the same gap for our
                            // notify-based approach.
                            error!("Could not reopen EE.log (rotation in progress?): {}", err);
                            if let Err(unwatch_err) = watcher.unwatch(&path) {
                                debug!("Could not unwatch EE.log (may not have been watched): {unwatch_err}");
                            }
                            rewatch_with_retry(&mut watcher, &path, "reopen failure");
                            continue;
                        }
                    };

                    let current_len = match f.metadata() {
                        Ok(m) => m.len(),
                        Err(err) => {
                            error!("Could not read EE.log metadata: {}", err);
                            continue;
                        }
                    };
                    if current_len < position {
                        // Shorter than our last read position - actually
                        // truncated/replaced, not just appended to.
                        // Restart from the beginning instead of seeking
                        // past the new EOF and silently missing every
                        // line written since the rotation. Also
                        // re-establish the watch (see the reopen-failure
                        // comment above) - a successful reopen here
                        // doesn't prove the watch itself survived the
                        // rotation, only that a file exists at this path
                        // right now.
                        info!(
                            "EE.log appears rotated/truncated (was {} bytes, now {}) - reading from start",
                            position, current_len
                        );
                        position = 0;
                        if let Err(unwatch_err) = watcher.unwatch(&path) {
                            debug!("Could not unwatch EE.log (may not have been watched): {unwatch_err}");
                        }
                        rewatch_with_retry(&mut watcher, &path, "detected rotation");
                    }

                    if let Err(err) = f.seek(SeekFrom::Start(position)) {
                        error!("Could not seek EE.log: {}", err);
                        continue;
                    }

                    let mut reward_screen_detected = false;
                    let mut riven_events = Vec::new();

                    let reader = BufReader::new(std::io::Read::by_ref(&mut f));
                    for line in reader.lines() {
                        let line = match line {
                            Ok(line) => line,
                            Err(err) => {
                                error!("Error reading line: {}", err);
                                continue;
                            }
                        };
                        // debug!("> {:?}", line);
                        // This RMI opens the actual relic reward flow about five seconds
                        // before `Got rewards`. Unlike SWF creation, it is not emitted by
                        // the endless-mission continue/next-rotation transition. Adaptive
                        // capture retries bridge the five-second reveal phase.
                        if is_reward_ready_line(&line) {
                            reward_screen_detected = true;
                        }
                        if let Some(event) = riven_log_event(&line) {
                            riven_events.push(event);
                        }
                    }

                    for event in riven_events {
                        info!("Riven EE.log lifecycle event: {event:?}");
                        if riven_sender.send(event).is_err() {
                            error!("Riven event receiver dropped - stopping log watcher thread");
                            return;
                        }
                    }

                    if reward_screen_detected {
                        info!("Reward-ready event detected; starting adaptive capture");
                        // The receiver only ever goes away if main()'s own
                        // event loop exits, i.e. the whole process is
                        // shutting down anyway - exit this thread
                        // cleanly instead of panicking on an unwrap().
                        if event_sender.send(CaptureRequest::Automatic).is_err() {
                            error!("Event receiver dropped - stopping log watcher thread");
                            return;
                        }
                    }

                    position = current_len;
                    debug!("Log position: {}", position);
                }
                Ok(Ok(_)) => {}
                Ok(Err(err)) => error!("EE.log watch error: {err}"),
                Err(err) => {
                    error!("Error: {:?}", err);
                }
            }
        }
    });
}

fn hotkey_watcher(hotkey: HotKey, event_sender: mpsc::Sender<CaptureRequest>) {
    debug!("watching hotkey: {hotkey:?}");
    thread::spawn(move || {
        // This runs on a spawned thread, not main - a panic here only kills
        // this thread, not the whole process. That silently left orbiter.exe
        // running in a half-alive state (no hotkey, but otherwise still
        // running) whenever registration failed, with no visible crash to
        // explain why F12 stopped working - and since that half-alive
        // process was still holding the registration, every subsequent
        // launch attempt failed the same way too, compounding indefinitely.
        // Log and return instead of unwrap()ing, so a failure here is
        // visible and the thread just exits cleanly rather than leaving a
        // zombie behind.
        let manager = match GlobalHotKeyManager::new() {
            Ok(m) => m,
            Err(e) => {
                error!("Failed to create hotkey manager: {e}");
                return;
            }
        };
        if let Err(e) = manager.register(hotkey) {
            error!("Failed to register hotkey {hotkey:?}: {e} (F12 screenshot trigger will not work until orbiter is restarted)");
            return;
        }

        while let Ok(event) = GlobalHotKeyEvent::receiver().recv() {
            debug!("{:?}", event);
            if event.state == HotKeyState::Pressed {
                if event_sender.send(CaptureRequest::Manual).is_err() {
                    return;
                }
            }
        }
    });
}

#[allow(dead_code)]
fn benchmark() -> Result<(), Box<dyn Error>> {
    for _ in 0..10 {
        let image = image::open("input3.png").unwrap();
        println!("Converted");
        let text = reward_image_to_reward_names(image, None);
        println!("got names");
        let text = text.iter().map(|s| normalize_string(s));
        println!("{:#?}", text);
    }
    // clean up tesseract
    drop(
        OCR.lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .take(),
    );
    Ok(())
}

#[derive(Parser)]
#[command(version, about, long_about = None)]
struct Arguments {
    /// Path to the `EE.log` file located in the game installation directory
    ///
    /// Most likely located at `~/.local/share/Steam/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log`
    game_log_file_path: Option<PathBuf>,
    /// Warframe Window Name
    ///
    /// some systems may require the window name to be specified (e.g. when using gamescope)
    #[arg(short, long, default_value = "Warframe")]
    window_name: String,
    /// Global hotkey that triggers a screenshot capture
    ///
    /// F12 is the default, but some other software (Steam, GeForce
    /// Experience, Xbox Game Bar, etc.) may already claim it as a global
    /// hotkey, which prevents orbiter from registering it too. Change this
    /// to any unclaimed key (e.g. "F11") if that happens.
    #[arg(short = 'k', long, default_value = "F12")]
    hotkey: String,
    /// Legacy pre-capture delay setting, retained for launcher compatibility.
    ///
    /// Automatic captures now use immediate, validated retries instead of a
    /// fixed sleep. Older detector binaries still consume this value.
    #[arg(long, default_value_t = 1500)]
    pre_capture_sleep_ms: u64,
}

fn main() -> Result<(), Box<dyn Error>> {
    let arguments = Arguments::parse();
    // HOME doesn't exist on Windows (it's USERPROFILE there), and this used
    // to unwrap() it unconditionally — eagerly evaluated even when
    // --game-log-file-path was already given, since unwrap_or() isn't lazy.
    // That panicked on every Windows launch. Only compute this fallback
    // path (and only touch env vars at all) if it's actually needed.
    let log_path = match arguments.game_log_file_path {
        Some(p) => p,
        None => {
            let home = std::env::var("HOME")
                .or_else(|_| std::env::var("USERPROFILE"))
                .unwrap_or_else(|_| ".".to_string());
            let home = PathBuf::from_str(&home).unwrap();
            if cfg!(windows) {
                home.join("AppData/Local/Warframe/EE.log")
            } else {
                home.join(".local/share/Steam/steamapps/compatdata/230410/pfx/drive_c/users/steamuser/AppData/Local/Warframe/EE.log")
            }
        }
    };
    let window_name = arguments.window_name;
    let env = Env::default()
        .filter_or("WFINFO_LOG", "info")
        .write_style_or("WFINFO_STYLE", "always");
    Builder::from_env(env)
        // Was fully disabled (None) - made it impossible to tell how long
        // any step of a detection actually takes (pre_capture_sleep_ms
        // wait vs. screenshot vs. OCR itself) from orbiter.log alone.
        // Millisecond precision so the gap between "Detected, waiting..."
        // and "Wrote state file" is actually measurable. Jacob 2026-07-25
        // ("overlay didn't come on until 3 seconds left of the choice
        // selection" - need to know where that time actually goes).
        .format_timestamp_millis()
        .format_level(false)
        .format_module_path(false)
        .format_target(false)
        .init();

    // Screenshots are taken via spectacle/grim (Wayland-native portal).
    // No X11/XCB connection is made, so gamescope never releases its input grab.
    let _ = window_name; // kept for CLI compatibility

    let (prices, items) = fetch_prices_and_items()?;
    let db = Database::load_from_file(Some(&prices), Some(&items));

    // Load ownership data (owned_items.json next to the binary or in cwd)
    let owned_path = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("owned_items.json")))
        .filter(|p| p.exists())
        .unwrap_or_else(|| PathBuf::from("owned_items.json"));
    let mut owned = OwnedDb::load_or_empty(&owned_path);
    let mut owned_signature = file_signature(&owned_path);

    info!("Loaded database");

    let (event_sender, event_receiver) = channel();
    let (riven_sender, riven_receiver) = channel();

    if !memory_log_watcher(event_sender.clone(), riven_sender.clone()) {
        info!("Falling back to file-based EE.log watcher");
        log_watcher(log_path, event_sender.clone(), riven_sender);
    }
    let hotkey = arguments.hotkey.parse().map_err(|e| {
        format!(
            "Invalid --hotkey value {:?}: {e:?} (expected something like \"F12\" or \"F11\")",
            arguments.hotkey
        )
    })?;
    hotkey_watcher(hotkey, event_sender);
    riven_screen_watcher(riven_receiver);

    info!(
        "Adaptive reward capture enabled (legacy pre-capture setting: {}ms; automatic captures no longer use a fixed sleep)",
        arguments.pre_capture_sleep_ms
    );

    const AUTOMATIC_CAPTURE_ATTEMPTS: usize = 6;
    const RETRY_INTERVAL_MS: u64 = 250;

    while let Ok(request) = event_receiver.recv() {
        let current_signature = file_signature(&owned_path);
        if current_signature != owned_signature {
            match OwnedDb::load(&owned_path) {
                Ok(updated) => {
                    owned = updated;
                    owned_signature = current_signature;
                    info!("Reloaded changed ownership data");
                }
                Err(e) => warn!(
                    "Ownership data changed but could not be reloaded ({}); retaining last known-good data",
                    e
                ),
            }
        }
        let started = Instant::now();
        let max_attempts = match request {
            CaptureRequest::Automatic => AUTOMATIC_CAPTURE_ATTEMPTS,
            CaptureRequest::Manual => 1,
        };

        for attempt in 1..=max_attempts {
            info!(
                "Capture attempt {attempt}/{max_attempts} ({request:?}, {}ms since request)",
                started.elapsed().as_millis()
            );
            if run_detection(&db, &owned) {
                info!(
                    "Capture succeeded on attempt {attempt}/{max_attempts} after {}ms",
                    started.elapsed().as_millis()
                );
                break;
            }
            if attempt == max_attempts {
                warn!(
                    "Capture failed after {max_attempts} attempt(s) and {}ms",
                    started.elapsed().as_millis()
                );
            } else {
                sleep(Duration::from_millis(RETRY_INTERVAL_MS));
            }
        }
    }

    drop(
        OCR.lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .take(),
    );
    Ok(())
}

#[cfg(test)]
mod test {
    use std::collections::BTreeMap;
    use std::fs::read_to_string;

    use image::ImageReader as Reader;
    use ocr_rs::OcrEngine;
    use rayon::prelude::*;
    use wfinfo::ocr::detect_theme;
    use wfinfo::ocr::extract_parts;
    use wfinfo::ocr::image_to_rows;
    use wfinfo::testing::Label;

    use super::*;

    #[derive(serde::Deserialize)]
    struct CorpusRow {
        #[allow(dead_code)]
        raw_text: String,
        #[allow(dead_code)]
        numeric_token: String,
        #[allow(dead_code)]
        stat_name: String,
    }

    #[derive(serde::Deserialize)]
    struct CorpusCard {
        #[serde(default)]
        note: Option<String>,
        rows: Vec<CorpusRow>,
    }

    #[derive(serde::Deserialize)]
    struct CorpusSample {
        image: String,
        mode: String,
        variant: String,
        cards: Vec<CorpusCard>,
    }

    #[test]
    fn detects_riven_cycle_fixture() {
        let image = image::open("test-images/riven-cycle.png").unwrap();
        let (mode, cards, variant) = detect_riven_screen(&image)
            .expect("cycle fixture should be recognized as a Riven reroll screen");
        assert_eq!(mode, RivenScreenMode::Cycle);
        assert_eq!(cards.len(), 1);
        assert!(
            normalize_string(&variant)
                .to_ascii_lowercase()
                .contains("tenetarcaplasmor"),
            "selected variant OCR was {variant:?}"
        );
        assert!(
            normalize_string(&cards[0])
                .to_ascii_lowercase()
                .contains("arcaplasmor"),
            "selected card OCR was {:?}",
            cards[0]
        );
    }

    #[test]
    fn detects_riven_confirm_fixture() {
        let image = image::open("test-images/riven-confirm.png").unwrap();
        let (mode, cards, variant) = detect_riven_screen(&image)
            .expect("confirm fixture should be recognized as a Riven reroll screen");
        assert_eq!(mode, RivenScreenMode::Confirm);
        assert_eq!(cards.len(), 2);
        assert!(
            normalize_string(&variant)
                .to_ascii_lowercase()
                .contains("tenetarcaplasmor"),
            "selected variant OCR was {variant:?}"
        );
        for (index, card) in cards.into_iter().enumerate() {
            let side = if index == 0 { "old" } else { "new" };
            assert!(
                normalize_string(&card)
                    .to_ascii_lowercase()
                    .contains("arcaplasmor"),
                "{side} comparison card OCR was {card:?}"
            );
        }
    }

    #[test]
    fn riven_corpus_manifest_is_well_formed() {
        let manifest_path = "test-images/riven-corpus/manifest.json";
        let raw = read_to_string(manifest_path)
            .unwrap_or_else(|e| panic!("failed to read {manifest_path}: {e}"));
        let samples: Vec<CorpusSample> = serde_json::from_str(&raw)
            .unwrap_or_else(|e| panic!("failed to parse {manifest_path}: {e}"));

        assert!(!samples.is_empty(), "corpus manifest has no samples");

        for sample in &samples {
            let image_path = format!("test-images/riven-corpus/{}", sample.image);
            assert!(
                std::path::Path::new(&image_path).exists(),
                "manifest references missing image: {image_path}"
            );
            assert!(
                sample.mode == "Cycle" || sample.mode == "Confirm",
                "sample {} has unknown mode {:?}",
                sample.image,
                sample.mode
            );
            let expected_cards = if sample.mode == "Cycle" { 1 } else { 2 };
            assert_eq!(
                sample.cards.len(),
                expected_cards,
                "sample {} has {} cards, expected {} for mode {}",
                sample.image,
                sample.cards.len(),
                expected_cards,
                sample.mode
            );
            assert!(
                !sample.variant.is_empty(),
                "sample {} has empty variant",
                sample.image
            );
            for (i, card) in sample.cards.iter().enumerate() {
                if card.rows.is_empty() {
                    assert_eq!(
                        card.note.as_deref(),
                        Some("TODO_LABEL"),
                        "sample {} card {} has no rows and no TODO_LABEL note",
                        sample.image,
                        i
                    );
                }
            }
        }
    }

    #[test]
    fn riven_corpus_row_segmentation_report() {
        let manifest_path = "test-images/riven-corpus/manifest.json";
        let raw = read_to_string(manifest_path)
            .unwrap_or_else(|e| panic!("failed to read {manifest_path}: {e}"));
        let samples: Vec<CorpusSample> = serde_json::from_str(&raw)
            .unwrap_or_else(|e| panic!("failed to parse {manifest_path}: {e}"));

        let mut ocr: Option<OcrEngine> = None;
        let mut total_rows = 0usize;
        let mut exact_matches = 0usize;

        for sample in &samples {
            let labeled_cards: Vec<&CorpusCard> = sample
                .cards
                .iter()
                .filter(|c| c.note.as_deref() != Some("TODO_LABEL"))
                .collect();
            if labeled_cards.is_empty() {
                continue;
            }

            let mode = match sample.mode.as_str() {
                "Cycle" => RivenScreenMode::Cycle,
                "Confirm" => RivenScreenMode::Confirm,
                other => panic!("unknown mode {other} in manifest"),
            };
            let image_path = format!("test-images/riven-corpus/{}", sample.image);
            let image = image::open(&image_path)
                .unwrap_or_else(|e| panic!("failed to open {image_path}: {e}"));
            let rects = riven_card_rects(mode);

            for (card, rect) in labeled_cards.iter().zip(rects.iter()) {
                let crop = relative_crop(&image, rect.0, rect.1, rect.2, rect.3);
                let rows = image_to_rows(&mut ocr, &crop)
                    .unwrap_or_else(|e| panic!("image_to_rows failed on {image_path}: {e}"));

                let got: Vec<String> = rows
                    .iter()
                    .map(|r| normalize_string(&r.text).to_ascii_lowercase())
                    .collect();
                let expected: Vec<String> = card
                    .rows
                    .iter()
                    .map(|r| normalize_string(&r.raw_text).to_ascii_lowercase())
                    .collect();

                total_rows += expected.len();
                for want in &expected {
                    if got.iter().any(|g| g == want) {
                        exact_matches += 1;
                    } else {
                        eprintln!(
                            "{image_path}: expected row {want:?} not found among detected rows {got:?}"
                        );
                    }
                }
            }
        }

        if total_rows == 0 {
            eprintln!(
                "riven_corpus_row_segmentation_report: no labeled rows in the corpus yet \
                 (all samples still TODO_LABEL) - nothing to measure"
            );
            return;
        }

        let accuracy = exact_matches as f32 / total_rows as f32;
        eprintln!(
            "riven_corpus_row_segmentation_report: {exact_matches}/{total_rows} rows exact-matched \
             ({:.1}% accuracy)",
            accuracy * 100.0
        );
    }

    #[test]
    fn score_rows_prefers_higher_confidence_numeric_looking_rows() {
        use wfinfo::ocr::{score_rows, OcrRow};

        let strong = vec![
            OcrRow {
                text: "+52.3% Electricity".into(),
                confidence: 0.95,
                rect: (0, 0, 10, 10),
            },
            OcrRow {
                text: "+49.1% Status Chance".into(),
                confidence: 0.92,
                rect: (0, 10, 10, 10),
            },
        ];
        let weak_noise = vec![OcrRow {
            text: "smudge".into(),
            confidence: 0.4,
            rect: (0, 0, 10, 10),
        }];
        let empty: Vec<OcrRow> = vec![];

        assert!(score_rows(&strong) > score_rows(&weak_noise));
        assert_eq!(score_rows(&empty), 0.0);
    }

    #[test]
    fn score_rows_weights_confidence_even_without_numeric_tokens() {
        use wfinfo::ocr::{score_rows, OcrRow};

        let confident_but_not_numeric = vec![OcrRow {
            text: "Electricity".into(),
            confidence: 0.9,
            rect: (0, 0, 10, 10),
        }];
        let unconfident_and_not_numeric = vec![OcrRow {
            text: "Electricity".into(),
            confidence: 0.2,
            rect: (0, 0, 10, 10),
        }];
        assert!(score_rows(&confident_but_not_numeric) > score_rows(&unconfident_and_not_numeric));
    }

    #[test]
    fn preprocessing_variants_produces_four_labeled_variants() {
        use wfinfo::ocr::preprocessing_variants;

        let image = image::open("test-images/riven-corpus/riven-cycle.png").unwrap();
        let variants = preprocessing_variants(&image);
        let labels: Vec<&str> = variants.iter().map(|(label, _)| *label).collect();
        assert_eq!(
            labels,
            vec!["original", "grayscale", "contrast_grayscale", "otsu_binary"]
        );
        for (label, variant) in &variants {
            assert!(
                variant.width() > 0 && variant.height() > 0,
                "{label} variant has zero-sized dimensions"
            );
        }
    }

    #[test]
    fn riven_corpus_ensemble_preprocessing_report() {
        use wfinfo::ocr::best_of_image_to_rows;

        let manifest_path = "test-images/riven-corpus/manifest.json";
        let raw = read_to_string(manifest_path)
            .unwrap_or_else(|e| panic!("failed to read {manifest_path}: {e}"));
        let samples: Vec<CorpusSample> = serde_json::from_str(&raw)
            .unwrap_or_else(|e| panic!("failed to parse {manifest_path}: {e}"));

        let mut ocr: Option<OcrEngine> = None;
        let mut total_rows = 0usize;
        let mut exact_matches = 0usize;

        for sample in &samples {
            let labeled_cards: Vec<&CorpusCard> = sample
                .cards
                .iter()
                .filter(|c| c.note.as_deref() != Some("TODO_LABEL"))
                .collect();
            if labeled_cards.is_empty() {
                continue;
            }

            let mode = match sample.mode.as_str() {
                "Cycle" => RivenScreenMode::Cycle,
                "Confirm" => RivenScreenMode::Confirm,
                other => panic!("unknown mode {other} in manifest"),
            };
            let image_path = format!("test-images/riven-corpus/{}", sample.image);
            let image = image::open(&image_path)
                .unwrap_or_else(|e| panic!("failed to open {image_path}: {e}"));
            let rects = riven_card_rects(mode);

            for (card, rect) in labeled_cards.iter().zip(rects.iter()) {
                let crop = relative_crop(&image, rect.0, rect.1, rect.2, rect.3);
                let (winning_variant, rows) = best_of_image_to_rows(&mut ocr, &crop)
                    .unwrap_or_else(|e| {
                        panic!("best_of_image_to_rows failed on {image_path}: {e}")
                    });

                let got: Vec<String> = rows
                    .iter()
                    .map(|r| normalize_string(&r.text).to_ascii_lowercase())
                    .collect();
                let expected: Vec<String> = card
                    .rows
                    .iter()
                    .map(|r| normalize_string(&r.raw_text).to_ascii_lowercase())
                    .collect();

                total_rows += expected.len();
                for want in &expected {
                    if got.iter().any(|g| g == want) {
                        exact_matches += 1;
                    } else {
                        eprintln!(
                            "{image_path} ({winning_variant} won): expected row {want:?} \
                             not found among detected rows {got:?}"
                        );
                    }
                }
                eprintln!("{image_path}: ensemble picked '{winning_variant}'");
            }
        }

        if total_rows == 0 {
            eprintln!("riven_corpus_ensemble_preprocessing_report: no labeled rows to measure");
            return;
        }

        let accuracy = exact_matches as f32 / total_rows as f32;
        eprintln!(
            "riven_corpus_ensemble_preprocessing_report: {exact_matches}/{total_rows} rows \
             exact-matched ({:.1}% accuracy)",
            accuracy * 100.0
        );
    }

    #[test]
    fn riven_card_region_looks_valid_on_real_cycle_and_confirm_fixtures() {
        let cycle = image::open("test-images/riven-corpus/riven-cycle.png").unwrap();
        assert!(
            riven_card_region_looks_valid(&cycle),
            "real Cycle fixture's card region should score as valid"
        );

        let confirm = image::open("test-images/riven-corpus/riven-confirm.png").unwrap();
        assert!(
            riven_card_region_looks_valid(&confirm),
            "real Confirm fixture's card region should score as valid"
        );
    }

    #[test]
    fn riven_card_region_looks_valid_rejects_blank_image() {
        let blank = DynamicImage::ImageRgba8(image::RgbaImage::new(1920, 1080));
        assert!(
            !riven_card_region_looks_valid(&blank),
            "a blank image must never be treated as a valid card region"
        );
    }

    #[test]
    fn riven_menu_anchor_present_still_requires_action_row_when_no_card_rescues_it() {
        let blank = DynamicImage::ImageRgba8(image::RgbaImage::new(1920, 1080));
        assert!(!riven_menu_anchor_present(&blank));
    }

    #[test]
    fn riven_consensus_ignores_animation_noise_but_rejects_changed_rolls() {
        let first = (
            RivenScreenMode::Confirm,
            vec![
                "noise Arca Plasmor Vexidex +52.3% Electricity +49.1% Status Chance".into(),
                "armacron +20.8% Magazine Capacity +39.7% Ammo Maximum +36.9% Critical Chance"
                    .into(),
            ],
            "FITS IN noise Tenet Arca Plasmor".into(),
        );
        let noisy_match = (
            RivenScreenMode::Confirm,
            vec![
                "other pixels Arca Plasmor Vexidex Electricity Status Chance".into(),
                "armacron Magazine Capacity Ammo Maximum Critical Chance artifact".into(),
            ],
            "artifact FITS IN Tenet Arca Plasmor".into(),
        );
        let changed_roll = (
            RivenScreenMode::Confirm,
            vec![
                "Arca Plasmor Vexidex Electricity Status Chance".into(),
                "Zetido Cold Weapon Recoil Damage Infested".into(),
            ],
            "FITS IN Tenet Arca Plasmor".into(),
        );

        assert!(riven_signatures_match(&first, &noisy_match));
        assert!(!riven_signatures_match(&first, &changed_roll));
    }

    #[test]
    fn riven_ocr_scrub_fixes_known_tesseract_misreads() {
        // Two OCR passes of the exact same real stat line, one clean and
        // one hit by common Tesseract misreads on this UI - must still
        // consensus-match as the same signature instead of looking like a
        // changed roll.
        let clean = "Critical Chance +97% Damage to Grineer x1.5 Toxin Infested Zoom";
        let misread = "Critica1 Chance +97% DamageTo Grlneer x1.5 Toxln 1nfested Zo0m";
        assert_eq!(riven_ocr_tokens(clean), riven_ocr_tokens(misread));
    }

    #[test]
    fn riven_consensus_ignores_changing_mastery_and_reroll_badge() {
        let first =
            riven_ocr_tokens("Arca Plasmor Acri-satipha\n+49.8% Critical Damage\nMR 15 0100");
        let next =
            riven_ocr_tokens("Arca Plasmor Acri-satipha\n+49.8% Critical Damage\nMR 15 0101");
        assert_eq!(first, next);
    }

    #[test]
    fn classifies_real_riven_log_lifecycle_lines() {
        assert_eq!(
            riven_log_event("1962.071 Script [Info]: OmegaRerollSelection.lua: Diorama setup"),
            Some(RivenLogEvent::Opened)
        );
        assert_eq!(
            riven_log_event(
                "1961.744 Sys [Info]: Created /Lotus/Interface/OmegaRerollSelection.swf"
            ),
            Some(RivenLogEvent::Opened)
        );
        assert_eq!(
            riven_log_event(
                "1984.052 Script [Info]: Dialog.lua: Dialog::CreateOkCancel(description=Are you sure you want to cycle Arca Plasmor Vexidex for 3,500?, title= leftItem=/Menu/Confirm_Item_Yes, rightItem=/Menu/Confirm_Item_No)"
            ),
            Some(RivenLogEvent::CycleRequested)
        );
        assert_eq!(
            riven_log_event(
                "2042.723 Script [Info]: Dialog.lua: Dialog::CreateOkCancel(description=Cycle Riven into current selection?, title= leftItem=/Menu/Confirm_Item_Yes, rightItem=/Menu/Confirm_Item_No)"
            ),
            Some(RivenLogEvent::SelectionConfirmed)
        );
        assert_eq!(riven_log_event("ordinary unrelated EE.log line"), None);
    }

    #[test]
    fn rejects_screenshot_notifications_as_riven_variants() {
        assert!(riven_variant_region_is_valid("FITS IN\nTenet Arca Plasmor"));
        assert!(!riven_variant_region_is_valid(
            "Spectacle\nRectangular Region\nA screenshot was saved as Screenshot.png"
        ));
    }

    #[test]
    fn sandbox_data_paths_are_rejected() {
        assert!(is_sandbox_path(
            "/home/user/.var/app/com.visualstudio.code/data"
        ));
        assert!(is_sandbox_path("/tmp/flatpak/exports/share"));
        assert!(!is_sandbox_path("/home/user/.local/share"));
        assert!(!is_sandbox_path("/var/home/user/app-data"));
    }

    #[test]
    fn reward_trigger_ignores_endless_continue_transition() {
        let real_reward = [
            "Sys [Info]: VoidProjections: OpenVoidProjectionRewardScreenRMI",
            "Sys [Info]: Created /Lotus/Interface/ProjectionRewardChoice.swf",
            "Script [Info]: ProjectionRewardChoice.lua: Relic rewards initialized",
            "Script [Info]: ProjectionRewardChoice.lua: Got rewards",
        ];
        let continue_transition = [
            "Sys [Info]: Created /Lotus/Interface/ProjectionRewardChoice.swf",
            "Script [Info]: ProjectionRewardChoice.lua: Relic rewards initialized",
            "Script [Info]: ProjectionRewardChoice.lua: Reward choice force closed",
        ];

        assert_eq!(
            real_reward
                .iter()
                .filter(|line| is_reward_ready_line(line))
                .count(),
            1
        );
        assert!(!continue_transition
            .iter()
            .any(|line| is_reward_ready_line(line)));
    }

    #[test]
    fn single_image() {
        let image = Reader::open(format!("test-images/{}.png", 1))
            .unwrap()
            .decode()
            .unwrap();
        let text = reward_image_to_reward_names(image, None);
        let text = text.iter().map(|s| normalize_string(s));
        println!("{:#?}", text);
        let db = Database::load_from_file(None, None);
        let items: Vec<_> = text.map(|s| db.find_item(&s, None)).collect();
        println!("{:#?}", items);

        assert_eq!(
            items[0].expect("Didn't find an item?").drop_name,
            "Octavia Prime Systems Blueprint"
        );
        assert_eq!(
            items[1].expect("Didn't find an item?").drop_name,
            "Octavia Prime Blueprint"
        );
        assert_eq!(
            items[2].expect("Didn't find an item?").drop_name,
            "Tenora Prime Blueprint"
        );
        assert_eq!(
            items[3].expect("Didn't find an item?").drop_name,
            "Harrow Prime Systems Blueprint"
        );
    }

    // #[test]
    #[allow(dead_code)]
    fn wfi_images_exact() {
        let labels: BTreeMap<String, Label> =
            serde_json::from_str(&read_to_string("WFI test images/labels.json").unwrap()).unwrap();
        for (filename, label) in labels {
            let image = Reader::open("WFI test images/".to_string() + &filename)
                .unwrap()
                .decode()
                .unwrap();
            let text = reward_image_to_reward_names(image, None);
            let text: Vec<_> = text.iter().map(|s| normalize_string(s)).collect();
            println!("{:#?}", text);

            let db = Database::load_from_file(None, None);
            let items: Vec<_> = text.iter().map(|s| db.find_item(s, None)).collect();
            println!("{:#?}", items);
            println!("{}", filename);

            let item_names = items
                .iter()
                .map(|item| item.map(|item| item.drop_name.clone()));

            for (result, expectation) in item_names.zip(label.items) {
                if expectation.is_empty() {
                    assert_eq!(result, None)
                } else {
                    assert_eq!(result, Some(expectation))
                }
            }
        }
    }

    #[test]
    fn wfi_images_99_percent() {
        // `WFI test images/labels.json` (the expected-answers manifest) is
        // tracked, but the actual screenshot files it references never are
        // - `.gitignore` excludes them, and the same is true of every branch
        // of the upstream knoellle/wfinfo-ng repo and of WFCD/WFinfo further
        // upstream (checked 2026-07-28: none of them have ever committed
        // these PNGs or documented another source for them). They are a
        // developer's personal local OCR-accuracy test corpus that simply
        // does not exist in a fresh checkout. Skip instead of failing when
        // the images aren't present, rather than treating a missing-fixture
        // environment gap as a code regression.
        let labels: BTreeMap<String, Label> =
            serde_json::from_str(&read_to_string("WFI test images/labels.json").unwrap()).unwrap();
        let total = labels.len();
        let missing = labels
            .keys()
            .filter(|filename| {
                !std::path::Path::new(&format!("WFI test images/{filename}")).exists()
            })
            .count();
        if missing > 0 {
            println!(
                "Skipping wfi_images_99_percent: {missing}/{total} referenced screenshots are \
                 not present in this checkout (see comment above test)."
            );
            return;
        }
        let success_count: usize = labels
            .into_par_iter()
            .map(|(filename, label)| {
                let image = Reader::open("WFI test images/".to_string() + &filename)
                    .unwrap()
                    .decode()
                    .unwrap();
                let text = reward_image_to_reward_names(image, None);
                let text: Vec<_> = text.iter().map(|s| normalize_string(s)).collect();
                println!("{:#?}", text);

                let db = Database::load_from_file(None, None);
                let items: Vec<_> = text.iter().map(|s| db.find_item(s, None)).collect();
                println!("{:#?}", items);
                println!("{}", filename);

                let item_names = items
                    .iter()
                    .map(|item| item.map(|item| item.drop_name.clone()));

                if item_names.zip(label.items).all(|(result, expectation)| {
                    expectation == result.unwrap_or_else(|| "".to_string())
                }) {
                    1
                } else {
                    0
                }
            })
            .sum();

        let success_rate = success_count as f32 / total as f32;
        assert!(success_rate > 0.95, "Success rate: {success_rate}");
    }

    // #[test]
    #[allow(dead_code)]
    fn images() {
        let tests = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
        for i in tests {
            let image = Reader::open(format!("test-images/{}.png", i))
                .unwrap()
                .decode()
                .unwrap();

            let theme = detect_theme(&image);
            println!("Theme: {:?}", theme);

            let parts = extract_parts(&image, theme);

            let mut ocr: Option<OcrEngine> = None;
            for part in parts {
                let text = image_to_string(&mut ocr, &part).expect("Failed to get text");
                println!("{}", text);
            }
            println!("=================");
        }
    }
}
