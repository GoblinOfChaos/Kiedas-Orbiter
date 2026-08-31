use reqwest::Client;
use serde_json::json;
use std::time::Duration;

fn clean_token(token: &str) -> String {
    let t = token
        .trim()
        .trim_matches('"')
        .trim_matches('\'')
        .trim();

    if let Some(stripped) = t.strip_prefix("JWT=") {
        stripped.trim().to_string()
    } else if let Some(stripped) = t.strip_prefix("JWT ") {
        stripped.trim().to_string()
    } else if let Some(stripped) = t.strip_prefix("Bearer ") {
        stripped.trim().to_string()
    } else {
        t.to_string()
    }
}

fn build_client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))
}

pub async fn post_market_order(
    token: String,
    item_id: String,
    plat_price: i32,
    quantity: i32,
    rank: Option<i32>,
) -> Result<(), String> {
    let clean = clean_token(&token);
    if clean.is_empty() {
        return Err("Warframe.Market JWT token is missing. Please configure it in Settings.".to_string());
    }

    let client = build_client()?;
    let mut payload = json!({
        "itemId": item_id,
        "type": "sell",
        "platinum": plat_price,
        "quantity": quantity,
        "visible": true
    });

    if let Some(r) = rank {
        payload.as_object_mut().unwrap().insert("rank".to_string(), json!(r));
    }

    let url = "https://api.warframe.market/v2/order";
    let res = client
        .post(url)
        .header("Authorization", format!("Bearer {}", clean))
        .header("Cookie", format!("JWT={}", clean))
        .header("Language", "en")
        .header("Accept", "application/json")
        .header("Platform", "pc")
        .header("Crossplay", "true")
        .header("User-Agent", "KiedasOrbiter/1.3.3")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network error connecting to Warframe.Market: {}", e))?;

    let status = res.status();
    if status.is_success() {
        Ok(())
    } else {
        let text = res.text().await.unwrap_or_else(|_| "Unknown error body".to_string());
        Err(format!("Warframe.Market API error ({}): {}", status, text))
    }
}

pub async fn get_my_market_orders(token: String) -> Result<String, String> {
    let clean = clean_token(&token);
    if clean.is_empty() {
        return Err("Warframe.Market JWT token is missing. Please configure it in Settings.".to_string());
    }

    let client = build_client()?;
    let url = "https://api.warframe.market/v2/orders/my";

    let res = client
        .get(url)
        .header("Authorization", format!("Bearer {}", clean))
        .header("Cookie", format!("JWT={}", clean))
        .header("Language", "en")
        .header("Accept", "application/json")
        .header("Platform", "pc")
        .header("Crossplay", "true")
        .header("User-Agent", "KiedasOrbiter/1.3.3")
        .send()
        .await
        .map_err(|e| format!("Network error connecting to Warframe.Market: {}", e))?;

    let status = res.status();
    let text = res.text().await.unwrap_or_else(|_| "Unknown error body".to_string());
    if status.is_success() {
        Ok(text)
    } else {
        Err(format!("Warframe.Market API error ({}): {}", status, text))
    }
}

pub async fn delete_market_order(token: String, order_id: String) -> Result<(), String> {
    let clean = clean_token(&token);
    if clean.is_empty() {
        return Err("Warframe.Market JWT token is missing.".to_string());
    }

    let client = build_client()?;
    let url = format!("https://api.warframe.market/v2/order/{}", order_id.trim());

    let res = client
        .delete(&url)
        .header("Authorization", format!("Bearer {}", clean))
        .header("Cookie", format!("JWT={}", clean))
        .header("Language", "en")
        .header("Accept", "application/json")
        .header("Platform", "pc")
        .header("Crossplay", "true")
        .header("User-Agent", "KiedasOrbiter/1.3.3")
        .send()
        .await
        .map_err(|e| format!("Network error connecting to Warframe.Market: {}", e))?;

    let status = res.status();
    if status.is_success() {
        Ok(())
    } else {
        let text = res.text().await.unwrap_or_else(|_| "Unknown error body".to_string());
        Err(format!("Warframe.Market API error ({}): {}", status, text))
    }
}

pub async fn update_market_order(
    token: String,
    order_id: String,
    platinum: Option<i32>,
    quantity: Option<i32>,
    visible: Option<bool>,
) -> Result<(), String> {
    let clean = clean_token(&token);
    if clean.is_empty() {
        return Err("Warframe.Market JWT token is missing.".to_string());
    }

    let client = build_client()?;
    let url = format!("https://api.warframe.market/v2/order/{}", order_id.trim());

    let mut payload = json!({});
    if let Some(p) = platinum {
        payload.as_object_mut().unwrap().insert("platinum".to_string(), json!(p));
    }
    if let Some(q) = quantity {
        payload.as_object_mut().unwrap().insert("quantity".to_string(), json!(q));
    }
    if let Some(v) = visible {
        payload.as_object_mut().unwrap().insert("visible".to_string(), json!(v));
    }

    let res = client
        .patch(&url)
        .header("Authorization", format!("Bearer {}", clean))
        .header("Cookie", format!("JWT={}", clean))
        .header("Language", "en")
        .header("Accept", "application/json")
        .header("Platform", "pc")
        .header("Crossplay", "true")
        .header("User-Agent", "KiedasOrbiter/1.3.3")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network error connecting to Warframe.Market: {}", e))?;

    let status = res.status();
    if status.is_success() {
        Ok(())
    } else {
        let text = res.text().await.unwrap_or_else(|_| "Unknown error body".to_string());
        Err(format!("Warframe.Market API error ({}): {}", status, text))
    }
}

pub async fn close_market_order(token: String, order_id: String, quantity: i32) -> Result<(), String> {
    let clean = clean_token(&token);
    if clean.is_empty() {
        return Err("Warframe.Market JWT token is missing.".to_string());
    }

    let client = build_client()?;
    let url = format!("https://api.warframe.market/v2/order/{}/close", order_id.trim());

    let payload = json!({
        "quantity": quantity
    });

    let res = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", clean))
        .header("Cookie", format!("JWT={}", clean))
        .header("Language", "en")
        .header("Accept", "application/json")
        .header("Platform", "pc")
        .header("Crossplay", "true")
        .header("User-Agent", "KiedasOrbiter/1.3.3")
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Network error connecting to Warframe.Market: {}", e))?;

    let status = res.status();
    if status.is_success() {
        Ok(())
    } else {
        let text = res.text().await.unwrap_or_else(|_| "Unknown error body".to_string());
        Err(format!("Warframe.Market API error ({}): {}", status, text))
    }
}
