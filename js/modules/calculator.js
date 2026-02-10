// ==========================================
// MODULE: CALCULATOR
// ==========================================

export function hitungMaxPlus(input) {
    const { jumlah, metode, cuaca, alat, tglStart } = input;

    // 1. Knowledge Base Durasi (dalam hari)
    let d = { sortasi: 1, kemas: 1 };
    
    // Logika Fermentasi
    if (metode === "fullwash") d.fermentasi = 3;
    else if (metode === "honey") d.fermentasi = 2;
    else d.fermentasi = 1; // Natural / others

    // Logika Penjemuran
    if (metode === "natural") {
        d.jemur = (cuaca === "hujan") ? 45 : (cuaca === "mendung" ? 30 : 20);
    } else if (metode === "honey") {
        d.jemur = (cuaca === "hujan") ? 25 : 15;
    } else {
        d.jemur = (cuaca === "hujan") ? 10 : 7;
    }

    // Logika Roasting
    // Asumsi: Kapasitas manual 5kg/hari
    d.roasting = (alat === "manual") ? Math.ceil(jumlah / 5) : 1;

    // 2. Hitung Jadwal
    let currentTgl = new Date(tglStart);
    let jadwal = [];
    let totalHari = 0;

    const tahapan = [
        { nama: "Sortasi", dur: d.sortasi },
        { nama: "Fermentasi", dur: d.fermentasi },
        { nama: "Penjemuran", dur: d.jemur },
        { nama: "Roasting", dur: d.roasting },
        { nama: "Pengemasan", dur: d.kemas }
    ];

    tahapan.forEach(t => {
        let start = new Date(currentTgl);
        let durasiEfektif = Math.max(1, t.dur); 
        let end = new Date(start);
        end.setDate(start.getDate() + durasiEfektif - 1);
        
        jadwal.push({ 
            tahap: t.nama, 
            mulai: start.toISOString().split('T')[0], // Return string format
            selesai: end.toISOString().split('T')[0],
            durasi: t.dur
        });
        
        // Prepare next start date
        currentTgl = new Date(end);
        currentTgl.setDate(end.getDate() + 1);
        totalHari += t.dur;
    });

    // 3. Hitung Estimasi Bubuk (Rendemen)
    let rendemen = 0.20; // Default
    if (metode === "fullwash") rendemen = 0.16;
    else if (metode === "honey") rendemen = 0.18;

    const estimasiBubuk = Math.round(jumlah * rendemen);

    return {
        jadwal,
        tglSelesai: jadwal[jadwal.length-1].selesai,
        totalHari,
        estimasiBubuk
    };
}