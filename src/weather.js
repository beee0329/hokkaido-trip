// ================================================================
// Open-Meteo Weather API:札幌天氣預報
// ================================================================
// 為什麼選 Open-Meteo:
//   1. 完全免費,無需 API key
//   2. 無流量限制(對個人專案無虞)
//   3. 提供 16 天內的每日預報(含氣溫、降雨、天氣代碼)
//
// 限制:
//   - 距今 > 16 天的預報不可用,會回傳空資料(UI 顯示「—」)
//   - 歷史資料(已過去日期)用另一個 endpoint,本專案不需要
// ================================================================

// 札幌座標(根據需求 hard code,不需動態定位)
const SAPPORO_LAT = 43.0642;
const SAPPORO_LON = 141.3469;

// Open-Meteo Forecast API endpoint
const FORECAST_ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

// 簡單 in-memory cache(同個 session 不重複打 API)
// key = 起始日期 YYYY-MM-DD,value = { fetchedAt, byDate: { 'YYYY-MM-DD': {...} } }
const cache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 分鐘

/**
 * 把 Open-Meteo 的 weather_code 翻成中文 + emoji
 * 代碼定義來自 https://open-meteo.com/en/docs#weathervariables
 * @param {number} code
 * @returns {{ label: string, icon: string }}
 */
function decodeWeatherCode(code) {
  if (code === 0) return { label: '晴', icon: '☀️' };
  if (code === 1 || code === 2) return { label: '多雲時晴', icon: '🌤' };
  if (code === 3) return { label: '陰', icon: '☁️' };
  if (code === 45 || code === 48) return { label: '霧', icon: '🌫' };
  if (code >= 51 && code <= 57) return { label: '毛毛雨', icon: '🌦' };
  if (code >= 61 && code <= 65) return { label: '雨', icon: '🌧' };
  if (code >= 66 && code <= 67) return { label: '凍雨', icon: '🌧' };
  if (code >= 71 && code <= 77) return { label: '雪', icon: '🌨' };
  if (code >= 80 && code <= 82) return { label: '陣雨', icon: '🌦' };
  if (code >= 85 && code <= 86) return { label: '雪陣', icon: '🌨' };
  if (code >= 95) return { label: '雷雨', icon: '⛈' };
  return { label: '—', icon: '' };
}

/**
 * 抓取從 startDate 開始連續 N 天的札幌天氣預報
 *
 * 策略:Open-Meteo 限制 end_date 不能超過今天 +16 天,所以我們用
 * forecast_days=16 一次拉所有可預報的日子,再用 JS 篩出旅行日期。
 * 超過 16 天的日期天然就會缺,UI 自然顯示「—」。
 *
 * @param {string} startDate - YYYY-MM-DD 格式
 * @param {number} days - 連續幾天
 * @returns {Promise<{[date: string]: {tempMax: number, tempMin: number, code: number, label: string, icon: string}}>}
 */
export async function fetchSapporoForecast(startDate, days = 7) {
  if (!startDate || days <= 0) return {};

  // 檢查 cache
  const cacheKey = `${startDate}_${days}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.byDate;
  }

  // 計算需要的日期清單,後續從 API 回傳裡篩
  // ⚠️ 用本地時區組日期字串,避免 toISOString() 在 UTC+ 時區把日期推前一天
  const wantedDates = new Set();
  const start = new Date(startDate + 'T00:00:00'); // 明確指定本地午夜,而非 UTC
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    wantedDates.add(`${yyyy}-${mm}-${dd}`);
  }

  const params = new URLSearchParams({
    latitude: String(SAPPORO_LAT),
    longitude: String(SAPPORO_LON),
    daily: 'temperature_2m_max,temperature_2m_min,weather_code',
    timezone: 'Asia/Tokyo',
    forecast_days: '16', // 一次拉 16 天,API 自動處理範圍
  });

  try {
    const res = await fetch(`${FORECAST_ENDPOINT}?${params.toString()}`);
    if (!res.ok) return {};
    const data = await res.json();
    const dailyDates = data?.daily?.time;
    const tmaxArr = data?.daily?.temperature_2m_max;
    const tminArr = data?.daily?.temperature_2m_min;
    const codeArr = data?.daily?.weather_code;
    if (!Array.isArray(dailyDates)) return {};

    const byDate = {};
    dailyDates.forEach((date, idx) => {
      // 只保留旅行日期的資料
      if (!wantedDates.has(date)) return;
      const tmax = tmaxArr?.[idx];
      const tmin = tminArr?.[idx];
      const code = codeArr?.[idx];
      if (tmax == null || tmin == null) return;
      const decoded = decodeWeatherCode(code);
      byDate[date] = {
        tempMax: Math.round(tmax),
        tempMin: Math.round(tmin),
        code,
        label: decoded.label,
        icon: decoded.icon,
      };
    });

    cache.set(cacheKey, { fetchedAt: Date.now(), byDate });
    return byDate;
  } catch (err) {
    // 網路問題、API 故障 → 回傳空物件,UI 自然顯示「—」
    console.warn('天氣 API 失敗:', err);
    return {};
  }
}
