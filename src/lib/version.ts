export const APP_VERSION = '1.3.0';
export const APP_BUILD = '20261108';

export interface ChangelogItem {
  version: string;
  date: string;
  title: string;
  highlights: string[];
}

export const APP_CHANGELOG: ChangelogItem[] = [
  {
    version: '1.3.0',
    date: '2026-11-08',
    title: 'Universal 1-Tap Entry, Contextual Recording & Guided Onboarding',
    highlights: [
      'Universal Floating Action Button (FAB "+") mengambang di pojok layar: catat transaksi instan dengan 1 tap dari tab mana pun.',
      'Tombol Catat Langsung di Tab Daily Spend: catat pengeluaran hari ini secara kontekstual tanpa perlu pindah ke tab lain.',
      'Tombol Catat Transaksi di Tab Monthly: catat transaksi dan rencanakan target pengeluaran bulanan dalam satu tempat.',
      'Panduan Cepat Memulai (Onboarding Guide) interaktif 3 langkah ramah pemula untuk akun dengan 0 transaksi.',
      'Tombol unduh APK cerdas di topbar website (otomatis disembunyikan saat aplikasi dibuka di APK/iOS).',
      'Penyempurnaan label navigasi tab "Transactions" untuk kejelasan arsitektur informasi.',
    ],
  },
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
