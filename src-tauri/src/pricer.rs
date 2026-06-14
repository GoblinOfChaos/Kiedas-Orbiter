use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use ort::session::Session;

static PRICER: OnceLock<Option<RivenPricer>> = OnceLock::new();

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RivenInput {
    pub weapon_name: String,
    pub re_rolls: u32,
    pub positive1: Option<String>,
    pub positive2: Option<String>,
    pub positive3: Option<String>,
    pub negative: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct RivenFullEstimate {
    pub price: f32,
    pub grade: String,
    pub cdf_percentile: f32,
    pub expected_value: f32,
    pub expected_on_reroll: f32,
    pub probability_stagnant: f32,
    pub weapon_rank: Option<i32>,
    pub total_weapons: i32,
}

struct WeaponRankData {
    rank: i32,
    expected_value: f64,
    price_distribution: Vec<(f64, f64)>, // sorted (price, frequency)
}

pub struct RivenPricer {
    session: Mutex<ort::session::Session>,
    weapon_vocab: HashMap<String, i32>,
    attr_vocab: HashMap<String, i32>,
    weapon_name_to_url: HashMap<String, String>,
    attr_shortcuts: HashMap<String, String>,
    mask_index: i32,
    weapon_rankings: HashMap<String, WeaponRankData>,
}

pub fn get_models_dir() -> PathBuf {
    let data_root = crate::get_data_root();
    data_root.join("data").join("bin").join("pricer-models")
}

fn grade_from_cdf(cdf: f32) -> &'static str {
    if cdf >= 0.95 { "S" }
    else if cdf >= 0.80 { "A" }
    else if cdf >= 0.60 { "B" }
    else if cdf >= 0.40 { "C" }
    else if cdf >= 0.20 { "D" }
    else { "F" }
}

fn parse_price_distribution(val: &serde_json::Value) -> Vec<(f64, f64)> {
    let mut pairs: Vec<(f64, f64)> = Vec::new();
    if let Some(obj) = val.as_object() {
        for (price_str, freq_val) in obj {
            let price: f64 = price_str.parse().unwrap_or(0.0);
            let freq: f64 = freq_val.as_f64().unwrap_or(0.0);
            if freq > 0.0 {
                pairs.push((price, freq));
            }
        }
    }
    pairs.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
    pairs
}

/// Lazily initialized pricer singleton (ONNX session + vocabs + rankings).
pub fn init() {
    get_pricer();
}

fn get_pricer() -> Option<&'static RivenPricer> {
    PRICER.get_or_init(|| {
        let dir = get_models_dir();
        if !dir.exists() { return None; }

        let onnx_path = dir.join("price_model.onnx");
        let weapon_vocab_path = dir.join("weapon_vocab.json");
        let attr_vocab_path = dir.join("attr_vocab.json");
        let items_path = dir.join("items_data.json");
        let shortcuts_path = dir.join("attribute_name_shortcuts.json");
        let effect_map_path = dir.join("effect_to_url_name.json");
        let ranking_path = dir.join("weapon_ranking_information.json");

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

        let effect_map: HashMap<String, String> = serde_json::from_reader(
            std::fs::File::open(&effect_map_path).ok()?
        ).unwrap_or_default();

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

        // Build weapon_map:
        let weapon_map: HashMap<String, i32> = weapon_vocab.into_iter().enumerate()
            .map(|(i, s)| (s, i as i32)).collect();
        let mask_index = *weapon_map.get("<NONE>").unwrap_or(&0);

        let attr_map: HashMap<String, i32> = attr_vocab.into_iter().enumerate()
            .map(|(i, s)| (s, i as i32)).collect();

        let mut attr_shortcuts = shortcuts;
        let identity: Vec<(String, String)> = attr_shortcuts.iter()
            .map(|(_, v)| (v.clone(), v.clone())).collect();
        for (k, v) in identity {
            attr_shortcuts.entry(k).or_insert(v);
        }
        for (display_name, url_name) in &effect_map {
            attr_shortcuts.entry(display_name.to_lowercase()).or_insert(url_name.clone());
        }

        // Load weapon rankings (keys are display names like "Arca Plasmor", not url_names)
        // We insert entries for both the lowered display name AND the url_name so lookups
        // by either format succeed.
        let weapon_rankings: HashMap<String, WeaponRankData> = {
            let file = std::fs::File::open(&ranking_path);
            match file {
                Ok(f) => {
                    let json: HashMap<String, serde_json::Value> = serde_json::from_reader(f).unwrap_or_default();
                    let mut rankings = HashMap::new();
                    let mut url_aliases = Vec::new();
                    for (key, val) in json {
                        let rank = val.get("rank")?.as_i64()? as i32;
                        let expected_value = val.get("expected_value")?.as_f64()?;
                        let dist = parse_price_distribution(val.get("price_distribution")?);
                        let item_lower = key.to_lowercase();
                        // Find matching url_name in items_data for alias
                        for (_k, iv) in &items_data {
                            if let (Some(iname), Some(url_name)) = (
                                iv.get("item_name").and_then(|v| v.as_str()),
                                iv.get("url_name").and_then(|v| v.as_str()),
                            ) {
                                if iname.to_lowercase() == item_lower {
                                    url_aliases.push((url_name.to_lowercase(), rank, expected_value, dist.clone()));
                                }
                            }
                        }
                        rankings.insert(item_lower, WeaponRankData { rank, expected_value, price_distribution: dist });
                    }
                    for (url_lower, rank, expected_value, dist) in url_aliases {
                        rankings.entry(url_lower).or_insert(WeaponRankData { rank, expected_value, price_distribution: dist });
                    }
                    rankings
                }
                Err(_) => HashMap::new()
            }
        };

        eprintln!("[PRICER INIT] weapon_rankings loaded: {} entries", weapon_rankings.len());
        Some(RivenPricer {
            session: Mutex::new(session),
            weapon_vocab: weapon_map,
            attr_vocab: attr_map,
            weapon_name_to_url,
            attr_shortcuts,
            mask_index,
            weapon_rankings,
        })
    })
    .as_ref()
}

/// Estimate platinum price. Returns None if pricer not initialized.
pub fn estimate_price(input: &RivenInput) -> Option<f32> {
    let pricer = get_pricer()?;
    run_inference(pricer, input).map(|(price, _)| price)
}

/// Full estimate: price + grade + reroll EV. Returns None if pricer not initialized.
pub fn estimate_full(input: &RivenInput) -> Option<RivenFullEstimate> {
    let pricer = get_pricer()?;
    let (price, _) = run_inference(pricer, input)?;

    // Resolve weapon url_name
    let key = input.weapon_name.to_lowercase();
    let url_name = pricer.weapon_name_to_url.get(&key)
        .map(|s| s.as_str())
        .unwrap_or(&key);

    // Look up weapon ranking data
    let rank_entry = pricer.weapon_rankings.get(url_name);
    eprintln!("[PRICER] weapon='{}' url='{}' rank_found={}", input.weapon_name, url_name, rank_entry.is_some());
    let rank_data = rank_entry;

    let expected_value = rank_data.map(|r| r.expected_value as f32).unwrap_or(price);
    let weapon_rank = rank_data.map(|r| r.rank);

    // Calculate grade from price distribution
    let mut cdf_percentile = 50.0;
    let grade = if let Some(rd) = rank_data {
        let dist = &rd.price_distribution;
        let total_freq: f64 = dist.iter().map(|(_, f)| f).sum();
        if total_freq > 0.0 {
            let mut cum: f64 = 0.0;
            for (p, f) in dist {
                if *p <= price as f64 {
                    cum += f;
                } else {
                    break;
                }
            }
            let cdf = (cum / total_freq) as f32;
            cdf_percentile = cdf * 100.0;
            grade_from_cdf(cdf).to_string()
        } else {
            String::from("N/A")
        }
    } else {
        String::from("N/A")
    };

    // Probability a random reroll is ≤ current price (stagnant)
    let probability_stagnant = cdf_percentile / 100.0;

    // Reroll EV: expected value of a random reroll = average of the distribution
    let expected_on_reroll = expected_value;

    Some(RivenFullEstimate {
        price,
        grade,
        cdf_percentile,
        expected_value,
        expected_on_reroll,
        probability_stagnant,
        weapon_rank,
        total_weapons: pricer.weapon_rankings.len() as i32,
    })
}

/// Batch estimate: accept multiple inputs, return one result per input.
pub fn estimate_full_batch(inputs: &[RivenInput]) -> Vec<Option<RivenFullEstimate>> {
    let _pricer = get_pricer();
    let results: Vec<Option<RivenFullEstimate>> = inputs.iter().map(|i| {
        estimate_full(i)
    }).collect();
    eprintln!("[PRICER BATCH] done {}", results.len());
    results
}

/// Internal: runs ONNX inference, returns (price, log_price)
fn run_inference(pricer: &RivenPricer, input: &RivenInput) -> Option<(f32, f32)> {
    let key = input.weapon_name.to_lowercase();
    let url_name = pricer.weapon_name_to_url.get(&key)
        .map(|s| s.as_str())
        .unwrap_or(&key);
    let weapon_idx = *pricer.weapon_vocab.get(url_name)
        .unwrap_or(&pricer.mask_index);

    let attr_slots = [&input.positive1, &input.positive2, &input.positive3, &input.negative];
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

    let re_rolled: f32 = if input.re_rolls > 0 { 1.0 } else { 0.0 };

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

    let (_shape, data) = outputs["output"]
        .try_extract_tensor::<f32>()
        .ok()?;

    let log_price = data[0];
    Some((log_price.exp() - 1.0, log_price))
}
