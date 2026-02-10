// ==========================================
// MODULE: PDF GENERATOR
// ==========================================

// Helper to safely format dates for PDF
function fmtDate(dateInput) {
    if (!dateInput) return "-";
    try {
        const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
        if(isNaN(date.getTime())) return "-";
        return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return "-"; }
}

// 1. Generate PDF for Estimation (Wizard)
export function generatePDF(data) {
    if (!window.jspdf) {
        alert("Library PDF belum dimuat. Cek koneksi internet.");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text("Laporan Estimasi Produksi Kopi", 105, 20, { align: "center" });
    
    // Meta Data
    doc.setFontSize(11);
    doc.text(`Kelompok: ${data.input.namaKelompok}`, 14, 35);
    doc.text(`Metode: ${data.input.metode}`, 14, 41);
    doc.text(`Tanggal Cetak: ${fmtDate(new Date())}`, 14, 47);

    // Table Content
    const tableData = data.jadwal.map(r => [
        r.tahap, 
        fmtDate(r.mulai), 
        fmtDate(r.selesai), 
        r.durasi + " Hari"
    ]);

    doc.autoTable({
        startY: 55,
        head: [['Tahapan', 'Mulai', 'Selesai', 'Durasi']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [111, 78, 55] } // Coffee Brown
    });
    
    // Footer
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Estimasi Hasil: ${data.output.estimasiBubuk} kg`, 14, finalY);

    doc.save(`Estimasi_${data.input.namaKelompok}_${new Date().getTime()}.pdf`);
}

// 2. Generate PDF for Detail History (Finished Batch)
export function generateDetailPDF(item) {
    if (!window.jspdf) {
        alert("Library PDF belum dimuat.");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header Color Block
    doc.setFillColor(34, 139, 34); // Forest Green
    doc.rect(0, 0, 210, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("Laporan Detail Panen Kopi", 105, 16, null, null, "center");

    // Reset Text Color
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    
    // Info Block
    doc.text(`Kelompok Tani : ${item.input.namaKelompok}`, 14, 40);
    doc.text(`Metode Proses : ${item.input.metode.toUpperCase()}`, 14, 46);
    doc.text(`Tanggal Input : ${fmtDate(item.timestamp)}`, 14, 52);

    // Summary Table
    const output = parseFloat(item.input.manualOutput) || 0;
    const input = parseFloat(item.input.jumlah) || 0;
    const rendemen = input > 0 ? ((output / input) * 100).toFixed(1) + "%" : "-";

    const headSummary = [['Parameter', 'Nilai']];
    const bodySummary = [
        ['Input Cherry', input + ' kg'],
        ['Output Greenbean', output + ' kg'],
        ['Rendemen', rendemen]
    ];

    doc.autoTable({
        startY: 60,
        head: headSummary,
        body: bodySummary,
        theme: 'striped',
        headStyles: { fillColor: [139, 69, 19] } // Brown
    });

    // Schedule Table
    const t = item.tahapan || {};
    const datesBody = [
        ['Sortasi', fmtDate(t.sortasi_mulai), fmtDate(t.sortasi_selesai)],
        ['Fermentasi', fmtDate(t.fermentasi_mulai), fmtDate(t.fermentasi_selesai)],
        ['Penjemuran', fmtDate(t.jemur_mulai), fmtDate(t.jemur_selesai)],
        ['Roasting', fmtDate(t.roasting_mulai), fmtDate(t.roasting_selesai)],
        ['Pengemasan', fmtDate(t.kemas_mulai), fmtDate(t.kemas_selesai)]
    ];

    doc.text("Rekam Jejak Tanggal:", 14, doc.lastAutoTable.finalY + 12);
    
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 18,
        head: [['Tahapan', 'Mulai', 'Selesai']],
        body: datesBody,
        theme: 'grid',
        headStyles: { fillColor: [34, 139, 34] } // Green
    });

    // Notes
    if(item.catatan) {
        const yPos = doc.lastAutoTable.finalY + 12;
        
        doc.setFillColor(255, 243, 205); // Light yellow bg for notes
        doc.rect(14, yPos, 182, 20, 'F');
        
        doc.setTextColor(133, 100, 4);
        doc.setFontSize(10);
        doc.text("Catatan:", 16, yPos + 6);
        
        // Handle long text wrapping
        const splitText = doc.splitTextToSize(item.catatan, 175);
        doc.text(splitText, 16, yPos + 12);
    }

    doc.save(`Laporan_Detail_${item.input.namaKelompok}_${new Date().getTime()}.pdf`);
}