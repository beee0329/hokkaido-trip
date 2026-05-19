// ================================================================
// Gemini Vision API:收據辨識
// ================================================================
// 用 Google Gemini 2.5 Flash 把收據照片辨識成結構化資料
// (店家、品項、金額、類別)。
//
// 安全性備註(for reviewer):
// 此 API key 在 Google AI Studio 設定為「免費方案」(Free Tier),
// 無綁定信用卡,意即即使被濫用最差情況是被擋下而不會產生費用。
// 因為本專案僅供兩人共用、無公開推廣,流量極低,故直接內嵌於前端。
// 如未來流量上升或需更高安全性,可改走後端代理(如 Vercel Edge Function)。
//
// 防呆機制(2026/05/19 新增):
// 1. 圖片超過 4MB 或單邊 > 2048px 自動壓縮,避免 timeout / internal error
// 2. 5xx 錯誤自動重試 2 次,指數退避(1.5s → 3s)
// 3. 錯誤訊息翻成中文且帶下一步建議
// ================================================================

const GEMINI_API_KEY = 'AIzaSyBhSKX1HL5vbHbcwx7McCtoKkfE0rjg-V0';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// 壓縮參數:Gemini Vision 在 4MB 以下、單邊 2048px 內最穩定
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB
const MAX_IMAGE_DIMENSION = 2048; // 單邊最大像素
const JPEG_QUALITY = 0.85; // 壓縮品質(0.85 視覺幾乎無損但檔案小很多)

// 重試參數
const MAX_RETRIES = 2; // 失敗最多再試 2 次(總共最多 3 次嘗試)
const RETRY_DELAY_MS = 1500; // 第一次重試間隔,之後翻倍

// 給模型的提示詞:固定格式回傳 JSON,方便程式 parse
const RECEIPT_PROMPT = `你是日本旅遊記帳助手,請辨識這張收據照片。

請回傳 JSON 格式,範例:
{
  "store": "店家名稱(若無法辨識則填空字串)",
  "items": ["品項簡述1", "品項簡述2"],
  "total": 1234,
  "currency": "JPY",
  "category": "餐點"
}

規則:
1. category 必須從以下選一個最貼切的:餐點、交通、住宿、購物、景點、其他
2. items 最多 4 項,每項用簡短中文描述(可意譯日文品名,例如「おにぎり」→「飯糰」)
3. total 必須是數字(以收據上「合計」/「総額」/「Total」為準,含稅)
4. 若辨識不出任何金額,total 填 0
5. currency 若收據是日幣寫 "JPY",台幣寫 "TWD",其他幣別也照其代號
6. 只回傳 JSON,不要包 markdown 也不要任何說明文字`;

/**
 * 把 File 物件轉成 Gemini API 需要的 base64 格式
 * 過程中會做必要的壓縮(縮小尺寸 + 重新編碼 JPEG)
 * @param {File} file - 使用者上傳的圖片檔
 * @returns {Promise<{mimeType: string, data: string}>}
 */
async function fileToInlineData(file) {
  // 小檔案直接讀,跳過壓縮以節省時間
  if (file.size < MAX_IMAGE_BYTES && !needsResize(file)) {
    return readAsBase64(file);
  }
  // 大檔案或非 jpg/png 都走壓縮路徑
  return compressImage(file);
}

/**
 * 簡單判斷檔案是否可能需要縮小(從檔名快速排除明顯不用壓的格式)
 * @param {File} file
 * @returns {boolean}
 */
function needsResize(file) {
  // HEIC / HEIF(iPhone 原生格式)Gemini 不直接支援,必須轉成 jpeg
  const lower = (file.name || '').toLowerCase();
  return lower.endsWith('.heic') || lower.endsWith('.heif');
}

/**
 * 純讀檔成 base64,不壓縮
 * @param {File} file
 * @returns {Promise<{mimeType: string, data: string}>}
 */
function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      const mimeType = dataUrl.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
      resolve({ mimeType, data: base64 });
    };
    reader.onerror = () => reject(new Error('讀取圖片失敗'));
    reader.readAsDataURL(file);
  });
}

/**
 * 透過 Canvas 縮小圖片並重新編碼成 JPEG
 * 處理 HEIC iPhone 格式 / 過大圖片 / 過大像素的情況
 * @param {File} file
 * @returns {Promise<{mimeType: string, data: string}>}
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // 算出縮小後的尺寸(維持長寬比)
        let { width, height } = img;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        // 用 Canvas 重新繪製
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('無法處理圖片格式'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        // 輸出成 JPEG base64
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        const base64 = dataUrl.split(',')[1];
        resolve({ mimeType: 'image/jpeg', data: base64 });
      };
      img.onerror = () => reject(new Error('無法載入圖片(可能是不支援的格式)'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('讀取圖片失敗'));
    reader.readAsDataURL(file);
  });
}

/**
 * 把 HTTP 狀態碼或 Google 錯誤訊息翻成使用者看得懂的中文
 * @param {number} status
 * @param {string} message - Google 回傳的原始錯誤訊息
 * @returns {string}
 */
function friendlyError(status, message) {
  const lower = (message || '').toLowerCase();
  if (status === 429 || lower.includes('quota')) {
    return '今日辨識次數已達上限,請明天再試或手動輸入';
  }
  if (status >= 500 || lower.includes('internal error')) {
    return '辨識服務暫時忙碌,請稍後再試一次';
  }
  if (status === 400 && lower.includes('image')) {
    return '這張圖片無法辨識,試試光線更好或更清晰的照片';
  }
  if (status === 403) {
    return '辨識服務未授權,請聯絡開發者';
  }
  // 其他未知錯誤
  return '辨識失敗,請手動輸入金額';
}

/**
 * 暫停指定毫秒
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 呼叫 Gemini API,內建重試機制
 * @param {object} inlineData - { mimeType, data }
 * @returns {Promise<object>} - parsed JSON 結果
 */
async function callGeminiWithRetry(inlineData) {
  let lastError = null;

  // 最多嘗試 MAX_RETRIES + 1 次(初次嘗試 + 重試次數)
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // 指數退避:第 1 次重試等 1.5 秒,第 2 次等 3 秒
      await sleep(RETRY_DELAY_MS * attempt);
    }

    let response;
    try {
      response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: RECEIPT_PROMPT },
                { inlineData },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });
    } catch (networkError) {
      // 網路錯誤(沒網路、CORS 等):值得重試一次
      lastError = new Error('網路連線異常,請檢查網路後再試');
      continue;
    }

    // 5xx 錯誤代表 Google 後端暫時性問題,值得重試
    if (response.status >= 500) {
      const body = await response.json().catch(() => ({}));
      const msg = body?.error?.message || `HTTP ${response.status}`;
      lastError = new Error(friendlyError(response.status, msg));
      continue; // 重試
    }

    // 4xx 錯誤是請求本身的問題,重試也沒用,直接報錯
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const msg = body?.error?.message || `HTTP ${response.status}`;
      throw new Error(friendlyError(response.status, msg));
    }

    // 成功:解析回應
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      // 內容過濾、空回應等情況——這也算暫時性,可以重試
      lastError = new Error('AI 沒有回傳結果,請再試一次');
      continue;
    }

    try {
      return JSON.parse(text);
    } catch {
      // JSON 格式異常——也可能下次就好了,重試
      lastError = new Error('AI 回傳格式異常,請再試一次');
      continue;
    }
  }

  // 重試耗盡仍失敗
  throw lastError || new Error('辨識失敗,請手動輸入');
}

/**
 * 辨識收據圖片,回傳結構化資料
 * @param {File} imageFile - 收據照片(jpg / png / heic 等)
 * @returns {Promise<{store:string, items:string[], total:number, currency:string, category:string}>}
 * @throws {Error} 重試耗盡後仍失敗,訊息已翻成中文
 */
export async function recognizeReceipt(imageFile) {
  if (!imageFile) throw new Error('沒有提供圖片');

  // 1. 圖片預處理(過大則壓縮)
  const inlineData = await fileToInlineData(imageFile);

  // 2. 呼叫 Gemini API(內建重試)
  const parsed = await callGeminiWithRetry(inlineData);

  // 3. 補完欄位、加保護避免欄位缺失導致下游壞掉
  return {
    store: typeof parsed.store === 'string' ? parsed.store : '',
    items: Array.isArray(parsed.items) ? parsed.items.slice(0, 4).map(String) : [],
    total: Number(parsed.total) || 0,
    currency: ['JPY', 'TWD', 'USD', 'EUR'].includes(parsed.currency) ? parsed.currency : 'JPY',
    category: ['餐點', '交通', '住宿', '購物', '景點', '其他'].includes(parsed.category) ? parsed.category : '其他',
  };
}
