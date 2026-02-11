// ==========================================
// MAIN.JS - UNIFIED CONTROLLER (COMPLETE)
// ==========================================

import { hitungMaxPlus } from "./modules/calculator.js";
import { 
    simpanData, 
    ambilRiwayat, 
    updateData, 
    createBatch, 
    getActiveBatches, 
    updateBatch, 
    moveBatchToHistory, 
    getBatchById 
} from "./modules/database.js";
import * as UI from './modules/ui-helper.js';

// Global State
let currentState = {
    activeBatches: [], 
    historyData: [],
    lastEstimation: null,
    currentBatchId: null,      // For Active Batch Update
    currentBatchStatus: null,  // For Active Batch Update
    currentDetailItem: null    // For History Detail View
};

const STAGES = ['sortasi', 'fermentasi', 'jemur', 'roasting', 'kemas', 'selesai'];

// ==========================================
// 1. INITIALIZATION & SETUP
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // A. Set Default Date Inputs to Today
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(el => {
        if (!el.value) el.value = today;
    });

    // B. Check Auth & Load Page Specific Data
    const email = localStorage.getItem('userEmail');
    
    // If we are on the Tracking/Dashboard page
    if (document.getElementById('activeBatchesList')) {
        if(!email) {
            // Optional: Redirect to login if needed
            // window.location.href = 'login.html';
        } else {
            loadActiveBatches();
        }
    }

    // If we are on the History page
    if (document.getElementById('tabelHistory')) {
        loadHistoryData();
    }

    // C. Load Saved Theme
    const savedTheme = localStorage.getItem('theme');
    if(savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        UI.updateThemeIcon(true);
    }
}

// ==========================================
// 2. FEATURE: ESTIMATION (CALCULATOR)
// ==========================================

window.hitungJadwal = function() {
    // 1. Gather Input
    const panenVal = document.getElementById("panen").value;
    if (!panenVal || panenVal <= 0) return UI.showToast("Isi jumlah panen dengan benar!", "error");

    const input = {
        namaKelompok: document.getElementById("nama_kelompok")?.value || "Anonim",
        jumlah: parseInt(panenVal),
        metode: document.getElementById("metode").value,
        cuaca: document.getElementById("cuaca")?.value || "cerah",
        alat: document.getElementById("alat")?.value || "manual",
        tglStart: document.getElementById("tgl_start_produksi").value
    };

    // 2. Process Logic (Pure Math)
    const hasil = hitungMaxPlus(input);
    
    // 3. Save to State
    currentState.lastEstimation = { input, output: hasil, jadwal: hasil.jadwal };

    // 4. Update UI
    UI.renderScheduleTable(hasil.jadwal);
    UI.renderEstimationSummary(hasil.tglSelesai, hasil.totalHari, hasil.estimasiBubuk);
    
    // 5. Switch View & Render Chart
    document.getElementById("wizard-step-2").classList.add('hidden');
    document.getElementById("hasilEstimasi").classList.remove('hidden');

    setTimeout(() => {
        UI.renderHarvestChart('estimasiChart', input.jumlah, input.metode, hasil.estimasiBubuk);
    }, 100);
};

// ==========================================
// 3. FEATURE: TRACKING (ACTIVE BATCHES)
// ==========================================

// Load Active Batches from DB
window.loadActiveBatches = async function() {
    const email = localStorage.getItem('userEmail');
    if (!email) return;

    try {
        const batches = await getActiveBatches(email);
        currentState.activeBatches = batches; // Cache data
        UI.renderActiveBatchesList(batches, 'openBatchUpdateModal');
    } catch (e) {
        console.error(e);
        UI.showToast("Gagal memuat batch aktif.", "error");
    }
};

// Create New Batch
window.handleCreateBatch = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    
    // UI Feedback
    btn.disabled = true; 
    btn.innerText = "Processing...";

    const data = {
        email: localStorage.getItem('userEmail'),
        timestamp: new Date(),
        status: 'sortasi',
        input: {
            namaKelompok: document.getElementById('batch_nama').value,
            jumlah: parseInt(document.getElementById('batch_panen').value),
            metode: document.getElementById('batch_metode').value
        },
        tahapan: {
            sortasi_mulai: document.getElementById('batch_tgl_start').value
        }
    };

    try {
        await createBatch(data);
        UI.showToast("Batch Produksi Berhasil Dibuat!", "success");
        
        // Reset Form & Switch Tab
        e.target.reset();
        window.switchTab('active');
    } catch (err) {
        console.error(err);
        UI.showToast("Gagal membuat batch: " + err.message, "error");
    } finally {
        btn.disabled = false; 
        btn.innerText = "Mulai Batch Produksi";
    }
};

// Open Update Modal (Called via OnClick in HTML)
window.openBatchUpdateModal = function(id) {
    const batch = currentState.activeBatches.find(b => b.id === id);
    if(!batch) return;

    currentState.currentBatchId = id;
    currentState.currentBatchStatus = batch.status;

    const stageIdx = STAGES.indexOf(batch.status);
    const nextStage = STAGES[stageIdx + 1];
    const isFinal = (nextStage === 'selesai');

    UI.updateBatchModalUI(id, batch.status, nextStage, isFinal);
    
    const modal = document.getElementById('updateModal');
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
};

// Submit Update Progress
window.handleUpdateProgress = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitUpdate');
    btn.disabled = true;

    const id = currentState.currentBatchId;
    const currentStatus = currentState.currentBatchStatus;
    
    // Gather Inputs
    const tglSelesai = document.getElementById('update_tgl_selesai').value;
    const catatan = document.getElementById('update_catatan').value;
    const outputKg = document.getElementById('update_output_kg').value;

    const stageIdx = STAGES.indexOf(currentStatus);
    const nextStage = STAGES[stageIdx + 1];

    try {
        if (nextStage === 'selesai') {
            // CASE A: Finish & Archive
            const fullBatchData = await getBatchById(id);
            
            // Merge Notes
            const finalCatatan = (fullBatchData.catatan || "") + (catatan ? "\n" + catatan : "");

            const finalData = {
                ...fullBatchData,
                output: { tglSelesai: tglSelesai },
                input: { 
                    ...fullBatchData.input, 
                    manualOutput: parseInt(outputKg) || 0 
                },
                tahapan: {
                    ...fullBatchData.tahapan,
                    [`${currentStatus}_selesai`]: tglSelesai,
                    finish: tglSelesai
                },
                catatan: finalCatatan
            };
            
            // Remove Firestore ID before moving to history collection
            delete finalData.id; 

            await moveBatchToHistory(id, finalData);
            UI.showToast("Batch Selesai & Diarsipkan ke History!", "success");

        } else {
            // CASE B: Normal Stage Update
            const updatePayload = {
                [`tahapan.${currentStatus}_selesai`]: tglSelesai,
                [`tahapan.${nextStage}_mulai`]: tglSelesai,
                status: nextStage
            };
            
            await updateBatch(id, updatePayload);
            UI.showToast(`Status update: Lanjut ke ${nextStage}`, "success");
        }

        window.closeBatchUpdateModal();
        window.loadActiveBatches(); // Refresh List

    } catch (err) {
        console.error(err);
        UI.showToast("Error update: " + err.message, "error");
    } finally {
        btn.disabled = false;
    }
};

window.closeBatchUpdateModal = function() {
    document.getElementById('updateModal').style.display = 'none';
};

// ==========================================
// 4. FEATURE: HISTORY & MANUAL ENTRY
// ==========================================

window.loadHistoryData = async function() {
    const email = localStorage.getItem('userEmail');
    const loading = document.getElementById('loadingText');
    
    if(!email) return; 
    if(loading) loading.style.display = "block";

    try {
        const data = await ambilRiwayat(email);
        currentState.historyData = data; 
        
        if(loading) loading.style.display = "none";
        document.getElementById('historyContent')?.classList.remove("hidden");

        // Calculate Stats for Chart
        let stats = { fullwash: 0, honey: 0, natural: 0 };
        data.forEach(d => {
            if(stats[d.input.metode] !== undefined) stats[d.input.metode]++;
        });

        UI.renderHistoryTable(data, 'openDetailFromIndex'); 
        
        if(document.getElementById('frequencyChart')) {
            UI.renderFrequencyChart('frequencyChart', stats);
        }

    } catch (e) {
        console.error(e);
        if(loading) loading.innerText = "Gagal memuat data.";
    }
};

window.openDetailFromIndex = function(index) {
    const item = currentState.historyData[index];
    if(!item) return;

    currentState.currentDetailItem = item; // Store for PDF/Edit
    
    // Render Modal Content via UI Helper
    UI.renderDetailModal(item);
    
    const modal = document.getElementById('detailModal');
    modal.style.display = 'flex';
    modal.classList.remove('hidden');

    // Render Chart inside Modal
    setTimeout(() => {
        UI.renderHarvestChart('detailChart', item.input.jumlah, item.input.metode, item.input.manualOutput);
    }, 200);
};

// Manual Data Entry (Legacy/Direct Input)
window.simpanDataReal = async function(e) {
    if(e) e.preventDefault();
    const email = localStorage.getItem('userEmail');
    if(!email) return UI.showToast("Login diperlukan!", "error");

    const id = document.getElementById('real_id').value;
    const isUpdate = !!id;

    // Construct Payload
    const dataPayload = {
        email: email,
        timestamp: isUpdate ? undefined : new Date(),
        tipe: 'real',
        input: {
            namaKelompok: document.getElementById('real_nama').value || "Tanpa Nama",
            jumlah: parseInt(document.getElementById('real_panen').value) || 0,
            metode: document.getElementById('real_metode').value,
            manualOutput: parseInt(document.getElementById('real_hasil').value) || 0
        },
        tahapan: {
            sortasi_mulai: document.getElementById('tgl_sortasi_mulai').value,
            sortasi_selesai: document.getElementById('tgl_sortasi_selesai').value,
            fermentasi_mulai: document.getElementById('tgl_fermentasi_mulai').value,
            fermentasi_selesai: document.getElementById('tgl_fermentasi_selesai').value,
            jemur_mulai: document.getElementById('tgl_jemur_mulai').value,
            jemur_selesai: document.getElementById('tgl_jemur_selesai').value,
            roasting_mulai: document.getElementById('tgl_roasting_mulai').value,
            roasting_selesai: document.getElementById('tgl_roasting_selesai').value,
            kemas_mulai: document.getElementById('tgl_kemas_mulai').value,
            kemas_selesai: document.getElementById('tgl_kemas_selesai').value,
            finish: document.getElementById('tgl_kemas_selesai').value
        },
        output: { tglSelesai: document.getElementById('tgl_kemas_selesai').value },
        catatan: document.getElementById('catatan').value
    };

    if(isUpdate) delete dataPayload.timestamp;

    try {
        if (isUpdate) await updateData(id, dataPayload);
        else await simpanData(dataPayload);

        UI.showToast(isUpdate ? "Data Diperbarui!" : "Data Disimpan!", "success");
        
        // Reset & Redirect
        document.getElementById('real_id').value = ""; 
        document.querySelector('form[onsubmit="simpanDataReal(event)"]').reset();
        window.kembaliKeMenu();
        
        if(window.location.pathname.includes('history.html')) window.loadHistoryData();

    } catch (err) {
        console.error(err);
        UI.showToast("Gagal: " + err.message, "error");
    }
};

// Send Estimation to WhatsApp
window.kirimWA = function() {
    const est = currentState.lastEstimation;
    if (!est) return UI.showToast("Hitung jadwal dulu!", "error");

    const { input, output } = est;
    const jadwal = output.jadwal || est.jadwal;

    let msg = `☕ *ESTIMASI PRODUKSI KOPI*\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 Kelompok: ${input.namaKelompok}\n`;
    msg += `📦 Jumlah Panen: ${input.jumlah} kg\n`;
    msg += `⚙️ Metode: ${input.metode}\n`;
    msg += `🌤️ Cuaca: ${input.cuaca}\n`;
    msg += `📅 Mulai: ${input.tglStart}\n\n`;
    msg += `📋 *JADWAL TAHAPAN:*\n`;

    if (jadwal && jadwal.length) {
        jadwal.forEach(j => {
            msg += `▸ ${j.tahap}: ${j.mulai} → ${j.selesai} (${j.durasi} hari)\n`;
        });
    }

    msg += `\n✅ Estimasi Selesai: ${output.tglSelesai}\n`;
    msg += `⏱️ Total: ${output.totalHari} hari\n`;
    msg += `📊 Estimasi Bubuk: ${output.estimasiBubuk} kg\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n`;
    msg += `_Dikirim dari Dashboard Kopi Nglurah_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};

// Send Detail History to WhatsApp
window.kirimWADetail = function() {
    const item = currentState.currentDetailItem;
    if (!item) return;

    const t = item.tahapan || {};
    const inp = item.input || {};

    let msg = `☕ *DATA PRODUKSI KOPI*\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n`;
    msg += `👤 Kelompok: ${inp.namaKelompok || '-'}\n`;
    msg += `📦 Jumlah Panen: ${inp.jumlah || 0} kg\n`;
    msg += `⚙️ Metode: ${inp.metode || '-'}\n`;
    msg += `📊 Hasil Bubuk: ${inp.manualOutput || 0} kg\n\n`;
    msg += `📋 *TAHAPAN PRODUKSI:*\n`;
    msg += `▸ Sortasi: ${t.sortasi_mulai || '-'} → ${t.sortasi_selesai || '-'}\n`;
    msg += `▸ Fermentasi: ${t.fermentasi_mulai || '-'} → ${t.fermentasi_selesai || '-'}\n`;
    msg += `▸ Penjemuran: ${t.jemur_mulai || '-'} → ${t.jemur_selesai || '-'}\n`;
    msg += `▸ Roasting: ${t.roasting_mulai || '-'} → ${t.roasting_selesai || '-'}\n`;
    msg += `▸ Pengemasan: ${t.kemas_mulai || '-'} → ${t.kemas_selesai || '-'}\n\n`;

    if (item.catatan) {
        msg += `📝 Catatan: ${item.catatan}\n\n`;
    }

    msg += `✅ Selesai: ${t.finish || '-'}\n`;
    msg += `━━━━━━━━━━━━━━━━━━\n`;
    msg += `_Dikirim dari Dashboard Kopi Nglurah_`;

    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};

window.tutupDetail = () => document.getElementById('detailModal').style.display = 'none';

// ==========================================
// 5. NAVIGATION & UTILS
// ==========================================

window.switchTab = function(tab) {
    // For Tracking Page Tabs
    UI.toggleVisibility(
        [tab === 'active' ? 'section-active' : 'section-new'],
        ['section-active', 'section-new']
    );
    
    // Toggle Tab Styling
    const tabActive = document.getElementById('tab-active');
    const tabNew = document.getElementById('tab-new');
    
    if(tabActive && tabNew) {
        if(tab === 'active') {
            tabActive.style.borderBottom = "2px solid #6F4E37";
            tabActive.style.color = "#6F4E37";
            tabNew.style.borderBottom = "none";
            tabNew.style.color = "#999";
            window.loadActiveBatches();
        } else {
            tabNew.style.borderBottom = "2px solid #6F4E37";
            tabNew.style.color = "#6F4E37";
            tabActive.style.borderBottom = "none";
            tabActive.style.color = "#999";
        }
    }
};

window.bukaMode = (mode) => {
    // For Estimasi / Real Data / Menu
    const show = mode === 'estimasi' ? 'estimasiSection' : (mode === 'real' ? 'realSection' : '');
    const hide = ['menuSection', 'estimasiSection', 'realSection'];
    
    UI.toggleVisibility([show], hide);
    
    if (mode !== 'estimasi' && mode !== 'real') {
        document.getElementById('menuSection').classList.remove('hidden');
    }
};

window.kembaliKeMenu = () => {
    UI.toggleVisibility(['menuSection'], ['estimasiSection', 'realSection', 'hasilEstimasi']);
    window.showStep(1);
};

window.showStep = (step) => {
    document.getElementById('wizard-step-1')?.classList.toggle('hidden', step !== 1);
    document.getElementById('wizard-step-2')?.classList.toggle('hidden', step !== 2);
};

window.getAutoWeather = async function() {
    try {
        UI.showToast("Mengecek cuaca...", "info");
        // Nglurah, Karanganyar coordinates
        const lat = -7.6;
        const lon = 111.0;
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const data = await res.json();
        const code = data.current_weather.weathercode;

        // WMO Weather Codes mapping
        let cuaca = 'cerah';
        if ([1, 2, 3, 45, 48].includes(code)) cuaca = 'mendung';
        if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) cuaca = 'hujan';

        document.getElementById('cuaca').value = cuaca;
        UI.showToast(`Cuaca terdeteksi: ${cuaca}`, "success");
    } catch (e) {
        console.error(e);
        UI.showToast("Gagal cek cuaca otomatis.", "error");
    }
};

window.toggleTheme = function() {
    const isDark = document.body.hasAttribute('data-theme');
    if (isDark) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        UI.updateThemeIcon(false);
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        UI.updateThemeIcon(true);
    }
};

window.cetakPDF = () => {
    if(!currentState.lastEstimation) return UI.showToast("Hitung jadwal dulu!", "error");
    UI.generatePDF(currentState.lastEstimation);
};

window.downloadDetailPDF = () => {
    const item = currentState.currentDetailItem;
    if(!item) return;
    UI.generateDetailPDF(item);
};