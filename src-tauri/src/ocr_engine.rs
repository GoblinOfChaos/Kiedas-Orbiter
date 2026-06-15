use ocr_rs::{OcrEngine, RecModel};
use image::DynamicImage;
use std::path::PathBuf;
use std::sync::OnceLock;

static ENGINE: OnceLock<Option<RecModel>> = OnceLock::new();
static PIPELINE: OnceLock<Option<OcrEngine>> = OnceLock::new();

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
        None => return String::new(),
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
        .map(|r| r.text)
        .unwrap_or_default();
    raw.chars()
        .filter(|c| c.is_ascii() && (*c >= ' '))
        .collect()
}

pub fn recognize_riven(text_region: &DynamicImage) -> Vec<String> {
    let pipeline = match get_pipeline() {
        Some(p) => p,
        None => return Vec::new(),
    };
    let results = match pipeline.recognize(text_region) {
        Ok(r) => r,
        Err(_) => return Vec::new(),
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
