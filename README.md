# Dashboard Produksi - Kopi Nglurah ☕

Aplikasi web dashboard untuk petani Kopi Nglurah yang berfungsi untuk estimasi jadwal panen, pencatatan data real lapangan, dan visualisasi statistik produksi.

## 🚀 Fitur Utama

### 1. 🧮 Kalkulator Estimasi (Max-Plus)

- **Prediksi Jadwal**: Menghitung tanggal selesai tahapan produksi (Sortasi, Fermentasi, Penjemuran, Roasting, Pengemasan) berdasarkan tanggal mulai, metode (Full Wash/Honey/Natural), dan kondisi cuaca.
- **Estimasi Rendemen**: Memberikan perkiraan hasil bubuk (kg) dari berat cherry (panen).
- **Grafik Estimasi**: Visualisasi perbandingan Input Panen vs Estimasi Hasil.
- **Export**: Cetak PDF dan Kirim Laporan via WhatsApp.

### 2. 📝 Input Data Real

- Input data aktual dari lapangan untuk arsip.
- Mencatat detail tahapan tanggal yang sebenarnya terjadi.
- Integrasi database Cloud Firestore.

### 3. 📊 Riwayat & Statistik

- **Tabel Riwayat**: Menampilkan semua data panen yang tersimpan.
- **Detail View**: Melihat detail data per panen, termasuk grafik perbandingan Panen vs Hasil Bubuk.
- **Statistik Metode**: Grafik Donut Chart untuk melihat frekuensi metode (Full Wash vs Honey vs Natural).

### 4. 🌙 UI Modern & Dark Mode

- Desain responsif dan minimalis.
- Mendukung Dark Mode (Toggle di Header).

## 🛠️ Teknologi yang Digunakan

- **Frontend**: HTML5, CSS3, JavaScript (ES6 Modules).
- **Backend/Database**: Google Firebase Firestore.
- **Libraries**:
  - [Chart.js](https://www.chartjs.org/) - Untuk visualisasi grafik.
  - [jsPDF](https://github.com/parallax/jsPDF) & [AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) - Untuk generate laporan PDF.
  - [RemixIcon](https://remixicon.com/) - Untuk ikon UI.

## 📂 Struktur Project

```
/
├── index.html       # Halaman Utama (Dashboard & Kalkulator)
├── history.html     # Halaman Riwayat Data
├── login.html       # Halaman Login
├── landing.html     # Halaman Landing Page
├── css/
│   └── style.css    # Stylesheet Utama
└── js/
    ├── main.js      # Logic Utama Aplikasi
    ├── auth.js      # Autentikasi Firebase
    └── modules/
        ├── database.js    # Konfigurasi & Fungsi Firestore
        ├── calculator.js  # Algoritma Hitung Jadwal
        └── ui-helper.js   # Helper Chart, PDF, & Formatting
```

## 🚀 Cara Menjalankan Project

1.  **Clone Repository** atau download source code.
2.  Buka terminal di folder project.
3.  **Install Dependencies**:
    ```bash
    npm install
    ```
4.  **Buat File .env**:
    Copy file `.env.example` (jika ada) atau buat file `.env` baru dan isi konfigurasi Firebase:
    ```env
    VITE_FIREBASE_API_KEY=...
    VITE_FIREBASE_AUTH_DOMAIN=...
    ...
    ```
5.  **Jalankan Server**:
    ```bash
    npm run dev
    ```
6.  Buka URL yang muncul di terminal (biasanya `http://localhost:5173`).

## 🔐 Akun Demo

Silakan login menggunakan akun Google atau Email yang terdaftar di Firebase Auth project ini.

---

_Dibuat untuk membantu petani Desa Nglurah dalam manajemen produksi kopi._
