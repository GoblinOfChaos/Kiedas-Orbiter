use ocr_rs::{OcrEngine, RecModel};
use image::DynamicImage;
use std::path::PathBuf;
use std::sync::OnceLock;

static ENGINE: OnceLock<Option<RecModel>> = OnceLock::new();
static PIPELINE: OnceLock<Option<OcrEngine>> = OnceLock::new();

// crate::logger::log_to_disk's AppHandle parameter is unused internally, but
// these functions have no AppHandle available to pass one anyway. Writing to
// the same app-<date>.log file directly (rather than falling back to a plain
// eprintln that's easily lost in a GUI-launched AppImage) is what makes a
// broken OCR install distinguishable from a genuinely blank card - both
// previously returned the identical empty result with zero trace anywhere.
fn log_engine(message: &str) {
    let dir = crate::get_data_root().join("data/user/logs");
    let _ = std::fs::create_dir_all(&dir);
    let date = chrono::Local::now().format("%Y-%m-%d").to_string();
    let line = format!("[{}] {}", chrono::Local::now().format("%H:%M:%S%.3f"), message);
    eprintln!("{line}");
    if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(dir.join(format!("app-{date}.log"))) {
        use std::io::Write;
        let _ = writeln!(f, "{line}");
    }
}

fn get_engine() -> Option<&'static RecModel> {
    ENGINE.get_or_init(|| {
        let models_dir = models_dir();
        if !models_dir.exists() {
            return None;
        }
        let rec_path = models_dir.join("PP-OCRv5_mobile_rec.mnn");
        let keys_path = models_dir.join("ppocr_keys_v5.txt");
        if !rec_path.exists() || !keys_path.exists() {
            return None;
        }
        RecModel::from_file(
            rec_path.to_string_lossy().as_ref(),
            keys_path.to_string_lossy().as_ref(),
            None,
        )
        .ok()
    })
    .as_ref()
}

fn get_pipeline() -> Option<&'static OcrEngine> {
    PIPELINE.get_or_init(|| {
        let models_dir = models_dir();
        if !models_dir.exists() {
            return None;
        }
        let det_path = models_dir.join("PP-OCRv5_mobile_det.mnn");
        let rec_path = models_dir.join("PP-OCRv5_mobile_rec.mnn");
        let keys_path = models_dir.join("ppocr_keys_v5.txt");
        if !det_path.exists() || !rec_path.exists() || !keys_path.exists() {
            return None;
        }
        OcrEngine::new(det_path, rec_path, keys_path, None).ok()
    })
    .as_ref()
}

pub fn recognize(gray_image: &image::GrayImage) -> String {
    let engine = match get_engine() {
        Some(e) => e,
        None => {
            log_engine("[OCR-ENGINE] recognize() called but no engine loaded (missing model files or load failure) - returning empty text, indistinguishable downstream from a genuinely blank capture");
            return String::new();
        }
    };
    let (w, h) = gray_image.dimensions();
    if h == 0 { return String::new(); }

    let target_h = 64u32;
    let target_w = (w as f32 * (target_h as f32 / h as f32)).round() as u32;

    let upscaled = image::imageops::resize(
        gray_image,
        target_w,
        target_h,
        image::imageops::FilterType::Lanczos3,
    );
    let dyn_img = DynamicImage::ImageLuma8(upscaled);
    let raw = engine
        .recognize(&dyn_img)
        .inspect_err(|e| log_engine(&format!("[OCR-ENGINE] recognize() failed: {e} - returning empty text")))
        .map(|r| r.text)
        .unwrap_or_default();
    raw.chars()
        .filter(|c| c.is_ascii() && (*c >= ' '))
        .collect()
}

pub fn recognize_riven(text_region: &DynamicImage) -> Vec<String> {
    let pipeline = match get_pipeline() {
        Some(p) => p,
        None => {
            log_engine("[OCR-ENGINE] recognize_riven() called but no pipeline loaded (missing model files or load failure) - returning empty results, indistinguishable downstream from a genuinely blank card");
            return Vec::new();
        }
    };
    let results = match pipeline.recognize(text_region) {
        Ok(r) => r,
        Err(e) => {
            log_engine(&format!("[OCR-ENGINE] recognize_riven() failed: {e} - returning empty results"));
            return Vec::new();
        }
    };
    let mut sorted: Vec<_> = results
        .into_iter()
        .filter(|r| !r.text.is_empty())
        .collect();
    sorted.sort_by_key(|r| r.bbox.rect.top());
    sorted.into_iter().map(|r| r.text).collect()
}

pub fn models_dir() -> PathBuf {
    let data_root = crate::get_data_root();
    data_root.join("data").join("bin").join("ocr-models")
}
