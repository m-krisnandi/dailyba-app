/**
 * Multilingual Expense Categorizer for Dailyba
 * Maps merchant names and descriptions into Dailyba ExpenseCategory keys.
 * Supports Indonesian, Japanese, and English.
 */

const CATEGORY_RULES = [
  {
    category: 'food_drinks',
    patterns: [
      /\b(rm|rumah\s*makan|warung|resto|restaurant|cafe|coffee|kopi|salero|padang|soto|bakso|mie|ayam|bento|ramen|sushi|izakaya|shokudo|dining|food|drink|bakery|roti|tea|boba|starbucks|mcdonald|kfc|burger|pizza|dunkin|hokben|jco|gofood|grabfood|shopeefood)\b/i,
      /\b(indomaret|alfamart|superindo|hero|hypermart|familymart|7-eleven|seven-eleven|sevel|lawson|ministop|seiyu|aeon|life|maruetsu|supermarket|grocery|groceries|pasar)\b/i,
      /(食堂|居酒屋|カフェ|珈琲|ラーメン|寿司|定食|レストラン|弁当|スーパー|コンビニ|ファミリーマート|セブン[-ー]?イレブン|ローソン|飲食店|パン屋)/
    ]
  },
  {
    category: 'laundry',
    patterns: [
      /\b(laundry|laundromat|cuci|dry\s*clean|coin\s*laundry|sentaku|wash|washers)\b/i,
      /(コインランドリー|クリーニング|洗濯)/
    ]
  },
  {
    category: 'train',
    patterns: [
      /\b(kereta|kai|mrt|lrt|krl|commuter|train|subway|metro|densha|transit|suica|pasmo|icoca|station|stasiun|jr\s*(east|west|central)?)\b/i,
      /(電車|地下鉄|メトロ|駅|乗車券|切符|定期券|JR)/
    ]
  },
  {
    category: 'ride',
    patterns: [
      /\b(gojek|goride|gocar|grab|grabride|grabcar|uber|lyft|taxi|taksi|bluebird|ojol|maxim|inDrive)\b/i,
      /(タクシー|配車)/
    ]
  },
  {
    category: 'shopping',
    patterns: [
      /\b(uniqlo|gu|zara|h&m|amazon|shopee|tokopedia|lazada|bukalapak|rakuten|daiso|seria|donki|don\s*quijote|bic\s*camera|yodobashi|shop|store|fuku|clothes|shoes|sepatu|kaimono|mall|boutique)\b/i,
      /(買い物|ショッピング|服|靴|衣料|本屋|書店|家電)/
    ]
  },
  {
    category: 'vps',
    patterns: [
      /\b(vps|cloud|server|aws|amazon\s*web\s*services|google\s*cloud|gcp|azure|linode|akamai|digitalocean|vultr|hetzner|ovh|cloudflare|vercel|netlify|github|gitlab|namecheap|godaddy|domain|hosting)\b/i,
      /(サーバー|クラウド|ホスティング)/
    ]
  },
  {
    category: 'mobile',
    patterns: [
      /\b(telkomsel|indosat|xl\s*axiata|smartfren|tri|byu|docomo|au|softbank|ahamo|povo|linemo|rakuten\s*mobile|pulsa|kuota|data|sim|wifi|indihome|biznet|firstmedia|internet)\b/i,
      /(携帯|通信|スマホ|インターネット)/
    ]
  },
  {
    category: 'rent',
    patterns: [
      /\b(rent|sewa|kos|kosan|kontrakan|yachin|housing|apartment|apartemen|asrama|dorm|ryou)\b/i,
      /(家賃|寮|賃貸)/
    ]
  },
  {
    category: 'family',
    patterns: [
      /\b(family|keluarga|ortu|orang\s*tua|ibu|ayah|mama|papa|shiokuri|kirim\s*uang)\b/i,
      /(仕送り|家族)/
    ]
  },
  {
    category: 'gifts',
    patterns: [
      /\b(gift|kado|hadiah|traktir|donasi|sedekah|zakat|infaq|kifu|donation|oiwai|kondangan)\b/i,
      /(お祝い|プレゼント|ギフト|寄付)/
    ]
  }
];

/**
 * Predicts the category of an expense based on merchant name, subject, and notes.
 *
 * @param {string} text - text to analyze
 * @returns {string} Category key (e.g. 'food_drinks', 'laundry', 'shopping', etc.)
 */
function categorizeTransaction(text) {
  if (!text) return 'others';
  const clean = String(text).trim();

  for (const rule of CATEGORY_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(clean)) {
        return rule.category;
      }
    }
  }

  return 'others';
}

module.exports = {
  categorizeTransaction
};
