use reqwest::StatusCode;
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};

const CACHE_MAX_AGE: Duration = Duration::from_secs(24 * 60 * 60);

fn cache_is_fresh(path: &PathBuf) -> bool {
    let Ok(metadata) = path.metadata() else {
        return false;
    };
    let Ok(modified) = metadata.modified() else {
        return false;
    };
    match SystemTime::now().duration_since(modified) {
        Ok(age) => age <= CACHE_MAX_AGE,
        // A clock adjustment put the file in the future; do not redownload it
        // repeatedly until wall-clock time catches up.
        Err(_) => true,
    }
}

/// Local fallback paths relative to the project root (where the binary lives).
fn local_fallback(filename: &str) -> Option<PathBuf> {
    // Try next to the binary first, then the cwd.
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()));
    for base in exe_dir
        .into_iter()
        .chain(std::iter::once(std::env::current_dir().unwrap_or_default()))
    {
        let candidate = base.join(filename);
        if candidate.exists() {
            return Some(candidate);
        }
    }
    None
}

pub fn fetch_prices_and_items() -> Result<(PathBuf, PathBuf), anyhow::Error> {
    let prices = download_and_save("https://api.warframestat.us/wfinfo/prices/", "prices.json")?;
    let items = download_and_save(
        "https://api.warframestat.us/wfinfo/filtered_items/",
        "filtered_items.json",
    )?;
    Ok((prices, items))
}

fn download_and_save(url: &str, filename: &str) -> Result<PathBuf, anyhow::Error> {
    let tmp_path = std::env::temp_dir().join(filename);
    if cache_is_fresh(&tmp_path) {
        return Ok(tmp_path);
    }

    let download = (|| -> Result<(), anyhow::Error> {
        let res = reqwest::blocking::get(url)?;
        if res.status() != StatusCode::OK {
            anyhow::bail!("HTTP {}", res.status());
        }
        let text = res.text()?;
        let value: serde_json::Value = serde_json::from_str(&text)?;
        if !value.is_array() {
            anyhow::bail!("response is valid JSON but not the expected array");
        }
        let mut file = OpenOptions::new()
            .write(true)
            .truncate(true)
            .create(true)
            .open(&tmp_path)?;
        file.write_all(text.as_bytes())?;
        Ok(())
    })();
    if download.is_ok() {
        return Ok(tmp_path);
    }

    // Network, HTTP, or response-validation failures retain a valid local
    // project copy instead of aborting startup or caching an error page.
    let failure = download.unwrap_err();
    if let Some(local) = local_fallback(filename) {
        eprintln!(
            "Warning: {} refresh failed ({}). Using local fallback: {}",
            url,
            failure,
            local.display()
        );
        return Ok(local);
    }

    anyhow::bail!(
        "Failed to refresh {} ({}) and no local fallback found for {}",
        url,
        failure,
        filename
    )
}

#[cfg(test)]
mod tests {
    use super::cache_is_fresh;
    use std::fs;

    #[test]
    fn missing_cache_is_not_fresh_and_new_cache_is_fresh() {
        let path = std::env::temp_dir().join(format!(
            "wfinfo-cache-freshness-test-{}",
            std::process::id()
        ));
        let _ = fs::remove_file(&path);
        assert!(!cache_is_fresh(&path));
        fs::write(&path, b"[]").unwrap();
        assert!(cache_is_fresh(&path));
        fs::remove_file(path).unwrap();
    }
}
