// ==========================================
// AUTH.JS - FULL FIREBASE AUTH (GOOGLE + EMAIL)
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged,
    createUserWithEmailAndPassword, // <-- Import Baru
    signInWithEmailAndPassword      // <-- Import Baru
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { showToast } from "./toast.js";

// --- KONFIGURASI FIREBASE (PASTE PUNYAMU YANG BENAR DISINI) ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Init App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ==========================================
// 1. LISTENER STATUS USER (Login/Logout)
// ==========================================
onAuthStateChanged(auth, (user) => {
    const currentPath = window.location.pathname;

    if (user) {
        // --- USER LOGIN ---
        console.log("✅ User Masuk:", user.email);
        
        // Simpan ke LocalStorage (Untuk akses cepat di UI)
        localStorage.setItem('isLoggedIn', 'true');
        // Kalau login manual, displayName mungkin kosong, jadi pakai email
        localStorage.setItem('userName', user.displayName || user.email.split('@')[0]);
        localStorage.setItem('userEmail', user.email);

        // Update UI Nama User
        const userSpan = document.getElementById('userName');
        if(userSpan) userSpan.textContent = localStorage.getItem('userName');

        // Redirect dari Login ke Index
        if (currentPath.includes('login.html') || currentPath.includes('landing.html')) {
            window.location.href = 'index.html';
        }

    } else {
        // --- USER LOGOUT ---
        console.log("❌ User Keluar");
        localStorage.clear();

        // Redirect dari Index ke Landing Page
        if (!currentPath.includes('login.html') && !currentPath.includes('landing.html')) {
            window.location.href = 'landing.html';
        }
    }
});

// ==========================================
// 2. FUNGSI LOGIN & DAFTAR MANUAL
// ==========================================

// Login Biasa
window.handleLoginManual = function(e) {
    e.preventDefault(); // Stop reload form
    const email = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    signInWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            // Berhasil, onAuthStateChanged akan handle redirect
            showToast("Login Berhasil!", "success");
        })
        .catch((error) => {
            console.error(error);
            showToast("Gagal Login: " + translateError(error.code), "error");
        });
};

// Daftar Baru
window.handleRegisterManual = function() {
    const email = document.getElementById("username").value;
    const pass = document.getElementById("password").value;

    if(!email || !pass) {
        showToast("Isi email dan password dulu!", "warning");
        return;
    }
    
    if(pass.length < 6) {
        showToast("Password minimal 6 karakter!", "warning");
        return;
    }

    createUserWithEmailAndPassword(auth, email, pass)
        .then((userCredential) => {
            showToast("✅ Akun berhasil dibuat! Otomatis login...", "success");
            // onAuthStateChanged akan handle sisanya
        })
        .catch((error) => {
            console.error(error);
            showToast("Gagal Daftar: " + translateError(error.code), "error");
        });
};
// ...
window.loginWithGoogle = function() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error) => {
        showToast("Gagal Google Auth: " + error.message, "error");
    });
};

window.handleLogout = function() {
    // Tampilkan Modal Logout
    const modal = document.getElementById('logoutModal');
    if(modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    } else {
        // Fallback jika modal tidak ada (misal di halaman lain)
        if(confirm("Yakin ingin keluar?")) window.confirmLogout();
    }
};

window.confirmLogout = function() {
    signOut(auth)
        .then(() => showToast("Berhasil Logout", "info"))
        .catch((error) => console.error("Error Logout:", error));
};

// Listener Tombol Logout (Jika ada di halaman)
// Listener Tombol Logout (Pastikan elemen ada)
document.addEventListener('DOMContentLoaded', () => {
    const btnLogout = document.getElementById('logoutBtn');
    if(btnLogout) {
        // Hapus listener lama jika ada (optional, tapi good practice)
        btnLogout.removeEventListener('click', window.handleLogout);
        btnLogout.addEventListener('click', window.handleLogout);
        console.log("✅ Logout Listener Attached");
    } else {
        console.warn("⚠️ Logout Button Not Found");
    }
});