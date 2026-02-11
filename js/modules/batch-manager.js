import { 
    createBatch, getActiveBatches, updateBatch, moveBatchToHistory 
} from './database.js';
import { showToast, formatDate } from './ui-helper.js';

let currentBatchId = null;
let currentStage = null;

// Tahapan Produksi
const STAGES = ['sortasi', 'fermentasi', 'jemur', 'roasting', 'kemas', 'selesai'];
const STAGE_NAMES = {
    sortasi: 'Sortasi',
    fermentasi: 'Fermentasi',
    jemur: 'Penjemuran',
    roasting: 'Roasting',
    kemas: 'Pengemasan',
    selesai: 'Selesai'
};

document.addEventListener('DOMContentLoaded', () => {
    // Cek Login
    const email = localStorage.getItem('userEmail');
    if (!email) {
        window.location.href = 'login.html';
        return;
    }

    // Set initial tab styling & Load Data
    applyTabStyle('active');
    loadActiveBatches();
});

// --- NAVIGATION ---
function applyTabStyle(tab) {
    const tabActive = document.getElementById('tab-active');
    const tabNew = document.getElementById('tab-new');
    if (!tabActive || !tabNew) return;

    tabActive.style.borderBottom = tab === 'active' ? '2px solid #6F4E37' : 'none';
    tabActive.style.color = tab === 'active' ? '#6F4E37' : '#999';
    tabNew.style.borderBottom = tab === 'new' ? '2px solid #6F4E37' : 'none';
    tabNew.style.color = tab === 'new' ? '#6F4E37' : '#999';
}

window.switchTab = function(tab) {
    document.getElementById('section-active').classList.toggle('hidden', tab !== 'active');
    document.getElementById('section-new').classList.toggle('hidden', tab !== 'new');
    
    document.getElementById('tab-active').classList.toggle('active', tab === 'active');
    document.getElementById('tab-new').classList.toggle('active', tab === 'new');

    applyTabStyle(tab);

    if(tab === 'active') loadActiveBatches();
};

window.showNewBatchForm = function() {
    switchTab('new');
};

// --- LOAD DATA ---
async function loadActiveBatches() {
    const list = document.getElementById('activeBatchesList');
    const email = localStorage.getItem('userEmail');
    
    try {
        const batches = await getActiveBatches(email);
        
        if (batches.length === 0) {
            list.innerHTML = `
                <div class="card" style="text-align:center; padding:40px; grid-column: 1 / -1;">
                    <i class="ri-inbox-archive-line" style="font-size:40px; color:#ccc;"></i>
                    <p style="color:#666; margin-top:10px;">Belum ada batch aktif.</p>
                    <button onclick="showNewBatchForm()" class="btn btn-sm btn-primary" style="margin-top:15px;">Buat Batch Baru</button>
                </div>`;
            return;
        }

        list.innerHTML = batches.map(b => createBatchCard(b)).join('');

    } catch (e) {
        console.error(e);
        showToast("Gagal memuat data batch.", "error");
    }
}

function createBatchCard(b) {
    const stageName = STAGE_NAMES[b.status] || b.status;
    const progressMap = { sortasi: 10, fermentasi: 30, jemur: 50, roasting: 75, kemas: 90 };
    const progress = progressMap[b.status] || 0;

    return `
    <div class="card" onclick="openUpdateModal('${b.id}', '${b.status}', '${b.input.namaKelompok}')" style="cursor:pointer; transition:transform 0.2s; border-left: 5px solid #10b981;">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span class="badge badge-${b.status}">${stageName}</span>
            <span style="font-size:12px; color:#666;">${formatDate(b.timestamp.toDate())}</span>
        </div>
        <h3 style="margin:0 0 5px 0;">${b.input.namaKelompok}</h3>
        <p style="font-size:13px; color:#666; margin-bottom:15px;">
            ${b.input.metode} &bull; ${b.input.jumlah} kg
        </p>
        
        <div style="background:#eee; height:6px; border-radius:3px; overflow:hidden;">
            <div style="background:#10b981; height:100%; width:${progress}%"></div>
        </div>
        <p style="font-size:11px; color:#999; margin-top:5px; text-align:right;">Klik untuk update</p>
    </div>
    `;
}

// --- ACTIONS: CREATE ---
window.handleCreateBatch = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = "Processing...";

    const email = localStorage.getItem('userEmail');
    const catatanAwal = document.getElementById('batch_catatan').value.trim();
    const tahapanData = {
        sortasi_mulai: document.getElementById('batch_tgl_start').value
    };
    if (catatanAwal) tahapanData.sortasi_catatan = catatanAwal;

    const data = {
        email: email,
        timestamp: new Date(),
        status: 'sortasi',
        input: {
            namaKelompok: document.getElementById('batch_nama').value,
            jumlah: parseInt(document.getElementById('batch_panen').value),
            metode: document.getElementById('batch_metode').value
        },
        tahapan: tahapanData,
        logs: [
            { date: new Date(), action: 'Batch Created', note: 'Start Sortasi' }
        ]
    };

    try {
        await createBatch(data);
        showToast("Batch Baru Berhasil Dibuat!", "success");
        e.target.reset();
        switchTab('active');
    } catch (err) {
        console.error(err);
        showToast("Gagal membuat batch: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Mulai Batch Produksi";
    }
};

// --- ACTIONS: UPDATE ---
window.openUpdateModal = function(id, status, nama) {
    currentBatchId = id;
    currentStage = status;

    const modal = document.getElementById('updateModal');
    document.getElementById('updateBatchId').innerText = `#${id.substr(0,6)}`;
    
    // Set Badge & Label
    const stageIdx = STAGES.indexOf(currentStage);
    const nextStage = STAGES[stageIdx + 1];

    document.getElementById('currentStatusBadge').innerText = STAGE_NAMES[currentStage];
    document.getElementById('lblCurrentStage').innerText = STAGE_NAMES[currentStage]; // "Tanggal Selesai Sortasi"

    if (nextStage === 'selesai') {
        document.getElementById('nextStageName').innerText = "SELESAI (Arsipkan)";
        document.getElementById('btnSubmitUpdate').innerText = "Selesai & Arsipkan";
        document.getElementById('btnSubmitUpdate').classList.replace('btn-primary', 'btn-success');
        document.getElementById('inputFinalOutput').classList.remove('hidden');
        document.getElementById('update_output_kg').required = true;
    } else {
        document.getElementById('nextStageName').innerText = STAGE_NAMES[nextStage];
        document.getElementById('btnSubmitUpdate').innerText = "Simpan & Lanjut";
        document.getElementById('btnSubmitUpdate').classList.replace('btn-success', 'btn-primary');
        document.getElementById('inputFinalOutput').classList.add('hidden');
        document.getElementById('update_output_kg').required = false;
    }

    modal.style.display = 'flex';
    modal.classList.remove('hidden');
};

window.closeUpdateModal = function() {
    document.getElementById('updateModal').style.display = 'none';
};

window.handleUpdateProgress = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSubmitUpdate');
    btn.disabled = true;

    const tglSelesai = document.getElementById('update_tgl_selesai').value;
    const catatan = document.getElementById('update_catatan').value;
    const outputKg = document.getElementById('update_output_kg').value;

    const stageIdx = STAGES.indexOf(currentStage);
    const nextStage = STAGES[stageIdx + 1];

    // Prepare Update Data
    let updatePayload = {
        [`tahapan.${currentStage}_selesai`]: tglSelesai,
        [`tahapan.${nextStage}_mulai`]: tglSelesai, // Asumsi mulai next stage langsung
        status: nextStage
    };

    // Log Addition
    // Note: Firestore arrayUnion is ideal, but simplified here logic-side or we'd need another import
    // Simpelnya kita update logs via object assign kalau mau atomic, tapi di sini kita pakai standard updateDoc merge behavior
    // Karena nested array update agak tricky tanpa arrayUnion, kita skip log array push untuk MVP ini atau overwrite existing logs (Not ideal).
    // Better: just update status and dates for now.

    try {
        if (nextStage === 'selesai') {
            // FINISH BATCH -> MOVE TO HISTORY
            // Kita perlu fetch data lengkap dulu untuk dipindah
            // Tapi karena kita di client, kita construct final object
            // Workaround: Panggil fungsi moveBatchToHistory dengan data tambahan
            
            // Perlu ambil data batch existing dulu (ideally)
            // Di sini kita asumsi `moveBatchToHistory` handle logic pemindahan
            // Kita butuh data lengkap. 
            // ALERT: Kita ga punya data lengkap di variable sini.
            // Solusi: Get Batch by ID dulu.
            alert("Sedang memproses arsip..."); // UX Feedback
            
            // Imports dynamic or fetch
            // Let's rely on server/db function logic. 
            // For now, simpler approach: Update status to 'kemas' finished, then another call to move.
            // But let's try to do it in one go if possible.
            
            // Kita butuh fetch data batch ini
            const { getBatchById } = await import('./database.js'); 
            const batchData = await getBatchById(currentBatchId);

            const finalTahapan = {
                ...batchData.tahapan,
                [`${currentStage}_selesai`]: tglSelesai,
                finish: tglSelesai
            };
            // Save catatan for final stage
            if (catatan) finalTahapan[`${currentStage}_catatan`] = catatan;

            const finalData = {
                ...batchData,
                output: { 
                    tglSelesai: tglSelesai 
                },
                input: { 
                    ...batchData.input, 
                    manualOutput: outputKg ? parseFloat(outputKg) : 0 
                },
                tahapan: finalTahapan
            };
            
            // Clean up ID before saving as new doc
            delete finalData.id; 

            await moveBatchToHistory(currentBatchId, finalData);
            showToast("Batch Selesai & Diarsipkan!", "success");

        } else {
            // NORMAL UPDATE
            if (catatan) {
                // Save catatan per-stage
                updatePayload[`tahapan.${currentStage}_catatan`] = catatan;
            }
            
            await updateBatch(currentBatchId, updatePayload);
            showToast(`Lanjut ke tahap ${STAGE_NAMES[nextStage]}`, "success");
        }

        closeUpdateModal();
        loadActiveBatches();

    } catch (err) {
        console.error(err);
        showToast("Error update: " + err.message, "error");
    } finally {
        btn.disabled = false;
    }
};
