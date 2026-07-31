use lazy_static::lazy_static;
use ocr_rs::OcrEngine;
use rayon::iter::{IntoParallelIterator, ParallelIterator};
use std::f32::consts::PI;
use std::path::Path;
use std::{collections::HashMap, sync::Mutex};

use image::{DynamicImage, GenericImageView, Pixel, Rgb};
use log::{debug, warn};

use crate::theme::Theme;

const PIXEL_REWARD_WIDTH: f32 = 968.0;
const PIXEL_REWARD_HEIGHT: f32 = 235.0;
const PIXEL_REWARD_YDISPLAY: f32 = 316.0;
const PIXEL_REWARD_LINE_HEIGHT: f32 = 48.0;

pub fn detect_theme(image: &DynamicImage) -> Theme {
    let screen_scaling = if image.width() * 9 > image.height() * 16 {
        image.height() as f32 / 1080.0
    } else {
        image.width() as f32 / 1920.0
    };

    let line_height = PIXEL_REWARD_LINE_HEIGHT / 2.0 * screen_scaling;
    let most_width = PIXEL_REWARD_WIDTH * screen_scaling;

    let min_width = most_width / 4.0;

    let weights = (line_height as u32..image.height())
        .into_par_iter()
        .fold(HashMap::new, |mut weights: HashMap<Theme, f32>, y| {
            let perc = (y as f32 - line_height) / (image.height() as f32 - line_height);
            let total_width = min_width * perc + min_width;
            for x in 0..total_width as u32 {
                let closest = Theme::closest_from_color(
                    image
                        .get_pixel(x + (most_width - total_width) as u32 / 2, y)
                        .to_rgb(),
                );

                *weights.entry(closest.0).or_insert(0.0) += 1.0 / (1.0 + closest.1).powi(4)
            }
            weights
        })
        .reduce(HashMap::new, |mut a, b| {
            for (k, v) in b {
                *a.entry(k).or_insert(0.0) += v;
            }
            a
        });

    debug!("{:#?}", weights);

    weights
        .iter()
        .max_by(|a, b| a.1.total_cmp(b.1))
        .unwrap()
        .0
        .to_owned()
}

pub fn extract_parts(image: &DynamicImage, theme: Theme) -> Vec<DynamicImage> {
    extract_parts_impl(image, theme).0
}

/// Same as extract_parts, but also returns each part's absolute pixel rect
/// (x, y, width, height) relative to the `image` argument - added
/// 2026-07-20 so the Python overlay can size and position itself to match
/// Warframe's own reward boxes instead of a fixed guessed size/position
/// (the previous behavior looked visibly smaller than the game's own
/// boxes, confirmed via a real screenshot from Jacob). Kept as a separate
/// function from extract_parts rather than changing its return type, to
/// avoid touching that function's other call sites (image.rs,
/// check_image.rs, theme_tune.rs, relics.rs, and main.rs's non-production
/// test/verify helpers) - only the real detection path in main.rs opts
/// into the new rect data.
pub fn extract_parts_with_rects(
    image: &DynamicImage,
    theme: Theme,
) -> (Vec<DynamicImage>, Vec<(u32, u32, u32, u32)>) {
    extract_parts_impl(image, theme)
}

fn extract_parts_impl(
    image: &DynamicImage,
    theme: Theme,
) -> (Vec<DynamicImage>, Vec<(u32, u32, u32, u32)>) {
    // Unconditional debug artifact, written to the current working
    // directory on every single real detection - if that write ever
    // failed (read-only cwd, disk full, permissions), the whole detector
    // process crashed on a production capture over something that isn't
    // even needed for the actual detection. Matches the non-panicking
    // pattern main.rs already uses for its own debug image dumps. Jacob
    // 2026-07-24 ("Remove production OCR panics... including an
    // unconditional debug input.png write").
    if let Err(e) = image.save("input.png") {
        warn!("Failed to save debug capture input.png: {}", e);
    }
    let screen_scaling = if image.width() * 9 > image.height() * 16 {
        image.height() as f32 / 1080.0
    } else {
        image.width() as f32 / 1920.0
    };
    let line_height = (PIXEL_REWARD_LINE_HEIGHT / 2.0 * screen_scaling) as usize;

    let width = image.width() as f32;
    let height = image.height() as f32;
    let most_width = PIXEL_REWARD_WIDTH * screen_scaling;
    let most_left = width / 2.0 - most_width / 2.0;
    // Most Top = pixleRewardYDisplay - pixleRewardHeight + pixelRewardLineHeight
    //                   (316          -        235        +       44)    *    1.1    =    137
    let most_top = height / 2.0
        - ((PIXEL_REWARD_YDISPLAY - PIXEL_REWARD_HEIGHT + PIXEL_REWARD_LINE_HEIGHT)
            * screen_scaling);
    let most_bot =
        height / 2.0 - ((PIXEL_REWARD_YDISPLAY - PIXEL_REWARD_HEIGHT) * screen_scaling * 0.5);

    let prefilter = image.crop_imm(
        most_left as u32,
        most_top as u32,
        most_width as u32,
        (most_bot - most_top) as u32,
    );
    let mut prefilter_draw = prefilter.clone().into_rgb8();
    // prefilter.save("prefilter.png").unwrap();

    let mut rows = Vec::<usize>::new();
    for y in 0..prefilter.height() {
        let mut count = 0;
        for x in 0..prefilter.width() {
            let color = prefilter.get_pixel(x, y).to_rgb();
            if theme.threshold_filter(color) {
                count += 1;
            }
        }
        rows.push(count);
    }

    let mut perc_weights = Vec::new();
    let mut top_weights = Vec::new();
    let mut mid_weights = Vec::new();
    let mut bot_weights = Vec::new();

    let top_line_100 = prefilter.height() as usize - line_height;
    let top_line_50 = line_height / 2;

    let mut scaling = -1.0;
    let mut lowest_weight = 0.0;
    for i in 0..50 {
        let y_from_top = prefilter.height() as usize
            - (i as f32 * (top_line_100 - top_line_50) as f32 / 50.0 + top_line_50 as f32) as usize;
        let scale = 50 + i;
        let scale_width = (prefilter.width() as f32 * scale as f32 / 100.0) as usize;

        let text_segments = [2.0, 4.0, 16.0, 21.0];
        let text_top = (screen_scaling * text_segments[0] * scale as f32 / 100.0) as usize;
        let text_top_bot = (screen_scaling * text_segments[1] * scale as f32 / 100.0) as usize;
        let text_both_bot = (screen_scaling * text_segments[2] * scale as f32 / 100.0) as usize;
        let text_tail_bot = (screen_scaling * text_segments[3] * scale as f32 / 100.0) as usize;

        // debug!("");
        // debug!("i: {}", i);
        // debug!("y_from_top: {}", y_from_top);
        let mut w = 0.0;
        for loc in text_top..text_top_bot + 1 {
            w += (scale_width as f32 * 0.06 - rows[y_from_top + loc] as f32).abs();
            prefilter_draw.put_pixel(
                prefilter_draw.width() / 2 + i as u32,
                (y_from_top + loc) as u32,
                Rgb([255; 3]),
            );
        }
        top_weights.push(w);

        let mut w = 0.0;
        for loc in text_top_bot + 1..text_both_bot {
            if rows[y_from_top + loc] < scale_width / 15 {
                w += (scale_width as f32 * 0.26 - rows[y_from_top + loc] as f32) * 5.0;
            } else {
                w += (scale_width as f32 * 0.24 - rows[y_from_top + loc] as f32).abs();
            }
            prefilter_draw.put_pixel(
                prefilter_draw.width() / 2 + i as u32,
                (y_from_top + loc) as u32,
                Rgb([0, 255, 0]),
            );
        }
        mid_weights.push(w);

        let mut w = 0.0;
        for loc in text_both_bot..text_tail_bot {
            w += 10.0 * (scale_width as f32 * 0.007 - rows[y_from_top + loc] as f32).abs();
            prefilter_draw.put_pixel(
                prefilter_draw.width() / 2 + i as u32,
                (y_from_top + loc) as u32,
                Rgb([0, 0, 255]),
            );
        }
        bot_weights.push(w);

        top_weights[i] /= (text_top_bot - text_top + 1) as f32;
        mid_weights[i] /= (text_both_bot - text_top_bot - 2) as f32;
        bot_weights[i] /= (text_tail_bot - text_both_bot - 1) as f32;
        perc_weights.push(top_weights[i] + mid_weights[i] + bot_weights[i]);

        if scaling <= 0.0 || lowest_weight > perc_weights[i] {
            scaling = scale as f32;
            lowest_weight = perc_weights[i];
        }
    }

    debug!("Scaling: {}", scaling);

    let mut top_five = [-1_isize; 5];
    for (i, _w) in perc_weights.iter().enumerate() {
        let mut slot: isize = 4;
        while slot != -1
            && top_five[slot as usize] != -1
            && perc_weights[i] > perc_weights[top_five[slot as usize] as usize]
        {
            slot -= 1;
        }

        if slot != -1 {
            for slot2 in 0..slot {
                top_five[slot2 as usize] = top_five[slot2 as usize + 1]
            }
            top_five[slot as usize] = i as isize;
        }
    }

    debug!("top_five: {:?}", top_five);
    scaling = top_five[4] as f32 + 50.0;
    debug!("scaling: {:?}", top_five);

    scaling /= 100.0;
    let high_scaling = if scaling < 1.0 {
        scaling + 0.01
    } else {
        scaling
    };
    let low_scaling = if scaling > 0.5 {
        scaling + 0.01
    } else {
        scaling
    };

    let crop_width = PIXEL_REWARD_WIDTH * screen_scaling * high_scaling;
    let crop_left = prefilter.width() as f32 / 2.0 - crop_width / 2.0;
    let crop_top = height / 2.0
        - (PIXEL_REWARD_YDISPLAY - PIXEL_REWARD_HEIGHT + PIXEL_REWARD_LINE_HEIGHT)
            * screen_scaling
            * high_scaling;
    let crop_bot =
        height / 2.0 - (PIXEL_REWARD_YDISPLAY - PIXEL_REWARD_HEIGHT) * screen_scaling * low_scaling;
    let crop_hei = crop_bot - crop_top;
    // crop_top was computed above relative to `image` (uses image's own
    // height/2.0), then gets rebased here to be relative to `prefilter`
    // (subtracting most_top) since it's used to crop *from* prefilter.
    // Saved before the rebase - added back to most_left/most_top below to
    // get each reward box's rect relative to `image` for the overlay.
    let abs_partial_x = most_left + crop_left;
    let abs_partial_y = crop_top;
    let crop_top = crop_top - most_top;

    let partial_screenshot = DynamicImage::ImageRgb8(prefilter.into_rgb8()).crop_imm(
        crop_left as u32,
        crop_top as u32,
        crop_width as u32,
        crop_hei as u32,
    );

    // Draw top 5
    for (i, y) in top_five.iter().enumerate() {
        for x in 0..prefilter_draw.width() {
            prefilter_draw.put_pixel(x, *y as u32, Rgb([255 - i as u8 * 50, 0, 0]));
        }
    }
    // Draw histogram
    for (y, row) in rows.iter().enumerate() {
        for x in 0..*row {
            prefilter_draw.put_pixel(x as u32, y as u32, Rgb([0, 255, 0]));
        }
    }

    // prefilter_draw.save("prefilter.png").unwrap();

    // partial_screenshot.save("partial_screenshot.png").unwrap();

    let (images, local_rects) =
        filter_and_separate_parts_from_part_box_impl(partial_screenshot, theme);
    let abs_rects = local_rects
        .into_iter()
        .map(|(lx, ly, w, h)| {
            (
                (abs_partial_x + lx as f32) as u32,
                (abs_partial_y + ly as f32) as u32,
                w,
                h,
            )
        })
        .collect();
    (images, abs_rects)
}

pub fn filter_and_separate_parts_from_part_box(
    image: DynamicImage,
    theme: Theme,
) -> Vec<DynamicImage> {
    filter_and_separate_parts_from_part_box_impl(image, theme).0
}

/// Same as filter_and_separate_parts_from_part_box, but also returns each
/// part's pixel rect (x, y, width, height) *local to this function's own
/// `image` argument* - added 2026-07-20 so the caller (extract_parts_impl)
/// can combine these with its own crop offsets to get rects relative to
/// the original screenshot, for the Python overlay to size/position itself
/// against instead of guessing. Kept as a separate function rather than
/// changing filter_and_separate_parts_from_part_box's return type, so
/// every other existing caller of that function is unaffected.
fn filter_and_separate_parts_from_part_box_impl(
    image: DynamicImage,
    theme: Theme,
) -> (Vec<DynamicImage>, Vec<(u32, u32, u32, u32)>) {
    // `filtered` gets binarized (pure black/white) below purely to measure
    // where the 3-vs-4-player column boundaries are - that analysis needs
    // a clean per-pixel text/not-text signal regardless of OCR engine.
    // `original` is kept untouched and is what the returned crops are cut
    // from. Switched 2026-07-28 (PaddleOCR/ocr-rs engine swap, see
    // image_to_string()'s docstring): the OLD code cropped straight out of
    // `filtered` itself, handing OCR an already-binarized black-on-white
    // image - the right prep for Tesseract, but actively harmful to a
    // model trained on natural-looking text (confirmed live: garbled
    // output like "OclavaPripe yslems" for "Octavia Prime Systems" the
    // first time this swap was tested, before this fix).
    let original = image.clone().into_rgb8();
    let mut filtered = image.into_rgb8();

    let mut _weight = 0.0;
    let mut total_even = 0.0;
    let mut total_odd = 0.0;
    for x in 0..filtered.width() {
        let mut count = 0;
        for y in 0..filtered.height() {
            let pixel = filtered.get_pixel_mut(x, y);
            if theme.threshold_filter(*pixel) {
                *pixel = Rgb([0; 3]);
                count += 1;
            } else {
                *pixel = Rgb([255; 3]);
            }
        }

        count = count.min(filtered.height() / 3);
        let cosine = (8.0 * x as f32 * PI / filtered.width() as f32).cos();
        let cosine_thing = cosine.powi(3);

        // filtered.put_pixel(
        //     x,
        //     ((cosine_thing / 2.0 + 0.5) * (filtered.height() - 1) as f32) as u32,
        //     Rgb([255, 0, 0]),
        // );

        // debug!("{}", cosine_thing);

        let this_weight = cosine_thing * count as f32;
        _weight += this_weight;

        if cosine < 0.0 {
            total_even -= this_weight;
        } else if cosine > 0.0 {
            total_odd += this_weight;
        }
    }

    // filtered
    //     .save("filtered.png")
    //     .expect("Failed to write filtered image");

    if total_even == 0.0 && total_odd == 0.0 {
        return (vec![], vec![]);
    }

    let _total = total_even + total_odd;
    // debug!("Even: {}", total_even / total);
    // debug!("Odd: {}", total_odd / total);

    let mut box_width = filtered.width() / 4;
    let mut box_stride = box_width;
    let box_height = filtered.height();

    let mut curr_left = 0;
    let mut player_count = 4;

    if total_odd > total_even {
        // Solo 3-reward screens are visibly wider-spaced than simply dropping
        // one of the 4-grid columns; keep card width but add a fixed gap and
        // center the group in the crop so card bounds match the UI layout.
        let gap = box_width / 3;
        box_stride = box_width + gap;
        let required_width = box_stride.saturating_mul(3).saturating_sub(gap);
        curr_left = (filtered.width().saturating_sub(required_width)) / 2;
        player_count = 3;
    }

    let mut images = Vec::new();
    let mut rects = Vec::new();

    let dynamic_image = DynamicImage::ImageRgb8(original);
    for i in 0..player_count {
        let x = curr_left + i as u32 * box_stride;
        let cropped = dynamic_image.crop_imm(x, 0, box_width, box_height);
        // cropped
        //     .save(format!("part-{}.png", i))
        //     .expect("Failed to write image");
        images.push(cropped);
        rects.push((x, 0, box_width, box_height));
    }

    (images, rects)
}

pub fn normalize_string(string: &str) -> String {
    // Map Unicode "fullwidth" Latin letters (U+FF21-FF3A 'Ａ'-'Ｚ', U+FF41-FF5A
    // 'ａ'-'ｚ') back to plain ASCII before filtering. PP-OCRv5 is a
    // multilingual model (also covers CJK scripts) and occasionally
    // recognizes an ASCII letter as its fullwidth CJK-block equivalent
    // instead - confirmed live 2026-07-28: the Riven header consistently
    // read as "INＶENTORY/MODS" (fullwidth V), which the old ASCII-only
    // filter silently deleted entirely rather than counting, turning
    // "INVENTORY" into "INENTORY" and missing the header match by exactly
    // one letter. Fullwidth forms are a fixed offset (0xFEE0) from their
    // ASCII equivalents, so this is a simple codepoint shift, not a lookup
    // table.
    let widened_to_ascii: String = string
        .chars()
        .map(|c| {
            let code = c as u32;
            if (0xFF21..=0xFF3A).contains(&code) || (0xFF41..=0xFF5A).contains(&code) {
                char::from_u32(code - 0xFEE0).unwrap_or(c)
            } else {
                c
            }
        })
        .collect();
    widened_to_ascii.replace(|c: char| !c.is_ascii_alphabetic(), "")
}

// Switched 2026-07-28 from Tesseract to PaddleOCR (PP-OCRv5 mobile
// detection+recognition models via the ocr-rs/MNN crate), matching
// Cephalon Kronos's proven approach (its ocr_engine.rs never needed the
// color-isolation preprocessing Tesseract required to read Warframe's UI
// reliably - see riven_ocr_image() in main.rs, which used a "gold_only"
// color filter that silently erased non-gold header text before OCR ever
// saw it). This is the single shared entry point both reward detection
// (src/ocr.rs) and Riven screen/card detection (src/bin/main.rs) already
// funnel through, so the engine swap applies to both without touching
// either call site.
//
// Uses the FULL OcrEngine (detection + recognition), not recognition-only
// RecModel - a first attempt at recognition-only produced garbled results
// ("OclavaPripe yslems" for "Octavia Prime Systems") because several of our
// crops (reward names, Riven card stat blocks) are actually *multiple*
// stacked text lines, not one - recognition-only mode assumes a single
// line and squeezes everything into one strip, jumbling separate lines
// together. Detection finds and separates each real line first, matching
// how Kronos's own recognize_riven() handles its multi-line card content.
fn load_ocr_engine() -> Result<OcrEngine, anyhow::Error> {
    let det_path = Path::new("ocr-models/PP-OCRv5_mobile_det.mnn");
    let rec_path = Path::new("ocr-models/PP-OCRv5_mobile_rec.mnn");
    let keys_path = Path::new("ocr-models/ppocr_keys_v5.txt");
    if !det_path.exists() || !rec_path.exists() || !keys_path.exists() {
        anyhow::bail!(
            "OCR model files not found (expected ocr-models/PP-OCRv5_mobile_det.mnn, \
             PP-OCRv5_mobile_rec.mnn, and ppocr_keys_v5.txt relative to the current directory)"
        );
    }
    OcrEngine::new(det_path, rec_path, keys_path, None)
        .map_err(|e| anyhow::anyhow!("could not initialize OCR engine: {e}"))
}

pub fn image_to_string(
    ocr: &mut Option<OcrEngine>,
    image: &DynamicImage,
) -> Result<String, anyhow::Error> {
    if ocr.is_none() {
        *ocr = Some(load_ocr_engine()?);
    }
    let engine = ocr
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("OCR engine was unavailable after initialization"))?;

    let (w, h) = (image.width(), image.height());
    if w == 0 || h == 0 {
        anyhow::bail!("OCR image has zero width or height");
    }
    // Modest upscale before detection - matches Kronos's own preprocessing
    // (riven_ocr_image()/ocr_engine.rs::recognize()), small UI text
    // detects/recognizes more reliably enlarged than at native capture size.
    let enlarged = image.resize(
        w.saturating_mul(2),
        h.saturating_mul(2),
        image::imageops::FilterType::Lanczos3,
    );

    let results = engine
        .recognize(&enlarged)
        .map_err(|e| anyhow::anyhow!("OCR recognition failed: {e}"))?;

    // Reading-order sort: group detections into rows (close top values,
    // not necessarily pixel-identical - two words on the same visual line
    // rarely get perfectly matching bounding boxes), then left-to-right
    // within each row. Kronos's own recognize_riven() sorts by top() alone,
    // which is enough when every detection is already its own full line;
    // it isn't when a single line is split across multiple word-level
    // detections - confirmed live 2026-07-28: "Arca Plasmor" (two boxes on
    // one line) came back as "Plasmor Arca" under a top-only sort, since
    // their top() values weren't quite tied. A row-threshold groups them
    // correctly before the left-to-right sort runs.
    let mut boxes: Vec<_> = results
        .into_iter()
        .map(|r| (r.bbox.rect.top(), r.bbox.rect.left(), r.text))
        .collect();
    boxes.sort_by_key(|item| item.0);

    let row_threshold = 12_i32; // px, at the 2x-enlarged scale above
    let mut rows: Vec<Vec<(i32, i32, String)>> = Vec::new();
    for item in boxes {
        match rows.last_mut() {
            Some(row) if (item.0 - row[0].0).abs() <= row_threshold => row.push(item),
            _ => rows.push(vec![item]),
        }
    }
    for row in &mut rows {
        row.sort_by_key(|item| item.1);
    }

    Ok(rows
        .into_iter()
        .map(|row| {
            row.into_iter()
                .map(|(_, _, text)| text)
                .collect::<Vec<_>>()
                .join(" ")
        })
        .collect::<Vec<_>>()
        // Rows must stay newline-separated, not space-joined - riven_grader_
        // overlay.py's _clean_ocr_lines() (Python side) calls splitlines() to
        // process each visible Riven stat as its own line, one stat code per
        // line. Joining every row with a plain space instead flattened an
        // entire multi-stat card into one giant line, so only a single stat
        // code ever got extracted for the whole card (whichever phrase
        // happened to match first) and its curse/positive classification
        // was decided by scanning the ENTIRE blob for "x0." or "-digit"
        // instead of that one stat's own line - live-confirmed 2026-07-28 as
        // the cause of "NEW OFFER" permanently stuck on "Reading Riven
        // stats...": a real 3-positive/1-negative card OCR'd fine but
        // collapsed to "0 positive and 1 negative" once flattened to a
        // single line.
        .join("\n"))
}

/// One OCR-detected text row: its recognized text, the recognizer's own
/// confidence for that text, and its bounding rect in the *input* image's
/// pixel coordinates (i.e. relative to whatever crop was passed in, not
/// the full screenshot).
pub struct OcrRow {
    pub text: String,
    pub confidence: f32,
    pub rect: (u32, u32, u32, u32),
}

/// Segment-first, recognize-second: detect text row boundaries on the
/// whole image, then run recognition-only on each isolated row crop
/// rather than trusting the combined detect+recognize pipeline's
/// per-box text on a multi-line image. Unlike image_to_string(), this
/// preserves per-row confidence and geometry instead of flattening
/// everything into one joined string.
pub fn image_to_rows(
    ocr: &mut Option<OcrEngine>,
    image: &DynamicImage,
) -> Result<Vec<OcrRow>, anyhow::Error> {
    if ocr.is_none() {
        *ocr = Some(load_ocr_engine()?);
    }
    let engine = ocr
        .as_ref()
        .ok_or_else(|| anyhow::anyhow!("OCR engine was unavailable after initialization"))?;

    let (w, h) = (image.width(), image.height());
    if w == 0 || h == 0 {
        anyhow::bail!("OCR image has zero width or height");
    }
    let enlarged = image.resize(
        w.saturating_mul(2),
        h.saturating_mul(2),
        image::imageops::FilterType::Lanczos3,
    );

    let boxes = engine
        .detect(&enlarged)
        .map_err(|e| anyhow::anyhow!("OCR detection failed: {e}"))?;

    let mut boxes: Vec<_> = boxes
        .into_iter()
        .map(|b| (b.rect.top(), b.rect.left(), b))
        .collect();
    boxes.sort_by(|a, b| a.0.cmp(&b.0).then(a.1.cmp(&b.1)));

    const ROW_MERGE_THRESHOLD_PX: i32 = 12;
    let mut rows: Vec<Vec<(i32, i32, u32, u32)>> = Vec::new();
    for (top, _left, textbox) in boxes {
        let rect = (
            textbox.rect.left(),
            textbox.rect.top(),
            textbox.rect.width(),
            textbox.rect.height(),
        );
        match rows.last_mut() {
            Some(row) if (top - row[0].1).abs() <= ROW_MERGE_THRESHOLD_PX => {
                row.push(rect);
            }
            _ => rows.push(vec![rect]),
        }
    }

    const ROW_PADDING_PX: i64 = 4;
    let (ew, eh) = (enlarged.width() as i64, enlarged.height() as i64);
    let mut results = Vec::with_capacity(rows.len());
    for row_boxes in rows {
        let min_x = row_boxes.iter().map(|r| r.0).min().unwrap_or(0) as i64;
        let min_y = row_boxes.iter().map(|r| r.1).min().unwrap_or(0) as i64;
        let max_x = row_boxes
            .iter()
            .map(|r| r.0 as i64 + r.2 as i64)
            .max()
            .unwrap_or(0);
        let max_y = row_boxes
            .iter()
            .map(|r| r.1 as i64 + r.3 as i64)
            .max()
            .unwrap_or(0);

        let x = (min_x - ROW_PADDING_PX).clamp(0, ew.saturating_sub(1));
        let y = (min_y - ROW_PADDING_PX).clamp(0, eh.saturating_sub(1));
        let width = ((max_x - min_x) + ROW_PADDING_PX * 2).clamp(1, ew - x);
        let height = ((max_y - min_y) + ROW_PADDING_PX * 2).clamp(1, eh - y);

        let row_crop = enlarged.crop_imm(x as u32, y as u32, width as u32, height as u32);
        let recognized = engine
            .recognize_text(&row_crop)
            .map_err(|e| anyhow::anyhow!("OCR row recognition failed: {e}"))?;

        if recognized.text.trim().is_empty() {
            continue;
        }

        results.push(OcrRow {
            text: recognized.text,
            confidence: recognized.confidence,
            rect: (
                (x / 2) as u32,
                (y / 2) as u32,
                (width / 2).max(1) as u32,
                (height / 2).max(1) as u32,
            ),
        });
    }

    Ok(results)
}

/// Otsu's method: finds the luma threshold that best separates an image
/// into two classes (text vs. background) by maximizing between-class
/// variance. Hand-written rather than pulling in imageproc as a direct
/// dependency (it's currently only a transitive dependency via ocr-rs)
/// for one function.
fn otsu_threshold(luma: &image::GrayImage) -> u8 {
    let mut histogram = [0u64; 256];
    for pixel in luma.pixels() {
        histogram[pixel.0[0] as usize] += 1;
    }
    let total: u64 = histogram.iter().sum();
    if total == 0 {
        return 128;
    }
    let sum: f64 = histogram
        .iter()
        .enumerate()
        .map(|(i, &count)| i as f64 * count as f64)
        .sum();

    let mut sum_background = 0.0f64;
    let mut weight_background = 0u64;
    let mut max_variance = 0.0f64;
    let mut threshold = 0u8;

    for (i, &count) in histogram.iter().enumerate() {
        weight_background += count;
        if weight_background == 0 {
            continue;
        }
        let weight_foreground = total - weight_background;
        if weight_foreground == 0 {
            break;
        }
        sum_background += i as f64 * count as f64;
        let mean_background = sum_background / weight_background as f64;
        let mean_foreground = (sum - sum_background) / weight_foreground as f64;
        let variance = weight_background as f64
            * weight_foreground as f64
            * (mean_background - mean_foreground).powi(2);
        if variance > max_variance {
            max_variance = variance;
            threshold = i as u8;
        }
    }
    threshold
}

fn binarize(luma: &image::GrayImage, threshold: u8) -> image::GrayImage {
    image::GrayImage::from_fn(luma.width(), luma.height(), |x, y| {
        let value = luma.get_pixel(x, y).0[0];
        image::Luma([if value >= threshold { 255u8 } else { 0u8 }])
    })
}

/// Independently-preprocessed variants of the same crop, so a single bad
/// preprocessing choice (low contrast, animation blur, a busy card
/// background) isn't the only chance row segmentation gets at a correct
/// read. "original" preserves today's baseline behavior exactly.
pub fn preprocessing_variants(image: &DynamicImage) -> Vec<(&'static str, DynamicImage)> {
    let luma = image.to_luma8();
    let contrast_luma = image::imageops::contrast(&luma, 30.0);
    let threshold = otsu_threshold(&luma);
    let binary = binarize(&luma, threshold);
    vec![
        ("original", image.clone()),
        ("grayscale", DynamicImage::ImageLuma8(luma)),
        (
            "contrast_grayscale",
            DynamicImage::ImageLuma8(contrast_luma),
        ),
        ("otsu_binary", DynamicImage::ImageLuma8(binary)),
    ]
}

fn looks_like_stat_token(text: &str) -> bool {
    let has_digit = text.chars().any(|c| c.is_ascii_digit());
    let lower = text.to_ascii_lowercase();
    let has_marker = lower.contains('%') || lower.contains('x');
    has_digit && has_marker
}

/// Scores a set of detected rows for how likely they are to be a correct
/// Riven stat-line reading: average per-row OCR confidence, weighted up
/// when a healthy fraction of rows look like real numeric stat tokens
/// (contain a digit plus '%' or 'x', e.g. "+52.3%" or "x0.88") rather
/// than stray decorative/noise text. Zero rows always scores 0.0.
pub fn score_rows(rows: &[OcrRow]) -> f32 {
    if rows.is_empty() {
        return 0.0;
    }
    let numeric_rows = rows
        .iter()
        .filter(|r| looks_like_stat_token(&r.text))
        .count();
    let numeric_fraction = numeric_rows as f32 / rows.len() as f32;
    let avg_confidence = rows.iter().map(|r| r.confidence).sum::<f32>() / rows.len() as f32;
    avg_confidence * (0.5 + 0.5 * numeric_fraction)
}

/// Runs row segmentation independently on several preprocessed variants
/// of the same crop and returns the rows from whichever variant scored
/// best. Returns the winning variant's label alongside its rows so
/// callers/tests can see which preprocessing actually won.
pub fn best_of_image_to_rows(
    ocr: &mut Option<OcrEngine>,
    image: &DynamicImage,
) -> Result<(&'static str, Vec<OcrRow>), anyhow::Error> {
    let variants = preprocessing_variants(image);
    let mut best: Option<(&'static str, Vec<OcrRow>, f32)> = None;
    for (label, variant) in variants {
        let rows = image_to_rows(ocr, &variant)?;
        let score = score_rows(&rows);
        let is_better = match &best {
            None => true,
            Some((_, _, best_score)) => score > *best_score,
        };
        if is_better {
            best = Some((label, rows, score));
        }
    }
    best.map(|(label, rows, _)| (label, rows))
        .ok_or_else(|| anyhow::anyhow!("no preprocessing variants were evaluated"))
}

lazy_static! {
    // Initialization happens lazily in image_to_string(). Missing model
    // files now produce a logged capture failure and can be retried on the
    // next capture instead of panicking during first static access.
    pub static ref OCR: Mutex<Option<OcrEngine>> = Mutex::new(None);
}

pub fn reward_image_to_reward_names(image: DynamicImage, theme: Option<Theme>) -> Vec<String> {
    let theme = theme.unwrap_or_else(|| detect_theme(&image));
    let parts = extract_parts(&image, theme);
    debug!("Extracted part images");

    // Recovers from a poisoned Mutex instead of unwrap()-ing straight
    // into a panic - if a single bad OCR call ever panicked while
    // holding this lock (image_to_string still has a few of its own
    // unwrap()/expect() calls), every future call here would otherwise
    // also panic forever (a poisoned std Mutex stays poisoned), turning
    // one bad capture into a permanently broken detector for the rest of
    // the process's life. Jacob 2026-07-24 ("Remove production OCR
    // panics").
    parts
        .iter()
        .map(|image| {
            image_to_string(
                &mut OCR.lock().unwrap_or_else(|poisoned| poisoned.into_inner()),
                image,
            )
            .unwrap_or_else(|error| {
                warn!("OCR failed for reward card: {}", error);
                String::new()
            })
        })
        .collect()
}

/// Same as reward_image_to_reward_names, but pairs each name with its
/// on-screen rect (x, y, width, height) - used by the real detection path
/// (main.rs) so the Python overlay can size/position itself to match each
/// reward box instead of guessing.
pub fn reward_image_to_reward_names_with_rects(
    image: DynamicImage,
    theme: Option<Theme>,
) -> Vec<(String, (u32, u32, u32, u32))> {
    let theme = theme.unwrap_or_else(|| detect_theme(&image));
    let (parts, rects) = extract_parts_with_rects(&image, theme);
    debug!("Extracted part images");

    parts
        .iter()
        .zip(rects.iter())
        .map(|(image, rect)| {
            (
                image_to_string(
                    &mut OCR.lock().unwrap_or_else(|poisoned| poisoned.into_inner()),
                    image,
                )
                .unwrap_or_else(|error| {
                    warn!("OCR failed for reward card: {}", error);
                    String::new()
                }),
                *rect,
            )
        })
        .collect()
}
