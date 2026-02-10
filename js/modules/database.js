// MODULE: DATABASE FIRESTORE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, query, where, getDocs, orderBy, doc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Config Firebase (Paste API Key Kamu Disini)
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

// Fungsi Simpan
export async function simpanData(data) {
    try {
        await addDoc(collection(db, "riwayat_produksi"), data);
        return { success: true };
    } catch (e) {
        throw e;
    }
}

// Fungsi Ambil Data
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
    } catch (e) {
        throw e;
    }
}

// Fungsi Update
export async function updateData(id, newData) {
    try {
        const docRef = doc(db, "riwayat_produksi", id);
        await updateDoc(docRef, newData);
        return { success: true };
    } catch (e) {
        throw e;
    }
}