use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;
use std::time::Duration;

pub const DROP_TABLES_URL: &str = "https://www.warframe.com/droptables";
/// Disabled by default because this is a large non-DE-export HTML download.
pub const DE_DROP_TABLES_REFRESH_ENABLED: bool = false;
const MIN_ROWS: usize = 1_000;
const MIN_PREVIOUS_RATIO: f64 = 0.8;

const SECTIONS: &[&str] = &[
    "missionRewards", "relicRewards", "keyRewards", "transientRewards",
    "sortieRewards", "cetusRewards", "solarisRewards", "deimosRewards",
    "zarimanRewards", "entratiLabRewards", "hexRewards", "modByAvatar",
    "blueprintByAvatar", "resourceByAvatar", "sigilByAvatar",
    "additionalItemByAvatar", "relicByAvatar", "modByDrop",
    "blueprintByDrop", "resourceByDrop",
];

fn find_ascii_case_insensitive(haystack: &str, needle: &str) -> Option<usize> {
    if needle.is_empty() { return Some(0); }
    haystack.as_bytes().windows(needle.len()).position(|window| {
        window.iter().zip(needle.as_bytes()).all(|(left, right)| left.to_ascii_lowercase() == *right)
    })
}

fn text(markup: &str) -> String {
    let mut output = String::new();
    let mut in_tag = false;
    for character in markup.chars() {
        match character {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => output.push(character),
            _ => {}
        }
    }
    output.replace("&nbsp;", " ").replace("&amp;", "&")
        .replace("&lt;", "<").replace("&gt;", ">")
        .replace("&quot;", "\"").replace("&#39;", "'")
        .split_whitespace().collect::<Vec<_>>().join(" ")
}

fn cells(row: &str) -> Vec<(String, String)> {
    let mut result = Vec::new();
    let mut rest = row;
    while let Some(start) = find_ascii_case_insensitive(rest, "<t") {
        let after = &rest[start..];
        let kind = if after.get(..3).map(|s| s.eq_ignore_ascii_case("<th")).unwrap_or(false) { "th" } else if after.get(..3).map(|s| s.eq_ignore_ascii_case("<td")).unwrap_or(false) { "td" } else { rest = &after[2..]; continue };
        let Some(open_end) = after.find('>') else { break };
        let body = &after[open_end + 1..];
        let Some(close) = find_ascii_case_insensitive(body, &format!("</{}>", kind)) else { break };
        result.push((kind.to_owned(), text(&body[..close])));
        rest = &body[close + kind.len() + 3..];
    }
    result
}

fn probability(value: &str) -> Option<(String, f64, bool)> {
    let end = value.rfind('%')?;
    let open = value[..end].rfind('(')?;
    let chance = value[open + 1..end].trim().parse::<f64>().ok()? / 100.0;
    let rarity = value[..open].trim().to_owned();
    Some((rarity.clone(), chance, chance == 0.0 && rarity.to_lowercase().contains("under review")))
}

fn rows_between(html: &str, start: usize, end: usize) -> Vec<String> {
    let mut result = Vec::new();
    let mut rest = &html[start..end];
    while let Some(open) = find_ascii_case_insensitive(rest, "<tr") {
        let row = &rest[open..];
        let Some(close) = find_ascii_case_insensitive(row, "</tr>") else { break };
        result.push(row[..close + 5].to_owned());
        rest = &row[close + 5..];
    }
    result
}

fn parse(html: &str) -> Result<Value, String> {
    let mut sections = BTreeMap::<String, Vec<Value>>::new();
    let mut positions = Vec::new();
    let mut cursor = 0;
    while let Some(relative) = find_ascii_case_insensitive(&html[cursor..], "<h3 id=\"") {
        let start = cursor + relative + 8;
        let Some(end_id) = html[start..].find('"') else { return Err("malformed DE section heading".into()) };
        let id = &html[start..start + end_id];
        if !SECTIONS.contains(&id) { return Err(format!("unknown DE drop-table section {}", id)); }
        positions.push((id.to_owned(), cursor + relative));
        cursor = start + end_id;
    }
    for index in 0..positions.len() {
        let (section, heading) = &positions[index];
        let end = positions.get(index + 1).map(|(_, position)| *position).unwrap_or(html.len());
        let mut place: Option<String> = None;
        let mut rotation: Option<String> = None;
        let mut source_chance: Option<f64> = None;
        for row in rows_between(html, *heading, end) {
            if row.to_lowercase().contains("blank-row") { continue; }
            let parsed = cells(&row);
            if parsed.len() == 1 && parsed[0].0 == "th" {
                if parsed[0].1.to_lowercase().starts_with("rotation ") { rotation = Some(parsed[0].1.clone()); }
                else { place = Some(parsed[0].1.clone()); rotation = None; }
                continue;
            }
            if parsed.len() == 2 && parsed[0].0 == "th" && parsed[1].1.to_lowercase().contains("drop chance:") {
                place = Some(parsed[0].1.clone());
                source_chance = parsed[1].1.split(':').last().and_then(|v| v.trim_end_matches('%').parse::<f64>().ok()).map(|v| v / 100.0);
                continue;
            }
            if parsed.len() < 2 { continue; }
            let (item_index, chance_index) = if parsed.len() == 2 { (0, 1) } else { (1, 2) };
            let Some((rarity, chance, under_review)) = probability(&parsed[chance_index].1) else { continue };
            let item = parsed[item_index].1.clone();
            let mut row_value = json!({ "item": item, "rarity": rarity, "chance": chance });
            if under_review { row_value["underReview"] = json!(true); }
            if section.ends_with("ByDrop") { row_value["source"] = json!(place.clone().unwrap_or_default()); }
            else if section.ends_with("ByAvatar") { row_value["source"] = json!(place.clone().unwrap_or_default()); row_value["sourceChance"] = json!(source_chance); }
            else { row_value["place"] = json!(place.clone().unwrap_or_default()); row_value["rotation"] = json!(rotation); }
            sections.entry(section.clone()).or_default().push(row_value);
        }
    }
    let rows = sections.values().map(Vec::len).sum::<usize>();
    if rows < MIN_ROWS { return Err(format!("DE drop-table row count {} is below floor {}", rows, MIN_ROWS)); }
    for (section, values) in &sections {
        for row in values {
            let chance = row.get("chance").and_then(Value::as_f64).unwrap_or(-1.0);
            let under_review = row.get("underReview").and_then(Value::as_bool).unwrap_or(false);
            if (chance <= 0.0 || chance > 1.0) && !under_review {
                return Err(format!("invalid DE drop chance {} in {}", chance, section));
            }
        }
    }
    let places = sections.values().flat_map(|items| items.iter().filter_map(|row| row.get("place").or_else(|| row.get("source")).and_then(Value::as_str))).collect::<BTreeSet<_>>().len();
    Ok(json!({ "sourceUrl": DROP_TABLES_URL, "stats": { "rows": rows, "places": places }, "sections": sections }))
}

#[cfg(test)]
mod tests {
    use super::find_ascii_case_insensitive;

    #[test]
    fn ascii_search_preserves_utf8_offsets() {
        let html = "é <H3 id=\"missionRewards\">";
        let offset = find_ascii_case_insensitive(html, "<h3 id=\"").unwrap();
        assert!(html[offset..].starts_with("<H3 id=\""));
    }
}

pub async fn refresh_de_drop_tables(client: &reqwest::Client, export_dir: &Path, force: bool) -> Result<bool, String> {
    let cache_path = export_dir.join("de/DropTables.json");
    if !force && cache_path.exists() && crate::file_age_secs(&cache_path) <= 86_400 { return Ok(false); }
    tokio::time::sleep(Duration::from_secs(1)).await;
    let response = client.get(DROP_TABLES_URL).header("User-Agent", "KiedasOrbiter/1.3.3").send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() { return Err(format!("DE drop tables HTTP {}", response.status())); }
    let html = response.text().await.map_err(|e| e.to_string())?;
    let mut normalized = parse(&html)?;
    if let Ok(previous_bytes) = std::fs::read(&cache_path) {
        if let Ok(previous) = serde_json::from_slice::<Value>(&previous_bytes) {
            let old = previous.pointer("/stats/rows").and_then(Value::as_u64).unwrap_or(0) as f64;
            let new = normalized.pointer("/stats/rows").and_then(Value::as_u64).unwrap_or(0) as f64;
            if old > 0.0 && new < old * MIN_PREVIOUS_RATIO { return Err(format!("DE drop-table row count dropped from {} to {}", old, new)); }
        }
    }
    normalized["fetchedAt"] = json!(chrono::Utc::now().to_rfc3339());
    crate::write_export_json_atomic(&cache_path, &normalized)?;
    Ok(true)
}
