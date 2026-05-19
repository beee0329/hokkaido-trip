import { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Pencil, Eye, Cloud, CloudOff, MapPin, Phone, Check,
  MapPinned, Wallet, Camera, Utensils, ShoppingBag, Train, Bed, MoreHorizontal,
  Navigation, Users, User, ArrowRight, Scale, Banknote, CreditCard, Smartphone,
  PieChart as PieChartIcon, Loader2, Sparkles, X,
  Plane, Hotel, Calendar
} from 'lucide-react';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';
import { recognizeReceipt } from './gemini';
import { fetchSapporoForecast } from './weather';

// 房號:你和媽媽用同一個房號就會看到同一份資料
// 之後若想換新的雲端資料,改這個字串即可(例如改成 'hokkaido_2027')
const ROOM_ID = 'hokkaido_2026';
const STORAGE_KEY = 'hokkaido_spring_2026_v2'; // 保留作為離線快取備援
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const PEOPLE = ['靜宜', '阿鳳'];

const CATEGORIES = {
  景點: { color: '#BA7517', bg: '#FAEEDA', dot: '#E0AC4E', icon: Camera },
  餐點: { color: '#993C1D', bg: '#FAECE7', dot: '#D85A30', icon: Utensils },
  購物: { color: '#534AB7', bg: '#EEEDFE', dot: '#7F77DD', icon: ShoppingBag },
  交通: { color: '#0F6E56', bg: '#E1F5EE', dot: '#1D9E75', icon: Train },
  住宿: { color: '#185FA5', bg: '#E6F1FB', dot: '#378ADD', icon: Bed },
  其他: { color: '#5F5E5A', bg: '#F1EFE8', dot: '#888780', icon: MoreHorizontal },
};
const CATEGORY_KEYS = Object.keys(CATEGORIES);
const EXPENSE_CATEGORIES = ['餐點', '交通', '住宿', '購物', '景點', '其他'];

// 付款方式:現金 / 信用卡 / Suica
// 用顏色區分,出國回來對帳一目了然(信用卡看月結單、現金算手上、Suica 算儲值)
const PAY_METHODS = {
  cash: { label: '現金', icon: Banknote, color: '#7C5E3C', bg: '#F4EDDF' },
  credit: { label: '信用卡', icon: CreditCard, color: '#2F5F8C', bg: '#E1ECF7' },
  suica: { label: 'Suica', icon: Smartphone, color: '#1F7A4D', bg: '#DEF1E5' },
};
const PAY_METHOD_KEYS = Object.keys(PAY_METHODS);

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const DEFAULT_DATA = {
  trip: {
    title: '北海道初夏',
    subtitle: '靜宜・阿鳳',
    startDate: '2026-05-30',
    endDate: '2026-06-05',
  },
  days: [
    {
      theme: '出發 → 札幌',
      stay: '札幌站東口飯店',
      stayPhone: '',
      stayNote: '',
      items: [
        { id: newId(), time: '07:00', title: '出發 + 早餐覓食', note: '', category: '餐點', done: false },
        { id: newId(), time: '08:00', title: '機場報到', note: '桃園機場 T1', category: '交通', done: false },
        { id: newId(), time: '10:05', title: '起飛 JX850', note: '星宇航空', category: '交通', done: false },
        { id: newId(), time: '15:10', title: '抵達 新千歲機場 CTS', note: '國際線 2F 入境', category: '交通', done: false },
        { id: newId(), time: '16:30', title: '飯店 check-in', note: '', category: '住宿', done: false },
        { id: newId(), time: '18:00', title: '湯咖哩 奧芝商店 実家', note: '札幌名物', category: '餐點', done: false },
      ],
    },
    {
      theme: '芝櫻・鬱金香 一日遊',
      stay: '札幌站東口飯店',
      stayPhone: '',
      stayNote: 'KLOOK 一日遊行程,集合地點:札幌駅北口 団體バス乘車處 5 番のりば',
      items: [
        { id: newId(), time: '07:50', title: '集合 札幌駅北口団體バス 5番のりば', note: '提早 10 分鐘抵達', category: '交通', done: false, location: '札幌駅北口 団体バス乗り場' },
        { id: newId(), time: '09:40', title: '比布大雪 休息區', note: '休息 10 分鐘', category: '交通', done: false, location: '比布大雪 PA' },
        { id: newId(), time: '11:20', title: '芝ざくら滝上公園', note: '停留 1.5 小時', category: '景點', done: false, location: '芝ざくら滝上公園' },
        { id: newId(), time: '14:10', title: 'かみゆうべつチューリップ公園 + 午餐', note: '停留 1.5 小時,公園內可用餐', category: '景點', done: false, location: 'かみゆうべつチューリップ公園' },
        { id: newId(), time: '17:50', title: '比布大雪 休息區', note: '休息 10 分鐘', category: '交通', done: false, location: '比布大雪 PA' },
        { id: newId(), time: '20:00', title: '返回札幌駅北口', note: '', category: '交通', done: false, location: '札幌駅北口' },
        { id: newId(), time: '20:30', title: '札幌 晚餐', note: '行程結束後晚餐', category: '餐點', done: false },
      ],
    },
    {
      theme: '美瑛・富良野 一日遊',
      stay: '札幌站東口飯店',
      stayPhone: '',
      stayNote: 'KLOOK 一日遊,集合地點:札幌駅北口',
      items: [
        { id: newId(), time: '08:00', title: '集合 札幌駅北口', note: '提早 10 分鐘抵達', category: '交通', done: false, location: '札幌駅北口' },
        { id: newId(), time: '10:30', title: '拼布之路', note: '車程觀景路段', category: '景點', done: false, location: 'パッチワークの路 美瑛' },
        { id: newId(), time: '10:40', title: '四季彩之丘', note: '初夏花田', category: '景點', done: false, location: '四季彩の丘' },
        { id: newId(), time: '11:50', title: '青池', note: '雪融期水色最美', category: '景點', done: false, location: '美瑛 青い池' },
        { id: newId(), time: '12:30', title: '白鬚瀑布', note: '', category: '景點', done: false, location: '白ひげの滝' },
        { id: newId(), time: '13:05', title: '富良野 自由用餐', note: '車上會說明附近選擇', category: '餐點', done: false, location: '富良野' },
        { id: newId(), time: '15:05', title: '富田農場', note: '5/30~6/5 鬱金香未開、薰衣草要 7 月,以其他花卉為主', category: '景點', done: false, location: 'ファーム富田' },
        { id: newId(), time: '15:50', title: '搭乘巴士回程', note: '', category: '交通', done: false },
        { id: newId(), time: '17:50', title: '抵達札幌', note: '', category: '交通', done: false, location: '札幌駅北口' },
        { id: newId(), time: '18:30', title: '札幌 晚餐', note: '', category: '餐點', done: false },
      ],
    },
    {
      theme: '小樽運河日',
      stay: '札幌站東口飯店',
      stayPhone: '',
      stayNote: '',
      items: [
        { id: newId(), time: '09:00', title: 'JR 札幌 → 小樽', note: '約 35 分鐘', category: '交通', done: false },
        { id: newId(), time: '10:00', title: '小樽運河散策', note: '', category: '景點', done: false },
        { id: newId(), time: '11:30', title: '北一硝子館', note: '', category: '景點', done: false },
        { id: newId(), time: '13:00', title: '小樽壽司街 午餐', note: '政壽司本店', category: '餐點', done: false },
        { id: newId(), time: '15:00', title: '音樂盒堂本館', note: '蒸氣鐘整點演奏', category: '景點', done: false },
        { id: newId(), time: '19:00', title: '返回札幌 晚餐', note: '', category: '餐點', done: false },
      ],
    },
    {
      theme: '旭川動物園',
      stay: '札幌站東口飯店',
      stayPhone: '',
      stayNote: '',
      items: [
        { id: newId(), time: '09:00', title: '旭山動物園', note: '企鵝散步、北極熊', category: '景點', done: false },
        { id: newId(), time: '12:00', title: '旭川拉麵村 午餐', note: '', category: '餐點', done: false },
        { id: newId(), time: '14:00', title: '男山酒造資料館', note: '', category: '景點', done: false },
        { id: newId(), time: '17:00', title: 'JR 返回札幌', note: '', category: '交通', done: false },
        { id: newId(), time: '19:30', title: '札幌 晚餐', note: '', category: '餐點', done: false },
      ],
    },
    {
      theme: '登別溫泉',
      stay: '登別溫泉飯店',
      stayPhone: '',
      stayNote: '',
      items: [
        { id: newId(), time: '09:30', title: '巴士 → 登別溫泉', note: '高速巴士約 100 分鐘', category: '交通', done: false },
        { id: newId(), time: '12:00', title: '地獄谷散步', note: '', category: '景點', done: false },
        { id: newId(), time: '14:00', title: '登別海洋公園尼克斯', note: '', category: '景點', done: false },
        { id: newId(), time: '17:00', title: '溫泉飯店 check-in', note: '', category: '住宿', done: false },
        { id: newId(), time: '19:00', title: '會席料理 + 溫泉', note: '', category: '餐點', done: false },
      ],
    },
    {
      theme: '回程',
      stay: '—',
      stayPhone: '',
      stayNote: '',
      items: [
        { id: newId(), time: '10:00', title: '退房 → 新千歲機場', note: '', category: '交通', done: false },
        { id: newId(), time: '13:00', title: '機場午餐 + 伴手禮', note: '拉麵道場、伴手禮街', category: '購物', done: false },
        { id: newId(), time: '14:30', title: '辦理出境 國際線 3F', note: '', category: '交通', done: false },
        { id: newId(), time: '16:25', title: '起飛 JX851', note: '星宇航空', category: '交通', done: false },
        { id: newId(), time: '19:35', title: '抵達桃園', note: '', category: '交通', done: false },
        { id: newId(), time: '20:30', title: '回家洗洗睡', note: '', category: '其他', done: false },
      ],
    },
  ],
  expenses: [],
  fxRate: 0.22,
  people: [...PEOPLE],
  // 預訂資訊:機票和住宿(出發前訂好的)
  bookings: {
    flights: [],
    hotels: [],
  },
  lastUpdate: Date.now(),
};

// 行前花費用特殊 dayIndex,跟「Day N」共存於同一陣列
const PRE_TRIP_INDEX = -1;

function migrateExpense(e) {
  // 幣別處理:舊資料沒有 currency 一律當 JPY
  // amount 統一為「換算成日幣後的數字」(用記帳當下的匯率,固定下來)
  // originalAmount + currency 則是「使用者原本輸入的幣別跟金額」
  const currency = e.currency || 'JPY';
  const amount = Number(e.amount) || 0; // 一律是日幣
  const originalAmount = Number(e.originalAmount) || amount; // 顯示用的原始金額
  const fxAtEntry = Number(e.fxAtEntry) || 0.22; // 記帳當下的匯率(JPY → TWD)
  return {
    id: e.id || newId(),
    dayIndex: e.dayIndex ?? 0, // -1 代表行前
    category: e.category || '其他',
    amount, // 內部一律以日幣計算
    note: e.note || '',
    createdAt: e.createdAt || Date.now(),
    paidBy: e.paidBy || PEOPLE[0],
    splitMode: e.splitMode || 'shared',
    payMethod: e.payMethod || 'cash',
    currency,
    originalAmount,
    fxAtEntry,
  };
}

function migrateBookings(raw) {
  // 確保 bookings 結構存在,舊資料若沒有就給空陣列
  const b = raw?.bookings || {};
  return {
    flights: Array.isArray(b.flights) ? b.flights.map((f) => ({
      id: f.id || newId(),
      airline: f.airline || '',
      flightNo: f.flightNo || '',
      from: f.from || '',
      to: f.to || '',
      departTime: f.departTime || '',
      arriveTime: f.arriveTime || '',
      amount: Number(f.amount) || 0,
      currency: f.currency || 'TWD',
    })) : [],
    hotels: Array.isArray(b.hotels) ? b.hotels.map((h) => ({
      id: h.id || newId(),
      name: h.name || '',
      checkIn: h.checkIn || '',
      checkOut: h.checkOut || '',
      amount: Number(h.amount) || 0,
      currency: h.currency || 'TWD',
    })) : [],
  };
}

function migrateData(raw) {
  if (raw?.trip && raw?.days && Array.isArray(raw?.expenses)) {
    return {
      ...raw,
      people: raw.people && raw.people.length === 2 ? raw.people : [...PEOPLE],
      expenses: raw.expenses.map(migrateExpense),
      bookings: migrateBookings(raw),
    };
  }
  if (raw?.days) {
    return {
      trip: {
        title: raw.title || '北海道夏日',
        subtitle: raw.subtitle || '',
        startDate: raw.startDate || '',
        endDate: raw.endDate || '',
      },
      days: raw.days.map((d) => ({
        theme: d.theme || '',
        stay: d.stay || '',
        stayPhone: d.stayPhone || '',
        stayNote: d.stayNote || '',
        items: (d.items || []).map((it) => ({
          id: newId(),
          time: it.time || '',
          title: it.title || '',
          note: it.note || '',
          category: '其他',
          done: false,
        })),
      })),
      expenses: [],
      fxRate: 0.22,
      people: [...PEOPLE],
      bookings: { flights: [], hotels: [] },
      lastUpdate: Date.now(),
    };
  }
  return DEFAULT_DATA;
}

function getDayIndex(startISO) {
  if (!startISO) return -1;
  const start = new Date(startISO + 'T00:00:00');
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((today - start) / 86400000);
}

function formatDateDM(startISO, offset) {
  if (!startISO) return '';
  const d = new Date(startISO + 'T00:00:00');
  d.setDate(d.getDate() + offset);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekday(startISO, offset) {
  if (!startISO) return '';
  const d = new Date(startISO + 'T00:00:00');
  d.setDate(d.getDate() + offset);
  return WEEKDAYS[d.getDay()];
}

function relativeTime(ts) {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return '剛剛';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

function EditableText({ value, onCommit, editMode, placeholder, className = '', multiline = false, style = undefined }) {
  const [draft, setDraft] = useState(value || '');
  useEffect(() => { setDraft(value || ''); }, [value]);

  if (!editMode) {
    return value ? (
      <span className={className} style={style}>{value}</span>
    ) : placeholder ? (
      <span className={`${className} opacity-30`} style={style}>{placeholder}</span>
    ) : null;
  }

  const commit = () => { if (draft !== value) onCommit(draft); };
  const baseCls = `${className} bg-transparent border-b border-dashed border-stone-300 focus:border-stone-600 focus:outline-none w-full`;

  return multiline ? (
    <textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      placeholder={placeholder}
      rows={1}
      className={`${baseCls} resize-none`}
      style={style}
    />
  ) : (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      placeholder={placeholder}
      className={baseCls}
      style={style}
    />
  );
}

function LinkifiedText({ text }) {
  if (!text) return null;
  // 把 http(s):// 開頭的 URL 轉成可點連結,其他文字原樣顯示
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 underline decoration-dotted underline-offset-2 hover:text-sky-700 break-all"
          >
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </span>
  );
}

function CategoryTag({ category, onChange, editMode }) {
  const cat = CATEGORIES[category] || CATEGORIES['其他'];
  const Icon = cat.icon;
  const handleClick = () => {
    if (!editMode) return;
    const i = CATEGORY_KEYS.indexOf(category);
    const next = CATEGORY_KEYS[(i + 1) % CATEGORY_KEYS.length];
    onChange(next);
  };
  return (
    <button
      onClick={handleClick}
      disabled={!editMode}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium leading-none shrink-0"
      style={{ background: cat.bg, color: cat.color }}
    >
      <Icon size={11} strokeWidth={2.2} />
      {category}
    </button>
  );
}

function buildMapsUrl(item) {
  // 用 location 欄位優先;沒有就用 title。附上「北海道」幫助 Google Maps 對到正確位置。
  const q = (item.location || item.title || '').trim();
  if (!q) return null;
  const needsHint = !/(北海道|札幌|小樽|富良野|美瑛|旭川|登別|新千歲|機場)/.test(q);
  const query = needsHint ? `${q} 北海道` : q;
  // dir/?api=1&destination=... 會用裝置目前位置作為起點
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}&travelmode=transit`;
}

function ItineraryItem({ item, onUpdate, onRemove, editMode, isLast }) {
  const cat = CATEGORIES[item.category] || CATEGORIES['其他'];
  const toggleDone = () => onUpdate({ ...item, done: !item.done });
  const mapsUrl = buildMapsUrl(item);
  const openMap = (e) => {
    e.stopPropagation();
    if (mapsUrl) window.open(mapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative flex gap-3 items-start">
      <div className="relative flex flex-col items-center shrink-0" style={{ width: 14 }}>
        <div className="w-3 h-3 rounded-full border-2 bg-white mt-1.5 relative z-10" style={{ borderColor: cat.dot }} />
        {!isLast && (
          <div className="absolute top-5 left-1/2 -translate-x-1/2 w-px bottom-[-22px] border-l border-dashed border-stone-200" />
        )}
      </div>

      <div className="w-12 shrink-0 text-sm tabular-nums text-stone-600 pt-0.5 font-medium tracking-tight">
        <EditableText value={item.time} onCommit={(v) => onUpdate({ ...item, time: v })} editMode={editMode} placeholder="00:00" />
      </div>

      <div className={`flex-1 min-w-0 pb-5 ${item.done && !editMode ? 'opacity-40' : ''}`}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <CategoryTag category={item.category} onChange={(c) => onUpdate({ ...item, category: c })} editMode={editMode} />
        </div>
        <div className={`text-stone-800 leading-snug ${item.done && !editMode ? 'line-through' : ''}`}>
          <EditableText value={item.title} onCommit={(v) => onUpdate({ ...item, title: v })} editMode={editMode} placeholder="景點 / 活動" />
        </div>
        {(item.note || editMode) && (
          <div className="text-xs text-stone-400 mt-0.5">
            <EditableText value={item.note} onCommit={(v) => onUpdate({ ...item, note: v })} editMode={editMode} placeholder="備註" />
          </div>
        )}
        {editMode && (
          <div className="text-xs text-stone-400 mt-1 flex items-center gap-1">
            <MapPin size={10} />
            <EditableText
              value={item.location}
              onCommit={(v) => onUpdate({ ...item, location: v })}
              editMode={editMode}
              placeholder="地圖位置(選填,預設用標題)"
              className="text-xs"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
        <button
          onClick={toggleDone}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            item.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300 text-stone-300 hover:border-stone-400'
          }`}
          aria-label={item.done ? '取消完成' : '標記完成'}
        >
          {item.done && <Check size={13} strokeWidth={3} />}
        </button>
        {mapsUrl && !editMode && (
          <button
            onClick={openMap}
            className="w-6 h-6 rounded-full border-2 border-sky-200 text-sky-600 hover:bg-sky-50 hover:border-sky-400 flex items-center justify-center transition-all"
            aria-label="開啟地圖導航"
            title="從現在位置導航過去"
          >
            <Navigation size={11} strokeWidth={2.2} />
          </button>
        )}
        {editMode && (
          <button onClick={onRemove} className="text-stone-300 hover:text-rose-500 p-1 -m-1" aria-label="刪除">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function DayContent({ day, dayIndex, totalDays, startDate, onUpdate, onAddDay, onRemoveDay, editMode, weather }) {
  const date = formatDateDM(startDate, dayIndex);
  const weekday = getWeekday(startDate, dayIndex);
  const doneCount = day.items.filter((i) => i.done).length;
  const total = day.items.length;

  // 算出當天日期(YYYY-MM-DD)用來查天氣
  // ⚠️ 不能用 toISOString(),那會強制轉成 UTC,在台灣時區會把日期偏移一天
  // 改用本地時區的年月日組合,確保 Day 1 = startDate 字面上的日期
  const dayDateISO = (() => {
    if (!startDate) return null;
    const d = new Date(startDate + 'T00:00:00');
    d.setDate(d.getDate() + dayIndex);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  })();
  const dayWeather = dayDateISO ? weather?.[dayDateISO] : null;

  const updateItem = (idx, newItem) => {
    const items = day.items.map((it, i) => (i === idx ? newItem : it));
    onUpdate({ ...day, items });
  };
  const removeItem = (idx) => onUpdate({ ...day, items: day.items.filter((_, i) => i !== idx) });
  const addItem = () => onUpdate({
    ...day,
    items: [...day.items, { id: newId(), time: '', title: '', note: '', category: '其他', done: false }],
  });

  const handleRemoveDay = () => {
    if (totalDays <= 1) return;
    if (window.confirm(`確定要刪除 Day ${dayIndex + 1}「${day.theme || '(無標題)'}」嗎?這天的記帳也會一起刪除。`)) {
      onRemoveDay?.();
    }
  };

  return (
    <div className="w-full">
      <div className="mb-5">
        <div className="flex items-baseline gap-3 mb-1 flex-wrap">
          <span className="text-3xl font-extralight tracking-tight text-stone-400 leading-none">Day {dayIndex + 1}</span>
          <span className="text-base font-light text-stone-500 tabular-nums tracking-wide">{date}</span>
          {weekday && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white bg-stone-500 tracking-tight">
              {weekday}
            </span>
          )}
          {/* 札幌天氣:有預報資料才顯示,超過 16 天的日子自然不顯示 */}
          {dayWeather && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs tabular-nums"
              style={{ background: 'var(--brand-primary-bg)', color: 'var(--brand-primary-dark)' }}
              title={`札幌 · ${dayWeather.label}`}
            >
              <span style={{ fontSize: '13px' }}>{dayWeather.icon}</span>
              {dayWeather.tempMin}°–{dayWeather.tempMax}°
            </span>
          )}
          <span className="ml-auto text-xs text-stone-400 tabular-nums">{doneCount}/{total} 完成</span>
        </div>
        <h2 className="text-xl font-medium text-stone-800 tracking-wide" style={{ fontFamily: '"Noto Serif TC", "Source Han Serif TC", serif' }}>
          <EditableText value={day.theme} onCommit={(v) => onUpdate({ ...day, theme: v })} editMode={editMode} placeholder="今日主題" />
        </h2>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
        {day.items.length === 0 ? (
          <div className="text-center text-sm text-stone-400 py-8">
            {editMode ? '點下方按鈕新增第一個景點' : '今天還沒安排行程'}
          </div>
        ) : (
          day.items.map((item, i) => (
            <ItineraryItem
              key={item.id}
              item={item}
              onUpdate={(newItem) => updateItem(i, newItem)}
              onRemove={() => removeItem(i)}
              editMode={editMode}
              isLast={i === day.items.length - 1}
            />
          ))
        )}
        {editMode && (
          <button
            onClick={addItem}
            className="w-full mt-3 py-3 rounded-xl text-sm font-medium text-white inline-flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 active:opacity-80"
            style={{ background: 'var(--brand-primary-dark)' }}
          >
            <Plus size={16} /> 新增景點
          </button>
        )}

        {/* 當日備註(原本「住宿」區塊的 stayNote 改用,放當天的特殊提醒,例如集合地點)
            stay/stayPhone 已移到「預訂」頁,這裡只保留通用備註 */}
        {(day.stayNote || editMode) && (
          <div className="mt-5 pt-4 border-t border-stone-100 flex items-start gap-2 text-xs text-stone-500 leading-relaxed">
            <Pencil size={11} className="mt-1 shrink-0 text-stone-400" />
            <div className="flex-1 min-w-0">
              {editMode ? (
                <EditableText
                  value={day.stayNote}
                  onCommit={(v) => onUpdate({ ...day, stayNote: v })}
                  editMode={editMode}
                  placeholder="當日備註(例如集合地點、特別提醒)"
                  multiline
                />
              ) : (
                <LinkifiedText text={day.stayNote} />
              )}
            </div>
          </div>
        )}
      </div>

      {editMode && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onAddDay}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-stone-700 bg-white border border-stone-200 hover:bg-stone-50 inline-flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> 新增一天
          </button>
          {totalDays > 1 && (
            <button
              onClick={handleRemoveDay}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-rose-600 bg-white border border-rose-100 hover:bg-rose-50 inline-flex items-center justify-center gap-1.5"
            >
              <Trash2 size={14} /> 刪除 Day {dayIndex + 1}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DayTabs({ days, selected, onSelect, startDate, todayIndex }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-day-tab="${selected}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selected]);

  return (
    <div ref={scrollRef} className="flex gap-1 overflow-x-auto px-4 py-2" style={{ scrollbarWidth: 'none' }}>
      {days.map((_, i) => {
        const active = i === selected;
        const isToday = i === todayIndex;
        return (
          <button
            key={i}
            data-day-tab={i}
            onClick={() => onSelect(i)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-center ${active ? 'text-white' : 'text-stone-500 hover:bg-stone-100'}`}
            style={active ? { background: 'var(--brand-primary-dark)' } : undefined}
          >
            <div className="text-xs font-medium leading-tight">
              Day {i + 1}
              {isToday && <span className="ml-1" style={{ color: active ? '#FFE0EA' : 'var(--brand-accent)' }}>•</span>}
            </div>
            <div className={`text-[10px] tabular-nums leading-tight mt-0.5 ${active ? 'opacity-70' : 'opacity-50'}`}>
              {formatDateDM(startDate, i)}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// 計算結算:共同支出對半分,看誰墊得多。回傳 { from, to, amount } 或 null。
function calcSettlement(expenses, people) {
  const [A, B] = people;
  let paidSharedA = 0;
  let paidSharedB = 0;
  let totalShared = 0;
  for (const e of expenses) {
    if (e.splitMode !== 'shared') continue;
    totalShared += e.amount;
    if (e.paidBy === A) paidSharedA += e.amount;
    else if (e.paidBy === B) paidSharedB += e.amount;
  }
  const eachShare = totalShared / 2;
  // 對 A 而言:墊出的 - 應分擔的;正數表示 A 多墊了
  const balanceA = paidSharedA - eachShare;
  // 取到整數日圓(避免顯示小數)
  const amt = Math.round(Math.abs(balanceA));
  if (amt === 0) return { settled: true, paidSharedA, paidSharedB, totalShared, eachShare };
  if (balanceA > 0) {
    // A 多墊 → B 還 A
    return { from: B, to: A, amount: amt, paidSharedA, paidSharedB, totalShared, eachShare };
  }
  return { from: A, to: B, amount: amt, paidSharedA, paidSharedB, totalShared, eachShare };
}

function PersonPill({ person, active, onClick, size = 'sm' }) {
  const isFirst = person === PEOPLE[0];
  const palette = isFirst
    ? { bg: '#FBE9DD', color: '#9A4A20', activeBg: '#D85A30' }
    : { bg: '#E8E2F5', color: '#5340A0', activeBg: '#7F6FCB' };
  const padding = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';
  return (
    <button
      onClick={onClick}
      className={`rounded-full font-medium inline-flex items-center gap-1 ${padding}`}
      style={{
        background: active ? palette.activeBg : palette.bg,
        color: active ? 'white' : palette.color,
      }}
    >
      <User size={size === 'lg' ? 13 : 11} strokeWidth={2.2} />
      {person}
    </button>
  );
}

function ExpenseView({ data, onAdd, onRemove, onUpdateFx }) {
  const [day, setDay] = useState(0);
  const [category, setCategory] = useState('餐點');
  const [paidBy, setPaidBy] = useState(PEOPLE[0]);
  const [splitMode, setSplitMode] = useState('shared');
  const [payMethod, setPayMethod] = useState('cash');
  const [currency, setCurrency] = useState('JPY'); // JPY 或 TWD
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  // 收據掃描相關狀態
  const [scanning, setScanning] = useState(false); // 正在辨識中
  const [scanError, setScanError] = useState(''); // 辨識失敗的錯誤訊息
  const fileInputRef = useRef(null);

  // 處理使用者選擇/拍照後的收據圖片
  const handleReceiptPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 清掉 input 的值,讓使用者下次可以選同一張(否則 onChange 不會觸發)
    e.target.value = '';

    setScanning(true);
    setScanError('');
    try {
      const result = await recognizeReceipt(file);
      // 把辨識結果填入表單(使用者還可以再修改後送出)
      if (result.total > 0) setAmount(String(result.total));
      if (result.category) setCategory(result.category);
      if (result.currency === 'TWD') setCurrency('TWD');
      else setCurrency('JPY');
      // 組備註:店家 · 品項1, 品項2
      const noteParts = [];
      if (result.store) noteParts.push(result.store);
      if (result.items.length > 0) noteParts.push(result.items.join('、'));
      if (noteParts.length > 0) setNote(noteParts.join(' · '));
    } catch (err) {
      setScanError(err.message || '辨識失敗,請手動輸入');
    } finally {
      setScanning(false);
    }
  };

  const people = data.people && data.people.length === 2 ? data.people : PEOPLE;
  const fxRate = data.fxRate || 0.22; // JPY → TWD 的比率(0.22 表示 1 日幣 ≈ 0.22 台幣)

  useEffect(() => {
    const ti = getDayIndex(data.trip.startDate);
    setDay(ti >= 0 && ti < data.days.length ? ti : 0);
  }, [data.trip.startDate, data.days.length]);

  // 把使用者輸入的金額換算成日幣(內部統一用日幣計算結算)
  // TWD 1000 / 0.22 = JPY 4545
  const previewJpy = (() => {
    const n = Number(amount);
    if (!n || n <= 0) return 0;
    return currency === 'TWD' ? Math.round(n / fxRate) : Math.round(n);
  })();

  const submit = () => {
    const n = Number(amount);
    if (!n || n <= 0) return;
    // 一律換算成日幣存進去,但保留原始幣別/金額/匯率作為顯示用
    const jpyAmount = currency === 'TWD' ? Math.round(n / fxRate) : Math.round(n);
    onAdd({
      id: newId(),
      dayIndex: day,
      category,
      amount: jpyAmount, // 內部以日幣計算
      note: note.trim(),
      createdAt: Date.now(),
      paidBy,
      splitMode,
      payMethod,
      currency,
      originalAmount: Math.round(n),
      fxAtEntry: fxRate, // 記下「記帳當下用的匯率」,以後即使總匯率改了,歷史紀錄不變
    });
    setAmount('');
    setNote('');
  };

  const grandTotal = data.expenses.reduce((s, e) => s + e.amount, 0);
  // 行前花費總額(dayIndex === -1)
  const preTripTotal = data.expenses.filter((e) => e.dayIndex === PRE_TRIP_INDEX).reduce((s, e) => s + e.amount, 0);
  const dayTotals = data.days.map((_, i) =>
    data.expenses.filter((e) => e.dayIndex === i).reduce((s, e) => s + e.amount, 0)
  );
  const catTotals = EXPENSE_CATEGORIES.reduce((acc, c) => {
    acc[c] = data.expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {});
  // 按付款方式分類加總(看每種付款方式總共花了多少,出國回來對帳用)
  const payTotals = PAY_METHOD_KEYS.reduce((acc, k) => {
    acc[k] = data.expenses.filter((e) => (e.payMethod || 'cash') === k).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {});
  const twdEstimate = Math.round(grandTotal * (data.fxRate || 0.22));

  // 各人總支出 / 共同 vs 個人 拆分
  const totalByPerson = people.map((p) => data.expenses.filter((e) => e.paidBy === p).reduce((s, e) => s + e.amount, 0));
  const sharedTotal = data.expenses.filter((e) => e.splitMode === 'shared').reduce((s, e) => s + e.amount, 0);
  const personalTotal = grandTotal - sharedTotal;
  const settlement = calcSettlement(data.expenses, people);

  return (
    <div className="w-full pb-32">
      {/* Add expense form */}
      <div className="mb-5 bg-white rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
        <div className="text-sm font-medium text-stone-700 mb-3">記一筆</div>

        <div className="flex gap-1 overflow-x-auto mb-3 pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setDay(PRE_TRIP_INDEX)}
            className={`shrink-0 px-2.5 py-1 rounded-md text-xs ${day === PRE_TRIP_INDEX ? 'text-white' : 'bg-stone-50 text-stone-500'}`}
            style={day === PRE_TRIP_INDEX ? { background: 'var(--brand-primary-dark)' } : undefined}
          >
            行前
          </button>
          {data.days.map((_, i) => (
            <button
              key={i}
              onClick={() => setDay(i)}
              className={`shrink-0 px-2.5 py-1 rounded-md text-xs ${day === i ? 'text-white' : 'bg-stone-50 text-stone-500'}`}
              style={day === i ? { background: 'var(--brand-primary-dark)' } : undefined}
            >
              Day {i + 1}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {EXPENSE_CATEGORIES.map((c) => {
            const cat = CATEGORIES[c];
            const active = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: active ? cat.color : cat.bg, color: active ? 'white' : cat.color }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* 誰付的 + 共同/個人 */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="bg-stone-50 rounded-lg p-2">
            <div className="text-[10px] text-stone-500 mb-1.5 px-1">誰付的</div>
            <div className="flex gap-1">
              {people.map((p) => (
                <PersonPill key={p} person={p} active={paidBy === p} onClick={() => setPaidBy(p)} />
              ))}
            </div>
          </div>
          <div className="bg-stone-50 rounded-lg p-2">
            <div className="text-[10px] text-stone-500 mb-1.5 px-1">分攤方式</div>
            <div className="flex gap-1">
              <button
                onClick={() => setSplitMode('shared')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                  splitMode === 'shared' ? 'text-white' : 'bg-white text-stone-500'
                }`}
                style={splitMode === 'shared' ? { background: 'var(--brand-primary-dark)' } : undefined}
              >
                <Users size={11} /> 共同
              </button>
              <button
                onClick={() => setSplitMode('personal')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                  splitMode === 'personal' ? 'text-white' : 'bg-white text-stone-500'
                }`}
                style={splitMode === 'personal' ? { background: 'var(--brand-primary-dark)' } : undefined}
              >
                <User size={11} /> 個人
              </button>
            </div>
          </div>
        </div>

        {/* 付款方式 */}
        <div className="mb-3 bg-stone-50 rounded-lg p-2">
          <div className="text-[10px] text-stone-500 mb-1.5 px-1">付款方式</div>
          <div className="flex gap-1.5 flex-wrap">
            {PAY_METHOD_KEYS.map((k) => {
              const pm = PAY_METHODS[k];
              const Icon = pm.icon;
              const active = payMethod === k;
              return (
                <button
                  key={k}
                  onClick={() => setPayMethod(k)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1"
                  style={{
                    background: active ? pm.color : 'white',
                    color: active ? 'white' : pm.color,
                  }}
                >
                  <Icon size={11} strokeWidth={2.4} />
                  {pm.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 金額輸入:可切 JPY/TWD,輸入 TWD 會即時顯示換算後的日幣 */}
        <div className="mb-3">
          <div className="flex items-stretch gap-2">
            <div className="flex bg-stone-50 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setCurrency('JPY')}
                className={`px-2.5 rounded-md text-xs font-medium ${currency === 'JPY' ? 'text-white' : 'text-stone-500'}`}
                style={currency === 'JPY' ? { background: 'var(--brand-primary-dark)' } : undefined}
              >
                ¥ JPY
              </button>
              <button
                onClick={() => setCurrency('TWD')}
                className={`px-2.5 rounded-md text-xs font-medium ${currency === 'TWD' ? 'text-white' : 'text-stone-500'}`}
                style={currency === 'TWD' ? { background: 'var(--brand-primary-dark)' } : undefined}
              >
                NT$ TWD
              </button>
            </div>
            <div className="flex items-center bg-stone-50 rounded-lg px-3 flex-1">
              <span className="text-stone-400 mr-1">{currency === 'TWD' ? 'NT$' : '¥'}</span>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="金額"
                className="bg-transparent py-2 flex-1 tabular-nums focus:outline-none min-w-0"
              />
            </div>
          </div>
          {currency === 'TWD' && previewJpy > 0 && (
            <div className="text-[10px] text-stone-400 mt-1.5 px-1 tabular-nums">
              ≈ ¥{previewJpy.toLocaleString()}(以匯率 {fxRate} 換算,結算用)
            </div>
          )}
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="備註(例如:六花亭、地下鐵 24h 票)"
          className="w-full bg-stone-50 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:bg-stone-100"
        />
        {/* 收據掃描:用 Gemini 自動填表單,使用者送出前還能再改 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleReceiptPick}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
          className="w-full py-2 rounded-lg text-sm font-medium mb-2 border border-dashed disabled:opacity-60 inline-flex items-center justify-center gap-1.5 transition-colors"
          style={{
            borderColor: 'var(--brand-accent)',
            background: 'var(--brand-accent-bg)',
            color: 'var(--brand-accent-dark)',
          }}
        >
          {scanning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              AI 辨識中,請稍候...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              拍收據自動填
            </>
          )}
        </button>
        {scanError && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-rose-50 text-rose-700 text-xs flex items-start gap-2">
            <span className="flex-1">{scanError}</span>
            <button onClick={() => setScanError('')} className="text-rose-400 hover:text-rose-600 shrink-0">
              <X size={12} />
            </button>
          </div>
        )}

        <button
          onClick={submit}
          disabled={!amount || Number(amount) <= 0}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:bg-stone-300 transition-colors"
          style={{
            background: (!amount || Number(amount) <= 0) ? undefined : 'var(--brand-primary-dark)',
          }}
        >
          記一筆 + {currency === 'TWD' ? 'NT$' : '¥'}{amount || 0}
        </button>
      </div>

      {/* Total summary */}
      <div className="mb-5 bg-white rounded-2xl p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
        <div className="text-xs text-stone-500 mb-1">旅程總花費</div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-light tabular-nums text-stone-800">¥{grandTotal.toLocaleString()}</span>
          <span className="text-sm text-stone-400 tabular-nums">≈ NT${twdEstimate.toLocaleString()}</span>
        </div>
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center gap-2 text-xs text-stone-500">
          <span>匯率 JPY → TWD</span>
          <input
            type="number"
            step="0.001"
            value={data.fxRate}
            onChange={(e) => onUpdateFx(Number(e.target.value) || 0.22)}
            className="w-16 px-2 py-0.5 bg-stone-50 rounded text-center tabular-nums"
          />
        </div>

        {grandTotal > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2.5" style={{ background: '#F1EFE8' }}>
              <div className="text-[10px] text-stone-500 inline-flex items-center gap-1">
                <Users size={10} /> 共同支出
              </div>
              <div className="text-sm font-medium tabular-nums text-stone-700 mt-0.5">¥{sharedTotal.toLocaleString()}</div>
            </div>
            <div className="rounded-lg p-2.5" style={{ background: '#F1EFE8' }}>
              <div className="text-[10px] text-stone-500 inline-flex items-center gap-1">
                <User size={10} /> 個人支出
              </div>
              <div className="text-sm font-medium tabular-nums text-stone-700 mt-0.5">¥{personalTotal.toLocaleString()}</div>
            </div>
          </div>
        )}

        {grandTotal > 0 && (
          <div className="mt-4 space-y-1.5">
            {EXPENSE_CATEGORIES.filter((c) => catTotals[c] > 0).map((c) => {
              const pct = (catTotals[c] / grandTotal) * 100;
              const cat = CATEGORIES[c];
              return (
                <div key={c} className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.dot }} />
                  <span className="text-stone-600 w-10">{c}</span>
                  <div className="flex-1 h-1 bg-stone-100 rounded overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${pct}%`, background: cat.dot }} />
                  </div>
                  <span className="text-stone-500 tabular-nums">¥{catTotals[c].toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 按付款方式統計:出國回來對帳一目了然 */}
        {grandTotal > 0 && (
          <div className="mt-4 pt-3 border-t border-stone-100">
            <div className="text-[10px] text-stone-500 mb-2">按付款方式</div>
            <div className="grid grid-cols-3 gap-2">
              {PAY_METHOD_KEYS.map((k) => {
                const pm = PAY_METHODS[k];
                const Icon = pm.icon;
                const amt = payTotals[k];
                return (
                  <div key={k} className="rounded-lg p-2" style={{ background: pm.bg }}>
                    <div className="text-[10px] inline-flex items-center gap-1" style={{ color: pm.color }}>
                      <Icon size={10} strokeWidth={2.4} /> {pm.label}
                    </div>
                    <div className="text-xs font-medium tabular-nums mt-0.5" style={{ color: pm.color }}>
                      ¥{amt.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Settlement card */}
      {data.expenses.length > 0 && (
        <div className="mb-5 bg-white rounded-2xl p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-1.5 text-sm font-medium text-stone-700 mb-3">
            <Scale size={14} />
            結算
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            {people.map((p, i) => (
              <div key={p} className="rounded-lg p-3" style={{ background: i === 0 ? '#FBE9DD' : '#E8E2F5' }}>
                <div className="text-[10px]" style={{ color: i === 0 ? '#9A4A20' : '#5340A0' }}>
                  {p} 已付
                </div>
                <div className="text-lg font-light tabular-nums mt-0.5" style={{ color: i === 0 ? '#9A4A20' : '#5340A0' }}>
                  ¥{totalByPerson[i].toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {sharedTotal === 0 ? (
            <div className="text-xs text-stone-400 text-center py-2">尚無共同支出,無需結算</div>
          ) : settlement.settled ? (
            <div className="text-center text-sm text-emerald-600 font-medium py-2 rounded-lg bg-emerald-50">
              共同支出已平攤,不用還
            </div>
          ) : (
            <div className="rounded-lg p-3" style={{ background: 'var(--brand-accent-bg)' }}>
              <div className="text-[10px] mb-1.5" style={{ color: 'var(--brand-accent-dark)' }}>應還金額</div>
              <div className="flex items-center justify-center gap-2 text-base font-medium text-stone-800 flex-wrap">
                <PersonPill person={settlement.from} active size="lg" />
                <ArrowRight size={16} style={{ color: 'var(--brand-accent)' }} />
                <PersonPill person={settlement.to} active size="lg" />
                <span className="tabular-nums ml-1">¥{settlement.amount.toLocaleString()}</span>
              </div>
              <div className="text-[10px] text-stone-500 mt-2 text-center">
                共同支出 ¥{settlement.totalShared.toLocaleString()} ÷ 2 = 每人 ¥{Math.round(settlement.eachShare).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expense list grouped by day (含行前獨立區塊) */}
      <div className="space-y-3">
        {(() => {
          // 把「行前」當成 dayIndex = -1 的特殊區塊,放在 Day 1 之前
          const preTripExps = data.expenses.filter((e) => e.dayIndex === PRE_TRIP_INDEX).sort((a, b) => b.createdAt - a.createdAt);

          // 渲染單一筆記帳的小函式(行前和 Day N 共用)
          const renderExpRow = (exp) => {
            const cat = CATEGORIES[exp.category];
            const isFirst = exp.paidBy === people[0];
            const personBg = isFirst ? '#FBE9DD' : '#E8E2F5';
            const personColor = isFirst ? '#9A4A20' : '#5340A0';
            const pm = PAY_METHODS[exp.payMethod || 'cash'];
            const PmIcon = pm.icon;
            const isTWD = exp.currency === 'TWD';
            return (
              <div key={exp.id} className="flex items-center gap-2 flex-wrap">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.dot }} />
                <span className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0" style={{ background: cat.bg, color: cat.color }}>
                  {exp.category}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 inline-flex items-center gap-0.5"
                  style={{ background: personBg, color: personColor }}
                >
                  <User size={9} strokeWidth={2.4} />
                  {exp.paidBy || people[0]}
                </span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 inline-flex items-center gap-0.5"
                  style={{ background: pm.bg, color: pm.color }}
                  title={pm.label}
                >
                  <PmIcon size={9} strokeWidth={2.4} />
                  {pm.label}
                </span>
                {exp.splitMode === 'shared' ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 inline-flex items-center gap-0.5 bg-stone-100 text-stone-600">
                    <Users size={9} strokeWidth={2.4} />
                    共同
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 bg-stone-50 text-stone-400">
                    個人
                  </span>
                )}
                <span className="text-sm text-stone-700 flex-1 min-w-0 truncate">{exp.note || '—'}</span>
                <div className="text-right shrink-0">
                  <div className="text-sm tabular-nums text-stone-700 font-medium">
                    {isTWD ? `NT$${(exp.originalAmount || 0).toLocaleString()}` : `¥${exp.amount.toLocaleString()}`}
                  </div>
                  {isTWD && (
                    <div className="text-[10px] text-stone-400 tabular-nums">≈ ¥{exp.amount.toLocaleString()}</div>
                  )}
                </div>
                <button onClick={() => onRemove(exp.id)} className="text-stone-300 hover:text-rose-500" aria-label="刪除">
                  <Trash2 size={12} />
                </button>
              </div>
            );
          };

          return (
            <>
              {/* 行前花費區塊(放最上面) */}
              {preTripExps.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border-2 border-dashed border-stone-200">
                  <div className="flex items-baseline justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                      <Plus size={13} className="text-stone-400" />
                      <span className="text-sm font-medium text-stone-700">行前</span>
                      <span className="text-[10px] text-stone-400">機票・住宿・KLOOK 等</span>
                    </div>
                    <span className="text-sm tabular-nums text-stone-600 font-medium">¥{preTripTotal.toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">{preTripExps.map(renderExpRow)}</div>
                </div>
              )}

              {/* Day 1 ~ Day N */}
              {data.days.map((_, di) => {
                const dayExps = data.expenses.filter((e) => e.dayIndex === di).sort((a, b) => b.createdAt - a.createdAt);
                if (dayExps.length === 0) return null;
                return (
                  <div key={di} className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
                    <div className="flex items-baseline justify-between mb-3">
                      <div>
                        <span className="text-sm font-medium text-stone-700">Day {di + 1}</span>
                        <span className="ml-2 text-xs text-stone-400 tabular-nums">{formatDateDM(data.trip.startDate, di)}</span>
                      </div>
                      <span className="text-sm tabular-nums text-stone-600 font-medium">¥{dayTotals[di].toLocaleString()}</span>
                    </div>
                    <div className="space-y-2">{dayExps.map(renderExpRow)}</div>
                  </div>
                );
              })}
            </>
          );
        })()}
        {data.expenses.length === 0 && (
          <div className="text-center text-sm text-stone-400 py-8">還沒有任何花費紀錄</div>
        )}
      </div>
    </div>
  );
}

// ================================================================
// PieChart 元件:純 SVG 繪製,不引入額外圖表套件
// ================================================================
// segments = [{ label, value, color }, ...]
// 自動處理 0 值(空圖示);若只有一筆,畫成整圓
// ================================================================
function PieChart({ segments, size = 160 }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 4;

  if (total <= 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="w-32 h-32 rounded-full border-4 border-dashed border-stone-200" />
      </div>
    );
  }

  // 過濾掉值為 0 的 segments
  const filtered = segments.filter((s) => s.value > 0);

  // 只有一個 segment → 直接畫整圓(SVG arc 在 360 度時會渲染失敗,所以特例處理)
  if (filtered.length === 1) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill={filtered[0].color} />
      </svg>
    );
  }

  // 多個 segment → 用 SVG path 畫扇形
  let cumulative = 0;
  const paths = filtered.map((seg, i) => {
    const startAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;
    cumulative += seg.value;
    const endAngle = (cumulative / total) * Math.PI * 2 - Math.PI / 2;

    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return <path key={i} d={d} fill={seg.color} />;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      {/* 中間挖空當 donut style,看起來更精緻 */}
      <circle cx={cx} cy={cy} r={radius * 0.5} fill="#fff" />
    </svg>
  );
}

// ================================================================
// AnalyticsView:分析頁
// ================================================================
// 兩個圓餅圖:按類別 / 按付款方式
// 篩選器:時間範圍(全部/行前/旅程中)、分攤類型(全部/共同/個人)、付款人(全部/各自)
// 響應式:手機上下排,sm: 以上左右排
// ================================================================
function AnalyticsView({ data }) {
  const [rangeFilter, setRangeFilter] = useState('all'); // all | pre | trip
  const [personFilter, setPersonFilter] = useState('all'); // all | 共同 | 靜宜 | 阿鳳

  const people = data.people && data.people.length === 2 ? data.people : PEOPLE;

  // 套用篩選條件
  const filteredExps = data.expenses.filter((e) => {
    // 時間範圍篩選
    if (rangeFilter === 'pre' && e.dayIndex !== PRE_TRIP_INDEX) return false;
    if (rangeFilter === 'trip' && e.dayIndex === PRE_TRIP_INDEX) return false;
    // 付款人/共同篩選
    if (personFilter === 'shared' && e.splitMode !== 'shared') return false;
    if (personFilter === people[0] && (e.paidBy !== people[0] || e.splitMode !== 'personal')) return false;
    if (personFilter === people[1] && (e.paidBy !== people[1] || e.splitMode !== 'personal')) return false;
    return true;
  });

  const total = filteredExps.reduce((s, e) => s + e.amount, 0);
  const twdEstimate = Math.round(total * (data.fxRate || 0.22));

  // 按類別分組
  const catSegments = EXPENSE_CATEGORIES.map((c) => ({
    label: c,
    value: filteredExps.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
    color: CATEGORIES[c].dot,
  })).filter((s) => s.value > 0).sort((a, b) => b.value - a.value);

  // 按付款方式分組
  const payMethodSegments = PAY_METHOD_KEYS.map((k) => ({
    label: PAY_METHODS[k].label,
    value: filteredExps.filter((e) => (e.payMethod || 'cash') === k).reduce((s, e) => s + e.amount, 0),
    color: PAY_METHODS[k].color,
    icon: PAY_METHODS[k].icon,
  })).filter((s) => s.value > 0).sort((a, b) => b.value - a.value);

  const rangeOptions = [
    { id: 'all', label: '全部' },
    { id: 'pre', label: '行前' },
    { id: 'trip', label: '旅程中' },
  ];
  const personOptions = [
    { id: 'all', label: '全部' },
    { id: 'shared', label: '共同' },
    { id: people[0], label: people[0] },
    { id: people[1], label: people[1] },
  ];

  return (
    <div className="pb-32 pt-2">
      {/* 總額卡片 */}
      <div className="mb-4 bg-white rounded-2xl p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
        <div className="text-xs text-stone-500 mb-1">總花費</div>
        <div className="text-3xl font-light tabular-nums text-stone-800">¥{total.toLocaleString()}</div>
        <div className="text-xs text-stone-400 mt-1 tabular-nums">≈ NT$ {twdEstimate.toLocaleString()}</div>
        {filteredExps.length === 0 && (
          <div className="text-xs text-stone-400 mt-3">目前篩選條件下沒有任何花費紀錄</div>
        )}
      </div>

      {/* 篩選器 */}
      <div className="mb-4 bg-white rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] space-y-3">
        <div>
          <div className="text-[10px] text-stone-500 mb-1.5 px-1">時間範圍</div>
          <div className="flex gap-1.5 flex-wrap">
            {rangeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setRangeFilter(opt.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  rangeFilter === opt.id ? 'text-white' : 'bg-stone-50 text-stone-500'
                }`}
                style={rangeFilter === opt.id ? { background: 'var(--brand-primary-dark)' } : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-stone-500 mb-1.5 px-1">付款對象</div>
          <div className="flex gap-1.5 flex-wrap">
            {personOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setPersonFilter(opt.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  personFilter === opt.id ? 'text-white' : 'bg-stone-50 text-stone-500'
                }`}
                style={personFilter === opt.id ? { background: 'var(--brand-primary-dark)' } : undefined}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 兩個圓餅圖:手機上下排、平板以上左右排 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 按類別 */}
        <div className="flex-1 bg-white rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
          <div className="text-sm font-medium text-stone-700 mb-3">按類別</div>
          {catSegments.length > 0 ? (
            <>
              <div className="flex justify-center mb-3">
                <PieChart segments={catSegments} size={180} />
              </div>
              <div className="space-y-1.5">
                {catSegments.map((seg) => {
                  const pct = (seg.value / total) * 100;
                  return (
                    <div key={seg.label} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
                      <span className="text-stone-700 w-10">{seg.label}</span>
                      <span className="text-stone-400 tabular-nums w-10">{pct.toFixed(0)}%</span>
                      <span className="text-stone-600 tabular-nums flex-1 text-right">¥{seg.value.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center text-xs text-stone-400 py-8">沒有資料</div>
          )}
        </div>

        {/* 按付款方式 */}
        <div className="flex-1 bg-white rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
          <div className="text-sm font-medium text-stone-700 mb-3">按付款方式</div>
          {payMethodSegments.length > 0 ? (
            <>
              <div className="flex justify-center mb-3">
                <PieChart segments={payMethodSegments} size={180} />
              </div>
              <div className="space-y-1.5">
                {payMethodSegments.map((seg) => {
                  const pct = (seg.value / total) * 100;
                  const Icon = seg.icon;
                  return (
                    <div key={seg.label} className="flex items-center gap-2 text-xs">
                      <span
                        className="w-5 h-5 rounded-full shrink-0 inline-flex items-center justify-center"
                        style={{ background: seg.color }}
                      >
                        <Icon size={10} strokeWidth={2.4} color="white" />
                      </span>
                      <span className="text-stone-700 w-12">{seg.label}</span>
                      <span className="text-stone-400 tabular-nums w-10">{pct.toFixed(0)}%</span>
                      <span className="text-stone-600 tabular-nums flex-1 text-right">¥{seg.value.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center text-xs text-stone-400 py-8">沒有資料</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
// BookingView:預訂頁(機票 + 住宿)
// ================================================================
// 兩個子分頁:Flights / Hotels
// 編輯模式才能新增/刪除,讀模式只顯示
// 每張卡用機票存根樣式呈現,讓使用者一眼就看到關鍵資訊
// ================================================================
function BookingView({ data, onUpdate, editMode }) {
  const [tab, setTab] = useState('flights'); // flights | hotels
  const bookings = data.bookings || { flights: [], hotels: [] };

  // 機票:新增空白筆,使用者直接編輯欄位
  const addFlight = () => {
    const newFlight = {
      id: newId(),
      airline: '',
      flightNo: '',
      from: '',
      to: '',
      departTime: '',
      arriveTime: '',
      amount: 0,
      currency: 'TWD',
    };
    onUpdate({ ...bookings, flights: [...bookings.flights, newFlight] });
  };
  const updateFlight = (id, patch) => {
    onUpdate({
      ...bookings,
      flights: bookings.flights.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    });
  };
  const removeFlight = (id) => {
    if (!window.confirm('確定要刪除這筆機票紀錄嗎?')) return;
    onUpdate({ ...bookings, flights: bookings.flights.filter((f) => f.id !== id) });
  };

  // 住宿
  const addHotel = () => {
    const newHotel = {
      id: newId(),
      name: '',
      checkIn: '',
      checkOut: '',
      amount: 0,
      currency: 'TWD',
    };
    onUpdate({ ...bookings, hotels: [...bookings.hotels, newHotel] });
  };
  const updateHotel = (id, patch) => {
    onUpdate({
      ...bookings,
      hotels: bookings.hotels.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    });
  };
  const removeHotel = (id) => {
    if (!window.confirm('確定要刪除這筆住宿紀錄嗎?')) return;
    onUpdate({ ...bookings, hotels: bookings.hotels.filter((h) => h.id !== id) });
  };

  return (
    <div className="pb-32 pt-2">
      {/* 子分頁切換 */}
      <div className="mb-4 bg-white rounded-2xl p-1 flex shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
        <button
          onClick={() => setTab('flights')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
            tab === 'flights' ? 'text-white' : 'text-stone-500'
          }`}
          style={tab === 'flights' ? { background: 'var(--brand-primary-dark)' } : undefined}
        >
          <Plane size={14} /> 機票
        </button>
        <button
          onClick={() => setTab('hotels')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
            tab === 'hotels' ? 'text-white' : 'text-stone-500'
          }`}
          style={tab === 'hotels' ? { background: 'var(--brand-primary-dark)' } : undefined}
        >
          <Hotel size={14} /> 住宿
        </button>
      </div>

      {/* 機票區塊 */}
      {tab === 'flights' && (
        <div className="space-y-3">
          {bookings.flights.length === 0 && (
            <div className="text-center text-sm text-stone-400 py-8 bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
              還沒有機票紀錄{editMode ? '——點下方新增' : ',進入編輯模式新增'}
            </div>
          )}
          {bookings.flights.map((flight) => (
            <FlightCard
              key={flight.id}
              flight={flight}
              editMode={editMode}
              onUpdate={(patch) => updateFlight(flight.id, patch)}
              onRemove={() => removeFlight(flight.id)}
            />
          ))}
          {editMode && (
            <button
              onClick={addFlight}
              className="w-full py-3 rounded-2xl text-sm font-medium text-white inline-flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 active:opacity-80"
              style={{ background: 'var(--brand-primary-dark)' }}
            >
              <Plus size={16} /> 新增機票
            </button>
          )}
        </div>
      )}

      {/* 住宿區塊 */}
      {tab === 'hotels' && (
        <div className="space-y-3">
          {bookings.hotels.length === 0 && (
            <div className="text-center text-sm text-stone-400 py-8 bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
              還沒有住宿紀錄{editMode ? '——點下方新增' : ',進入編輯模式新增'}
            </div>
          )}
          {bookings.hotels.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              editMode={editMode}
              onUpdate={(patch) => updateHotel(hotel.id, patch)}
              onRemove={() => removeHotel(hotel.id)}
            />
          ))}
          {editMode && (
            <button
              onClick={addHotel}
              className="w-full py-3 rounded-2xl text-sm font-medium text-white inline-flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 active:opacity-80"
              style={{ background: 'var(--brand-primary-dark)' }}
            >
              <Plus size={16} /> 新增住宿
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// 機票卡片:以「登機證」樣式呈現,讓 from → to 視覺最顯眼
function FlightCard({ flight, editMode, onUpdate, onRemove }) {
  const currencySymbol = flight.currency === 'JPY' ? '¥' : 'NT$';
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
      {/* 上方:航空公司 + 航班 + 刪除 */}
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'var(--brand-primary-bg)' }}>
        <Plane size={14} style={{ color: 'var(--brand-primary-dark)' }} />
        <EditableText
          value={flight.airline}
          onCommit={(v) => onUpdate({ airline: v })}
          editMode={editMode}
          placeholder="航空公司"
          className="text-xs font-medium"
          style={{ color: 'var(--brand-primary-dark)' }}
        />
        <span className="text-stone-300">·</span>
        <EditableText
          value={flight.flightNo}
          onCommit={(v) => onUpdate({ flightNo: v })}
          editMode={editMode}
          placeholder="航班"
          className="text-xs font-medium tracking-wide"
          style={{ color: 'var(--brand-primary-dark)' }}
        />
        {editMode && (
          <button onClick={onRemove} className="ml-auto text-stone-300 hover:text-rose-500" aria-label="刪除">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* 中間:起飛 → 抵達 */}
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-stone-400 mb-0.5">出發</div>
          <EditableText
            value={flight.from}
            onCommit={(v) => onUpdate({ from: v })}
            editMode={editMode}
            placeholder="TPE 桃園"
            className="text-base font-medium text-stone-800 block"
          />
          <div className="text-sm text-stone-500 tabular-nums mt-0.5">
            <EditableText
              value={flight.departTime}
              onCommit={(v) => onUpdate({ departTime: v })}
              editMode={editMode}
              placeholder="05/30 18:30"
            />
          </div>
        </div>
        <ArrowRight size={18} style={{ color: 'var(--brand-primary)' }} />
        <div className="flex-1 min-w-0 text-right">
          <div className="text-[10px] text-stone-400 mb-0.5">抵達</div>
          <EditableText
            value={flight.to}
            onCommit={(v) => onUpdate({ to: v })}
            editMode={editMode}
            placeholder="CTS 新千歲"
            className="text-base font-medium text-stone-800 block"
          />
          <div className="text-sm text-stone-500 tabular-nums mt-0.5">
            <EditableText
              value={flight.arriveTime}
              onCommit={(v) => onUpdate({ arriveTime: v })}
              editMode={editMode}
              placeholder="05/30 23:00"
            />
          </div>
        </div>
      </div>

      {/* 底部:金額 */}
      <div className="border-t border-dashed border-stone-200 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-stone-400">金額</span>
        {editMode ? (
          <div className="flex items-center gap-1.5">
            <select
              value={flight.currency}
              onChange={(e) => onUpdate({ currency: e.target.value })}
              className="text-xs bg-stone-50 rounded px-1 py-0.5"
            >
              <option value="TWD">NT$</option>
              <option value="JPY">¥</option>
            </select>
            <input
              type="number"
              value={flight.amount || ''}
              onChange={(e) => onUpdate({ amount: Number(e.target.value) || 0 })}
              placeholder="金額"
              className="w-24 text-right text-sm bg-stone-50 rounded px-2 py-1 tabular-nums focus:outline-none"
            />
          </div>
        ) : (
          <span className="text-sm font-medium tabular-nums text-stone-800">
            {currencySymbol} {(flight.amount || 0).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}

// 住宿卡片
function HotelCard({ hotel, editMode, onUpdate, onRemove }) {
  const currencySymbol = hotel.currency === 'JPY' ? '¥' : 'NT$';
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: 'var(--brand-accent-bg)' }}>
        <Hotel size={14} style={{ color: 'var(--brand-accent-dark)' }} />
        <EditableText
          value={hotel.name}
          onCommit={(v) => onUpdate({ name: v })}
          editMode={editMode}
          placeholder="飯店名稱"
          className="text-sm font-medium flex-1"
          style={{ color: 'var(--brand-accent-dark)' }}
        />
        {editMode && (
          <button onClick={onRemove} className="text-stone-300 hover:text-rose-500 shrink-0" aria-label="刪除">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      <div className="px-4 py-4 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-stone-400 mb-0.5 flex items-center gap-1">
            <Calendar size={9} /> 入住
          </div>
          <EditableText
            value={hotel.checkIn}
            onCommit={(v) => onUpdate({ checkIn: v })}
            editMode={editMode}
            placeholder="2026-05-30"
            className="text-sm text-stone-700 tabular-nums"
          />
        </div>
        <ArrowRight size={16} style={{ color: 'var(--brand-accent)' }} />
        <div className="flex-1 min-w-0 text-right">
          <div className="text-[10px] text-stone-400 mb-0.5 flex items-center gap-1 justify-end">
            <Calendar size={9} /> 退住
          </div>
          <EditableText
            value={hotel.checkOut}
            onCommit={(v) => onUpdate({ checkOut: v })}
            editMode={editMode}
            placeholder="2026-06-01"
            className="text-sm text-stone-700 tabular-nums"
          />
        </div>
      </div>

      <div className="border-t border-dashed border-stone-200 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[10px] text-stone-400">金額</span>
        {editMode ? (
          <div className="flex items-center gap-1.5">
            <select
              value={hotel.currency}
              onChange={(e) => onUpdate({ currency: e.target.value })}
              className="text-xs bg-stone-50 rounded px-1 py-0.5"
            >
              <option value="TWD">NT$</option>
              <option value="JPY">¥</option>
            </select>
            <input
              type="number"
              value={hotel.amount || ''}
              onChange={(e) => onUpdate({ amount: Number(e.target.value) || 0 })}
              placeholder="金額"
              className="w-24 text-right text-sm bg-stone-50 rounded px-2 py-1 tabular-nums focus:outline-none"
            />
          </div>
        ) : (
          <span className="text-sm font-medium tabular-nums text-stone-800">
            {currencySymbol} {(hotel.amount || 0).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}


function StatusPill({ status }) {
  // 用 inline style 配合主題色,因為 Tailwind 沒有對應的 brand-* class
  const map = {
    loading: { icon: <Cloud size={12} />, text: '連線中', style: { color: '#9CA3AF' } },
    saving: { icon: <Cloud size={12} className="animate-pulse" />, text: '儲存中', style: { color: 'var(--brand-accent-dark)' } },
    synced: { icon: <Cloud size={12} />, text: '已同步', style: { color: 'var(--brand-primary-dark)' } },
    offline: { icon: <CloudOff size={12} />, text: '離線', style: { color: '#E11D48' } },
  };
  const s = map[status] || map.loading;
  return (
    <div className="text-xs flex items-center gap-1 shrink-0" style={s.style}>
      {s.icon}
      {s.text}
    </div>
  );
}

function BottomNav({ view, onChange, editMode, onToggleEdit }) {
  const tabs = [
    { id: 'itinerary', label: '行程', icon: MapPinned },
    { id: 'booking', label: '預訂', icon: Plane },
    { id: 'expense', label: '記帳', icon: Wallet },
    { id: 'analytics', label: '分析', icon: PieChartIcon },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200/70 bg-white/95 backdrop-blur-md">
      <div className="max-w-xl mx-auto flex items-center">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = view === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 ${active ? 'text-stone-900' : 'text-stone-400'}`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span className="text-[11px] font-medium">{t.label}</span>
            </button>
          );
        })}
        <button onClick={onToggleEdit} className="px-4 py-2.5 text-stone-400 hover:text-stone-700" aria-label="切換編輯模式">
          {editMode ? <Eye size={18} /> : <Pencil size={16} />}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [view, setView] = useState('itinerary');
  const [selectedDay, setSelectedDay] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [status, setStatus] = useState('loading');
  const [, forceTick] = useState(0);
  // 天氣預報 by date(YYYY-MM-DD → { tempMax, tempMin, label, icon })
  const [weather, setWeather] = useState({});
  const saveTimer = useRef(null);

  // 抓札幌天氣預報(startDate 變動時重抓)
  useEffect(() => {
    if (!data.trip.startDate || !data.days?.length) return;
    let cancelled = false;
    fetchSapporoForecast(data.trip.startDate, data.days.length).then((result) => {
      if (!cancelled) setWeather(result);
    });
    return () => { cancelled = true; };
  }, [data.trip.startDate, data.days.length]);

  useEffect(() => {
    if (document.getElementById('hk-fonts')) return;
    const link = document.createElement('link');
    link.id = 'hk-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;500;700&display=swap';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const sync = () => setEditMode(window.location.hash === '#edit');
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const loadData = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData(migrateData(JSON.parse(raw)));
      }
    } catch (e) {
      // 本地讀取失敗,等雲端來
    }
  };

  // 啟動時先載本地快取(秒開、避免空白),雲端來了會自動覆蓋
  useEffect(() => { loadData(); }, []);

  // ===== Firebase 即時同步 =====
  // 用 ref 來分辨「資料變動是雲端推來的」還是「自己改的」,避免迴圈寫入
  const skipNextSave = useRef(false);
  const isInitialLoad = useRef(true);

  // 監聽 Firestore 的房間資料,任何一邊有改動就會自動推到所有裝置
  useEffect(() => {
    const docRef = doc(db, 'rooms', ROOM_ID);
    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const cloudData = snap.data();
          skipNextSave.current = true; // 標記:這次更新是雲端推來的,不要再回寫雲端
          setData(migrateData(cloudData));
          setStatus('synced');
          // 同時更新本地快取,離線時還能看
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData)); } catch (e) {}
        } else if (isInitialLoad.current) {
          // 雲端還沒有資料(第一次使用),把預設資料/本地資料推上去當初始值
          const initial = (() => {
            try {
              const raw = localStorage.getItem(STORAGE_KEY);
              return raw ? migrateData(JSON.parse(raw)) : DEFAULT_DATA;
            } catch (e) {
              return DEFAULT_DATA;
            }
          })();
          setDoc(docRef, { ...initial, lastUpdate: Date.now() })
            .then(() => setStatus('synced'))
            .catch(() => setStatus('offline'));
        }
        isInitialLoad.current = false;
      },
      (err) => {
        console.error('Firestore 監聽錯誤:', err);
        setStatus('offline');
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const ti = getDayIndex(data.trip.startDate);
    if (ti >= 0 && ti < data.days.length) setSelectedDay(ti);
  }, [data.trip.startDate, data.days.length]);

  useEffect(() => {
    const id = setInterval(() => forceTick((x) => x + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const saveData = (next) => {
    const updated = { ...next, lastUpdate: Date.now() };
    setData(updated);

    // 如果這次的 setData 是被雲端推來觸發的,不要回寫(避免迴圈)
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    setStatus('saving');
    // 同步寫入本地快取(即時)+ debounce 寫入雲端(400ms 內多次編輯合併成一次寫入)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch (e) {}
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      setDoc(doc(db, 'rooms', ROOM_ID), updated)
        .then(() => setStatus('synced'))
        .catch((err) => {
          console.error('Firestore 寫入失敗:', err);
          setStatus('offline');
        });
    }, 400);
  };

  const updateTrip = (newTrip) => saveData({ ...data, trip: newTrip });
  const updateDay = (i, newDay) => {
    const days = data.days.map((d, idx) => (idx === i ? newDay : d));
    saveData({ ...data, days });
  };
  const addDay = () => {
    const newDay = {
      theme: '新的一天',
      stay: '',
      stayPhone: '',
      stayNote: '',
      items: [],
    };
    saveData({ ...data, days: [...data.days, newDay] });
    setSelectedDay(data.days.length); // 跳到新加的那天
  };
  const removeDay = (i) => {
    if (data.days.length <= 1) return; // 至少留一天
    const days = data.days.filter((_, idx) => idx !== i);
    // 也要把該天的記帳刪除——但行前花費(dayIndex = -1)不受影響
    const expenses = data.expenses
      .filter((e) => e.dayIndex !== i)
      .map((e) => {
        // 只調整正數 dayIndex,行前的 -1 保持不變
        if (e.dayIndex > i) return { ...e, dayIndex: e.dayIndex - 1 };
        return e;
      });
    saveData({ ...data, days, expenses });
    setSelectedDay(Math.min(i, days.length - 1));
  };
  // 記帳用 Firestore 原子操作:直接 append/remove,不會覆蓋其他裝置的同時寫入
  const addExpense = (exp) => {
    // 立刻更新本地畫面(樂觀更新),不等雲端
    const newExpenses = [...data.expenses, exp];
    setData({ ...data, expenses: newExpenses, lastUpdate: Date.now() });
    setStatus('saving');
    // 用 arrayUnion 直接 append 這一筆到雲端,不會碰其他人加的紀錄
    skipNextSave.current = true; // 等下 onSnapshot 推回來時不要再回寫
    updateDoc(doc(db, 'rooms', ROOM_ID), {
      expenses: arrayUnion(exp),
      lastUpdate: Date.now(),
    })
      .then(() => setStatus('synced'))
      .catch((err) => {
        console.error('addExpense 寫入失敗:', err);
        setStatus('offline');
      });
  };
  const removeExpense = (id) => {
    const target = data.expenses.find((e) => e.id === id);
    if (!target) return;
    const newExpenses = data.expenses.filter((e) => e.id !== id);
    setData({ ...data, expenses: newExpenses, lastUpdate: Date.now() });
    setStatus('saving');
    skipNextSave.current = true;
    updateDoc(doc(db, 'rooms', ROOM_ID), {
      expenses: arrayRemove(target),
      lastUpdate: Date.now(),
    })
      .then(() => setStatus('synced'))
      .catch((err) => {
        console.error('removeExpense 寫入失敗:', err);
        setStatus('offline');
      });
  };
  const updateFx = (rate) => saveData({ ...data, fxRate: rate });
  // 預訂(機票/住宿)的更新都走整份覆蓋,因為一次編輯一筆且資料量小,不需 arrayUnion
  const updateBookings = (newBookings) => saveData({ ...data, bookings: newBookings });

  const todayIndex = getDayIndex(data.trip.startDate);
  const inTrip = todayIndex >= 0 && todayIndex < data.days.length;

  const toggleEdit = () => {
    window.location.hash = editMode ? '' : 'edit';
    if (editMode) window.history.replaceState(null, '', window.location.pathname + window.location.search);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  return (
    <div
      className="min-h-screen w-full pb-32"
      style={{
        background:
          'radial-gradient(circle at 20% -10%, #F4E8DA 0%, transparent 50%), radial-gradient(circle at 80% 110%, #E8E3F0 0%, transparent 50%), #F5F2EB',
        fontFamily: '"Noto Sans TC", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div className="max-w-xl mx-auto px-5 pt-7">
        <header className="mb-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] tracking-[0.25em] text-stone-400 mb-1.5 uppercase">旅 の 手 帳</div>
              <h1 className="text-2xl font-medium tracking-wide text-stone-800 leading-tight" style={{ fontFamily: '"Noto Serif TC", "Source Han Serif TC", serif' }}>
                <EditableText value={data.trip.title} onCommit={(v) => updateTrip({ ...data.trip, title: v })} editMode={editMode} placeholder="旅行標題" />
              </h1>
              <div className="text-sm text-stone-500 mt-1.5 flex items-center gap-2 flex-wrap">
                <span className="tabular-nums tracking-wide">
                  <EditableText value={data.trip.startDate} onCommit={(v) => updateTrip({ ...data.trip, startDate: v })} editMode={editMode} placeholder="YYYY-MM-DD" />
                  {!editMode && data.trip.endDate && ` – ${data.trip.endDate.slice(5).replace('-', '.')}`}
                </span>
                {data.trip.subtitle && <span className="text-stone-400">·</span>}
                <span>
                  <EditableText value={data.trip.subtitle} onCommit={(v) => updateTrip({ ...data.trip, subtitle: v })} editMode={editMode} placeholder="同行人" />
                </span>
              </div>
            </div>
            <StatusPill status={status} />
          </div>

          {inTrip && !editMode && (
            <div className="mt-3 text-xs tracking-[0.15em] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'var(--brand-accent-bg)', color: 'var(--brand-accent-dark)' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--brand-accent)' }} />
              旅程進行中 · Day {todayIndex + 1}
            </div>
          )}
        </header>

        {view === 'itinerary' && (
          <DayContent
            day={data.days[selectedDay]}
            dayIndex={selectedDay}
            totalDays={data.days.length}
            startDate={data.trip.startDate}
            onUpdate={(d) => updateDay(selectedDay, d)}
            onAddDay={addDay}
            onRemoveDay={() => removeDay(selectedDay)}
            editMode={editMode}
            weather={weather}
          />
        )}
        {view === 'expense' && (
          <ExpenseView data={data} onAdd={addExpense} onRemove={removeExpense} onUpdateFx={updateFx} />
        )}
        {view === 'analytics' && (
          <AnalyticsView data={data} />
        )}
        {view === 'booking' && (
          <BookingView data={data} onUpdate={updateBookings} editMode={editMode} />
        )}

        <footer className="mt-10 text-center text-[11px] text-stone-400">
          最後更新 {relativeTime(data.lastUpdate)}
        </footer>
      </div>

      {view === 'itinerary' && (
        <div className="fixed bottom-[58px] left-0 right-0 z-20 border-t border-stone-200/70 bg-white/90 backdrop-blur-md">
          <div className="max-w-xl mx-auto">
            <DayTabs days={data.days} selected={selectedDay} onSelect={setSelectedDay} startDate={data.trip.startDate} todayIndex={todayIndex} />
          </div>
        </div>
      )}

      <BottomNav view={view} onChange={setView} editMode={editMode} onToggleEdit={toggleEdit} />
    </div>
  );
}
