const firebaseConfig = {
  apiKey: "AIzaSyBaqROPsywPgtKjQU7cs1ke1WaqDFhWwn0",
  authDomain: "sistema-gw-36566.firebaseapp.com",
  projectId: "sistema-gw-36566",
  storageBucket: "sistema-gw-36566.firebasestorage.app",
  messagingSenderId: "472820177992",
  appId: "1:472820177992:web:2e1b98c9f6ac3a823d0c7d"
};

const VERSAO = "1.1";
document.getElementById("versao-app").textContent = "v" + VERSAO;

firebase.initializeApp(firebaseConfig);
const db  = firebase.firestore();
const col = db.collection("funcionarios");

function escHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function parseMoeda(s) {
  const v = parseFloat(String(s).replace(/[^\d,]/g, "").replace(",", "."));
  return isNaN(v) ? 0 : v;
}

function fmtMoeda(v) {
  return "R$ " + (v || 0).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function hoje() {
  const d = new Date();
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear()
  ].join("/");
}

let funcionariosCache = {};

function render(docs) {
  const lista = document.getElementById("lista");
  funcionariosCache = {};

  if (docs.length === 0) {
    lista.innerHTML = '<p class="empty">Nenhum funcionário cadastrado.</p>';
    return;
  }

  lista.innerHTML = docs.map(doc => {
    const f = doc.data();
    funcionariosCache[doc.id] = f;
    return `
      <div class="card">
        <button class="btn-del" onclick="excluir('${doc.id}')" title="Excluir">✕</button>
        <div class="card-nome">${escHtml(f.nome)}</div>
        <div class="card-info">
          <span class="badge">${escHtml(f.cargo)}</span>
          <span class="card-salario ${f.cargo === 'PINTOR' ? 'por-producao' : ''}">${f.cargo === 'PINTOR' ? 'Por produção' : fmtMoeda(f.salario)}</span>
        </div>
        <div class="card-meta">
          <span>Admissão: ${escHtml(f.admissao)}</span>
          ${f.telefone ? `<span>📞 ${escHtml(f.telefone)}</span>` : ""}
        </div>
        ${f.obs ? `<div class="card-obs">${escHtml(f.obs)}</div>` : ""}
      </div>`;
  }).join("");
}

col.orderBy("criadoEm", "asc").onSnapshot(snap => {
  render(snap.docs);
}, err => {
  console.error(err);
  document.getElementById("lista").innerHTML =
    '<p class="empty">Erro ao conectar. Verifique sua internet.</p>';
});

document.getElementById("form").addEventListener("submit", function(e) {
  e.preventDefault();
  const nome     = document.getElementById("f-nome").value.trim();
  const cargo    = document.getElementById("f-cargo").value.trim();
  const admissao = document.getElementById("f-admissao").value.trim();
  const isPintor = cargo.toUpperCase() === "PINTOR";
  const salario  = isPintor ? 0 : parseMoeda(document.getElementById("f-salario").value);
  const telefone = document.getElementById("f-telefone").value.trim();
  const obs      = document.getElementById("f-obs").value.trim();

  if (!nome || !cargo || !admissao) {
    alert("Nome, Cargo e Admissão são obrigatórios.");
    return;
  }

  col.add({ nome, cargo, admissao, salario, telefone, obs,
    criadoEm: firebase.firestore.FieldValue.serverTimestamp() });

  this.reset();
  document.getElementById("f-admissao").value = hoje();
  toggleForm();
});

document.getElementById("f-salario").addEventListener("blur", function() {
  const v = parseMoeda(this.value);
  if (v > 0) this.value = v.toFixed(2).replace(".", ",");
});

document.getElementById("f-cargo").addEventListener("input", function() {
  const wrap = document.getElementById("wrap-salario");
  wrap.style.display = this.value.trim().toUpperCase() === "PINTOR" ? "none" : "";
});

document.getElementById("f-admissao").value = hoje();

function excluir(id) {
  const f = funcionariosCache[id];
  if (!f) return;
  const info = `${f.nome} — ${f.cargo}`;
  const senha = prompt("EXCLUIR FUNCIONÁRIO?\n\n" + info + "\n\nDigite a senha:");
  if (senha === null) return;
  if (senha !== "4512") {
    alert("Senha incorreta.");
    return;
  }
  col.doc(id).delete();
}

function toggleForm() {
  const form = document.getElementById("form");
  const fab  = document.getElementById("fab");
  const open = form.style.display === "none" || form.style.display === "";
  form.style.display = open ? "block" : "none";
  fab.classList.toggle("open", open);
  if (open) document.getElementById("f-nome").focus();
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}
