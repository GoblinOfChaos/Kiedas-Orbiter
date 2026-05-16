use image::{DynamicImage, GenericImageView};
use std::path::{Path, PathBuf};

fn get_slot_coords(squad_size: usize) -> Vec<(f64, f64, f64, f64)> {
    let (bx, by, bw, bh) = match squad_size {
        2 => (719.0 / 1920.0, 409.0 / 1080.0, 481.0 / 1920.0, 51.0 / 1080.0),
        3 => (600.0 / 1920.0, 409.0 / 1080.0, 720.0 / 1920.0, 51.0 / 1080.0),
        4 => (478.0 / 1920.0, 409.0 / 1080.0, 965.0 / 1920.0, 51.0 / 1080.0),
        _ => (839.0 / 1920.0, 409.0 / 1080.0, 241.0 / 1920.0, 51.0 / 1080.0),
    };
    let slot_w = bw / squad_size as f64;
    let trim_x = 5.0 / 1920.0;
    (0..squad_size).map(|i| {
        (bx + (i as f64 * slot_w) + trim_x, by, slot_w - 2.0 * trim_x, bh)
    }).collect()
}

fn save_line(img: &image::GrayImage, stem: &str, slot: usize, line: usize, out_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let pad = 30u32;
    let (uw, uh) = img.dimensions();
    let mut padded = image::GrayImage::new(uw + pad * 2, uh + pad * 2);
    padded.fill(255);
    image::imageops::overlay(&mut padded, img, pad as i64, pad as i64);
    
    let out_path = out_dir.join(format!("{}_s{}_l{}.tif", stem, slot, line));
    padded.save(out_path)?;
    
    let gt_path = out_dir.join(format!("{}_s{}_l{}.gt.txt", stem, slot, line));
    if !gt_path.exists() {
        std::fs::write(gt_path, "")?;
    }
    Ok(())
}

fn process_image(img_path: &Path, out_dir: &Path) -> Result<(), Box<dyn std::error::Error>> {
    let img = image::open(img_path)?;
    let (iw, ih) = img.dimensions();
    let stem = img_path.file_stem().unwrap().to_string_lossy();
    let squad_size = if stem == "1" || stem == "11" || stem == "19" || stem == "test1" || stem == "test11" { 3 }
                     else if stem == "12" || stem == "test12" { 2 }
                     else { 4 };

    let coords = get_slot_coords(squad_size);

    for (i, (x_off, y_off, w, h)) in coords.iter().enumerate() {
        let full_slot_w = (*w * iw as f64) as u32;
        let full_slot_h = (*h * ih as f64) as u32;
        let full_slot_x = (*x_off * iw as f64) as u32;
        let full_slot_y = (*y_off * ih as f64) as u32;

        if full_slot_x + full_slot_w > iw || full_slot_y + full_slot_h > ih { continue; }

        let slot_crop = img.crop_imm(full_slot_x, full_slot_y, full_slot_w, full_slot_h);
        
        // 3x Upscaling for OCR resolution text density
        let upscaled = slot_crop.resize(full_slot_w * 3, full_slot_h * 3, image::imageops::FilterType::Lanczos3);
        let gray = upscaled.to_luma8();
        let (uw, uh) = gray.dimensions();

        // 1. Flatten background gradient variance (Adaptive Contrast)
        use imageproc::filter::gaussian_blur_f32;
        let large = gaussian_blur_f32(&gray, 30.0);

        let mut enhanced = image::GrayImage::new(uw, uh);
        let total_pixels = (uw * uh) as f32;
        let bg_mean: f32 = large.pixels().map(|p| p[0] as f32).sum::<f32>() / total_pixels;
        
        for py in 0..uh {
            for px in 0..uw {
                let orig = gray.get_pixel(px, py)[0] as f32;
                let blurred = large.get_pixel(px, py)[0] as f32;
                let diff = orig - blurred;
                let normalized = (bg_mean + diff * 3.0).clamp(0.0, 255.0) as u8;
                enhanced.put_pixel(px, py, image::Luma([normalized]));
            }
        }

        // 2. Light smoothing to kill high-frequency noise/artifacts before Otsu
        let smoothed = gaussian_blur_f32(&enhanced, 0.5);

        // 3. Dynamic Otsu Threshold on smoothed image
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

        let mut binary = image::GrayImage::new(uw, uh);
        for py in 0..uh {
            for px in 0..uw {
                let val = smoothed.get_pixel(px, py)[0];
                binary.put_pixel(px, py, image::Luma([if val < otsu_thresh { 0 } else { 255 }]));
            }
        }

        // Normalise polarity: Tesseract expects dark text on light background.
        // Use edge-based detection: borders are almost always background.
        let mut edge_black = 0;
        let mut edge_white = 0;
        for x in 0..uw {
            if binary.get_pixel(x, 0)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
            if binary.get_pixel(x, uh - 1)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
        }
        for y in 0..uh {
            if binary.get_pixel(0, y)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
            if binary.get_pixel(uw - 1, y)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
        }
        if edge_black > edge_white {
            for p in binary.pixels_mut() { p[0] = 255 - p[0]; }
        }

        let midpoint = uh / 2;
        let dyn_binary = DynamicImage::ImageLuma8(binary);
        let line1 = dyn_binary.crop_imm(0, 0, uw, midpoint).to_luma8();
        let line2 = dyn_binary.crop_imm(0, midpoint, uw, uh - midpoint).to_luma8();

        save_line(&line1, &stem, i + 1, 1, out_dir)?;
        save_line(&line2, &stem, i + 1, 2, out_dir)?;
    }
    Ok(())
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 3 {
        println!("Usage: training_extractor <input_dir> <output_dir>");
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
