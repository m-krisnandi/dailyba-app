const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'dailyba.db');
console.log('[Clean Mock Data] Connecting to database at:', DB_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const mockTxIds = new Set([
  'tx_inc_1', 'tx_sav_1', 'tx_rent_1', 'tx_fam_1', 'tx_vps_1',
  'tx_mob_1', 'tx_food_1', 'tx_train_1', 'tx_laundry_1', 'tx_shop_1'
]);
const mockInvIds = new Set(['inv_1', 'inv_2', 'inv_3', 'inv_4']);
const mockBillIds = new Set(['rec_rent', 'rec_vps', 'rec_mobile', 'rec_family']);

try {
  const users = db.prepare('SELECT id, email FROM users').all();
  console.log(`[Clean Mock Data] Found ${users.length} registered user(s).`);

  const records = db.prepare('SELECT user_id, data_json FROM user_data').all();
  let cleanedCount = 0;

  for (const record of records) {
    let data;
    try {
      data = JSON.parse(record.data_json);
    } catch {
      continue;
    }

    const initialTxCount = (data.transactions || []).length;
    const initialInvCount = (data.investments || []).length;
    const initialBillCount = (data.recurringBills || []).length;

    data.transactions = (data.transactions || []).filter((tx) => !mockTxIds.has(tx.id));
    data.investments = (data.investments || []).filter((inv) => !mockInvIds.has(inv.id));
    data.recurringBills = (data.recurringBills || []).filter((bill) => !mockBillIds.has(bill.id));

    db.prepare('UPDATE user_data SET data_json = ? WHERE user_id = ?').run(
      JSON.stringify(data),
      record.user_id
    );

    cleanedCount++;
    console.log(
      `[Clean Mock Data] User ${record.user_id}: TXs ${initialTxCount} -> ${data.transactions.length}, Invs ${initialInvCount} -> ${data.investments.length}, Bills ${initialBillCount} -> ${data.recurringBills.length}`
    );
  }

  console.log(`[Clean Mock Data] Successfully cleaned mock data for ${cleanedCount} user profile(s).`);
} catch (err) {
  console.error('[Clean Mock Data] Error:', err.message);
  process.exit(1);
}
