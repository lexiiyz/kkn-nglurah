// MODULE: DATABASE FIRESTORE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc, getDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ... (Config & Init remains same) ...
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- COLLECTION: riwayat_produksi (Arsip Selesai) ---

export async function simpanData(data) {
    try {
        await addDoc(collection(db, "riwayat_produksi"), data);
        return { success: true };
    } catch (e) { throw e; }
}

export async function ambilRiwayat(email) {
    try {
        const q = query(
            collection(db, "riwayat_produksi"), 
            where("email", "==", email),
            orderBy("timestamp", "desc")
        );
        const snapshot = await getDocs(q);
        let results = [];
        snapshot.forEach(doc => {
            let d = doc.data();
            d.id = doc.id;
            results.push(d);
        });
        return results;
    } catch (e) { throw e; }
}

export async function updateData(id, newData) {
    try {
        const docRef = doc(db, "riwayat_produksi", id);
        await updateDoc(docRef, newData);
        return { success: true };
    } catch (e) { throw e; }
}

// --- COLLECTION: produksi_active (Batch Berjalan) ---

export async function createBatch(data) {
    try {
        const docRef = await addDoc(collection(db, "produksi_active"), data);
        return { success: true, id: docRef.id };
    } catch (e) { throw e; }
}

export async function getActiveBatches(email) {
    try {
        const q = query(
            collection(db, "produksi_active"),
            where("email", "==", email),
            orderBy("timestamp", "desc")
        );
        const snapshot = await getDocs(q);
        let results = [];
        snapshot.forEach(doc => {
            let d = doc.data();
            d.id = doc.id;
            results.push(d);
        });
        return results;
    } catch (e) { throw e; }
}

export async function updateBatch(id, newData) {
    try {
        const docRef = doc(db, "produksi_active", id);
        await updateDoc(docRef, newData);
        return { success: true };
    } catch (e) { throw e; }
}

export async function getBatchById(id) {
    try {
        const docRef = doc(db, "produksi_active", id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() };
        } else {
            throw new Error("Batch tidak ditemukan");
        }
    } catch (e) { throw e; }
}

export async function moveBatchToHistory(batchId, finalData) {
    try {
        // 1. Simpan ke Riwayat
        await addDoc(collection(db, "riwayat_produksi"), finalData);
        
        // 2. Hapus dari Active
        await deleteDoc(doc(db, "produksi_active", batchId));
        
        return { success: true };
    } catch (e) { throw e; }
}