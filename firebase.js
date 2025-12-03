import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// ======= твой конфиг Firebase =======
const firebaseConfig = {
  apiKey: "AIzaSyA6uOS8shaJf69bCsFofUhr2BQxfMbguyQ",
  authDomain: "lifejunk-b989d.firebaseapp.com",
  projectId: "lifejunk-b989d",
  storageBucket: "lifejunk-b989d.firebasestorage.app",
  messagingSenderId: "736883566845",
  appId: "1:736883566845:web:0b8a87e82ad2970e7ef694",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI элементы
const emailEl = document.getElementById("email");
const passEl = document.getElementById("pass");
const btnSignup = document.getElementById("btn-signup");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const whoami = document.getElementById("whoami");

function refreshAuthUI(user) {
  const logged = !!user;
  [emailEl, passEl, btnSignup, btnLogin].forEach((el) =>
    el?.classList.toggle("hidden", logged)
  );
  btnLogout?.classList.toggle("hidden", !logged);
  if (whoami) whoami.textContent = logged ? ` · ${user.email || user.uid}` : "";
}

onAuthStateChanged(auth, async (user) => {
  refreshAuthUI(user);
  if (user) await loadCloudSave();
});

btnSignup?.addEventListener("click", async () => {
  try {
    await createUserWithEmailAndPassword(
      auth,
      emailEl.value.trim(),
      passEl.value
    );
    alert("Аккаунт создан. Теперь войди.");
  } catch (e) {
    alert(e.message);
  }
});

btnLogin?.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(
      auth,
      emailEl.value.trim(),
      passEl.value
    );
  } catch (e) {
    alert(e.message);
  }
});

btnLogout?.addEventListener("click", async () => {
  await signOut(auth);
});

// ====== Облачные сейвы (Firestore) ======
if (!window.S) window.S = {};
if (!window.S.meta) window.S.meta = {};

function touchUpdated() {
  window.S.meta.updatedAt = Date.now();
}

async function saveCloud() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    await setDoc(
      doc(db, "saves", user.uid),
      {
        data: window.S,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("Cloud save error:", e.message);
  }
}

async function loadCloudSave() {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const snap = await getDoc(doc(db, "saves", user.uid));
    if (snap.exists()) {
      const cloud = snap.data().data;
      const localTs = (window.S.meta && window.S.meta.updatedAt) || 0;
      const cloudTs = (cloud.meta && cloud.meta.updatedAt) || 0;

      if (cloudTs >= localTs) {
        Object.assign(window.S, cloud);
        try {
          window.tick && window.tick(0); // чтобы обновить UI через renderStats
        } catch (_) {}
      } else {
        await saveCloud();
      }
    } else {
      await saveCloud();
    }
  } catch (e) {
    console.warn("Cloud load error:", e.message);
  }
}

// Debounced autosave
let cloudTimer;
function autosaveCloudDebounced() {
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(saveCloud, 1500);
}

// Патчим tick для автосейва
const _tick = window.tick;
if (typeof _tick === "function") {
  window.tick = function (dt) {
    _tick(dt);
    try {
      touchUpdated();
      autosaveCloudDebounced();
    } catch (_) {}
  };
}
