use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use ort::session::Session;

static PRICER: OnceLock<Option<RivenPricer>> = OnceLock::new();

pub struct RivenPricer {
    session: Mutex<ort::session::Session>,
    weapon_vocab: HashMap<String, i32>,
    attr_vocab: HashMap<String, i32>,
    weapon_name_to_url: HashMap<String, String>,
    attr_shortcuts: HashMap<String, String>,
    mask_index: i32,
}

pub fn get_models_dir() -> PathBuf {
    let data_root = crate::get_data_root();
    data_root.join("data").join("bin").join("pricer-models")
}

fn get_pricer() -> Option<&'static RivenPricer> {
    PRICER.get_or_init(|| {
        let dir = get_models_dir();
        if !dir.exists() {
            return None;
        }

        let onnx_path = dir.join("price_model.onnx");
        let weapon_vocab_path = dir.join("weapon_vocab.json");
        let attr_vocab_path = dir.join("attr_vocab.json");
        let items_path = dir.join("items_data.json");
        let shortcuts_path = dir.join("attribute_name_shortcuts.json");

        if !onnx_path.exists() || !weapon_vocab_path.exists() || !attr_vocab_path.exists() {
            return None;
        }

        let session = Session::builder().ok()?
            .commit_from_file(onnx_path.to_string_lossy().as_ref())
            .ok()?;

        let weapon_vocab: Vec<String> = serde_json::from_reader(
            std::fs::File::open(&weapon_vocab_path).ok()?
        ).ok()?;

        let attr_vocab: Vec<String> = serde_json::from_reader(
            std::fs::File::open(&attr_vocab_path).ok()?
        ).ok()?;

        let items_data: HashMap<String, serde_json::Value> = serde_json::from_reader(
            std::fs::File::open(&items_path).ok()?
        ).ok()?;

        let shortcuts: HashMap<String, String> = serde_json::from_reader(
            std::fs::File::open(&shortcuts_path).ok()?
        ).ok()?;

        // Build weapon_name -> url_name map from items_data
        let mut weapon_name_to_url = HashMap::new();
        for (_key, val) in &items_data {
            if let (Some(item_name), Some(url_name)) = (
                val.get("item_name").and_then(|v| v.as_str()),
                val.get("url_name").and_then(|v| v.as_str()),
            ) {
                weapon_name_to_url.insert(item_name.to_lowercase(), url_name.to_string());
                weapon_name_to_url.insert(url_name.to_string(), url_name.to_string());
            }
        }

        // Build weapon_vocab: list -> HashMap<name, index>
        let weapon_map: HashMap<String, i32> = weapon_vocab.into_iter().enumerate()
            .map(|(i, s)| (s, i as i32)).collect();
        let mask_index = *weapon_map.get("<NONE>").unwrap_or(&0);

        // Build attr_vocab: list -> HashMap<name, index>
        let attr_map: HashMap<String, i32> = attr_vocab.into_iter().enumerate()
            .map(|(i, s)| (s, i as i32)).collect();

        // Build shortcuts with identity entries (same as Python data_handler.py)
        let mut attr_shortcuts = shortcuts;
        let identity: Vec<(String, String)> = attr_shortcuts.iter()
            .map(|(_, v)| (v.clone(), v.clone())).collect();
        for (k, v) in identity {
            attr_shortcuts.entry(k).or_insert(v);
        }

        Some(RivenPricer {
            session: Mutex::new(session),
            weapon_vocab: weapon_map,
            attr_vocab: attr_map,
            weapon_name_to_url,
            attr_shortcuts,
            mask_index,
        })
    })
    .as_ref()
}

/// Input: a riven's parsed attributes from OCR
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RivenInput {
    pub weapon_name: String,
    pub re_rolls: u32,
    pub positive1: Option<String>,
    pub positive2: Option<String>,
    pub positive3: Option<String>,
    pub negative: Option<String>,
}

/// Estimate platinum price. Returns None if pricer not initialized or inference fails.
pub fn estimate_price(input: &RivenInput) -> Option<f32> {
    let pricer = get_pricer()?;

    // 1. Resolve weapon name -> url_name -> vocab index
    let key = input.weapon_name.to_lowercase();
    let url_name = pricer.weapon_name_to_url.get(&key)
        .map(|s| s.as_str())
        .unwrap_or(&key);
    let weapon_idx = *pricer.weapon_vocab.get(url_name)
        .unwrap_or(&pricer.mask_index);

    // 2. Resolve attribute names -> indices
    let attr_slots = [
        &input.positive1,
        &input.positive2,
        &input.positive3,
        &input.negative,
    ];
    let mut attr_indices = [pricer.mask_index; 4];
    for (i, attr_opt) in attr_slots.iter().enumerate() {
        if let Some(attr) = attr_opt {
            let key = attr.to_lowercase();
            let url = pricer.attr_shortcuts.get(&key)
                .map(|s| s.as_str())
                .unwrap_or(&key);
            attr_indices[i] = *pricer.attr_vocab.get(url)
                .unwrap_or(&pricer.mask_index);
        }
    }

    // 3. re_rolled flag
    let re_rolled: f32 = if input.re_rolls > 0 { 1.0 } else { 0.0 };

    // 4. Run inference
    use ort::inputs;
    let weapon_tensor = ort::value::Value::from_array(
        ndarray::array![[weapon_idx]]
    ).ok()?;
    let re_rolled_tensor = ort::value::Value::from_array(
        ndarray::array![[re_rolled]]
    ).ok()?;
    let attrs_tensor = ort::value::Value::from_array(
        ndarray::array![[attr_indices[0], attr_indices[1], attr_indices[2], attr_indices[3]]]
    ).ok()?;

    let mut session_guard = pricer.session.lock().ok()?;
    let outputs = session_guard.run(
        inputs! {
            "weapon_idx" => weapon_tensor,
            "re_rolled" => re_rolled_tensor,
            "attr_indices" => attrs_tensor,
        }
    ).ok()?;

    // 5. Extract output and apply expm1
    let (_shape, data) = outputs["output"]
        .try_extract_tensor::<f32>()
        .ok()?;

    let log_price = data[0];
    Some(log_price.exp() - 1.0)
}
