// ==========================================
// MAIN.JS - REFACTORED & FIXED
// ==========================================

import { hitungMaxPlus } from "./modules/calculator.js";
import { simpanData, ambilRiwayat } from "./modules/database.js";
import { 
    showToast, 
    renderFrequencyChart, 
    renderHarvestChart,
    generatePDF, 
    formatDate 
} from './modules/ui-helper.js';

// Global State
let globalData = null; 
window.cachedHistory = []; // Tetap di window agar bisa diakses inline onclick

// --- A. INISIALISASI ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 1. Set Default Date Inputs
    const tglInputs = document.querySelectorAll('input[type="date"]');
    const today = new Date().toISOString().split('T')[0];
    tglInputs.forEach(el => {
        if (!el.value) el.value = today;
    });

    // 2. Auto Load History jika di halaman history
    if (window.location.pathname.includes('history.html') || document.getElementById('tabelHistory')) {
        window.loadHistoryData();
    }

    // 3. Load Theme
    if(localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        const icon = document.getElementById('themeIcon');
        if(icon) icon.className = 'ri-sun-line';
    }
}

// ==========================================
// B. NAVIGASI MENU
// ==========================================

window.bukaMode = function(mode) {
    const menu = document.getElementById('menuSection');
    const estimasi = document.getElementById('estimasiSection');
    const real = document.getElementById('realSection');

    if(menu) menu.classList.add('hidden');
    
    if(mode === 'estimasi' && estimasi) {
        estimasi.classList.remove('hidden');
    } else if (real) {
        real.classList.remove('hidden');
    }
};

window.kembaliKeMenu = function() {
    document.getElementById('estimasiSection')?.classList.add('hidden');
    document.getElementById('realSection')?.classList.add('hidden');
    document.getElementById('menuSection')?.classList.remove('hidden');
    
    // Reset wizard
    document.getElementById('hasilEstimasi')?.classList.add('hidden');
    window.showStep(1);
};

window.showStep = function(step) {
    const s1 = document.getElementById('wizard-step-1');
    const s2 = document.getElementById('wizard-step-2');
    if(s1 && s2) {
        s1.classList.toggle('hidden', step !== 1);
        s2.classList.toggle('hidden', step !== 2);
    }
};

// ==========================================
// C. LOGIKA ESTIMASI
// ==========================================

window.hitungJadwal = function() {
    const jumlahPanen = document.getElementById("panen").value;
    if (!jumlahPanen || jumlahPanen <= 0) return showToast("Isi jumlah panen dengan benar!", "error");

    const input = {
        namaKelompok: document.getElementById("nama_kelompok")?.value || "Anonim",
        jumlah: parseInt(jumlahPanen),
        metode: document.getElementById("metode").value,
        cuaca: document.getElementById("cuaca").value,
        alat: document.getElementById("alat").value,
        tglStart: document.getElementById("tgl_start_produksi").value
    };

    const hasil = hitungMaxPlus(input);
    globalData = { input, output: hasil, jadwal: hasil.jadwal };

    // Render Tabel Jadwal
    const tbody = document.querySelector("#tabelJadwal tbody");
    if (tbody) {
        tbody.innerHTML = hasil.jadwal.map(r => `
            <tr>
                <td>${r.tahap}</td>
                <td>${formatDate(r.mulai)}</td>
                <td>${formatDate(r.selesai)}</td>
                <td>${r.durasi} Hari</td>
                <td><i class="ri-checkbox-circle-line"></i></td>
            </tr>
        `).join('');
    }

    const ringkasan = document.getElementById("ringkasanOutput");
    if(ringkasan) ringkasan.innerHTML = `<b>Estimasi Selesai: ${formatDate(hasil.tglSelesai)}</b><br><small>Total Waktu: ${hasil.totalHari} Hari</small><br>
    <p style="margin-top:5px; font-size:14px; color:#10b981;">
        <i class="ri-scales-3-line"></i> Estimasi Hasil Bubuk: <b>${hasil.estimasiBubuk} kg</b>
    </p>`;
    
    // Render Chart Estimasi (Panen vs Estimasi Bubuk)
    setTimeout(() => {
        renderHarvestChart('estimasiChart', input.jumlah, input.metode, hasil.estimasiBubuk);
    }, 100);

    document.getElementById("wizard-step-2").classList.add('hidden');
    document.getElementById("hasilEstimasi").classList.remove('hidden');
};

// ==========================================
// D. LOGIKA DATA REAL (DATABASE)
// ==========================================

window.simpanDataReal = async function(e) {
    if(e) e.preventDefault();
    
    const email = localStorage.getItem('userEmail');
    if(!email) return showToast("Anda harus login untuk menyimpan data!", "error");

    const dataReal = {
        email: email,
        timestamp: new Date(),
        tipe: 'real',
        input: {
            namaKelompok: document.getElementById('real_nama').value || "Tanpa Nama",
            jumlah: parseInt(document.getElementById('real_panen').value) || 0,
            metode: document.getElementById('real_metode').value,
            manualOutput: parseInt(document.getElementById('real_hasil').value) || 0
        },
        output: {
            tglSelesai: document.getElementById('real_tgl_finish').value
        },
        tahapan: {
            finish: document.getElementById('real_tgl_finish').value
        }
    };

    try {
        await simpanData(dataReal);
        showToast("Data Berhasil Diarsipkan!", "success");
        document.getElementById('formRealData')?.reset();
        window.kembaliKeMenu();
    } catch (err) {
        showToast("Gagal simpan: " + err.message, "error");
    }
};

// ==========================================
// E. LOGIKA HISTORY
// ==========================================

window.loadHistoryData = async function() {
    const tbody = document.querySelector("#tabelHistory tbody");
    const loading = document.getElementById('loadingText');
    const content = document.getElementById('historyContent');

    if(!tbody) return;

    const email = localStorage.getItem('userEmail');
    if(!email) {
        tbody.innerHTML = "<tr><td colspan='7' class='center'>Silakan login untuk melihat riwayat.</td></tr>";
        return;
    }

    if(loading) loading.style.display = "block";

    try {
        const data = await ambilRiwayat(email);
        window.cachedHistory = data; 
        
        if(loading) loading.style.display = "none";
        if(content) content.classList.remove("hidden");

        if(data.length === 0) {
            tbody.innerHTML = "<tr><td colspan='7' style='text-align:center'>Belum ada riwayat produksi.</td></tr>";
            return;
        }

        let stats = { fullwash: 0, honey: 0, natural: 0 };
        tbody.innerHTML = "";

        data.forEach((d, index) => {
            const tglSimpan = d.timestamp?.seconds ? formatDate(new Date(d.timestamp.seconds * 1000)) : "-";
            const estimasiBubuk = d.input.manualOutput || Math.round(d.input.jumlah * 0.2); 
            
            tbody.innerHTML += `
                <tr class="hover-row">
                    <td><small>${tglSimpan}</small></td>
                    <td>${d.input.namaKelompok}</td>
                    <td>${d.input.jumlah} kg</td>
                    <td class="badge-metode">${d.input.metode}</td>
                    <td>${estimasiBubuk} kg</td>
                    <td><b>${formatDate(d.output.tglSelesai)}</b></td>
                    <td>
                        <button onclick="showDetail(window.cachedHistory[${index}])" class="btn-sm btn-outline">
                            <i class="ri-eye-line"></i>
                        </button>
                    </td>
                </tr>`;
            
            if(stats[d.input.metode.toLowerCase()] !== undefined) stats[d.input.metode.toLowerCase()]++;
        });

        if(document.getElementById('frequencyChart')) {
            renderFrequencyChart('frequencyChart', stats);
        }

    } catch (e) {
        console.error("History Error:", e);
        if(loading) loading.innerText = "Koneksi bermasalah.";
    }
};

// ==========================================
// F. UTILS
// ==========================================

window.showDetail = function(item) {
    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');
    if(!modal || !content) return;

    const fmt = (num) => num ? num.toLocaleString('id-ID') : '0';
    const dateVal = item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000) : new Date();

    content.innerHTML = `
        <div class="detail-grid">
            <div class="detail-row"><span class="detail-label">Tanggal Input</span><span class="detail-value">${formatDate(dateVal)}</span></div>
            <div class="detail-row"><span class="detail-label">Tanggal Selesai</span><span class="detail-value text-success"><b>${formatDate(item.output.tglSelesai)}</b></span></div>
            <div class="detail-row"><span class="detail-label">Kelompok</span><span class="detail-value">${item.input.namaKelompok}</span></div>
            <div class="detail-row"><span class="detail-label">Metode</span><span class="detail-value" style="text-transform:capitalize;">${item.input.metode}</span></div>
            <div class="detail-row"><span class="detail-label">Berat Cherry</span><span class="detail-value">${fmt(item.input.jumlah)} kg</span></div>
            <div class="detail-row"><span class="detail-label">Hasil Akhir</span><span class="detail-value">${fmt(item.input.manualOutput)} kg</span></div>
        </div>
        <div class="chart-container-detail">
            <canvas id="detailChart"></canvas>
        </div>
    `;
    
    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    setTimeout(() => {
        renderHarvestChart('detailChart', item.input.jumlah, item.input.metode, item.input.manualOutput);
    }, 200);
};

window.tutupDetail = () => {
    document.getElementById('detailModal').style.display = 'none';
};

window.toggleTheme = function() {
    const isDark = document.body.hasAttribute('data-theme');
    if (isDark) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
};

window.cetakPDF = () => {
    if(!globalData) return showToast("Hitung jadwal dulu!", "error");
    generatePDF(globalData);
};