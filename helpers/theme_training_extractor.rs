use image::GenericImageView;
use std::path::{Path, PathBuf};

// Precise layout bounds for Row 1 and Row 2
const R1_X1: u32 = 786;
const R1_Y1: u32 = 674;
const R1_X2: u32 = 991;
const R1_Y2: u32 = 694;

const R2_X1: u32 = 786;
const R2_Y1: u32 = 695;
const R2_X2: u32 = 991;
const R2_Y2: u32 = 715;

fn process_image(img_path: &Path, out_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let img = image::open(img_path)?;
    let (iw, ih) = img.dimensions();
    let stem = img_path.file_stem().unwrap().to_string_lossy();

    // 1. Calculate resolution-scaled coordinates and box sizes
    let r1_x = (R1_X1 as f64 * iw as f64 / 1920.0) as u32;
    let r1_y = (R1_Y1 as f64 * ih as f64 / 1080.0) as u32;
    let r1_w = ((R1_X2 - R1_X1) as f64 * iw as f64 / 1920.0) as u32;
    let r1_h = ((R1_Y2 - R1_Y1) as f64 * ih as f64 / 1080.0) as u32;

    let r2_x = (R2_X1 as f64 * iw as f64 / 1920.0) as u32;
    let r2_y = (R2_Y1 as f64 * ih as f64 / 1080.0) as u32;
    let r2_w = ((R2_X2 - R2_X1) as f64 * iw as f64 / 1920.0) as u32;
    let r2_h = ((R2_Y2 - R2_Y1) as f64 * ih as f64 / 1080.0) as u32;

    if r1_x + r1_w > iw || r1_y + r1_h > ih || r2_x + r2_w > iw || r2_y + r2_h > ih {
        return Err("Region outside image bounds".into());
    }

    // 2. Crop out the raw rows independently
    let crop1 = img.crop_imm(r1_x, r1_y, r1_w, r1_h);
    let crop2 = img.crop_imm(r2_x, r2_y, r2_w, r2_h);

    // 3. Process and save Row 1
    save_processed_row(crop1, r1_w, r1_h, &format!("{}_row1", stem), out_dir)?;

    // 4. Process and save Row 2
    save_processed_row(crop2, r2_w, r2_h, &format!("{}_row2", stem), out_dir)?;

    Ok(())
}

// Helper function to run the upscaling, contrast correction, and binarization per line
fn save_processed_row(
    cropped_img: image::DynamicImage,
    w: u32,
    h: u32,
    suffix_stem: &str,
    out_dir: &Path
) -> Result<(), Box<dyn std::error::Error>> {
    // 3x Upscaling for OCR resolution text density
    let upscaled = cropped_img.resize(w * 3, h * 3, image::imageops::FilterType::Lanczos3);
    let gray = upscaled.to_luma8();

    // Flatten background gradient variance (Adaptive Contrast)
    use imageproc::filter::gaussian_blur_f32;
    let large = gaussian_blur_f32(&gray, 30.0);

    let mut enhanced = image::GrayImage::new(w * 3, h * 3);
    let total_pixels = (w * 3 * h * 3) as f32;
    let bg_mean: f32 = large.pixels().map(|p| p[0] as f32).sum::<f32>() / total_pixels;
    
    for py in 0..(h * 3) {
        for px in 0..(w * 3) {
            let orig = gray.get_pixel(px, py)[0] as f32;
            let blurred = large.get_pixel(px, py)[0] as f32;
            let diff = orig - blurred;
            let normalized = (bg_mean + diff * 3.0).clamp(0.0, 255.0) as u8;
            enhanced.put_pixel(px, py, image::Luma([normalized]));
        }
    }

    // Light smoothing to kill high-frequency noise/artifacts before Otsu
    let smoothed = gaussian_blur_f32(&enhanced, 0.5);

    // Calculate dynamic Otsu Threshold threshold on smoothed image
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

    // Binarize smoothed image
    let mut binary = image::GrayImage::new(w * 3, h * 3);
    for py in 0..(h * 3) {
        for px in 0..(w * 3) {
            let val = smoothed.get_pixel(px, py)[0];
            binary.put_pixel(px, py, image::Luma([if val < otsu_thresh { 0 } else { 255 }]));
        }
    }

    // Normalise polarity: OCR expects dark text on light background.
    // Use edge-based detection: borders are almost always background.
    let (bw, bh) = binary.dimensions();
    let mut edge_black = 0;
    let mut edge_white = 0;
    for x in 0..bw {
        if binary.get_pixel(x, 0)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
        if binary.get_pixel(x, bh - 1)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
    }
    for y in 0..bh {
        if binary.get_pixel(0, y)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
        if binary.get_pixel(bw - 1, y)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
    }
    if edge_black > edge_white {
        for p in binary.pixels_mut() { p[0] = 255 - p[0]; }
    }

    // Write out the independent .tif image asset
    let out_path = out_dir.join(format!("{}.tif", suffix_stem));
    binary.save(out_path)?;
    
    // Generate empty matching ground truth transcript file
    let gt_path = out_dir.join(format!("{}.gt.txt", suffix_stem));
    if !gt_path.exists() {
        std::fs::write(gt_path, "")?;
    }

    Ok(())
}
fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 3 {
        println!("Usage: theme_training_extractor <input_dir> <output_dir>");
        return;
    }
    let in_dir = PathBuf::from(&args[1]);
    let out_dir = PathBuf::from(&args[2]);
    std::fs::create_dir_all(&out_dir).unwrap();
    for entry in std::fs::read_dir(in_dir).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
        if ext == "png" || ext == "jpg" || ext == "jpeg" {
            println!("Processing {:?}...", path);
            if let Err(e) = process_image(&path, &out_dir) {
                println!("  Failed: {}", e);
            }
        }
    }
}