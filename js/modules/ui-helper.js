// MODULE: UI HELPER (Chart, PDF, WA)

// Render Donut Chart
export function renderFrequencyChart(ctxId, stats) {
    const ctx = document.getElementById(ctxId);
    if(!ctx) return;

    if(window.historyChartInstance) window.historyChartInstance.destroy();

    window.historyChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Full Wash', 'Honey', 'Natural'],
            datasets: [{
                data: [stats.fullwash, stats.honey, stats.natural],
                backgroundColor: ['#6F4E37', '#F59E0B', '#10B981']
            }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
    });
}

// Render Bar Chart (Harvest)
export function renderHarvestChart(ctxId, inputAwal, metode, manualOutput) {
    const ctx = document.getElementById(ctxId);
    if(!ctx) return;

    let rendemen = 0.18;
    if (metode === "fullwash") rendemen = 0.16;
    else if (metode === "honey") rendemen = 0.18;
    else if (metode === "natural") rendemen = 0.20;

    let estimasi = (inputAwal * rendemen).toFixed(1);
    let finalVal = (manualOutput > 0) ? manualOutput : estimasi;
    let colorFinal = (manualOutput > 0) ? "#10B981" : "#6F4E37";

    if(window.harvestChartInstance) window.harvestChartInstance.destroy();

    window.harvestChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Panen', 'Hasil'],
            datasets: [{
                label: 'Berat (kg)',
                data: [inputAwal, finalVal],
                backgroundColor: ['#DC2626', colorFinal],
                borderRadius: 5
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

// Kirim WA
export function sendWA(data) {
    let pesan = `*LAPORAN PRODUKSI KOPI*%0A`;
    pesan += `Kelompok: ${data.input.namaKelompok}%0A`;
    pesan += `Panen: ${data.input.jumlah}kg | Metode: ${data.input.metode}%0A`;
    pesan += `Selesai: ${data.output.tglSelesai}%0A`;
    window.open(`https://wa.me/?text=${pesan}`, '_blank');
}

// Cetak PDF
export function generatePDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text("Laporan Produksi Kopi", 105, 20, { align: "center" });
    doc.text(`Kelompok: ${data.input.namaKelompok}`, 20, 30);
    
    const tableData = data.jadwal.map(r => [r.tahap, r.mulai, r.selesai, r.durasi + " Hari"]);
    doc.autoTable({
        startY: 40,
        head: [['Tahap', 'Mulai', 'Selesai', 'Durasi']],
        body: tableData
    });
    
    doc.save(`Laporan_${data.output.tglSelesai}.pdf`);
}

// Format Tanggal Indonesia
export function formatDate(dateString) {
    if (!dateString) return "-";
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// Wrapper for Global Toast
export function showToast(message, type = 'info') {
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        alert(`${type.toUpperCase()}: ${message}`);
    }
}