use xcap::Monitor;
use image::DynamicImage;
use tauri::{AppHandle, Manager};
use serde::Serialize;
use std::process::{Command, Stdio};
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

/// Set to true by log_scanner when 10-reactant fires, false when reward screen
/// closes or mission exits. The icon poll loop checks this each iteration.
pub static ICON_SCAN_ACTIVE: AtomicBool = AtomicBool::new(false);

/// Logs to stderr (dev) and disk (prod). Requires an `AppHandle` reference named `app_c` in scope.
macro_rules! ocr_log {
    ($app:expr, $($arg:tt)*) => {{
        let msg = format!($($arg)*);
        eprintln!("{}", msg);
        crate::logger::log_to_disk($app, &msg);
    }};
}

/// Logs to stderr (dev) and disk (prod). Requires an `AppHandle` reference named `app_c` in scope.
macro_rules! ocr_log {
    ($app:expr, $($arg:tt)*) => {{
        let msg = format!($($arg)*);
        eprintln!("{}", msg);
        crate::logger::log_to_disk($app, &msg);
    }};
}

#[derive(Clone, Serialize, Debug)]
pub struct OcrSlotResult {
    pub slot: usize,
    pub text: String,
}

#[derive(Clone, Serialize, Debug)]
pub struct OcrBandResult {
    pub text: String,
    pub slot_results: Vec<OcrSlotResult>,
    pub is_debug: bool,
}

// User-provided coordinates for 1920x1080
// Rewards are centered - adjust positions accordingly
fn get_base_region(squad_size: usize) -> (f64, f64, f64, f64) {
    match squad_size {
        2 => (719.0 / 1920.0, 409.0 / 1080.0, 481.0 / 1920.0, 51.0 / 1080.0),
        3 => (600.0 / 1920.0, 409.0 / 1080.0, 720.0 / 1920.0, 51.0 / 1080.0),
        4 => (478.0 / 1920.0, 409.0 / 1080.0, 965.0 / 1920.0, 51.0 / 1080.0),
        _ => (839.0 / 1920.0, 409.0 / 1080.0, 241.0 / 1920.0, 51.0 / 1080.0),
    }
}

fn get_slot_coords(squad_size: usize) -> Vec<(f64, f64, f64, f64)> {
    let (bx, by, bw, bh) = get_base_region(squad_size);
    let slot_w = bw / squad_size as f64;
    (0..squad_size).map(|i| {
        (bx + (i as f64 * slot_w), by, slot_w, bh)
    }).collect()
}

pub fn run_ocr_pipeline_with_size(app: AppHandle, squad_size: usize) {
    run_ocr_internal(app, squad_size, false, None);
}

// ─── Template-based rarity icon detection ─────────────────────────────────────
//
// Templates are 40×30px crops of each rarity icon at 1920×1080, embedded at
// compile time. They are decoded once on first use via OnceLock and reused
// for the lifetime of the process.
//
// Place these files in src-tauri/data/bin/ (next to the tessdata/ folder):
//   rarity_rare.png     — gold lotus    (from slot 1 of 4Slots.png)
//   rarity_uncommon.png — silver lotus  (from slot 3 of 4Slots.png)
//   rarity_common.png   — bronze diamond(from slot 2 of 4Slots.png)

static RARITY_TEMPLATES: std::sync::OnceLock<Vec<image::GrayImage>> =
    std::sync::OnceLock::new();

fn get_templates() -> &'static Vec<image::GrayImage> {
    RARITY_TEMPLATES.get_or_init(|| {
        let raw: &[&[u8]] = &[
            include_bytes!("../data/bin/rarity_rare.png"),
            include_bytes!("../data/bin/rarity_uncommon.png"),
            include_bytes!("../data/bin/rarity_common.png"),
        ];
        raw.iter()
            .filter_map(|bytes| image::load_from_memory(bytes).ok().map(|i| i.to_luma8()))
            .collect()
    })
}

/// Polls the screen after the 10-reactant trigger until rarity icons are found,
/// then fires the OCR pipeline with the correct slot count.
///
/// Stops immediately if `ICON_SCAN_ACTIVE` is cleared (reward screen closed
/// or mission exited) without ever finding icons — no default fallback.
pub fn detect_slot_count_from_icons(app: AppHandle) {
    std::thread::spawn(move || {
        let templates = get_templates();
        if templates.is_empty() {
            ocr_log!(&app, "[OCR] WARN: no rarity templates loaded, aborting icon scan");
            return;
        }

        let mut attempt = 0u32;

        loop {
            attempt += 1;

            // Wait before each capture — this also serves as the initial delay
            // so the first capture doesn't happen before the screen animates in.
            std::thread::sleep(std::time::Duration::from_millis(400));

            // Stop if log_scanner cleared the flag (mission exit / reward closed)
            if !ICON_SCAN_ACTIVE.load(Ordering::SeqCst) {
                ocr_log!(&app, "[OCR] Icon scan: flag cleared, stopping (attempt {})", attempt);
                return;
            }

            // ── Capture primary monitor ──────────────────────────────────────
            let monitors = match Monitor::all() {
                Ok(m) if !m.is_empty() => m,
                _ => {
                    ocr_log!(&app, "[OCR] Icon scan attempt {}: no monitors", attempt);
                    continue;
                }
            };
            let monitor = monitors.iter()
                .find(|m| m.is_primary().unwrap_or(false))
                .or_else(|| monitors.first())
                .unwrap();

            let screen = match monitor.capture_image() {
                Ok(s) => s,
                Err(e) => {
                    ocr_log!(&app, "[OCR] Icon scan attempt {}: capture failed: {}", attempt, e);
                    continue;
                }
            };

            let sw = screen.width()  as f64;
            let sh = screen.height() as f64;

            // ── Crop a horizontal strip where rarity icons live ──────────────
            // Icons sit at y≈476 in 1080p. The strip covers all 4 possible slot
            // positions horizontally (x≈555..1365 at 1920px wide).
            let strip_y = ((456.0 / 1080.0) * sh) as u32;
            let strip_h = ((40.0  / 1080.0) * sh).max(1.0) as u32;
            let strip_x = ((555.0 / 1920.0) * sw) as u32;
            let strip_w = ((810.0 / 1920.0) * sw).max(1.0) as u32;

            let gray_full = DynamicImage::ImageRgba8(screen).to_luma8();

            if strip_x + strip_w > gray_full.width()
                || strip_y + strip_h > gray_full.height()
            {
                ocr_log!(&app, "[OCR] Icon scan attempt {}: strip OOB, skipping", attempt);
                continue;
            }

            let strip = image::imageops::crop_imm(
                &gray_full, strip_x, strip_y, strip_w, strip_h,
            ).to_image();

            // ── Match all three rarity templates against the strip ───────────
            let sx = sw / 1920.0;
            let sy = sh / 1080.0;
            // Minimum x-distance between two distinct icon peaks (≈ half a slot width)
let min_dist_px = ((90.0 * sx) as i32).max(30);

            // Accumulate absolute-x positions of all confirmed icon matches
            let mut peaks: Vec<u32> = Vec::new();

            for tmpl in templates {
                let tw = ((tmpl.width()  as f64) * sx).round() as u32;
                let th = ((tmpl.height() as f64) * sy).round() as u32;
                if tw == 0 || th == 0 || tw > strip_w || th > strip_h {
                    continue;
                }

                let scaled = image::imageops::resize(
                    tmpl, tw, th, image::imageops::FilterType::Lanczos3,
                );

const THRESHOLD: f32 = 0.65;
                for (x, _y, _score) in ncc_scan(&strip, &scaled, THRESHOLD) {
                    let abs_x = strip_x + x;
                    let too_close = peaks.iter().any(|&px| {
                        (px as i32 - abs_x as i32).abs() < min_dist_px
                    });
                    if !too_close {
                        peaks.push(abs_x);
                    }
                }
            }

            peaks.sort_unstable();
            
            let mut has_3_slot = false;
            let mut has_4_slot_outer = false;
            let mut has_4_slot_inner = false;

            for &p in &peaks {
                let norm_x = (p as f64 / sx).round() as i32;
                if (norm_x - 698).abs() < 30 || (norm_x - 940).abs() < 30 || (norm_x - 1182).abs() < 30 {
                    has_3_slot = true;
                }
                if (norm_x - 575).abs() < 30 || (norm_x - 1304).abs() < 30 {
                    has_4_slot_outer = true;
                }
                if (norm_x - 819).abs() < 30 || (norm_x - 1060).abs() < 30 {
                    has_4_slot_inner = true;
                }
            }

            let deduced_size = if has_3_slot && !has_4_slot_outer && !has_4_slot_inner {
                3
            } else if has_4_slot_outer {
                4
            } else if has_4_slot_inner {
                if peaks.len() >= 3 { 4 } else { 2 }
            } else {
                peaks.len().max(2).min(4)
            };

            ocr_log!(
                &app,
                "[OCR] Icon scan attempt {}: {} peaks at x={:?}, deduced size={}",
                attempt, peaks.len(), peaks, deduced_size
            );

            if peaks.len() >= 2 {
                let slot_count = deduced_size;
                // Clear the flag — scan is done
                ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
                
                // Trigger overlay when slots detected
                if let Some(window) = app.get_window("overlay-relic") {
                    let _ = window.show();
                }
                
                // Get cached relic data from AppState or create default
                let state = app.state::<crate::AppState>();
                let relics: Vec<crate::log_scanner::RelicInfo> = if let Ok(cached) = state.active_relic_data.lock() {
                    if let Some(ref val) = *cached {
                        val.get("squad_relics")
                            .and_then(|v| serde_json::from_value(v.clone()).ok())
                            .unwrap_or_default()
                    } else {
                        Vec::new()
                    }
                } else {
                    Vec::new()
                };
                
                let event_payload = crate::log_scanner::FissureEvent {
                    event_type: "relic_phase_start".to_string(),
                    squad_relics: relics,
                    local_reward: None,
                    squad_size: slot_count,
                    void_tier: None,
                };
                app.emit_all("scanner-relic-phase-start", serde_json::json!({ "squad_size": slot_count })).unwrap_or_default();
                app.emit_all("fissure-relic-phase", &event_payload).unwrap_or_default();
                
                run_ocr_pipeline_with_size(app, slot_count);
                return;
            }
            // < 2 matches: reward screen not up yet, loop and try again
        }
    });
}


/// Zero-mean normalized cross-correlation scan.
/// Returns (x, y, score) for every position where score >= threshold
/// AND the position is a local horizontal maximum within ±4px.
/// No external crates — avoids image version conflicts.
fn ncc_scan(
    strip: &image::GrayImage,
    template: &image::GrayImage,
    threshold: f32,
) -> Vec<(u32, u32, f32)> {
    let (sw, sh) = strip.dimensions();
    let (tw, th) = template.dimensions();
    if tw > sw || th > sh { return vec![]; }

    // Precompute mean-centered template and its L2 norm
    let t_pixels: Vec<f32> = template.pixels().map(|p| p[0] as f32).collect();
    let t_mean = t_pixels.iter().sum::<f32>() / t_pixels.len() as f32;
    let t_centered: Vec<f32> = t_pixels.iter().map(|&v| v - t_mean).collect();
    let t_norm = t_centered.iter().map(|v| v * v).sum::<f32>().sqrt();
    if t_norm < 1e-6 { return vec![]; }

    let x_count = sw - tw + 1;
    let y_count = sh - th + 1;
    let mut score_map = vec![0f32; (x_count * y_count) as usize];

    for y in 0..y_count {
        for x in 0..x_count {
            let n = (tw * th) as f32;
            let mut patch_sum = 0f32;
            for dy in 0..th {
                for dx in 0..tw {
                    patch_sum += strip.get_pixel(x + dx, y + dy)[0] as f32;
                }
            }
            let p_mean = patch_sum / n;

            let mut dot = 0f32;
            let mut p_sq = 0f32;
            for dy in 0..th {
                for dx in 0..tw {
                    let pc = strip.get_pixel(x + dx, y + dy)[0] as f32 - p_mean;
                    dot += pc * t_centered[(dy * tw + dx) as usize];
                    p_sq += pc * pc;
                }
            }
            let p_norm = p_sq.sqrt();
            if p_norm > 1e-6 {
                score_map[(y * x_count + x) as usize] = dot / (t_norm * p_norm);
            }
        }
    }

    // Collect peaks above threshold that are local horizontal maxima within ±4px
    let mut peaks = Vec::new();
    for y in 0..y_count {
        for x in 0..x_count {
            let score = score_map[(y * x_count + x) as usize];
            if score < threshold { continue; }
            let lo = x.saturating_sub(4);
            let hi = (x + 4).min(x_count - 1);
            let is_hmax = (lo..=hi).all(|nx| {
                score_map[(y * x_count + nx) as usize] <= score
            });
            if is_hmax {
                peaks.push((x, y, score));
            }
        }
    }
    peaks
}

fn run_ocr_internal(app: AppHandle, squad_size: usize, is_debug: bool, captured_image: Option<DynamicImage>) {
    run_ocr_with_retry(app, squad_size, is_debug, captured_image, 0);
}

fn run_ocr_with_retry(app: AppHandle, squad_size: usize, is_debug: bool, captured_image: Option<DynamicImage>, attempt: u8) {
    let app_c = app.clone();
    std::thread::spawn(move || {
        let start_time = std::time::Instant::now();

        let dynamic_image = if let Some(img) = captured_image.clone() {
            ocr_log!(&app_c, "[OCR] [Attempt {}] Using provided debug image", attempt + 1);
            img
        } else {
            let monitors = Monitor::all().unwrap_or_default();
            if monitors.is_empty() { return; }
            let Ok(image) = monitors[0].capture_image() else { return; };
            DynamicImage::ImageRgba8(image)
        };
        
        let coords = get_slot_coords(squad_size);
        ocr_log!(&app_c, "[OCR] [Attempt {}] Captured image: {}x{}, squad_size={}", attempt + 1, dynamic_image.width(), dynamic_image.height(), squad_size);
        let (bin_path, tessdata_path) = get_tesseract_config(&app_c);
        let bin_path_arc = std::sync::Arc::new(bin_path);
        let tessdata_path_arc = std::sync::Arc::new(tessdata_path);

        let wordlist_path: Option<std::path::PathBuf> = {
            let state = app_c.state::<crate::AppState>();
            let path = state.ocr_wordlist_path.lock().unwrap().clone();
            path
        };
        let wordlist_path_arc = std::sync::Arc::new(wordlist_path);

        let mut handles: Vec<(usize, usize, std::thread::JoinHandle<Option<String>>)> = Vec::new();

        for (i, (x_off, y_off, w, h)) in coords.iter().enumerate() {
            let full_slot_w = (*w * dynamic_image.width() as f64) as u32;
            let full_slot_h = (*h * dynamic_image.height() as f64) as u32;
            let full_slot_x = (*x_off * dynamic_image.width() as f64) as u32;
            let full_slot_y = (*y_off * dynamic_image.height() as f64) as u32;

            if full_slot_x + full_slot_w > dynamic_image.width() || full_slot_y + full_slot_h > dynamic_image.height() { continue; }

            let slot_crop = dynamic_image.crop_imm(full_slot_x, full_slot_y, full_slot_w, full_slot_h);
            
            // ── PREPROCESS ──
            // Upscale 2x instead of 3x to cut Tesseract processing time in half
            let upscaled = slot_crop.resize(full_slot_w * 2, full_slot_h * 2, image::imageops::FilterType::Nearest);
            let mut gray = upscaled.to_luma8();
            for p in gray.pixels_mut() { p[0] = 255 - p[0]; }
            let blurred = image::imageops::blur(&gray, 0.5);

            // --- DYNAMIC OTSU ---
            let mut hist = [0u32; 256];
            for p in blurred.pixels() { hist[p[0] as usize] += 1; }
            let total = (blurred.width() * blurred.height()) as f64;
            let (mut sum, mut sum_b, mut q1, mut max_var) = (0.0f64, 0.0f64, 0.0f64, 0.0f64);
            for i in 0..256usize { sum += i as f64 * hist[i] as f64; }
            let mut threshold = 128u8;
            for i in 0..256usize {
                q1 += hist[i] as f64;
                if q1 == 0.0 { continue; }
                let q2 = total - q1;
                if q2 == 0.0 { break; }
                sum_b += i as f64 * hist[i] as f64;
                let m1 = sum_b / q1;
                let m2 = (sum - sum_b) / q2;
                let var_between = q1 * q2 * (m1 - m2).powi(2);
                if var_between > max_var { max_var = var_between; threshold = i as u8; }
            }
            let mut binary = blurred.clone();
            for p in binary.pixels_mut() { p[0] = if p[0] <= threshold { 0 } else { 255 }; }

            let (uw, uh) = binary.dimensions();
            let midpoint = uh / 2;
            let overlap = (uh as f32 * 0.05) as u32;
            let dyn_binary = image::DynamicImage::ImageLuma8(binary);
            let line1 = dyn_binary.crop_imm(0, 0, uw, midpoint + overlap).to_luma8();
            let line2 = dyn_binary.crop_imm(0, midpoint - overlap, uw, uh - (midpoint - overlap)).to_luma8();

            for (l_idx, line_img) in [(0usize, line1), (1usize, line2)] {
                let bin_path_c = std::sync::Arc::clone(&bin_path_arc);
                let tessdata_path_c = std::sync::Arc::clone(&tessdata_path_arc);
                let wordlist_path_c = std::sync::Arc::clone(&wordlist_path_arc);
                let app_for_thread = app_c.clone();
                let slot_idx = i;

                handles.push((slot_idx, l_idx, std::thread::spawn(move || {
                    let pad = 30u32;
                    let (lw, lh) = (line_img.width(), line_img.height());
                    let mut padded = image::GrayImage::new(lw + pad * 2, lh + pad * 2);
                    padded.fill(255);
                    image::imageops::overlay(&mut padded, &line_img, pad as i64, pad as i64);

                    let mut buffer = Vec::new();
                    let mut cursor = std::io::Cursor::new(&mut buffer);
                    let _ = padded.write_to(&mut cursor, image::ImageFormat::Pnm);

                    let bin_path_str = bin_path_c.to_string_lossy().replace("\\\\?\\", "");
                    let mut cmd = Command::new(&bin_path_str);
                    cmd.args(["-", "stdout", "--oem", "1", "--psm", "7", "-l", "warframe"]);
                    cmd.args(["-c", "load_system_dawg=0", "-c", "load_freq_dawg=0", "-c", "tessedit_write_images=false"]);

                    if let Some(ref wl) = *wordlist_path_c {
                        if wl.exists() { cmd.args(["--user-words", &wl.to_string_lossy()]); }
                    }
                    if let Some(ref tp) = *tessdata_path_c {
                        let tp_str = tp.to_string_lossy().replace("\\\\?\\", "");
                        cmd.env("TESSDATA_PREFIX", tp_str);
                    }

                    #[cfg(windows)] { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }

                    let child = cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn();
                    if let Ok(mut child) = child {
                        if let Some(mut stdin) = child.stdin.take() { let _ = stdin.write_all(&buffer); }
                        if let Ok(output) = child.wait_with_output() {
if output.status.success() {
                                let text = String::from_utf8_lossy(&output.stdout).trim().to_uppercase();
                                crate::logger::log_to_disk(&app_for_thread, &format!("[OCR] Slot {} Line {}: \"{}\"", slot_idx + 1, l_idx + 1, text));
                                return Some(text);
                            } else {
                                let err = String::from_utf8_lossy(&output.stderr);
                                crate::logger::log_to_disk(&app_for_thread, &format!("[OCR] Slot {} Line {} FAILED: {}", slot_idx + 1, l_idx + 1, err.trim()));
                            }
                        }
                    }
                    None
                })));
            }
        }

        let mut slot_lines: std::collections::HashMap<usize, Vec<(usize, String)>> = std::collections::HashMap::new();
        for (slot_idx, l_idx, handle) in handles {
            if let Ok(Some(text)) = handle.join() {
                slot_lines.entry(slot_idx).or_default().push((l_idx, text));
            }
        }

        let mut slot_results = Vec::new();
        let mut sorted_slots: Vec<usize> = slot_lines.keys().cloned().collect();
        sorted_slots.sort();
        
        let mut found_loading = false;
        for slot_idx in sorted_slots {
            let mut lines = slot_lines.remove(&slot_idx).unwrap();
            lines.sort_by_key(|(l, _)| *l);
            let combined = lines.into_iter().map(|(_, t)| t).collect::<Vec<_>>().join(" ");
            if combined.contains("LOADING") { found_loading = true; }
            ocr_log!(&app_c, "[OCR] [Attempt {}] Slot {} text: \"{}\"", attempt + 1, slot_idx + 1, combined);
            slot_results.push(OcrSlotResult { slot: slot_idx + 1, text: combined });
        }

        if found_loading && attempt < 1 {
            ocr_log!(&app_c, "[OCR] [Attempt {}] LOADING detected, retrying in 500ms...", attempt + 1);
            std::thread::sleep(std::time::Duration::from_millis(500));
            run_ocr_with_retry(app_c, squad_size, is_debug, captured_image, attempt + 1);
            return;
        }

        let combined_text = slot_results.iter().map(|r| r.text.clone()).collect::<Vec<_>>().join(" | ");
        ocr_log!(&app_c, "[OCR] [Attempt {}] Total pipeline time: {}ms — results: {}", attempt + 1, start_time.elapsed().as_millis(), combined_text);
        let _ = app_c.emit_all("overlay-debug-text", serde_json::json!({ "text": combined_text }));
        app_c.emit_all("fissure-ocr-band", OcrBandResult { text: combined_text, slot_results, is_debug }).unwrap_or_default();
    });
}

/// Core preprocessing logic used by both live OCR and debug screenshots.
/// Performs 4x upscale, inversion, blurring, and dynamic Otsu thresholding.
fn apply_ocr_preprocessing(slot_crop: &DynamicImage) -> image::GrayImage {
    let (full_slot_w, full_slot_h) = (slot_crop.width(), slot_crop.height());
    let upscaled = slot_crop.resize(full_slot_w * 4, full_slot_h * 4, image::imageops::FilterType::CatmullRom);
    let mut gray = upscaled.to_luma8();
    for p in gray.pixels_mut() { p[0] = 255 - p[0]; }
    let blurred = image::imageops::blur(&gray, 0.5);

    // --- DYNAMIC OTSU ---
    let mut hist = [0u32; 256];
    for p in blurred.pixels() { hist[p[0] as usize] += 1; }
    let total = (blurred.width() * blurred.height()) as f64;
    let (mut sum, mut sum_b, mut q1, mut max_var) = (0.0f64, 0.0f64, 0.0f64, 0.0f64);
    for i in 0..256usize { sum += i as f64 * hist[i] as f64; }
    let mut threshold = 128u8;
    for i in 0..256usize {
        q1 += hist[i] as f64;
        if q1 == 0.0 { continue; }
        let q2 = total - q1;
        if q2 == 0.0 { break; }
        sum_b += i as f64 * hist[i] as f64;
        let m1 = sum_b / q1;
        let m2 = (sum - sum_b) / q2;
        let var_between = q1 * q2 * (m1 - m2).powi(2);
        if var_between > max_var { max_var = var_between; threshold = i as u8; }
    }
    let mut binary = blurred.clone();
    for p in binary.pixels_mut() { p[0] = if p[0] <= threshold { 0 } else { 255 }; }
    binary
}

/// Preprocesses a single image for OCR.
/// Now uses the same dynamic Otsu pipeline as the live `run_ocr_internal`.
fn preprocess_for_ocr(image: DynamicImage) -> image::GrayImage {
    let binary = apply_ocr_preprocessing(&image);
    let pad = 30u32;
    let (uw, uh) = binary.dimensions();
    let mut padded = image::GrayImage::new(uw + pad * 2, uh + pad * 2);
    padded.fill(255);
    image::imageops::overlay(&mut padded, &binary, pad as i64, pad as i64);
    padded
}

#[tauri::command]
pub fn write_ocr_wordlist(app: AppHandle, words: Vec<String>) -> Result<(), String> {
    let state = app.state::<crate::AppState>();
    let mut seen = std::collections::HashSet::new();
    let mut lines = Vec::new();
    for w in &words {
        let trimmed = w.trim().to_string();
        if !trimmed.is_empty() && seen.insert(trimmed.to_lowercase()) { lines.push(trimmed); }
    }
    // Add common non-Prime reward words to the baseline
    for w in &["PRIME", "BLUEPRINT", "SLIVER", "FRAGMENT", "AYATAN", "AMBER", "CYAN", "REQUIEM", "ADAPTER", "FORMA", "EXILUS", "ARCANE"] {
        if seen.insert(w.to_lowercase()) { lines.push(w.to_string()); }
    }
    if lines.is_empty() { return Ok(()); }
    let dir = crate::get_data_root().join("data/user");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("ocr_wordlist.txt");
    std::fs::write(&path, lines.join("\n")).map_err(|e| e.to_string())?;
    *state.ocr_wordlist_path.lock().unwrap() = Some(path);
    Ok(())
}

fn get_tesseract_config(app: &AppHandle) -> (PathBuf, Option<PathBuf>) {
    #[cfg(windows)] let bin_name = "tesseract.exe";
    #[cfg(target_os = "macos")] let bin_name = if cfg!(target_arch = "aarch64") { "tesseract-macos-arm64" } else { "tesseract-macos-x64" };
    #[cfg(not(any(windows, target_os = "macos")))] let bin_name = "tesseract";

    if let Some(bundled) = app.path_resolver().resolve_resource(format!("data/bin/{}", bin_name)) {
        if bundled.exists() {
            let tessdata = bundled.parent().map(|p| p.join("tessdata"));
            return (bundled, tessdata);
        }
    }
    #[cfg(not(windows))] {
        let system = PathBuf::from("/usr/bin/tesseract");
        if system.exists() {
            let tessdata = app.path_resolver().resolve_resource("data/bin/tessdata");
            return (system, tessdata);
        }
    }
    (PathBuf::from(bin_name), None)
}

#[tauri::command]
pub async fn save_debug_screenshot(_app: AppHandle) -> Result<String, String> {
    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
    let monitors = Monitor::all().unwrap_or_default();
    if monitors.is_empty() { return Err("No monitors found".to_string()); }
    let Ok(image) = monitors[0].capture_image() else { return Err("Capture failed".to_string()); };
    let dynamic_image = DynamicImage::ImageRgba8(image);
    let (bx, by, bw, bh) = get_base_region(4);
    let crop = dynamic_image.crop_imm((bx * dynamic_image.width() as f64) as u32, (by * dynamic_image.height() as f64) as u32, (bw * dynamic_image.width() as f64) as u32, (bh * dynamic_image.height() as f64) as u32);
    let processed = preprocess_for_ocr(crop);
    let dest_path = crate::get_data_root().join("data/user/debug_crop.png");
    if let Some(parent) = dest_path.parent() { std::fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
    processed.save(&dest_path).map_err(|e| e.to_string())?;
    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn trigger_manual_ocr(app: AppHandle, squad_size: Option<usize>) -> Result<(), String> {
    let size = squad_size.unwrap_or(4);
    eprintln!("[OCR] Manual trigger called (size={})", size);
    
    if let Some(w) = app.get_window("overlay-relic") {
        let _ = w.show();
        let _ = w.set_always_on_top(true);
    }
    
    use crate::log_scanner::{FissureEvent, RelicInfo};
    let mut mock_relics = Vec::new();
    for _ in 0..size {
        mock_relics.push(RelicInfo {
            unique_name: "MANUAL".to_string(),
            tier: "MANUAL".to_string(),
            refinement: "MANUAL".to_string(),
            era: "MANUAL".to_string(),
        });
    }
    
    app.emit_all("overlay-update-relics", FissureEvent {
        event_type: "reward_phase".to_string(),
        squad_relics: mock_relics,
        local_reward: None,
        squad_size: size,
        void_tier: None
    }).unwrap_or_default();

    run_ocr_internal(app, size, true, None);
    Ok(())
}

#[tauri::command]
pub async fn start_debug_ocr_session(app: AppHandle) -> Result<(), String> {
    use xcap::Monitor;
    use image::DynamicImage;
    
    let app_c = app.clone();
    std::thread::spawn(move || {
        // Wait for user to switch to game
        std::thread::sleep(std::time::Duration::from_secs(5));
        
        // Single capture
        let monitors = Monitor::all().unwrap_or_default();
        if monitors.is_empty() { return; }
        let monitor = &monitors[0];
        let Ok(image) = monitor.capture_image() else { return; };
        let screen = DynamicImage::ImageRgba8(image);
        
        let sw = screen.width()  as f64;
        let sh = screen.height() as f64;
        
        // Crop the icon strip
        let strip_y = ((456.0 / 1080.0) * sh) as u32;
        let strip_h = ((40.0  / 1080.0) * sh).max(1.0) as u32;
        let strip_x = ((555.0 / 1920.0) * sw) as u32;
        let strip_w = ((810.0 / 1920.0) * sw).max(1.0) as u32;
        
        let gray_full = screen.to_luma8();
        if strip_x + strip_w > gray_full.width() || strip_y + strip_h > gray_full.height() {
            return;
        }
        
        let strip = image::imageops::crop_imm(&gray_full, strip_x, strip_y, strip_w, strip_h).to_image();
        
        // Run detection with lowered threshold for 3-slot detection
        let templates = get_templates();
        let sx = sw / 1920.0;
        let sy = sh / 1080.0;
let min_dist_px = ((90.0 * sx) as i32).max(30);
        
        let mut peaks: Vec<u32> = Vec::new();
        for tmpl in templates {
            let tw = ((tmpl.width() as f64) * sx).round() as u32;
            let th = ((tmpl.height() as f64) * sy).round() as u32;
            if tw == 0 || th == 0 || tw > strip_w || th > strip_h { continue; }
            
            let scaled = image::imageops::resize(tmpl, tw, th, image::imageops::FilterType::Lanczos3);
const THRESHOLD: f32 = 0.65;
            
            for (x, _y, _score) in ncc_scan(&strip, &scaled, THRESHOLD) {
                let abs_x = strip_x + x;
                let too_close = peaks.iter().any(|&px| (px as i32 - abs_x as i32).abs() < min_dist_px);
                if !too_close { peaks.push(abs_x); }
            }
        }
        
        peaks.sort_unstable();
        
        let mut has_3_slot = false;
        let mut has_4_slot_outer = false;
        let mut has_4_slot_inner = false;

        for &p in &peaks {
            let norm_x = (p as f64 / sx).round() as i32;
            if (norm_x - 698).abs() < 30 || (norm_x - 940).abs() < 30 || (norm_x - 1182).abs() < 30 {
                has_3_slot = true;
            }
            if (norm_x - 575).abs() < 30 || (norm_x - 1304).abs() < 30 {
                has_4_slot_outer = true;
            }
            if (norm_x - 819).abs() < 30 || (norm_x - 1060).abs() < 30 {
                has_4_slot_inner = true;
            }
        }

        let deduced_size = if has_3_slot && !has_4_slot_outer && !has_4_slot_inner {
            3
        } else if has_4_slot_outer {
            4
        } else if has_4_slot_inner {
            if peaks.len() >= 3 { 4 } else { 2 }
        } else {
            peaks.len().max(2).min(4)
        };
        
        ocr_log!(&app_c, "[DEBUG] Single scan: {} peaks at x={:?}, deduced size={}", peaks.len(), peaks, deduced_size);
        
        if peaks.len() >= 2 {
            let slot_count = deduced_size;
            if let Some(w) = app_c.get_window("overlay-relic") { let _ = w.show(); let _ = w.set_always_on_top(true); }
            
            // Emit relic events for overlay
            let event_payload = crate::log_scanner::FissureEvent {
                event_type: "relic_phase_start".to_string(),
                squad_relics: Vec::new(),
                local_reward: None,
                squad_size: slot_count,
                void_tier: None,
            };
            app_c.emit_all("scanner-relic-phase-start", serde_json::json!({ "squad_size": slot_count })).unwrap_or_default();
            app_c.emit_all("fissure-relic-phase", &event_payload).unwrap_or_default();
            
            run_ocr_pipeline_with_size(app_c, slot_count);
        }
    });
    Ok(())
}