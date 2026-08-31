import React, { useState, useEffect, useMemo, useCallback } from "react";
import { PageLayout, Card, Input } from "../components/UI";
import ItemImage from "../components/ItemImage";
import { useUi } from "../contexts/UiContext";
import { invoke } from "@tauri-apps/api/core";
import { loadSettings, getSetting } from "../lib/settings";
import { useMonitoring } from "../contexts/MonitoringContext";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { ensureWfmItems, lookupWfmItem, getPrice } from "../lib/wfmCache";
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

export default function Market({ onNavigate }) {
  const { t } = useUi();
  const { inventoryData } = useMonitoring();
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState("active_orders");
  const [wfmMap, setWfmMap] = useState(null); // "active_orders" | "tradeable_stock"
  
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
  const [stockPrices, setStockPrices] = useState({});

  // 1. Load WFM items catalog (ID -> name/icon map)
  const ensureCatalog = useCallback(async () => {
    try {
      const cached = localStorage.getItem(WFM_ID_CATALOG_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Object.keys(parsed).length > 0) {
          setIdCatalog(parsed);
        }
      }

      const map = await ensureWfmItems();
      if (map) setWfmMap(map);

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
      setSuccessMsg("Order deleted successfully.");
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
      setSuccessMsg("Order marked as sold!");
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
      setSuccessMsg("Price updated successfully.");
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
  const tradeableStock = useMemo(() => {
    if (!inventoryData?.prime_parts) return [];
    
    return inventoryData.prime_parts.map(part => {
      const wfmItem = wfmMap ? lookupWfmItem(wfmMap, part.unique_name) : null;
      const platPrice = stockPrices[part.name] || (part.estimated_platinum || 0);
      const ducats = part.ducats || 0;
      
      // Calculate decision & ratios
      let pdRatio = 0;
      let dpRatio = 0;
      if (ducats > 0 && platPrice > 0) {
        pdRatio = platPrice / ducats;
        dpRatio = ducats / platPrice;
      }

      // Decision rules:
      // High plat value if price >= 15p OR ratio >= 0.2 (e.g. >=10p for 45d, >=5p for 15d)
      let decision = "neutral";
      let decisionLabel = "FAIR VALUE";
      let decisionReason = `Balanced (~${ducats}d / ${platPrice || "?"}p)`;

      if (platPrice >= 15 || pdRatio >= 0.22) {
        decision = "sell_plat";
        decisionLabel = "SELL FOR PLAT";
        decisionReason = `High Plat Profit (${platPrice}p vs ${ducats}d)`;
      } else if (dpRatio >= 15 || (ducats >= 45 && platPrice <= 3)) {
        decision = "ducats";
        decisionLabel = "KEEP FOR DUCATS";
        decisionReason = `High Ducat Yield (${ducats}d vs ${platPrice}p)`;
      }

      return {
        ...part,
        wfmItem,
        platPrice,
        ducats,
        pdRatio,
        dpRatio,
        decision,
        decisionLabel,
        decisionReason,
        isDuplicate: (part.quantity || 0) > 1,
        isMastered: !!part.mastered
      };
    });
  }, [inventoryData, wfmMap, stockPrices]);


  useEffect(() => {
    if (!inventoryData?.prime_parts) return;
    let isMounted = true;

    const loadPrices = async () => {
      const owned = inventoryData.prime_parts.filter(p => (p.quantity || 0) > 0);
      const chunkSize = 8;
      
      for (let i = 0; i < owned.length; i += chunkSize) {
        if (!isMounted) break;
        const chunk = owned.slice(i, i + chunkSize);
        const batchResults = {};
        
        await Promise.all(chunk.map(async part => {
          try {
            const plat = await getPrice(part.unique_name, part.name, part.ducats || 0);
            if (plat !== null && plat !== undefined) {
              batchResults[part.name] = plat;
            }
          } catch {}
        }));

        if (isMounted && Object.keys(batchResults).length > 0) {
          setStockPrices(prev => ({ ...prev, ...batchResults }));
        }
      }
    };

    loadPrices();
    return () => { isMounted = false; };
  }, [inventoryData?.prime_parts]);

  // Filtered & Sorted Tradeable Stock
  const processedStock = useMemo(() => {
    let list = tradeableStock.filter(item => {
      if (stockFilter === "sell_plat" && item.decision !== "sell_plat") return false;
      if (stockFilter === "ducats" && item.decision !== "ducats") return false;
      if (stockFilter === "duplicates" && !item.isDuplicate) return false;
      if (stockFilter === "mastered" && !item.isMastered) return false;
      if (stockFilter === "unmastered" && item.isMastered) return false;
      if (stockSearch.trim() && !item.name.toLowerCase().includes(stockSearch.toLowerCase())) return false;
      return true;
    });

    list.sort((a, b) => {
      if (stockSort === "plat_ratio") return (b.pdRatio || 0) - (a.pdRatio || 0) || (b.platPrice || 0) - (a.platPrice || 0);
      if (stockSort === "ducat_ratio") return (b.dpRatio || 0) - (a.dpRatio || 0) || (b.ducats || 0) - (a.ducats || 0);
      if (stockSort === "plat_desc") return (b.platPrice || 0) - (a.platPrice || 0);
      if (stockSort === "owned_desc") return (b.quantity || 0) - (a.quantity || 0);
      if (stockSort === "ducats_desc") return (b.ducats || 0) - (a.ducats || 0);
      if (stockSort === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [tradeableStock, stockFilter, stockSort, stockSearch]);

  // 1-Click Sell from Tradeable Stock
  const handleSellStockItem = async (item) => {
    const customPrice = sellPriceInput[item.name] || item.platPrice || 10;
    if (!token) {
      alert("Please configure your Warframe.Market JWT token in Settings to list items.");
      return;
    }

    // Resolve 24-char hexadecimal WFM itemId
    let itemId = item.wfmItem?.id || (wfmMap ? lookupWfmItem(wfmMap, item.unique_name)?.id : null);
    if (!itemId && idCatalog) {
      const slug = item.wfmItem?.slug || item.name.toLowerCase().replace(/\s+/g, '_');
      const entry = Object.values(idCatalog).find(e => e.slug === slug || e.name === item.name);
      if (entry) itemId = entry.id;
    }

    if (!itemId) {
      try {
        const catRes = await tauriFetch("https://api.warframe.market/v2/items", {
          method: "GET",
          headers: { Platform: "pc", Accept: "application/json", "User-Agent": "KiedasOrbiter/1.3.3" }
        });
        if (catRes.ok) {
          const body = await catRes.json();
          const items = body?.data || [];
          const leaf = item.unique_name ? item.unique_name.split('/').pop() : null;
          const matched = items.find(it => {
            if (it.gameRef && (it.gameRef === item.unique_name || (leaf && it.gameRef.endsWith(leaf)))) return true;
            if (it.i18n?.en?.name?.toLowerCase() === item.name?.toLowerCase()) return true;
            return false;
          });
          if (matched) itemId = matched.id;
        }
      } catch {}
    }

    if (!itemId) {
      alert("Could not resolve Warframe.Market item ID for: " + item.name);
      return;
    }

    setSellStatus(prev => ({ ...prev, [item.name]: "listing" }));
    try {
      await invoke("post_market_order", {
        token,
        itemId,
        platPrice: parseInt(customPrice, 10),
        quantity: 1,
        rank: null
      });
      setSellStatus(prev => ({ ...prev, [item.name]: "success" }));
      fetchMyOrders();
      setTimeout(() => {
        setSellStatus(prev => ({ ...prev, [item.name]: null }));
      }, 3000);
    } catch (err) {
      alert("Failed to list order on Warframe.Market: " + err);
      setSellStatus(prev => ({ ...prev, [item.name]: "error" }));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent text-kronos-text">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-kronos-panel/30 backdrop-blur flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-kronos-accent" />
            <h1 className="text-xl font-bold text-white tracking-wide">Market & Trading Hub</h1>
            <span className="px-2 py-0.5 text-xs font-semibold bg-kronos-accent/10 text-kronos-accent border border-kronos-accent/20 rounded-full">
              Warframe.Market v2
            </span>
          </div>
          <p className="text-xs text-kronos-dim mt-1">
            Manage live listings, evaluate Ducat vs. Platinum trade-offs, and sell stock directly.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMyOrders}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-kronos-panel/50 hover:bg-[#334155] border border-white/10 text-xs font-medium text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-kronos-accent" : ""}`} />
            Sync Listings
          </button>
          <a
            href="https://warframe.market"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-kronos-accent/10 hover:bg-kronos-accent/20 border border-kronos-accent/30 text-xs font-medium text-kronos-accent transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Website
          </a>
        </div>
      </div>

      {/* No Token Warning */}
      {!token && (
        <div className="m-6 p-4 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#f59e0b] shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[#fbbf24]">Warframe.Market Token Required</h3>
            <p className="text-xs text-kronos-text mt-1">
              To view active listings, update prices, or sell items with 1-click, configure your JWT cookie in Settings.
            </p>
            {onNavigate && (
              <button
                onClick={() => onNavigate("settings")}
                className="mt-2.5 px-3 py-1 bg-[#f59e0b] hover:bg-[#d97706] text-black font-semibold text-xs rounded-lg transition"
              >
                Go to Settings
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
              <div className="text-xs text-kronos-dim">Potential Earnings</div>
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
              <div className="text-xs text-kronos-dim">Active Orders</div>
              <div className="text-lg font-bold text-white">{metrics.activeCount} listings</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-kronos-panel/40 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center text-[#10b981]">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-kronos-dim">Visibility</div>
              <div className="text-lg font-bold text-white">{metrics.visibleCount} visible / {metrics.hiddenCount} hidden</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-kronos-panel/40 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center text-[#f59e0b]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-kronos-dim">Tradeable Inventory</div>
              <div className="text-lg font-bold text-white">{tradeableStock.length} items</div>
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
            Tradeable Stock ({tradeableStock.length})
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
                <h3 className="text-sm font-semibold text-white">No active orders found</h3>
                <p className="text-xs text-kronos-dim mt-1 max-w-sm">
                  {searchQuery ? "No listings match your search filter." : "You have no active orders matching this filter on Warframe.Market."}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-white/5 bg-kronos-panel/40 overflow-hidden shadow-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-kronos-panel/60 text-kronos-dim uppercase text-[10px] tracking-wider border-b border-white/5">
                    <tr>
                      <th className="py-3 px-4">Item</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Quantity</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
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
                              <span>{order.visible ? "Visible" : "Hidden"}</span>
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
                                  {isClosing ? "..." : "Sold"}
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
                  All ({tradeableStock.length})
                </button>
                <button
                  onClick={() => setStockFilter("sell_plat")}
                  className={`px-3 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
                    stockFilter === "sell_plat" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold" : "text-kronos-dim hover:text-white"
                  }`}
                >
                  <Tag className="w-3 h-3 text-emerald-400" />
                  Sell for Plat ({tradeableStock.filter(i => i.decision === "sell_plat").length})
                </button>
                <button
                  onClick={() => setStockFilter("ducats")}
                  className={`px-3 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
                    stockFilter === "ducats" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold" : "text-kronos-dim hover:text-white"
                  }`}
                >
                  <Coins className="w-3 h-3 text-amber-400" />
                  Best for Ducats ({tradeableStock.filter(i => i.decision === "ducats").length})
                </button>
                <button
                  onClick={() => setStockFilter("duplicates")}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    stockFilter === "duplicates" ? "bg-[#a855f7]/20 text-[#c084fc] font-bold" : "text-kronos-dim hover:text-white"
                  }`}
                >
                  Duplicates 2+ ({tradeableStock.filter(i => i.isDuplicate).length})
                </button>
                <button
                  onClick={() => setStockFilter("mastered")}
                  className={`px-3 py-1 rounded text-xs font-medium transition ${
                    stockFilter === "mastered" ? "bg-kronos-accent/20 text-kronos-accent font-bold" : "text-kronos-dim hover:text-white"
                  }`}
                >
                  Mastered ({tradeableStock.filter(i => i.isMastered).length})
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
                      {stockSort === "plat_ratio" && "Sort: Best Plat to Sell"}
                      {stockSort === "ducat_ratio" && "Sort: Best Ducats for Baro"}
                      {stockSort === "plat_desc" && "Highest Plat Price"}
                      {stockSort === "owned_desc" && "Most Owned"}
                      {stockSort === "ducats_desc" && "Highest Ducats"}
                      {stockSort === "name_asc" && "Name (A-Z)"}
                    </span>
                    <span className="text-[10px] text-kronos-dim">▼</span>
                  </button>

                  {isSortOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                      <div className="absolute right-0 mt-1.5 w-56 bg-[#0f172a] border border-white/20 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.85)] z-50 py-1.5 overflow-hidden backdrop-blur-md">
                        {[
                          { id: "plat_ratio", label: "Sort: Best Plat to Sell" },
                          { id: "ducat_ratio", label: "Sort: Best Ducats for Baro" },
                          { id: "plat_desc", label: "Highest Plat Price" },
                          { id: "owned_desc", label: "Most Owned" },
                          { id: "ducats_desc", label: "Highest Ducats" },
                          { id: "name_asc", label: "Name (A-Z)" },
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
              </div>
            </div>

            {/* Stock Cards Grid */}
            {processedStock.length === 0 ? (
              <div className="p-12 rounded-xl bg-kronos-panel/30 border border-white/5 flex flex-col items-center justify-center text-center">
                <Layers className="w-12 h-12 text-[#475569] mb-3" />
                <h3 className="text-sm font-semibold text-white">No items found in stock</h3>
                <p className="text-xs text-kronos-dim mt-1 max-w-sm">
                  {stockSearch ? "No tradeable items match your search." : "No tradeable prime items match this filter."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {processedStock.map(item => {
                  const isListing = sellStatus[item.name] === "listing";
                  const isListed = sellStatus[item.name] === "success";
                  const hasCustomPrice = sellPriceInput[item.name] !== undefined;
                  const currentPrice = hasCustomPrice ? sellPriceInput[item.name] : (item.platPrice || 10);

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
                            <span>Owned: <b className="text-white">{item.quantity}</b></span>
                            {item.ducats > 0 && <span>Ducats: <b className="text-amber-400">{item.ducats}d</b></span>}
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
                          <span className="text-[10px] text-kronos-dim">Plat:</span>
                          <input
                            type="number"
                            min="1"
                            value={currentPrice}
                            onChange={(e) => setSellPriceInput(prev => ({ ...prev, [item.name]: e.target.value }))}
                            className="w-14 px-1.5 py-0.5 bg-kronos-panel/60 border border-white/5 focus:border-kronos-accent rounded text-white text-xs font-bold text-center"
                            title="Edit listing price"
                          />
                          <span className="text-xs text-kronos-accent font-bold">p</span>
                        </div>

                        <button
                          onClick={() => handleSellStockItem(item)}
                          disabled={isListing || isListed}
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
                              <Check className="w-3.5 h-3.5" /> Listed!
                            </>
                          ) : (
                            "Sell on WFM"
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
