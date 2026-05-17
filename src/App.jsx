import { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Pencil, Eye, Cloud, CloudOff, MapPin, Phone, Check,
  MapPinned, Wallet, Camera, Utensils, ShoppingBag, Train, Bed, MoreHorizontal,
  Navigation, Users, User, ArrowRight, Scale
} from 'lucide-react';

const STORAGE_KEY = 'hokkaido_spring_2026_v2';
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
  lastUpdate: Date.now(),
};

function migrateExpense(e) {
  return {
    id: e.id || newId(),
    dayIndex: e.dayIndex ?? 0,
    category: e.category || '其他',
    amount: Number(e.amount) || 0,
    note: e.note || '',
    createdAt: e.createdAt || Date.now(),
    paidBy: e.paidBy || PEOPLE[0],
    splitMode: e.splitMode || 'shared',
  };
}

function migrateData(raw) {
  if (raw?.trip && raw?.days && Array.isArray(raw?.expenses)) {
    return {
      ...raw,
      people: raw.people && raw.people.length === 2 ? raw.people : [...PEOPLE],
      expenses: raw.expenses.map(migrateExpense),
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

function EditableText({ value, onCommit, editMode, placeholder, className = '', multiline = false }) {
  const [draft, setDraft] = useState(value || '');
  useEffect(() => { setDraft(value || ''); }, [value]);

  if (!editMode) {
    return value ? (
      <span className={className}>{value}</span>
    ) : placeholder ? (
      <span className={`${className} opacity-30`}>{placeholder}</span>
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
    />
  ) : (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      placeholder={placeholder}
      className={baseCls}
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

function DayContent({ day, dayIndex, totalDays, startDate, onUpdate, onAddDay, onRemoveDay, editMode }) {
  const date = formatDateDM(startDate, dayIndex);
  const weekday = getWeekday(startDate, dayIndex);
  const doneCount = day.items.filter((i) => i.done).length;
  const total = day.items.length;

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
    <div>
      <div className="mb-5">
        <div className="flex items-baseline gap-3 mb-1 flex-wrap">
          <span className="text-3xl font-extralight tracking-tight text-stone-400 leading-none">Day {dayIndex + 1}</span>
          <span className="text-base font-light text-stone-500 tabular-nums tracking-wide">{date}</span>
          {weekday && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium text-white bg-stone-500 tracking-tight">
              {weekday}
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
            className="w-full mt-3 py-3 rounded-xl text-sm font-medium text-white bg-stone-700 hover:bg-stone-800 active:bg-stone-900 inline-flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> 新增景點
          </button>
        )}

        <div className="mt-5 pt-4 border-t border-stone-100 flex items-start gap-2 text-sm text-stone-600">
          <MapPin size={14} className="mt-0.5 shrink-0 text-stone-400" />
          <div className="flex-1 min-w-0">
            <EditableText value={day.stay} onCommit={(v) => onUpdate({ ...day, stay: v })} editMode={editMode} placeholder="今晚住宿" />
            {(day.stayPhone || editMode) && (
              <div className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                <Phone size={10} />
                <EditableText value={day.stayPhone} onCommit={(v) => onUpdate({ ...day, stayPhone: v })} editMode={editMode} placeholder="飯店電話" />
              </div>
            )}
            {(day.stayNote || editMode) && (
              <div className="text-xs text-stone-500 mt-1.5 leading-relaxed">
                {editMode ? (
                  <EditableText
                    value={day.stayNote}
                    onCommit={(v) => onUpdate({ ...day, stayNote: v })}
                    editMode={editMode}
                    placeholder="飯店介紹或網址(選填)"
                    multiline
                  />
                ) : (
                  <LinkifiedText text={day.stayNote} />
                )}
              </div>
            )}
          </div>
        </div>
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
            className={`shrink-0 px-3 py-1.5 rounded-lg text-center ${active ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'}`}
          >
            <div className="text-xs font-medium leading-tight">
              Day {i + 1}
              {isToday && <span className={`ml-1 ${active ? 'text-amber-300' : 'text-amber-500'}`}>•</span>}
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
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const people = data.people && data.people.length === 2 ? data.people : PEOPLE;

  useEffect(() => {
    const ti = getDayIndex(data.trip.startDate);
    setDay(ti >= 0 && ti < data.days.length ? ti : 0);
  }, [data.trip.startDate, data.days.length]);

  const submit = () => {
    const n = Number(amount);
    if (!n || n <= 0) return;
    onAdd({
      id: newId(),
      dayIndex: day,
      category,
      amount: n,
      note: note.trim(),
      createdAt: Date.now(),
      paidBy,
      splitMode,
    });
    setAmount('');
    setNote('');
  };

  const grandTotal = data.expenses.reduce((s, e) => s + e.amount, 0);
  const dayTotals = data.days.map((_, i) =>
    data.expenses.filter((e) => e.dayIndex === i).reduce((s, e) => s + e.amount, 0)
  );
  const catTotals = EXPENSE_CATEGORIES.reduce((acc, c) => {
    acc[c] = data.expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {});
  const twdEstimate = Math.round(grandTotal * (data.fxRate || 0.22));

  // 各人總支出 / 共同 vs 個人 拆分
  const totalByPerson = people.map((p) => data.expenses.filter((e) => e.paidBy === p).reduce((s, e) => s + e.amount, 0));
  const sharedTotal = data.expenses.filter((e) => e.splitMode === 'shared').reduce((s, e) => s + e.amount, 0);
  const personalTotal = grandTotal - sharedTotal;
  const settlement = calcSettlement(data.expenses, people);

  return (
    <div>
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
            <div className="rounded-lg p-3" style={{ background: '#FEF7E7' }}>
              <div className="text-[10px] text-amber-700 mb-1.5">應還金額</div>
              <div className="flex items-center justify-center gap-2 text-base font-medium text-stone-800 flex-wrap">
                <PersonPill person={settlement.from} active size="lg" />
                <ArrowRight size={16} className="text-amber-600" />
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

      {/* Add expense form */}
      <div className="mb-5 bg-white rounded-2xl p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
        <div className="text-sm font-medium text-stone-700 mb-3">記一筆</div>

        <div className="flex gap-1 overflow-x-auto mb-3 pb-1" style={{ scrollbarWidth: 'none' }}>
          {data.days.map((_, i) => (
            <button
              key={i}
              onClick={() => setDay(i)}
              className={`shrink-0 px-2.5 py-1 rounded-md text-xs ${day === i ? 'bg-stone-800 text-white' : 'bg-stone-50 text-stone-500'}`}
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
                  splitMode === 'shared' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500'
                }`}
              >
                <Users size={11} /> 共同
              </button>
              <button
                onClick={() => setSplitMode('personal')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${
                  splitMode === 'personal' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500'
                }`}
              >
                <User size={11} /> 個人
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center bg-stone-50 rounded-lg px-3 mb-3">
          <span className="text-stone-400 mr-1">¥</span>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="金額"
            className="bg-transparent py-2 flex-1 tabular-nums focus:outline-none"
          />
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="備註(例如:六花亭、地下鐵 24h 票)"
          className="w-full bg-stone-50 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:bg-stone-100"
        />
        <button
          onClick={submit}
          disabled={!amount || Number(amount) <= 0}
          className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-stone-800 hover:bg-stone-900 active:bg-black disabled:bg-stone-300"
        >
          記一筆 + ¥{amount || 0}
        </button>
      </div>

      {/* Expense list grouped by day */}
      <div className="space-y-3">
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
              <div className="space-y-2">
                {dayExps.map((exp) => {
                  const cat = CATEGORIES[exp.category];
                  const isFirst = exp.paidBy === people[0];
                  const personBg = isFirst ? '#FBE9DD' : '#E8E2F5';
                  const personColor = isFirst ? '#9A4A20' : '#5340A0';
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
                      <span className="text-sm tabular-nums text-stone-700 font-medium shrink-0">¥{exp.amount.toLocaleString()}</span>
                      <button onClick={() => onRemove(exp.id)} className="text-stone-300 hover:text-rose-500" aria-label="刪除">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {data.expenses.length === 0 && (
          <div className="text-center text-sm text-stone-400 py-8">還沒有任何花費紀錄</div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status, editMode }) {
  if (!editMode) {
    return (
      <div className="text-xs text-stone-400 flex items-center gap-1 shrink-0">
        <Cloud size={12} />
        即時同步
      </div>
    );
  }
  const map = {
    loading: { icon: <Cloud size={12} />, text: '載入中', cls: 'text-stone-400' },
    saving: { icon: <Cloud size={12} className="animate-pulse" />, text: '儲存中', cls: 'text-amber-600' },
    synced: { icon: <Cloud size={12} />, text: '已同步', cls: 'text-emerald-600' },
    offline: { icon: <CloudOff size={12} />, text: '離線', cls: 'text-rose-500' },
  };
  const s = map[status] || map.loading;
  return (
    <div className={`text-xs flex items-center gap-1 shrink-0 ${s.cls}`}>
      {s.icon}
      {s.text}
    </div>
  );
}

function BottomNav({ view, onChange, editMode, onToggleEdit }) {
  const tabs = [
    { id: 'itinerary', label: '行程', icon: MapPinned },
    { id: 'expense', label: '記帳', icon: Wallet },
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
  const saveTimer = useRef(null);

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
      setStatus('synced');
    } catch (e) {
      setStatus('synced');
    }
  };

  useEffect(() => { loadData(); }, []);

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
    setStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setStatus('synced');
      } catch (e) {
        setStatus('offline');
      }
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
    // 也要把該天的記帳挪走或刪除——這裡選擇刪除該天的記帳
    const expenses = data.expenses
      .filter((e) => e.dayIndex !== i)
      .map((e) => ({ ...e, dayIndex: e.dayIndex > i ? e.dayIndex - 1 : e.dayIndex }));
    saveData({ ...data, days, expenses });
    setSelectedDay(Math.min(i, days.length - 1));
  };
  const addExpense = (exp) => saveData({ ...data, expenses: [...data.expenses, exp] });
  const removeExpense = (id) => saveData({ ...data, expenses: data.expenses.filter((e) => e.id !== id) });
  const updateFx = (rate) => saveData({ ...data, fxRate: rate });

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
            <StatusPill status={status} editMode={editMode} />
          </div>

          {inTrip && !editMode && (
            <div className="mt-3 text-xs tracking-[0.15em] text-amber-700 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: '#FAEEDA' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
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
          />
        )}
        {view === 'expense' && (
          <ExpenseView data={data} onAdd={addExpense} onRemove={removeExpense} onUpdateFx={updateFx} />
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
