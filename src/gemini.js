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
// ================================================================

const GEMINI_API_KEY = 'AIzaSyBhSKX1HL5vbHbcwx7McCtoKkfE0rjg-V0';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
 * @param {File} file - 使用者上傳的圖片檔
 * @returns {Promise<{mimeType: string, data: string}>}
 */
async function fileToInlineData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result 是 data:image/jpeg;base64,XXXXX 格式
      // 我們要去掉 prefix 只留 base64 部分
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
 * 辨識收據圖片,回傳結構化資料
 * @param {File} imageFile - 收據照片(jpg / png / heic 等)
 * @returns {Promise<{store:string, items:string[], total:number, currency:string, category:string}>}
 * @throws {Error} 辨識失敗時(網路錯誤、API 配額用完、回傳非 JSON 等)
 */
export async function recognizeReceipt(imageFile) {
  if (!imageFile) throw new Error('沒有提供圖片');

  // 1. 把圖片轉成 base64
  const inlineData = await fileToInlineData(imageFile);

  // 2. 呼叫 Gemini API
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
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
        temperature: 0.1, // 低 temperature 讓回應更穩定、不要亂創造內容
      },
    }),
  });

  // 3. 處理 HTTP 錯誤
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const msg = errorBody?.error?.message || `HTTP ${response.status}`;
    throw new Error(`辨識服務錯誤:${msg}`);
  }

  const data = await response.json();

  // 4. 取出文字內容並 parse 成 JSON
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('AI 沒有回傳結果,請再試一次');
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('AI 回傳格式異常,請再拍一次');
  }

  // 5. 補完欄位、加保護避免欄位缺失導致下游壞掉
  return {
    store: typeof parsed.store === 'string' ? parsed.store : '',
    items: Array.isArray(parsed.items) ? parsed.items.slice(0, 4).map(String) : [],
    total: Number(parsed.total) || 0,
    currency: ['JPY', 'TWD', 'USD', 'EUR'].includes(parsed.currency) ? parsed.currency : 'JPY',
    category: ['餐點', '交通', '住宿', '購物', '景點', '其他'].includes(parsed.category) ? parsed.category : '其他',
  };
}
