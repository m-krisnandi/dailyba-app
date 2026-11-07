export const APP_VERSION = '1.2.0';
export const APP_BUILD = '20261107';

export interface ChangelogItem {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export const APP_CHANGELOG: ChangelogItem[] = [
  {
    version: '1.2.0',
    date: '2026-11-07',
    title: 'Monthly Budgeting, Edit Transactions & Performance Optimization',
    highlights: [
      'Fitur Perencanaan & Target Pengeluaran Bulanan (Monthly Budget & Spending Plan) dengan tracking batas budget dan alokasi per kategori.',
      'Kemampuan Edit Transaksi lengkap (bukan hanya hapus) di Quick Entry, Daily Spend, dan Tabungan.',
      'Navigasi Pemilih Bulan cepat 1 baris yang hemat tempat dengan Quick-Jump 12 bulan dan Year Stepper.',
      'Perbaikan akurasi target rupiah murni (mencegah desimal drift 4.000.000 menjadi 4.000.046).',
      'Optimasi transisi Dark/Light mode instan tanpa lag untuk HP Xiaomi/MIUI.',
      'Ukuran APK dipangkas drastis (kembali ringan ~5-6 MB) berkat pembersihan rekursif cache build.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-11-06',
    title: 'Cloud Vault Sync & Authentication',
    highlights: [
      'Sinkronisasi otomatis multi-perangkat via Dailyba Cloud Vault.',
      'Penyempurnaan layout tab mobile 2 baris yang ramah jempol.',
      'Dukungan multi-mata uang JPY, IDR, USD, MMK dengan kurs live.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-11-05',
    title: 'Dailyba Initial Release',
    highlights: [
      'Metodologi pencatatan keuangan harian cerdas (Smart Quick Entry).',
      'Ringkasan pengeluaran harian, bulanan, dan tahunan dengan grafik modern.',
      'Pelacak aset investasi dan portofolio kekayaan bersih.',
    ],
  },
];
