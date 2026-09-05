import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { PageLayout, Card, Input } from "../components/UI";
import ItemImage from "../components/ItemImage";
import { useUi } from "../contexts/UiContext";
import { invoke } from "@tauri-apps/api/core";
import { loadSettings, getSetting } from "../lib/settings";
import { useMonitoring } from "../contexts/MonitoringContext";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { ensureWfmItems, lookupWfmItem, getPriceState } from "../lib/wfmCache";
import {
  TrendingUp,
  Package,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  Coins,
  AlertCircle,
  Sparkles,
  Tag,
  Check,
  ArrowUpDown,
  DollarSign,
  Layers,
  Award
} from "lucide-react";

const WFM_ID_CATALOG_KEY = "wfm_id_catalog_v2";

function priceAgeLabel(timestamp) {
  if (!timestamp) return "";
  const ageMs = Date.now() - timestamp;
  const mins = Math.floor(ageMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Market({ onNavigate }) {
  const { t } = useUi();
  const { inventoryData } = useMonitoring();
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState("active_orders");
  const [wfmMap, setWfmMap] = useState(null);
  const [catalogStatus, setCatalogStatus] = useState("loading"); // "loading" | "ready" | "error"
  
  // Active Orders state
  const [orderFilter, setOrderFilter] = useState("all"); // "all" | "sell" | "buy" | "hidden"
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [idCatalog, setIdCatalog] = useState({});
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editPrice, setEditPrice] = useState(1);
  const [actionLoading, setActionLoading] = useState({});

  // Tradeable Stock state
  const [stockSearch, setStockSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // "all" | "sell_plat" | "ducats" | "duplicates" | "mastered" | "unmastered"
  const [stockSort, setStockSort] = useState("plat_ratio");
  const [isSortOpen, setIsSortOpen] = useState(false); // "plat_ratio" | "ducat_ratio" | "plat_desc" | "owned_desc" | "ducats_desc" | "name_asc"
  const [sellingItem, setSellingItem] = useState(null);
  const [sellPriceInput, setSellPriceInput] = useState({});
  const [sellStatus, setSellStatus] = useState({});
  // Keyed by WFM item id (not display name / unique_name) - see wfmCache.js.
  // Each value is { status: 'loading' | 'ready' | 'no_orders' | 'error', price?, timestamp? }.
  const [priceStates, setPriceStates] = useState({});
  // Card order is intentionally NOT recomputed every time a price resolves
  // (see stockOrderKeys effect below) - bumping this is how the user
  // explicitly asks for the list to re-sort using currently-known prices.
  const [sortRefreshToken, setSortRefreshToken] = useState(0);
  const [stockOrderKeys, setStockOrderKeys] = useState([]);

  // 1. Load WFM items catalog (ID -> name/icon map)
  const ensureCatalog = useCallback(async () => {
    setCatalogStatus("loading");
    try {
      const cached = localStorage.getItem(WFM_ID_CATALOG_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Object.keys(parsed).length > 0) {
          setIdCatalog(parsed);
        }
      }

      const map = await ensureWfmItems();
      if (!map) {
        setCatalogStatus("error");
        return;
      }
      setWfmMap(map);
      setCatalogStatus("ready");

      const res = await tauriFetch("https://api.warframe.market/v2/items", {
        method: "GET",
        headers: {
          Platform: "pc",
          Accept: "application/json",
          "User-Agent": "KiedasOrbiter/1.3.3"
        }
      });
      if (res.ok) {
        const body = await res.json();
        const items = body?.data || [];
        const catalog = {};
        for (const item of items) {
          if (item.id) {
            const en = item.i18n?.en || {};
            catalog[item.id] = {
              id: item.id,
              slug: item.slug,
              name: en.name || item.slug || item.id,
              icon: en.thumb || en.icon || null
            };
          }
        }
        setIdCatalog(catalog);
        localStorage.setItem(WFM_ID_CATALOG_KEY, JSON.stringify(catalog));
      }
    } catch (e) {
      console.warn("Failed to fetch WFM items catalog:", e);
    }
  }, []);

  // 2. Fetch fresh token & orders
  const fetchMyOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const settings = await loadSettings();
      const currentToken = settings?.wfm_token || getSetting("wfm_token", "") || "";
      setToken(currentToken);

      if (!currentToken || currentToken.trim() === "") {
        setLoading(false);
        return;
      }

      await invoke("log_terminal", {
        message: `[Market] Fetching active orders from Warframe.Market (token length: ${currentToken.length})`
      }).catch(() => {});

      const res = await invoke("get_my_market_orders", { token: currentToken });
      const data = JSON.parse(res);

      let orderList = [];
      if (Array.isArray(data?.data)) {
        orderList = data.data.map(o => ({
          ...o,
          type: o.type || o.order_type || "sell"
        }));
      } else if (data?.data && typeof data.data === "object") {
        const buy = data.data.buy || [];
        const sell = data.data.sell || [];
        orderList = [
          ...sell.map(o => ({ ...o, type: "sell" })),
          ...buy.map(o => ({ ...o, type: "buy" }))
        ];
      }

      setOrders(orderList);
      await invoke("log_terminal", {
        message: `[Market] Successfully loaded ${orderList.length} orders from Warframe.Market`
      }).catch(() => {});
    } catch (err) {
      console.error("Failed to fetch market orders:", err);
      const msg = typeof err === "string" ? err : err.message || "Failed to load orders";
      setError(msg);
      await invoke("log_terminal", {
        message: `[Market] [ERROR] Failed to fetch market orders: ${msg}`
      }).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    ensureCatalog();
    fetchMyOrders();
  }, [ensureCatalog, fetchMyOrders]);

  // Order Actions
  const handleDeleteOrder = async (orderId) => {
    setActionLoading(prev => ({ ...prev, [orderId]: "deleting" }));
    try {
      await invoke("delete_market_order", { token, orderId });
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setSuccessMsg(t("market.msg_order_deleted"));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert("Failed to delete order: " + err);
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: null }));
    }
  };

  const handleCloseOrder = async (orderId, quantity = 1) => {
    setActionLoading(prev => ({ ...prev, [orderId]: "closing" }));
    try {
      await invoke("close_market_order", { token, orderId, quantity });
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setSuccessMsg(t("market.msg_order_sold"));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert("Failed to close order: " + err);
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: null }));
    }
  };

  const handleToggleVisibility = async (order) => {
    const newVis = !order.visible;
    setActionLoading(prev => ({ ...prev, [order.id]: "toggling" }));
    try {
      await invoke("update_market_order", {
        token,
        orderId: order.id,
        platinum: null,
        quantity: null,
        visible: newVis
      });
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, visible: newVis } : o));
    } catch (err) {
      alert("Failed to update visibility: " + err);
    } finally {
      setActionLoading(prev => ({ ...prev, [order.id]: null }));
    }
  };

  const handleSavePrice = async (orderId) => {
    if (!editPrice || editPrice < 1) return;
    setActionLoading(prev => ({ ...prev, [orderId]: "updating" }));
    try {
      await invoke("update_market_order", {
        token,
        orderId,
        platinum: parseInt(editPrice, 10),
        quantity: null,
        visible: null
      });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, platinum: parseInt(editPrice, 10) } : o));
      setEditingOrder(null);
      setSuccessMsg(t("market.msg_price_updated"));
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert("Failed to update price: " + err);
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: null }));
    }
  };

  // Helper to resolve display name from item details
  const getItemInfo = useCallback((order) => {
    const id = order?.itemId || order?.item?.id;
    if (id && idCatalog[id]) {
      const entry = idCatalog[id];
      return {
        name: entry.name,
        image: entry.icon ? `https://warframe.market/static/assets/${entry.icon}` : null
      };
    }
    if (order?.item?.en?.item_name) {
      return {
        name: order.item.en.item_name,
        image: order.item.icon ? `https://warframe.market/static/assets/${order.item.icon}` : null
      };
    }
    return {
      name: order?.itemId ? `Item (${order.itemId.slice(0, 8)})` : "Warframe Item",
      image: null
    };
  }, [idCatalog]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (orderFilter === "sell" && o.type !== "sell") return false;
      if (orderFilter === "buy" && o.type !== "buy") return false;
      if (orderFilter === "hidden" && o.visible) return false;
      if (searchQuery.trim()) {
        const info = getItemInfo(o);
        if (!info.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [orders, orderFilter, searchQuery, getItemInfo]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const sellListings = orders.filter(o => o.type === "sell");
    const totalPlat = sellListings.reduce((sum, o) => sum + (o.platinum * (o.quantity || 1)), 0);
    const visibleCount = sellListings.filter(o => o.visible).length;
    const hiddenCount = sellListings.filter(o => !o.visible).length;
    return {
      totalPlat,
      activeCount: orders.length,
      sellCount: sellListings.length,
      visibleCount,
      hiddenCount
    };
  }, [orders]);

  // --------------------------------------------------------------------------
  // Tradeable Stock Processing & Valuation Logic
  // --------------------------------------------------------------------------
  // Step 1: which owned items are actually saleable at all. This is Market's
  // own inventory selection, deliberately separate from raw prime_parts
  // (which also serves crafting/collection tracking elsewhere) - a crafted
  // part with zero spare copies, or a part with no verified WFM listing,
  // must never appear here just because its game path looks similar to a
  // real one.
  const saleableStock = useMemo(() => {
    if (!inventoryData?.prime_parts || catalogStatus !== "ready" || !wfmMap) return [];

    return inventoryData.prime_parts
      .filter(part => (part.quantity || 0) > 0)
      .map(part => {
        const wfmItem = lookupWfmItem(wfmMap, part.unique_name);
        return wfmItem && wfmItem.tradable !== false ? { ...part, wfmItem } : null;
      })
      .filter(Boolean);
  }, [inventoryData, wfmMap, catalogStatus]);

  // Step 2: attach current price state + a derived recommendation. Recomputes
  // whenever a price resolves, but this does NOT drive card order (see the
  // stockOrderKeys effect below) - only what's shown on an already-placed card.
  const stockWithPricing = useMemo(() => {
    return saleableStock.map(part => {
      const priceState = priceStates[part.wfmItem.id] || { status: "loading" };
      const ducats = part.ducats || 0;
      const isDuplicate = (part.quantity || 0) > 1;
      const isMastered = !!part.mastered;

      if (priceState.status !== "ready") {
        // No confirmed price yet (still loading, no sell orders, or the
        // request failed) - there is nothing to compare ducats against, so
        // say so explicitly instead of treating the missing price as 0.
        return {
          ...part,
          priceState,
          platPrice: null,
          ducats,
          pdRatio: 0,
          dpRatio: 0,
          decision: "unknown",
          decisionLabel: t("market.decision_cannot_compare"),
          decisionReason: priceState.status === "no_orders"
            ? t("market.reason_no_orders")
            : priceState.status === "error"
            ? t("market.reason_price_unavailable")
            : t("market.reason_price_loading"),
          isDuplicate,
          isMastered
        };
      }

      const platPrice = priceState.price;
      let pdRatio = 0, dpRatio = 0;
      if (ducats > 0 && platPrice > 0) {
        pdRatio = platPrice / ducats;
        dpRatio = ducats / platPrice;
      }

      let decision = "neutral";
      let decisionLabel = t("market.decision_fair_value");
      let decisionReason = t("market.reason_balanced", { ducats, plat: platPrice, age: priceAgeLabel(priceState.timestamp) });

      if (platPrice >= 15 || pdRatio >= 0.22) {
        decision = "sell_plat";
        decisionLabel = t("market.decision_sell_plat");
        decisionReason = t("market.reason_high_plat", { plat: platPrice, ducats, age: priceAgeLabel(priceState.timestamp) });
      } else if (dpRatio >= 15 || (ducats >= 45 && platPrice <= 3)) {
        decision = "ducats";
        decisionLabel = t("market.decision_keep_ducats");
        decisionReason = t("market.reason_high_ducat", { ducats, plat: platPrice, age: priceAgeLabel(priceState.timestamp) });
      }

      return { ...part, priceState, platPrice, ducats, pdRatio, dpRatio, decision, decisionLabel, decisionReason, isDuplicate, isMastered };
    });
  }, [saleableStock, priceStates, t]);

  // Step 3: fetch price state for each saleable item, applied as each one
  // resolves (not batched) so results show up progressively.
  const priceStatesRef = useRef(priceStates);
  priceStatesRef.current = priceStates;

  useEffect(() => {
    if (saleableStock.length === 0) return;
    let isMounted = true;

    const loadPrices = async () => {
      const chunkSize = 8;
      for (let i = 0; i < saleableStock.length; i += chunkSize) {
        if (!isMounted) break;
        const chunk = saleableStock.slice(i, i + chunkSize);

        await Promise.all(chunk.map(async part => {
          const id = part.wfmItem.id;
          const existing = priceStatesRef.current[id];
          if (existing && (existing.status === "ready" || existing.status === "no_orders")) return;
          try {
            const result = await getPriceState(id, part.wfmItem.slug, part.maxRank ?? null);
            if (!isMounted) return;
            setPriceStates(prev => ({ ...prev, [id]: result }));
          } catch {
            if (!isMounted) return;
            setPriceStates(prev => ({ ...prev, [id]: { status: "error", timestamp: Date.now() } }));
          }
        }));
      }
    };

    loadPrices();
    return () => { isMounted = false; };
  }, [saleableStock]);

  // Step 4: filter + sort. Card order is only recomputed when the set of
  // saleable items changes, the filter/search/sort mode changes, or the user
  // explicitly clicks "Refresh Sort" (sortRefreshToken) - NOT on every price
  // update, so cards don't reshuffle out from under the user mid-load.
  const stockByKey = useMemo(() => {
    const m = new Map();
    for (const item of stockWithPricing) m.set(item.unique_name, item);
    return m;
  }, [stockWithPricing]);

  useEffect(() => {
    const filtered = stockWithPricing.filter(item => {
      if (stockFilter === "sell_plat" && item.decision !== "sell_plat") return false;
      if (stockFilter === "ducats" && item.decision !== "ducats") return false;
      if (stockFilter === "duplicates" && !item.isDuplicate) return false;
      if (stockFilter === "mastered" && !item.isMastered) return false;
      if (stockFilter === "unmastered" && item.isMastered) return false;
      if (stockSearch.trim() && !item.name.toLowerCase().includes(stockSearch.toLowerCase())) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (stockSort === "plat_ratio") return (b.pdRatio || 0) - (a.pdRatio || 0) || (b.platPrice || 0) - (a.platPrice || 0);
      if (stockSort === "ducat_ratio") return (b.dpRatio || 0) - (a.dpRatio || 0) || (b.ducats || 0) - (a.ducats || 0);
      if (stockSort === "plat_desc") return (b.platPrice || 0) - (a.platPrice || 0);
      if (stockSort === "owned_desc") return (b.quantity || 0) - (a.quantity || 0);
      if (stockSort === "ducats_desc") return (b.ducats || 0) - (a.ducats || 0);
      if (stockSort === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });

    setStockOrderKeys(filtered.map(item => item.unique_name));
    // Deliberately excludes `stockWithPricing`/`priceStates` - see comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleableStock, stockFilter, stockSort, stockSearch, sortRefreshToken]);

  const processedStock = useMemo(() => {
    return stockOrderKeys.map(key => stockByKey.get(key)).filter(Boolean);
  }, [stockOrderKeys, stockByKey]);

  // 1-Click Sell from Tradeable Stock. `item` always comes from
  // saleableStock, so item.wfmItem.id is already a verified catalog match -
  // there is no re-resolution or name-based re-matching here on purpose.
  const handleSellStockItem = async (item) => {
    if (!token) {
      alert(t("market.alert_configure_jwt"));
      return;
    }

    const itemId = item.wfmItem?.id;
    if (!itemId) {
      alert("No verified Warframe.Market listing for: " + item.name);
      return;
    }

    const rawPrice = sellPriceInput[item.unique_name];
    const enteredPrice = rawPrice !== undefined && rawPrice !== "" ? parseInt(rawPrice, 10) : null;
    if (!enteredPrice || enteredPrice < 1) {
      alert("Enter a listing price before selling.");
      return;
    }
    if ((item.quantity || 0) <= 0) {
      alert("No saleable quantity for: " + item.name);
      return;
    }

    setSellStatus(prev => ({ ...prev, [item.unique_name]: "listing" }));
    try {
      await invoke("post_market_order", {
        token,
        itemId,
        platPrice: enteredPrice,
        quantity: 1,
        rank: null
      });
      setSellStatus(prev => ({ ...prev, [item.unique_name]: "success" }));
      fetchMyOrders();
      setTimeout(() => {
        setSellStatus(prev => ({ ...prev, [item.unique_name]: null }));
      }, 3000);
    } catch (err) {
      alert("Failed to list order on Warframe.Market: " + err);
      setSellStatus(prev => ({ ...prev, [item.unique_name]: "error" }));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent text-kronos-text">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-kronos-panel/30 backdrop-blur flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-kronos-accent" />
            <h1 className="text-xl font-bold text-white tracking-wide">{t("market.title")}</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-kronos-accent/10 text-kronos-accent border border-kronos-accent/20 rounded-full">
              Warframe.Market v2
            </span>
          </div>
          <p className="text-xs text-kronos-dim mt-1">
            {t("market.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMyOrders}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-kronos-panel/50 hover:bg-[#334155] border border-white/10 text-xs font-medium text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-kronos-accent" : ""}`} />
            {t("market.sync_listings")}
          </button>
          <a
            href="https://warframe.market"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-kronos-accent/10 hover:bg-kronos-accent/20 border border-kronos-accent/30 text-xs font-medium text-kronos-accent transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t("market.open_website")}
          </a>
        </div>
      </div>

      {/* No Token Warning */}
      {!token && (
        <div className="m-6 p-4 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#fbbf24]">{t("market.token_required_title")}</h3>
            <p className="text-xs text-kronos-text mt-1">
              {t("market.token_required_desc")}
            </p>
            {onNavigate && (
              <button
                onClick={() => onNavigate("settings")}
                className="mt-2.5 px-3 py-1 bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold text-xs rounded-lg transition"
              >
                {t("market.go_to_settings")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {successMsg && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="mx-6 mt-4 p-3 rounded-lg bg-red-950/80 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-kronos-panel/40 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-kronos-accent/10 border border-kronos-accent/20 flex items-center justify-center text-kronos-accent">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-kronos-dim">{t("market.stat_potential_earnings")}</div>
              <div className="text-lg font-bold text-white flex items-center gap-1">
                {metrics.totalPlat.toLocaleString()} <span className="text-xs text-kronos-accent">plat</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-kronos-panel/40 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#a855f7]/10 border border-[#a855f7]/20 flex items-center justify-center text-[#a855f7]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-kronos-dim">{t("market.stat_active_orders")}</div>
              <div className="text-lg font-bold text-white">{metrics.activeCount} listings</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-kronos-panel/40 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center text-[#10b981]">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-kronos-dim">{t("market.stat_visibility")}</div>
              <div className="text-lg font-bold text-white">{metrics.visibleCount} visible / {metrics.hiddenCount} hidden</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-kronos-panel/40 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-kronos-dim">{t("market.stat_tradeable_inventory")}</div>
              <div className="text-lg font-bold text-white">{stockWithPricing.length} items</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/5 gap-6">
          <button
            onClick={() => setActiveTab("active_orders")}
            className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "active_orders"
                ? "border-kronos-accent text-kronos-accent"
                : "border-transparent text-kronos-dim hover:text-white"
            }`}
          >
            <Package className="w-4 h-4" />
            Active Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("tradeable_stock")}
            className={`pb-3 text-sm font-semibold transition border-b-2 flex items-center gap-2 ${
              activeTab === "tradeable_stock"
                ? "border-kronos-accent text-kronos-accent"
                : "border-transparent text-kronos-dim hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#fbbf24]" />
            Tradeable Stock ({stockWithPricing.length})
          </button>
        </div>

        {/* ==================================================================== */}
        {/* Tab 1: Active Orders                                                 */}
        {/* ==================================================================== */}
        {activeTab === "active_orders" && (
          <div className="flex flex-col gap-4">
            {/* Filter / Search Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-1.5 p-1 bg-kronos-panel/50 rounded-lg border border-white/5">
                <button
                  onClick={() => setOrderFilter("all")}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    orderFilter === "all" ? "bg-kronos-panel/50 text-white" : "text-kronos-dim hover:text-white"
                  }`}
                >
                  All ({orders.length})
                </button>
                <button
                  onClick={() => setOrderFilter("sell")}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    orderFilter === "sell" ? "bg-[#10b981]/20 text-[#10b981]" : "text-kronos-dim hover:text-white"
                  }`}
                >
                  Sell ({orders.filter(o => o.type === "sell").length})
                </button>
                <button
                  onClick={() => setOrderFilter("buy")}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    orderFilter === "buy" ? "bg-kronos-accent/20 text-kronos-accent" : "text-kronos-dim hover:text-white"
                  }`}
                >
                  Buy ({orders.filter(o => o.type === "buy").length})
                </button>
                <button
                  onClick={() => setOrderFilter("hidden")}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    orderFilter === "hidden" ? "bg-[#64748b]/20 text-kronos-text" : "text-kronos-dim hover:text-white"
                  }`}
                >
                  Hidden ({orders.filter(o => !o.visible).length})
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-kronos-dim" />
                <input
                  type="text"
                  placeholder="Search active listings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 bg-kronos-panel/50 border border-white/5 rounded-lg text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-kronos-accent w-full sm:w-64"
                />
              </div>
            </div>

            {/* Orders Table */}
            {filteredOrders.length === 0 ? (
              <div className="p-12 rounded-xl bg-kronos-panel/30 border border-white/5 flex flex-col items-center justify-center text-center">
                <Package className="w-12 h-12 text-[#475569] mb-3" />
                <h3 className="text-sm font-semibold text-white">{t("market.no_active_orders")}</h3>
                <p className="text-xs text-kronos-dim mt-1 max-w-sm">
                  {searchQuery ? t("market.no_listings_search") : t("market.no_active_orders_filter")}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-kronos-panel/40 overflow-hidden shadow-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-kronos-panel/60 text-kronos-dim uppercase text-[10px] tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-3 px-4">{t("market.col_item")}</th>
                      <th className="py-3 px-4">{t("market.col_type")}</th>
                      <th className="py-3 px-4">{t("market.col_quantity")}</th>
                      <th className="py-3 px-4">{t("market.col_price")}</th>
                      <th className="py-3 px-4">{t("market.col_status")}</th>
                      <th className="py-3 px-4 text-right">{t("market.col_actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f293d]/50 text-slate-300">
                    {filteredOrders.map(order => {
                      const itemInfo = getItemInfo(order);
                      const isDeleting = actionLoading[order.id] === "deleting";
                      const isClosing = actionLoading[order.id] === "closing";
                      const isToggling = actionLoading[order.id] === "toggling";
                      const isUpdating = actionLoading[order.id] === "updating";
                      const isEditing = editingOrder === order.id;

                      return (
                        <tr key={order.id} className="hover:bg-kronos-panel/50/30 transition">
                          {/* Item Column */}
                          <td className="py-3 px-4 font-medium text-white flex items-center gap-3">
                            {itemInfo.image ? (
                              <ItemImage src={itemInfo.image} alt="" className="w-8 h-8 object-contain rounded bg-kronos-panel/60 p-0.5 border border-white/5" placeholderClassName="w-8 h-8 rounded bg-kronos-panel/60 border border-white/5" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-kronos-panel/50 border border-white/10 flex items-center justify-center text-kronos-dim">
                                <Tag className="w-4 h-4" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-white">{itemInfo.name}</div>
                              {order.rank !== undefined && order.rank !== null && (
                                <div className="text-[10px] text-kronos-dim">Rank {order.rank}</div>
                              )}
                              {order.subtype && (
                                <div className="text-[10px] text-kronos-accent capitalize">{order.subtype}</div>
                              )}
                            </div>
                          </td>

                          {/* Type */}
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                              order.type === "sell"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                            }`}>
                              {order.type}
                            </span>
                          </td>

                          {/* Quantity */}
                          <td className="py-3 px-4 font-medium">
                            {order.quantity || 1}
                          </td>

                          {/* Price */}
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="1"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-16 px-2 py-0.5 bg-kronos-panel/60 border border-kronos-accent rounded text-white text-xs"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSavePrice(order.id)}
                                  disabled={isUpdating}
                                  className="p-1 bg-kronos-accent text-black text-black rounded hover:bg-[#0284c7] transition"
                                  title="Save price"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => {
                                  setEditingOrder(order.id);
                                  setEditPrice(order.platinum);
                                }}
                                className="cursor-pointer group flex items-center gap-1.5 font-bold text-kronos-accent hover:text-[#7dd3fc]"
                                title="Click to edit price"
                              >
                                <span>{order.platinum}p</span>
                                <span className="text-[10px] opacity-0 group-hover:opacity-100 text-kronos-dim">✎</span>
                              </div>
                            )}
                          </td>

                          {/* Visibility Status */}
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleVisibility(order)}
                              disabled={isToggling}
                              className={`flex items-center gap-1 text-[11px] font-medium transition ${
                                order.visible ? "text-emerald-400 hover:text-emerald-300" : "text-slate-500 hover:text-slate-400"
                              }`}
                              title={order.visible ? "Visible to buyers (Click to hide)" : "Hidden (Click to make visible)"}
                            >
                              {order.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                              <span>{order.visible ? t("market.visible") : t("market.hidden")}</span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {order.type === "sell" && (
                                <button
                                  onClick={() => handleCloseOrder(order.id, 1)}
                                  disabled={isClosing}
                                  className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium transition disabled:opacity-50"
                                  title="Mark 1 sold"
                                >
                                  {isClosing ? "..." : t("market.sold")}
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                disabled={isDeleting}
                                className="p-1.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs transition disabled:opacity-50"
                                title="Delete listing"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* Tab 2: Tradeable Stock (Ducats vs Plat Analysis & 1-Click Selling)   */}
        {/* ==================================================================== */}
        {activeTab === "tradeable_stock" && (
          <div className="flex flex-col gap-4">
            {/* Filter and Sort Toolbar */}
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
              {/* Decision and Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-kronos-panel/50 rounded-lg border border-white/5">
                <button
                  onClick={() => setStockFilter("all")}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    stockFilter === "all" ? "bg-kronos-panel/50 text-white" : "text-kronos-dim hover:text-white"
                  }`}
                >
                  All ({stockWithPricing.length})
                </button>
                <button
                  onClick={() => setStockFilter("sell_plat")}
                  className={`px-3 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
                    stockFilter === "sell_plat" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold" : "text-kronos-dim hover:text-white"
                  }`}
                >
                  <Tag className="w-3 h-3 text-emerald-400" />
                  {t("market.filter_sell_plat", { n: stockWithPricing.filter(i => i.decision === "sell_plat").length })}
                </button>
                <button
                  onClick={() => setStockFilter("ducats")}
                  className={`px-3 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
                    stockFilter === "ducats" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold" : "text-kronos-dim hover:text-white"
                  }`}
                >
                  <Coins className="w-3 h-3 text-amber-400" />
                  {t("market.filter_best_ducats", { n: stockWithPricing.filter(i => i.decision === "ducats").length })}
                </button>
                <button
                  onClick={() => setStockFilter("duplicates")}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    stockFilter === "duplicates" ? "bg-[#a855f7]/20 text-[#c084fc] font-bold" : "text-kronos-dim hover:text-white"
                  }`}
                >
                  {t("market.filter_duplicates", { n: stockWithPricing.filter(i => i.isDuplicate).length })}
                </button>
                <button
                  onClick={() => setStockFilter("mastered")}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    stockFilter === "mastered" ? "bg-kronos-accent/20 text-kronos-accent font-bold" : "text-kronos-dim hover:text-white"
                  }`}
                >
                  {t("market.filter_mastered", { n: stockWithPricing.filter(i => i.isMastered).length })}
                </button>
              </div>

              {/* Search & Sort Dropdown */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-kronos-dim" />
                  <input
                    type="text"
                    placeholder="Search stock..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-kronos-panel/50 border border-white/5 rounded-lg text-xs text-white placeholder-[#64748b] focus:outline-none focus:border-kronos-accent w-full"
                  />
                </div>

                {/* Custom Dark Sort Dropdown Menu */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSortOpen(prev => !prev)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-kronos-panel/50 hover:bg-kronos-panel/50 border border-white/5 hover:border-kronos-accent/50 rounded-lg text-xs font-medium text-white transition shadow-sm"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-kronos-accent" />
                    <span>
                      {stockSort === "plat_ratio" && t("market.sort_best_plat")}
                      {stockSort === "ducat_ratio" && t("market.sort_best_ducats")}
                      {stockSort === "plat_desc" && t("market.sort_highest_plat")}
                      {stockSort === "owned_desc" && t("market.sort_most_owned")}
                      {stockSort === "ducats_desc" && t("market.sort_highest_ducats")}
                      {stockSort === "name_asc" && t("market.sort_name_az")}
                    </span>
                    <span className="text-[10px] text-kronos-dim">▼</span>
                  </button>

                  {isSortOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                      <div className="absolute right-0 mt-1.5 w-56 bg-[#0f172a] border border-white/20 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.85)] z-50 py-1.5 overflow-hidden backdrop-blur-md">
                        {[
                          { id: "plat_ratio", label: t("market.sort_best_plat") },
                          { id: "ducat_ratio", label: t("market.sort_best_ducats") },
                          { id: "plat_desc", label: t("market.sort_highest_plat") },
                          { id: "owned_desc", label: t("market.sort_most_owned") },
                          { id: "ducats_desc", label: t("market.sort_highest_ducats") },
                          { id: "name_asc", label: t("market.sort_name_az") },
                        ].map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setStockSort(opt.id);
                              setIsSortOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-xs transition flex items-center justify-between ${
                              stockSort === opt.id
                                ? "bg-kronos-accent/10 text-kronos-accent font-bold"
                                : "text-slate-300 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <span>{opt.label}</span>
                            {stockSort === opt.id && <Check className="w-3.5 h-3.5 text-kronos-accent" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSortRefreshToken(v => v + 1)}
                  title="Re-sort using currently known prices (list order stays fixed while prices are loading)"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-kronos-panel/50 hover:bg-kronos-panel/70 border border-white/5 hover:border-kronos-accent/50 rounded-lg text-xs font-medium text-white transition"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-kronos-accent" />
                  {t("market.refresh_sort")}
                </button>
              </div>
            </div>

            {catalogStatus === "loading" && (
              <div className="p-4 rounded-xl bg-kronos-panel/30 border border-white/5 flex items-center gap-2 text-xs text-kronos-dim">
                <RefreshCw className="w-4 h-4 animate-spin text-kronos-accent" />
                {t("market.catalog_loading")}
              </div>
            )}
            {catalogStatus === "error" && (
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/20 flex items-center justify-between gap-2 text-xs text-red-300">
                <span className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {t("market.catalog_error")}</span>
                <button
                  type="button"
                  onClick={ensureCatalog}
                  className="px-3 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-medium transition"
                >
                  {t("market.retry")}
                </button>
              </div>
            )}

            {/* Stock Cards Grid */}
            {catalogStatus === "ready" && processedStock.length === 0 ? (
              <div className="p-12 rounded-xl bg-kronos-panel/30 border border-white/5 flex flex-col items-center justify-center text-center">
                <Layers className="w-12 h-12 text-[#475569] mb-3" />
                <h3 className="text-sm font-semibold text-white">{t("market.no_items_stock")}</h3>
                <p className="text-xs text-kronos-dim mt-1 max-w-sm">
                  {stockSearch ? t("market.no_items_stock_search") : t("market.no_items_stock_filter")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {processedStock.map(item => {
                  const isListing = sellStatus[item.unique_name] === "listing";
                  const isListed = sellStatus[item.unique_name] === "success";
                  const hasCustomPrice = sellPriceInput[item.unique_name] !== undefined;
                  // Never silently substitute a price - prefill with the
                  // confirmed WFM price once known, otherwise leave blank
                  // so a listing can't go out at a made-up value.
                  const currentPrice = hasCustomPrice ? sellPriceInput[item.unique_name] : (item.platPrice ?? "");
                  const canSell = !!item.wfmItem?.id && (item.quantity || 0) > 0 && currentPrice !== "" && Number(currentPrice) >= 1;

                  return (
                    <div
                      key={item.unique_name || item.name}
                      className={`p-4 rounded-xl bg-kronos-panel/50 border transition flex flex-col justify-between gap-3 ${
                        item.decision === "sell_plat"
                          ? "border-emerald-500/30 hover:border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                          : item.decision === "ducats"
                          ? "border-amber-500/30 hover:border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
                          : "border-white/5 hover:border-kronos-accent/40"
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex items-start gap-3">
                        {item.image ? (
                          <ItemImage src={item.image} alt="" className="w-10 h-10 object-contain rounded bg-kronos-panel/60 p-1 border border-white/5 shrink-0" placeholderClassName="w-10 h-10 rounded bg-kronos-panel/60 border border-white/5 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-kronos-panel/50 border border-white/10 flex items-center justify-center text-kronos-dim shrink-0">
                            <Tag className="w-5 h-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white text-xs truncate" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-[10px] text-kronos-dim mt-0.5 flex flex-wrap items-center gap-2">
                            <span>{t("market.owned_label")} <b className="text-white">{item.quantity}</b></span>
                            {item.ducats > 0 && <span>{t("market.ducats_label")} <b className="text-amber-400">{item.ducats}d</b></span>}
                            {item.isMastered && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-kronos-accent/10 text-kronos-accent font-bold border border-kronos-accent/20">
                                Mastered
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Recommendation Banner */}
                      <div className={`p-2 rounded-lg flex items-center justify-between text-[11px] font-medium border ${
                        item.decision === "sell_plat"
                          ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/20"
                          : item.decision === "ducats"
                          ? "bg-amber-950/40 text-amber-300 border-amber-500/20"
                          : "bg-slate-900/60 text-slate-300 border-slate-700/30"
                      }`}>
                        <div className="flex items-center gap-1.5 font-bold">
                          {item.decision === "sell_plat" ? (
                            <Tag className="w-3.5 h-3.5 text-emerald-400" />
                          ) : item.decision === "ducats" ? (
                            <Coins className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{item.decisionLabel}</span>
                        </div>
                        <span className="text-[10px] opacity-80">{item.decisionReason}</span>
                      </div>

                      {/* Pricing & 1-Click Sell Footer */}
                      <div className="pt-2 border-t border-white/5/50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-kronos-dim">{t("market.plat_label")}</span>
                          <input
                            type="number"
                            min="1"
                            value={currentPrice}
                            placeholder={item.platPrice == null ? "?" : undefined}
                            onChange={(e) => setSellPriceInput(prev => ({ ...prev, [item.unique_name]: e.target.value }))}
                            className="w-14 px-1.5 py-0.5 bg-kronos-panel/60 border border-white/5 focus:border-kronos-accent rounded text-white text-xs font-bold text-center"
                            title="Edit listing price"
                          />
                          <span className="text-xs text-kronos-accent font-bold">p</span>
                        </div>

                        <button
                          onClick={() => handleSellStockItem(item)}
                          disabled={isListing || isListed || !canSell}
                          title={!canSell ? "Enter a price to enable selling" : undefined}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm ${
                            isListed
                              ? "bg-emerald-500 text-black cursor-default"
                              : item.decision === "sell_plat"
                              ? "bg-emerald-500 hover:bg-emerald-400 text-black"
                              : "bg-kronos-accent text-black hover:bg-[#0284c7] text-black"
                          } disabled:opacity-50`}
                        >
                          {isListing ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : isListed ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> {t("market.listed")}
                            </>
                          ) : (
                            t("market.sell_on_wfm")
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
