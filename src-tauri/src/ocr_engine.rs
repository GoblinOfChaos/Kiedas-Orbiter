use image::DynamicImage;
use ocr_rs::{OcrEngine, RecModel};
use std::path::PathBuf;
use std::sync::OnceLock;

static ENGINE: OnceLock<Option<RecModel>> = OnceLock::new();
static DET_ENGINE: OnceLock<Option<OcrEngine>> = OnceLock::new();

fn get_engine() -> Option<&'static RecModel> {
    ENGINE.get_or_init(|| {
        let models_dir = get_models_dir();
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

fn get_det_engine() -> Option<&'static OcrEngine> {
    DET_ENGINE.get_or_init(|| {
        let models_dir = get_models_dir();
        if !models_dir.exists() {
            return None;
        }
        let det_path = models_dir.join("PP-OCRv5_mobile_det.mnn");
        let rec_path = models_dir.join("PP-OCRv5_mobile_rec.mnn");
        let keys_path = models_dir.join("ppocr_keys_v5.txt");
        if !det_path.exists() || !rec_path.exists() || !keys_path.exists() {
            return None;
        }
        OcrEngine::new(
            det_path.to_string_lossy().as_ref(),
            rec_path.to_string_lossy().as_ref(),
            keys_path.to_string_lossy().as_ref(),
            None,
        )
        .ok()
    })
    .as_ref()
}

fn get_models_dir() -> PathBuf {
    let data_root = crate::get_data_root();
    data_root.join("data").join("bin").join("ocr-models")
}

pub fn recognize(gray_image: &image::GrayImage) -> String {
    let engine = match get_engine() {
        Some(e) => e,
        None => return String::new(),
    };
    let (w, h) = gray_image.dimensions();
    let upscaled = image::imageops::resize(
        gray_image,
        w * 3,
        h * 3,
        image::imageops::FilterType::CatmullRom,
    );
    let mut inv = upscaled;
    image::imageops::invert(&mut inv);
    let dyn_img = image::DynamicImage::ImageLuma8(inv);
    engine
        .recognize(&dyn_img)
        .map(|r| r.text)
        .unwrap_or_default()
}

/// Full detection+recognition pipeline. Returns (text, top_y) sorted top-to-bottom.
pub fn recognize_image(image: &DynamicImage) -> Vec<(String, i32)> {
    let engine = match get_det_engine() {
        Some(e) => e,
        None => return Vec::new(),
    };
    let results = match engine.recognize(image) {
        Ok(r) => r,
        Err(_) => return Vec::new(),
    };
    let mut out: Vec<(String, i32)> = results
        .into_iter()
        .map(|r| (r.text, r.bbox.rect.top()))
        .collect();
    out.sort_by_key(|(_, y)| *y);
    out
}

pub fn models_ready() -> bool {
    let models_dir = get_models_dir();
    if !models_dir.exists() {
        return false;
    }
    models_dir.join("PP-OCRv5_mobile_det.mnn").exists()
        && models_dir.join("PP-OCRv5_mobile_rec.mnn").exists()
        && models_dir.join("ppocr_keys_v5.txt").exists()
}

pub fn models_dir() -> PathBuf {
    get_models_dir()
}
