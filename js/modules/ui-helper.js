// ==========================================
// MODULE: UI HELPER (View Layer)
// ==========================================

export { showToast } from '../toast.js';

// State to track Chart instances so we can destroy them before redrawing
const chartInstances = {};

const STAGE_NAMES = {
    sortasi: 'Sortasi', 
    fermentasi: 'Fermentasi', 
    jemur: 'Penjemuran',
    roasting: 'Roasting', 
    kemas: 'Pengemasan', 
    selesai: 'Selesai'
};

// --- A. FORMATTERS ---
export function formatDate(dateInput) {
    if (!dateInput) return "-";
    try {
        // Handle Firestore Timestamp, Date object, or String
        const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
        if(isNaN(date.getTime())) return "-";
        return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return "-"; }
}

export const formatNumber = (num) => num ? num.toLocaleString('id-ID') : '0';

// --- B. GENERIC UI ---
export function setInputValue(id, value) {
    const el = document.getElementById(id);
    if(el) el.value = value !== undefined && value !== null ? value : "";
}

export function toggleVisibility(showIds, hideIds) {
    if(Array.isArray(hideIds)) hideIds.forEach(id => document.getElementById(id)?.classList.add('hidden'));
    if(Array.isArray(showIds)) showIds.forEach(id => document.getElementById(id)?.classList.remove('hidden'));
}

export function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    if(icon) icon.className = isDark ? 'ri-sun-line' : 'ri-moon-line';
}

// --- C. ESTIMATION UI ---
export function renderScheduleTable(scheduleData) {
    const tbody = document.querySelector("#tabelJadwal tbody");
    if (tbody) {
        tbody.innerHTML = scheduleData.map(r => `
            <tr>
                <td>${r.tahap}</td>
                <td>${formatDate(r.mulai)}</td>
                <td>${formatDate(r.selesai)}</td>
                <td>${r.durasi} Hari</td>
                <td><i class="ri-checkbox-circle-line"></i></td>
            </tr>
        `).join('');
    }
}

export function renderEstimationSummary(tglSelesai, totalHari, estimasiBubuk) {
    const el = document.getElementById("ringkasanOutput");
    if(el) {
        el.innerHTML = `
            <b>Estimasi Selesai: ${formatDate(tglSelesai)}</b><br>
            <small>Total Waktu: ${totalHari} Hari</small><br>
            <p style="margin-top:5px; font-size:14px; color:#10b981;">
                <i class="ri-scales-3-line"></i> Estimasi Hasil Bubuk: <b>${estimasiBubuk} kg</b>
            </p>`;
    }
}

// --- D. TRACKING (ACTIVE BATCH) UI ---
export function renderActiveBatchesList(batches, onCardClickCallback) {
    const list = document.getElementById('activeBatchesList');
    if(!list) return;

    if (batches.length === 0) {
        list.innerHTML = `
            <div class="card" style="text-align:center; padding:40px; grid-column: 1 / -1;">
                <i class="ri-inbox-archive-line" style="font-size:40px; color:#ccc;"></i>
                <p style="color:#666; margin-top:10px;">Belum ada batch aktif.</p>
                <button onclick="window.switchTab('new')" class="btn btn-sm btn-primary" style="margin-top:15px;">Buat Batch Baru</button>
            </div>`;
        return;
    }

    const progressMap = { sortasi: 10, fermentasi: 30, jemur: 50, roasting: 75, kemas: 90 };

    list.innerHTML = batches.map(b => {
        const stageName = STAGE_NAMES[b.status] || b.status;
        const progress = progressMap[b.status] || 0;
        
        return `
        <div class="card" onclick="${onCardClickCallback}('${b.id}')" style="cursor:pointer; border-left: 5px solid #10b981;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <span class="badge badge-${b.status}">${stageName}</span>
                <span style="font-size:12px; color:#666;">${formatDate(b.timestamp)}</span>
            </div>
            <h3 style="margin:0 0 5px 0;">${b.input.namaKelompok}</h3>
            <p style="font-size:13px; color:#666; margin-bottom:15px;">
                ${b.input.metode} &bull; ${b.input.jumlah} kg
            </p>
            <div style="background:#eee; height:6px; border-radius:3px; overflow:hidden;">
                <div style="background:#10b981; height:100%; width:${progress}%"></div>
            </div>
            <p style="font-size:11px; color:#999; margin-top:5px; text-align:right;">Klik untuk update</p>
        </div>`;
    }).join('');
}

export function updateBatchModalUI(batchId, currentStatus, nextStage, isFinal) {
    document.getElementById('updateBatchId').innerText = `#${batchId.substr(0,6)}`;
    
    // Status Badges
    document.getElementById('currentStatusBadge').innerText = STAGE_NAMES[currentStatus];
    document.getElementById('lblCurrentStage').innerText = STAGE_NAMES[currentStatus];

    // Next Stage Logic
    const nextName = isFinal ? "SELESAI (Arsipkan)" : STAGE_NAMES[nextStage];
    document.getElementById('nextStageName').innerText = nextName;
    
    // Button Styling
    const btn = document.getElementById('btnSubmitUpdate');
    const inputOutput = document.getElementById('inputFinalOutput');
    const outputField = document.getElementById('update_output_kg');

    if (isFinal) {
        btn.innerText = "Selesai & Arsipkan";
        btn.classList.replace('btn-primary', 'btn-success');
        inputOutput.classList.remove('hidden');
        if(outputField) outputField.required = true;
    } else {
        btn.innerText = "Simpan & Lanjut";
        btn.classList.replace('btn-success', 'btn-primary');
        inputOutput.classList.add('hidden');
        if(outputField) outputField.required = false;
    }
}

// --- E. HISTORY UI ---
export function renderHistoryTable(data, onDetailClickCallback) {
    const tbody = document.querySelector("#tabelHistory tbody");
    if(!tbody) return;

    if(data.length === 0) {
        tbody.innerHTML = "<tr><td colspan='7' class='center'>Belum ada riwayat.</td></tr>";
        return;
    }

    tbody.innerHTML = data.map((d, index) => {
        const tgl = formatDate(d.timestamp);
        const output = d.input.manualOutput || Math.round(d.input.jumlah * 0.2);
        
        return `
            <tr class="hover-row">
                <td><small>${tgl}</small></td>
                <td>${d.input.namaKelompok}</td>
                <td>${d.input.jumlah} kg</td>
                <td class="badge-metode">${d.input.metode}</td>
                <td>${output} kg</td>
                <td><b>${formatDate(d.output.tglSelesai)}</b></td>
                <td>
                    <button onclick="${onDetailClickCallback}(${index})" class="btn-sm btn-outline">
                        <i class="ri-eye-line"></i>
                    </button>
                </td>
            </tr>`;
    }).join('');
}

// --- F. DETAIL MODAL ---
export function renderDetailModal(item) {
    const content = document.getElementById('detailContent');
    if (!content) return;

    const t = item.tahapan || {};
    const showDate = (d) => d ? formatDate(d) : '-';

    content.innerHTML = `
        <div class="detail-grid">
            <div class="detail-row"><span class="detail-label">Kelompok</span><span class="detail-value">${item.input.namaKelompok}</span></div>
            <div class="detail-row"><span class="detail-label">Metode</span><span class="detail-value" style="text-transform:capitalize;">${item.input.metode}</span></div>
            <div class="detail-row"><span class="detail-label">Berat Cherry</span><span class="detail-value">${formatNumber(item.input.jumlah)} kg</span></div>
            <div class="detail-row"><span class="detail-label">Hasil Bubuk</span><span class="detail-value">${formatNumber(item.input.manualOutput)} kg</span></div>
        </div>

        <div class="detail-schedule">
            <p class="detail-schedule-title">📅 Rincian Tahapan</p>
            <div class="table-responsive">
                <table class="tabel detail-tabel">
                    <thead>
                        <tr><th>Tahap</th><th>Mulai</th><th>Selesai</th><th>Ket.</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>Sortasi</td><td>${showDate(t.sortasi_mulai)}</td><td>${showDate(t.sortasi_selesai)}</td><td><small><i>${t.sortasi_catatan || '-'}</i></small></td></tr>
                        <tr><td>Fermentasi</td><td>${showDate(t.fermentasi_mulai)}</td><td>${showDate(t.fermentasi_selesai)}</td><td><small><i>${t.fermentasi_catatan || '-'}</i></small></td></tr>
                        <tr><td>Penjemuran</td><td>${showDate(t.jemur_mulai)}</td><td>${showDate(t.jemur_selesai)}</td><td><small><i>${t.jemur_catatan || '-'}</i></small></td></tr>
                        <tr><td>Roasting</td><td>${showDate(t.roasting_mulai)}</td><td>${showDate(t.roasting_selesai)}</td><td><small><i>${t.roasting_catatan || '-'}</i></small></td></tr>
                        <tr><td>Pengemasan</td><td>${showDate(t.kemas_mulai)}</td><td>${showDate(t.kemas_selesai)}</td><td><small><i>${t.kemas_catatan || '-'}</i></small></td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="chart-container-detail">
            <canvas id="detailChart"></canvas>
        </div>
    `;
}

// --- G. CHARTS ---
export function renderHarvestChart(ctxId, inputAwal, metode, manualOutput) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;

    // Destroy existing chart to prevent canvas reuse error
    if (chartInstances[ctxId]) {
        chartInstances[ctxId].destroy();
    }

    const cherry = parseFloat(inputAwal) || 0;
    const finalVal = parseFloat(manualOutput) || (cherry * 0.18).toFixed(1);

    // Color logic: Green for Realization, Brown/Red for Estimation
    const colorFinal = (manualOutput > 0) ? "#10B981" : "#8D6E63";

    chartInstances[ctxId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Panen (Cherry)', 'Hasil (Greenbean)'],
            datasets: [{
                label: 'Berat (kg)',
                data: [cherry, finalVal],
                backgroundColor: ['#DC2626', colorFinal],
                borderRadius: 5,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

export function renderFrequencyChart(ctxId, stats) {
    const ctx = document.getElementById(ctxId);
    if (!ctx) return;

    if (chartInstances[ctxId]) {
        chartInstances[ctxId].destroy();
        delete chartInstances[ctxId];
    }

    chartInstances[ctxId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Full Wash', 'Honey', 'Natural'],
            datasets: [{
                data: [stats.fullwash, stats.honey, stats.natural],
                backgroundColor: ['#6F4E37', '#F59E0B', '#10B981'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// Export PDF functions from the separate module
export { generatePDF, generateDetailPDF } from './pdf-generator.js';