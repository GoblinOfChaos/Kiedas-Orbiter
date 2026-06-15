use ocr_rs::RecModel;
use std::path::PathBuf;
use std::sync::OnceLock;

static ENGINE: OnceLock<Option<RecModel>> = OnceLock::new();

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
    let dyn_img = image::DynamicImage::ImageLuma8(upscaled);
    engine
        .recognize(&dyn_img)
        .map(|r| r.text)
        .unwrap_or_default()
}

pub fn models_dir() -> PathBuf {
    let data_root = crate::get_data_root();
    data_root.join("data").join("bin").join("ocr-models")
}
