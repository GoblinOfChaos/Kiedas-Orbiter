# Riven listing design investigation

Status: Stage 2 investigation completed as far as the current official public documentation permits. Stage 3 is blocked pending an authoritative Riven auction contract. No write endpoint was called during this investigation.

## Verified current API contract

The current public documentation describes `POST https://api.warframe.market/v2/order` as the create-order endpoint. Its documented request body uses `itemId`, `type`, `platinum`, `quantity`, and `visible`; `rank`, `charges`, `subtype`, and sculpture star fields are conditional item modifiers. The docs require authentication, a verified account, and a non-banned user for creation. [Orders API](https://docs.warframe.market/docs/api/orders/)

The same documentation describes `GET /v2/orders/my` for authenticated users' orders and says the public v2 API is still below 1.0. [Orders API](https://docs.warframe.market/docs/api/orders/), [Introduction](https://docs.warframe.market/docs/intro/)

The existing app follows that documented ordinary-order route in `src-tauri/src/market.rs`: it sends the stored token as both `Authorization: Bearer ...` and `Cookie: JWT=...`, plus `Platform`, `Crossplay`, `Language`, `Accept`, and an identifying `User-Agent`. The official docs say OAuth 2.0 is not yet available to public integrations and that integrations still rely on the existing v1 authorization flow, but they do not specify this JWT header/cookie combination. [Introduction](https://docs.warframe.market/docs/intro/)

The official public API rules state a general limit of 3 requests per second, note that some endpoints may be stricter, and say limits may change. [Rules](https://docs.warframe.market/docs/rules/overview/)

## Requested Riven auction fields

The task brief asks for an auction-creation payload containing a weapon slug, polarity, mastery rank, rerolls, mod rank, stats with `url_names`, starting/buyout prices, and visibility. I could not verify that shape, an auction-create endpoint, or the meaning/requiredness of those fields in the current official public docs. The documented v2 create-order body contains no polarity, rerolls, Riven stats, `url_names`, starting price, or buyout price fields. [Orders API](https://docs.warframe.market/docs/api/orders/)

The data-model docs do verify that a Riven item has an `id`, `slug`, `gameRef`, `rivenType`, disposition, and required mastery rank, and that Riven attributes have their own `id`, `slug`, `gameRef`, and localized names. They do not define a listing payload that accepts those attributes as auction stat `url_names`, nor do they define polarity or reroll serialization for creation. [Data Models](https://docs.warframe.market/docs/data-models/)

## Existing app mapping and safety boundary

Inventory parsing provides real Riven fields including `item_id`, weapon names, rank, rerolls, polarity, mastery requirement, and each stat's English `statKey` plus raw game tag. The local pricing model maps a subset of those English stat keys to its own model vocabulary. That model vocabulary is not authoritative evidence that the values are Warframe.market auction `url_names`; therefore it must not be reused for a listing payload.

Until Warframe.market publishes or confirms the Riven/contract request shape and stat mapping, the safe implementation boundary is:

- show Riven inventory in Market stock analysis using the existing local estimate;
- display unknown estimates as unavailable, never as zero;
- do not construct or send a Riven auction payload;
- do not add a "List for sale" action that could imply an unverified contract.

## Open questions blocking Stage 3

1. What official endpoint creates a Riven auction/contract, if it is distinct from `POST /v2/order`?
2. What exact JSON fields and types represent weapon slug, polarity, required mastery rank, rerolls, mod rank, stats, starting price, buyout price, and visibility?
3. Which official Riven attribute `slug`/`url_name` values correspond to every stat emitted by this app, including faction multipliers and weapon-specific stats?
4. Does the existing JWT header/cookie flow authorize that endpoint, and are there additional scopes or ownership fields?
5. What endpoint-specific rate limit, account requirement, and validation rules apply to auction creation?

These questions remain intentionally unresolved rather than inferred from undocumented website traffic, third-party clients, or the legacy v1 API.
