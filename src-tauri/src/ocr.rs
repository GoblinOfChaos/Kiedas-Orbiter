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

/// Stores the user's custom UI Scale percentage (e.g. 100 for 1.0, 80 for 0.8)
pub static USER_UI_SCALE: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(100);

#[tauri::command]
pub fn set_fissure_ui_scale(scale: u32) {
    USER_UI_SCALE.store(scale, Ordering::SeqCst);
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
    let trim_x = 5.0 / 1920.0;
    (0..squad_size).map(|i| {
        (bx + (i as f64 * slot_w) + trim_x, by, slot_w - 2.0 * trim_x, bh)
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

static RARITY_TEMPLATES: std::sync::OnceLock<Vec<image::RgbImage>> =
    std::sync::OnceLock::new();

fn get_templates() -> &'static Vec<image::RgbImage> {
    RARITY_TEMPLATES.get_or_init(|| {
        let raw: &[&[u8]] = &[
            include_bytes!("../data/bin/rarity_rare.png"),
            include_bytes!("../data/bin/rarity_uncommon.png"),
            include_bytes!("../data/bin/rarity_common.png"),
        ];
        raw.iter()
            .filter_map(|bytes| image::load_from_memory(bytes).ok().map(|i| i.to_rgb8()))
            .collect()
    })
}

// ─── Position-anchored NCC detection ──────────────────────────────────────────
//
// The reward detection pipeline uses a position-anchored approach to maximize
// reliability and minimize CPU usage.
//
// 1. ANCHORED SEARCH:
//    Because Warframe's reward UI is standardized, relic icons can only appear
//    at specific horizontal coordinates. Instead of a sliding-window search
//    across the entire screen, we only evaluate the Normalized Cross-Correlation
//    (NCC) at 7 known 'anchor' points. This eliminates false positives from 
//    dynamic gameplay backgrounds.
//
// 2. COLOR DISCRIMINATION:
//    Detection is performed using all 3 RGB color channels. This allows the
//    scanner to easily distinguish between Silver and Gold icons which share
//    the same shape but different color profiles.
//
// 3. CONFIGURATION SCORING:
//    The system evaluates the scores of all anchor points against valid squad
//    configurations (2, 3, or 4 slots). It picks the configuration that best
//    explains the detected icons.
//
// 4. PERFORMANCE:
//    Template data is pre-computed (zero-meaned and normalized) once per 
//    attempt to keep the inner detection loop extremely fast.

/// X-centres of all 7 possible rarity-icon positions at 1920×1080.
/// Index layout:
///   0=595  1=717  2=838  3=960  4=1080  5=1202  6=1323
const CENTERS_1080P: [i32; 7] = [595, 717, 838, 960, 1080, 1202, 1323];

/// Which of the 7 indices each squad size occupies:
///   4-slot → 0,2,4,6  (595, 838, 1080, 1323)
///   3-slot → 1,3,5    (717, 960, 1202)
///   2-slot → 2,4      (838, 1080)
const CONFIG_4: &[usize] = &[0, 2, 4, 6];
const CONFIG_3: &[usize] = &[1, 3, 5];
const CONFIG_2: &[usize] = &[2, 4];

/// Minimum NCC score for a single slot to be considered "detected".
/// Can be high because we never evaluate off-position pixels and use shape masking.
const PER_SLOT_MIN: f32 = 0.8;

// ── Pre-computed template cache ────────────────────────────────────────────────

/// Template data pre-computed once per scan attempt (after resolution scaling).
/// Avoids repeating O(template_pixels) arithmetic inside the hot NCC loop.
struct TemplateData {
    centered: Vec<f32>,   // Interleaved RGB values minus their mean (foreground only)
    fg_indices: Vec<usize>, // Byte offsets into the raw RGB buffer for foreground pixels
    norm: f32,            // sqrt( sum of squared centered values )
    w: u32,
    h: u32,
}

fn precompute_template(img: &image::RgbImage) -> Option<TemplateData> {
    let raw = img.as_raw();
    if raw.is_empty() { return None; }

    // 1. Identify foreground pixels.
    // We treat any pixel with significant brightness as part of the "jagged icon" shape.
    // Background pixels (dark) are ignored to prevent them from diluting the score.
    let mut fg_indices = Vec::new();
    for i in (0..raw.len()).step_by(3) {
        let brightness = raw[i] as f32 * 0.299 + raw[i+1] as f32 * 0.587 + raw[i+2] as f32 * 0.114;
        if brightness > 15.0 {
            fg_indices.push(i);
        }
    }
    if fg_indices.is_empty() { return None; }

    // 2. Compute mean of foreground pixels only
    let mut sum = 0.0f32;
    for &idx in &fg_indices {
        sum += raw[idx] as f32 + raw[idx+1] as f32 + raw[idx+2] as f32;
    }
    let mean = sum / (fg_indices.len() * 3) as f32;

    // 3. Center and compute norm
    let mut centered = vec![0.0f32; raw.len()];
    let mut sum_sq = 0.0f32;
    for &idx in &fg_indices {
        let r = raw[idx] as f32 - mean;
        let g = raw[idx+1] as f32 - mean;
        let b = raw[idx+2] as f32 - mean;
        centered[idx] = r;
        centered[idx+1] = g;
        centered[idx+2] = b;
        sum_sq += r*r + g*g + b*b;
    }
    let norm = sum_sq.sqrt();
    if norm < 1e-6 { return None; }

    Some(TemplateData { centered, fg_indices, norm, w: img.width(), h: img.height() })
}

// ── Single-position NCC ────────────────────────────────────────────────────────

/// Evaluate RGB NCC of `tmpl` against `strip` with the template centred on
/// (`cx`, `cy`) in strip-local pixel coordinates.
/// 
/// This version is "Shape-Aware": it only correlates pixels identified as 
/// foreground in the template, making it immune to background noise.
fn ncc_at(strip: &image::RgbImage, tmpl: &TemplateData, cx: i32, cy: i32) -> f32 {
    let x0 = cx - tmpl.w as i32 / 2;
    let y0 = cy - tmpl.h as i32 / 2;
    if x0 < 0 || y0 < 0 { return 0.0; }
    let x0 = x0 as u32;
    let y0 = y0 as u32;
    if x0 + tmpl.w > strip.width() || y0 + tmpl.h > strip.height() { return 0.0; }

    let sw = strip.width() as usize;
    let raw = strip.as_raw();

    // 1. Calculate mean of the source patch (at foreground locations only)
    let mut p_sum = 0.0f32;
    for &t_idx in &tmpl.fg_indices {
        let dx = (t_idx / 3) as u32 % tmpl.w;
        let dy = (t_idx / 3) as u32 / tmpl.w;
        let p_idx = ((y0 + dy) as usize * sw + (x0 + dx) as usize) * 3;
        
        p_sum += raw[p_idx] as f32 + raw[p_idx + 1] as f32 + raw[p_idx + 2] as f32;
    }
    let p_mean = p_sum / (tmpl.fg_indices.len() * 3) as f32;

    // 2. Calculate Dot Product and Source Norm
    let mut dot = 0.0f32;
    let mut p_sq = 0.0f32;
    for &t_idx in &tmpl.fg_indices {
        let dx = (t_idx / 3) as u32 % tmpl.w;
        let dy = (t_idx / 3) as u32 / tmpl.w;
        let p_idx = ((y0 + dy) as usize * sw + (x0 + dx) as usize) * 3;

        let r = raw[p_idx] as f32 - p_mean;
        let g = raw[p_idx + 1] as f32 - p_mean;
        let b = raw[p_idx + 2] as f32 - p_mean;

        dot += r * tmpl.centered[t_idx] + g * tmpl.centered[t_idx + 1] + b * tmpl.centered[t_idx + 2];
        p_sq += r * r + g * g + b * b;
    }

    let p_norm = p_sq.sqrt();
    if p_norm < 1e-6 { 0.0 } else { (dot / (tmpl.norm * p_norm)).clamp(-1.0, 1.0) }
}

// ── Configuration scorer ───────────────────────────────────────────────────────

/// Returns (mean_ncc_across_slots, n_slots_that_beat_PER_SLOT_MIN).
fn score_config(slot_scores: &[f32; 7], indices: &[usize]) -> (f32, usize) {
    let above = indices.iter().filter(|&&i| slot_scores[i] >= PER_SLOT_MIN).count();
    let mean  = indices.iter().map(|&i| slot_scores[i]).sum::<f32>() / indices.len() as f32;
    (mean, above)
}

// ── Main detection function ────────────────────────────────────────────────────

/// Polls the screen after the 10-reactant trigger until rarity icons are found,
/// then fires the OCR pipeline with the correct slot count.
/// If `manual` is true, stops after 5 seconds (for manual trigger buttons).
/// If `manual` is false, loops until icons found or ICON_SCAN_ACTIVE is cleared.
pub fn detect_slot_count_from_icons(app: AppHandle, manual: bool) {
    std::thread::spawn(move || {
        let templates = get_templates();
        if templates.is_empty() {
            ocr_log!(&app, "[OCR] WARN: no rarity templates loaded, aborting icon scan");
            return;
        }

        let mut attempt = 0u32;
        let start_time = std::time::Instant::now();
        const MANUAL_TIMEOUT_SECS: u64 = 5;

        loop {
            if manual && start_time.elapsed().as_secs() >= MANUAL_TIMEOUT_SECS {
                ocr_log!(&app, "[OCR] Icon scan timed out after {} attempts", attempt);
                ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
                if let Some(window) = app.get_window("overlay-relic") { let _ = window.hide(); }
                app.emit_all("fissure-reward-closed", ()).unwrap_or_default();
                return;
            }

            attempt += 1;
            std::thread::sleep(std::time::Duration::from_millis(400));

            if !ICON_SCAN_ACTIVE.load(Ordering::SeqCst) {
                ocr_log!(&app, "[OCR] Icon scan: flag cleared, stopping (attempt {})", attempt);
                return;
            }

            // ── Screen capture ─────────────────────────────────────────────────
            let monitors = Monitor::all().unwrap_or_default();
            if monitors.is_empty() { continue; }
            let monitor = monitors.iter()
                .find(|m| m.is_primary().unwrap_or(false))
                .unwrap_or(&monitors[0]);

            let screen = match monitor.capture_image() {
                Ok(s) => s,
                Err(e) => {
                    ocr_log!(&app, "[OCR] Capture failed (attempt {}): {}", attempt, e);
                    continue;
                }
            };

            let sw = screen.width()  as f64;
            let sh = screen.height() as f64;
            let sx = sw / 1920.0;
            let sy = sh / 1080.0;
            let active_scale = USER_UI_SCALE.load(Ordering::SeqCst) as f64 / 100.0;

            // ── Strip crop (centered at Y=478 for 1080p) ──────────────────────
            let strip_x = ((555.0 / 1920.0) * sw) as u32;
            let strip_y = ((428.0 / 1080.0) * sh) as u32;
            let strip_w = ((810.0 / 1920.0) * sw).max(1.0) as u32;
            let strip_h = ((100.0 / 1080.0) * sh).max(1.0) as u32;

            let rgb_full = DynamicImage::ImageRgba8(screen).to_rgb8();
            if strip_x + strip_w > rgb_full.width() || strip_y + strip_h > rgb_full.height() {
                continue;
            }
            let strip = image::imageops::crop_imm(
                &rgb_full, strip_x, strip_y, strip_w, strip_h
            ).to_image();

            // ── Scale templates to current resolution + UI scale ───────────────
            // Done every attempt so USER_UI_SCALE changes take effect live.
            let scaled_templates: Vec<TemplateData> = templates.iter().filter_map(|tmpl| {
                let tw = ((tmpl.width()  as f64 * sx * active_scale).round() as u32).max(1);
                let th = ((tmpl.height() as f64 * sy * active_scale).round() as u32).max(1);
                if tw > strip_w || th > strip_h { return None; }
                let scaled = image::imageops::resize(
                    tmpl, tw, th, image::imageops::FilterType::Lanczos3
                );
                precompute_template(&scaled)
            }).collect();

            if scaled_templates.is_empty() { continue; }

            // ── Evaluate NCC at each of the 7 canonical positions ─────────────
            // 
            // We use a ±5px "micro-scan" around each anchor to account for slight
            // alignment drifts caused by UI scale or anti-aliasing.
            let strip_cy = (strip_h / 2) as i32;
            let mut slot_scores = [0.0f32; 7];

            for (i, &cx_1080p) in CENTERS_1080P.iter().enumerate() {
                let abs_x = (cx_1080p as f64 * sx).round() as i32;
                let strip_cx = abs_x - strip_x as i32;

                // Save individual debug crops for manual scans
                if manual {
                    if let Some(t) = scaled_templates.first() {
                        let x0 = (strip_cx - t.w as i32 / 2).max(0) as u32;
                        let y0 = (strip_cy - t.h as i32 / 2).max(0) as u32;
                        if x0 + t.w <= strip.width() && y0 + t.h <= strip.height() {
                            let anchor_crop = image::imageops::crop_imm(&strip, x0, y0, t.w, t.h).to_image();
                            let debug_path = crate::get_data_root().join(format!("data/user/debug_anchor_{}.png", cx_1080p));
                            let _ = anchor_crop.save(debug_path);
                        }
                    }
                }

                let mut best_slot_score = 0.0f32;
                // Probing ±5px horizontally and ±2px vertically for the best match
                for dy in -2..=2 {
                    for dx in -5..=5 {
                        for t in scaled_templates.iter() {
                            let score = ncc_at(&strip, t, strip_cx + dx, strip_cy + dy);
                            if score > best_slot_score {
                                best_slot_score = score;
                            }
                        }
                    }
                }
                slot_scores[i] = best_slot_score;
            }

            ocr_log!(&app,
                "[OCR] Attempt {:>3}: NCC @ [595={:.3} 717={:.3} 838={:.3} 960={:.3} 1080={:.3} 1202={:.3} 1323={:.3}] scale={:.2}",
                attempt,
                slot_scores[0], slot_scores[1], slot_scores[2], slot_scores[3],
                slot_scores[4], slot_scores[5], slot_scores[6],
                active_scale,
            );

            // ── Score each squad-size configuration ────────────────────────────
            //
            // Each configuration (2, 3, or 4 slots) is scored based on the 
            // detected icons at its respective anchor points.
            //
            // ELIGIBILITY RULES (Strict):
            // - 4-slot: All 4 anchors must match.
            // - 3-slot: All 3 anchors must match.
            // - 2-slot: Both anchors must match.
            let (_score4, valid4) = score_config(&slot_scores, CONFIG_4);
            let (_score3, valid3) = score_config(&slot_scores, CONFIG_3);
            let (_score2, valid2) = score_config(&slot_scores, CONFIG_2);

            let ok4 = valid4 == 4;
            let ok3 = valid3 == 3;
            let ok2 = valid2 == 2;

            // Priority-based deduction:
            // Larger squad sizes are checked first. If 4 valid icons are found, 
            // it is a 4-slot layout, regardless of what sub-configurations match.
            let deduced_size = if ok4 {
                4
            } else if ok3 {
                3
            } else if ok2 {
                2
            } else {
                // No configuration matched well enough — keep polling
                continue;
            };

            // ── Matched — fire the OCR pipeline ───────────────────────────────
            ocr_log!(&app,
                "[OCR] Icon scan SUCCESS: {} slots detected (attempt {}, scale={:.2})",
                deduced_size, attempt, active_scale,
            );

            ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            if let Some(window) = app.get_window("overlay-relic") { let _ = window.show(); }

            let state = app.state::<crate::AppState>();
            let relics: Vec<crate::log_scanner::RelicInfo> =
                if let Ok(cached) = state.active_relic_data.lock() {
                    if let Some(ref val) = *cached {
                        val.get("squad_relics")
                            .and_then(|v| serde_json::from_value(v.clone()).ok())
                            .unwrap_or_default()
                    } else { Vec::new() }
                } else { Vec::new() };

            let event_payload = crate::log_scanner::FissureEvent {
                event_type: "relic_phase_start".to_string(),
                squad_relics: relics,
                local_reward: None,
                squad_size: deduced_size,
                void_tier: None,
            };
            app.emit_all("scanner-relic-phase-start",
                serde_json::json!({ "squad_size": deduced_size })
            ).unwrap_or_default();
            app.emit_all("fissure-relic-phase", &event_payload).unwrap_or_default();

            run_ocr_pipeline_with_size(app, deduced_size);
            return;
        }
    });
}

// ─── ncc_scan (kept for any future callers) ────────────────────────────────────
//
// This is the original full-strip sweep. It is no longer called by
// detect_slot_count_from_icons but is preserved in case it's useful elsewhere.
#[allow(dead_code)]
fn ncc_scan(strip: &image::GrayImage, template: &image::GrayImage, threshold: f32, step: u32) -> Vec<(u32, u32, f32)> {
    let (sw, sh) = strip.dimensions();
    let (tw, th) = template.dimensions();
    if tw > sw || th > sh { return vec![]; }

    let t_pixels: Vec<f32> = template.pixels().map(|p| p[0] as f32).collect();
    let t_mean = t_pixels.iter().sum::<f32>() / t_pixels.len() as f32;
    let t_centered: Vec<f32> = t_pixels.iter().map(|&v| v - t_mean).collect();
    let t_norm = t_centered.iter().map(|v| v * v).sum::<f32>().sqrt();
    if t_norm < 1e-6 { return vec![]; }

    let s_pixels = strip.as_raw();
    let x_count = sw - tw + 1;
    let y_count = sh - th + 1;
    let mut peaks = Vec::new();

    let tw_usize = tw as usize;
    let th_usize = th as usize;
    let sw_usize = sw as usize;

    for y in (0..y_count as usize).step_by(step as usize) {
        for x in (0..x_count as usize).step_by(step as usize) {
            let mut p_sum = 0.0f32;
            for dy in 0..th_usize {
                let row_offset = (y + dy) * sw_usize;
                for dx in 0..tw_usize {
                    p_sum += s_pixels[row_offset + x + dx] as f32;
                }
            }
            let p_mean = p_sum / (tw * th) as f32;

            let mut dot = 0.0f32;
            let mut p_sq = 0.0f32;
            for dy in 0..th_usize {
                let row_offset = (y + dy) * sw_usize;
                let t_row_offset = dy * tw_usize;
                for dx in 0..tw_usize {
                    let pc = s_pixels[row_offset + x + dx] as f32 - p_mean;
                    dot += pc * t_centered[t_row_offset + dx];
                    p_sq += pc * pc;
                }
            }
            let p_norm = p_sq.sqrt();
            if p_norm > 1e-6 {
                let score = dot / (t_norm * p_norm);
                if score >= threshold {
                    peaks.push((x as u32, y as u32, score));
                }
            }
        }
    }
    peaks
}

fn run_ocr_internal(app: AppHandle, squad_size: usize, is_debug: bool, captured_image: Option<DynamicImage>) {
    run_ocr_with_retry(app, squad_size, is_debug, captured_image, 0);
}

/// Advanced preprocessing using contrast normalization + edge enhancement.
/// This gives Tesseract more usable input than pure edge detection.
fn apply_ocr_preprocessing(slot_crop: &DynamicImage, debug_slot: Option<usize>) -> image::GrayImage {
    use imageproc::filter::gaussian_blur_f32;

    let (fw, fh) = (slot_crop.width(), slot_crop.height());
    let upscaled = slot_crop.resize(fw * 3, fh * 3, image::imageops::FilterType::Lanczos3);
    let gray = upscaled.to_luma8();
    let (w, h) = gray.dimensions();

    // 1. Compute local contrast using difference from blurred background
    let large = gaussian_blur_f32(&gray, 30.0);

    // 2. Create contrast-enhanced image
    let mut enhanced = image::GrayImage::new(w, h);
    let total_pixels = (w * h) as f32;
    let bg_mean: f32 = large.pixels().map(|p| p[0] as f32).sum::<f32>() / total_pixels;
    
    for y in 0..h {
        for x in 0..w {
            let orig = gray.get_pixel(x, y)[0] as f32;
            let blurred = large.get_pixel(x, y)[0] as f32;
            let diff = orig - blurred;
            let normalized = (bg_mean + diff * 3.0).clamp(0.0, 255.0) as u8;
            enhanced.put_pixel(x, y, image::Luma([normalized]));
        }
    }

    // 3. Light smoothing to kill high-frequency noise/artifacts before Otsu
    let smoothed = gaussian_blur_f32(&enhanced, 0.5);

    // 4. Dynamic Otsu Threshold on smoothed image
    let mut hist = [0u32; 256];
    for p in smoothed.pixels() { hist[p[0] as usize] += 1; }
    let total = total_pixels as f64;
    let (mut sum, mut sum_b, mut q1, mut max_var) = (0.0f64, 0.0f64, 0.0f64, 0.0f64);
    for i in 0..256 { sum += i as f64 * hist[i] as f64; }
    let mut otsu_thresh = 128u8;
    for i in 0..256 {
        q1 += hist[i] as f64;
        if q1 == 0.0 { continue; }
        let q2 = total - q1;
        if q2 == 0.0 { break; }
        sum_b += i as f64 * hist[i] as f64;
        let m1 = sum_b / q1;
        let m2 = (sum - sum_b) / q2;
        let var = q1 * q2 * (m1 - m2).powi(2);
        if var > max_var { max_var = var; otsu_thresh = i as u8; }
    }

    let mut binary = image::GrayImage::new(w, h);
    for y in 0..h {
        for x in 0..w {
            let val = smoothed.get_pixel(x, y)[0];
            binary.put_pixel(x, y, image::Luma([if val < otsu_thresh { 0 } else { 255 }]));
        }
    }

    // Normalise polarity: Tesseract expects dark text on light background.
    // Use edge-based detection: borders are almost always background.
    let mut edge_black = 0;
    let mut edge_white = 0;
    for x in 0..w {
        if binary.get_pixel(x, 0)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
        if binary.get_pixel(x, h - 1)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
    }
    for y in 0..h {
        if binary.get_pixel(0, y)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
        if binary.get_pixel(w - 1, y)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
    }
    if edge_black > edge_white {
        for p in binary.pixels_mut() { p[0] = 255 - p[0]; }
    }

    binary
}

fn run_ocr_with_retry(app: AppHandle, squad_size: usize, is_debug: bool, captured_image: Option<DynamicImage>, attempt: u8) {
    let app_c = app.clone();
    std::thread::spawn(move || {
        let start_time = std::time::Instant::now();
        let dynamic_image = if let Some(img) = captured_image.clone() { img } else {
            let monitors = Monitor::all().unwrap_or_default();
            if monitors.is_empty() { return; }
            let Ok(image) = monitors[0].capture_image() else { return; };
            DynamicImage::ImageRgba8(image)
        };
        
        ocr_log!(&app_c, "[OCR] Starting contrast normalization...");

        let coords = get_slot_coords(squad_size);
        let (bin_path, tessdata_path) = get_tesseract_config(&app_c);
        let bin_path_arc = std::sync::Arc::new(bin_path);
        let tessdata_path_arc = std::sync::Arc::new(tessdata_path);

        let wordlist_path: Option<std::path::PathBuf> = {
            let state = app_c.state::<crate::AppState>();
            let path = state.ocr_wordlist_path.lock().unwrap().clone();
            path
        };
        let wordlist_path_arc = std::sync::Arc::new(wordlist_path);

        let mut handles = Vec::new();

        for (i, (x_off, y_off, w, h)) in coords.iter().enumerate() {
            let sw = dynamic_image.width() as f64;
            let sh = dynamic_image.height() as f64;
            let fx = (*x_off * sw) as u32;
            let fy = (*y_off * sh) as u32;
            let fw = (*w * sw) as u32;
            let fh = (*h * sh) as u32;

            if fx + fw > dynamic_image.width() || fy + fh > dynamic_image.height() { continue; }
            let slot_crop = dynamic_image.crop_imm(fx, fy, fw, fh);
            
            let bin_path_c = std::sync::Arc::clone(&bin_path_arc);
            let tessdata_path_c = std::sync::Arc::clone(&tessdata_path_arc);
            let wordlist_path_c = std::sync::Arc::clone(&wordlist_path_arc);
            let app_for_thread = app_c.clone();
            let slot_idx = i;

            handles.push(std::thread::spawn(move || {
            let binary = apply_ocr_preprocessing(&slot_crop, Some(slot_idx));
            let (uw, uh) = binary.dimensions();

                let midpoint = uh / 2;
                let overlap = (uh as f32 * 0.05) as u32;
                let dyn_binary = image::DynamicImage::ImageLuma8(binary);
                let line1 = dyn_binary.crop_imm(0, 0, uw, (midpoint + overlap).min(uh)).to_luma8();
                let line2 = dyn_binary.crop_imm(0, (midpoint - overlap).max(0), uw, uh - ((midpoint - overlap).max(0))).to_luma8();

                // Save debug images for line1 and line2
                let debug_dir = crate::get_data_root().join("data/user");
                if let Some(parent) = debug_dir.parent() { let _ = std::fs::create_dir_all(&debug_dir); }
                let _ = line1.save(debug_dir.join(format!("ocr_debug_slot{}_line1.png", slot_idx)));
                let _ = line2.save(debug_dir.join(format!("ocr_debug_slot{}_line2.png", slot_idx)));

                let mut combined_lines = Vec::new();
                for (_l_idx, line_img) in [(0usize, line1), (1usize, line2)] {
                    let pad = 30u32;
                    let (lw, lh) = (line_img.width(), line_img.height());
                    let mut padded = image::GrayImage::new(lw + pad * 2, lh + pad * 2);
                    padded.fill(255);
                    image::imageops::overlay(&mut padded, &line_img, pad as i64, pad as i64);

                    let mut buffer = Vec::new();
                    let _ = padded.write_to(&mut std::io::Cursor::new(&mut buffer), image::ImageFormat::Pnm);

                    let mut cmd = Command::new(bin_path_c.to_string_lossy().replace("\\\\?\\", ""));
                    cmd.args(["-", "stdout", "--oem", "1", "--psm", "7", "-l", "warframe"]);
                    // Strict Whitelist: Include both cases, numbers, spaces and apostrophes.
                    cmd.args(["-c", "tessedit_char_whitelist=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '"]);
                    cmd.args(["-c", "load_system_dawg=0", "-c", "load_freq_dawg=0", "-c", "tessedit_write_images=false"]);

                    if let Some(ref wl) = *wordlist_path_c { if wl.exists() { cmd.args(["--user-words", &wl.to_string_lossy()]); } }
                    if let Some(ref tp) = *tessdata_path_c { cmd.env("TESSDATA_PREFIX", tp.to_string_lossy().replace("\\\\?\\", "")); }

                    #[cfg(windows)] { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }

                    if let Ok(mut child) = cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn() {
                        if let Some(mut stdin) = child.stdin.take() { let _ = stdin.write_all(&buffer); }
                        if let Ok(output) = child.wait_with_output() {
                            if output.status.success() {
                                let text = String::from_utf8_lossy(&output.stdout).trim().to_string();
                                combined_lines.push(text);
                            } else {
                                let err = String::from_utf8_lossy(&output.stderr);
                                ocr_log!(&app_for_thread, "[OCR] Tesseract error: {}", err);
                            }
                        }
                    }
                }
                
/// Strip leading garbage tokens from a Tesseract result.
///
/// Warframe item names always start with a proper capitalised word followed
/// by another valid word. We skip tokens until we find a candidate where:
///   - no digits, length >= 2, starts uppercase
///   - AND the immediately following token also looks valid
/// This filters single-char noise, digit blobs, and short mixed-case artefacts
/// like "sT" or "Liu" when followed by another garbage token.
fn clean_ocr_output(raw: &str) -> String {
    let tokens: Vec<&str> = raw.split_whitespace().collect();
    if tokens.is_empty() { return String::new(); }

    for i in 0..tokens.len() {
        let t = tokens[i];
        if t.len() < 2 { continue; }
        if t.chars().any(|c| c.is_ascii_digit()) { continue; }
        if !t.chars().next().map(|c| c.is_uppercase()).unwrap_or(false) { continue; }

        // Accept if this is the last token, or the next token also looks valid.
        // This rejects "Liu" when followed by "r", but accepts "Forma" followed
        // by "Blueprint".
        let accept = if i + 1 < tokens.len() {
            let next = tokens[i + 1];
            next.len() >= 2
                && !next.chars().any(|c| c.is_ascii_digit())
                && next.chars().next().map(|c| c.is_uppercase()).unwrap_or(false)
        } else {
            true
        };

        if accept {
            return tokens[i..].join(" ");
        }
    }

    raw.to_string()
}

// ... existing run_ocr_with_retry ...
                if !combined_lines.is_empty() {
                    let raw = combined_lines.join(" ");
                    let cleaned = clean_ocr_output(&raw);
                    if raw != cleaned {
                        ocr_log!(&app_for_thread, "[OCR] Slot {} cleaned: {:?} → {:?}", slot_idx + 1, raw, cleaned);
                    } else {
                        ocr_log!(&app_for_thread, "[OCR] Slot {}: {:?}", slot_idx + 1, cleaned);
                    }
                    Some(cleaned)
                } else { None }
            }));
        }

        let mut slot_results = Vec::new();
        let mut found_loading = false;
        for (i, h) in handles.into_iter().enumerate() {
            if let Ok(Some(text)) = h.join() {
                if text.contains("LOADING") { found_loading = true; }
                slot_results.push(OcrSlotResult { slot: i + 1, text });
            }
        }

        if found_loading && attempt < 1 {
            ocr_log!(&app_c, "[OCR] [Attempt {}] LOADING detected, retrying in 500ms...", attempt + 1);
            std::thread::sleep(std::time::Duration::from_millis(500));
            run_ocr_with_retry(app_c, squad_size, is_debug, captured_image, attempt + 1);
            return;
        }

        let combined_text = slot_results.iter().map(|r| r.text.clone()).collect::<Vec<_>>().join(" | ");
        ocr_log!(&app_c, "[OCR] [Attempt {}] Total pipeline time: {}ms", attempt + 1, start_time.elapsed().as_millis());
        let _ = app_c.emit_all("overlay-debug-text", serde_json::json!({ "text": combined_text }));
        app_c.emit_all("fissure-ocr-band", OcrBandResult { text: combined_text, slot_results, is_debug }).unwrap_or_default();
    });
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
    
    let processed = apply_ocr_preprocessing(&crop, None);
    
    let pad = 30u32;
    let (uw, uh) = processed.dimensions();
    let mut padded = image::GrayImage::new(uw + pad * 2, uh + pad * 2);
    padded.fill(255);
    image::imageops::overlay(&mut padded, &processed, pad as i64, pad as i64);

    let dest_path = crate::get_data_root().join("data/user/debug_crop.png");
    if let Some(parent) = dest_path.parent() { std::fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
    padded.save(&dest_path).map_err(|e| e.to_string())?;
    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn trigger_manual_ocr(app: AppHandle, _squad_size: Option<usize>) -> Result<(), String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let msg = format!("[SHORTCUT] trigger_manual_ocr called at {}", now);
    eprintln!("{}", msg);
    crate::logger::log_to_disk(&app, &msg);
    ICON_SCAN_ACTIVE.store(true, Ordering::SeqCst);
    detect_slot_count_from_icons(app, true);
    Ok(())
}

#[tauri::command]
pub async fn start_debug_ocr_session(app: AppHandle) -> Result<(), String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let msg = format!("[DEBUG] start_debug_ocr_session called at {}", now);
    eprintln!("{}", msg);
    crate::logger::log_to_disk(&app, &msg);
    ICON_SCAN_ACTIVE.store(true, Ordering::SeqCst);
    std::thread::sleep(std::time::Duration::from_secs(5));
    detect_slot_count_from_icons(app, true);
    Ok(())
}
