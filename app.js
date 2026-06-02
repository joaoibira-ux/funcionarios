const firebaseConfig = {
  apiKey: "AIzaSyBaqROPsywPgtKjQU7cs1ke1WaqDFhWwn0",
  authDomain: "sistema-gw-36566.firebaseapp.com",
  projectId: "sistema-gw-36566",
  storageBucket: "sistema-gw-36566.firebasestorage.app",
  messagingSenderId: "472820177992",
  appId: "1:472820177992:web:2e1b98c9f6ac3a823d0c7d"
};

const VERSAO = "2.1";
const CARGOS_POR_PRODUCAO = ["PINTOR", "RASPADOR"];

document.getElementById("versao-app").textContent = "v" + VERSAO;

firebase.initializeApp(firebaseConfig);
const db  = firebase.firestore();
const col = db.collection("funcionarios");

function escHtml(s) {
  return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function parseMoeda(s) {
  const v = parseFloat(String(s).replace(/[^\d,]/g,"").replace(",","."));
  return isNaN(v) ? 0 : v;
}

function fmtMoeda(v) {
  return "R$ " + (v||0).toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g,".");
}

function hoje() {
  const d = new Date();
  return [String(d.getDate()).padStart(2,"0"), String(d.getMonth()+1).padStart(2,"0"), d.getFullYear()].join("/");
}

function ehServente(cargo) { return (cargo||"").toLowerCase().includes("ajudante"); }
function ehPorProducao(cargo) { return CARGOS_POR_PRODUCAO.includes((cargo||"").toUpperCase()); }

let funcionariosCache = {};
let editandoId = null;

// ── Lista ─────────────────────────────────────────────────
function render(docs) {
  const lista = document.getElementById("lista");
  funcionariosCache = {};
  if (!docs.length) { lista.innerHTML = '<p class="empty">Nenhum funcionário cadastrado.</p>'; return; }
  lista.innerHTML = docs.map(doc => {
    const f = doc.data();
    funcionariosCache[doc.id] = f;
    const porProd = ehPorProducao(f.cargo);
    const ativo   = f.ativo !== false;
    return `
      <div class="card ${ativo ? '' : 'inativo'}">
        <div class="card-acoes">
          <button class="btn-consultar" onclick="consultarFuncionario('${doc.id}')">Consultar</button>
          <button class="btn-del" onclick="excluir('${doc.id}')" title="Excluir">✕</button>
        </div>
        <div class="card-nome">${escHtml(f.nome)}</div>
        <div class="card-info">
          <span class="badge">${escHtml(f.cargo)}</span>
          <span class="card-salario ${porProd ? 'por-producao' : ''}">
            ${porProd ? 'Por produção' : ehServente(f.cargo) ? 'Diária: '+fmtMoeda(f.salario) : fmtMoeda(f.salario)}
          </span>
          <button class="btn-ativo ${ativo ? 'ativo' : 'inativo'}" onclick="toggleAtivo('${doc.id}')">
            ${ativo ? '● Ativo' : '○ Inativo'}
          </button>
        </div>
        <div class="card-meta">
          <span>Admissão: ${escHtml(f.admissao||'')}</span>
          ${f.telefone ? `<span>📞 ${escHtml(f.telefone)}</span>` : ""}
          ${f.cpf ? `<span>CPF: ${escHtml(f.cpf)}</span>` : ""}
        </div>
        ${f.obs ? `<div class="card-obs">${escHtml(f.obs)}</div>` : ""}
      </div>`;
  }).join("");
}

col.orderBy("criadoEm","asc").onSnapshot(snap => render(snap.docs), err => {
  document.getElementById("lista").innerHTML = '<p class="empty">Erro ao conectar.</p>';
});

// ── Formulário ─────────────────────────────────────────────
function abrirFormulario() {
  editandoId = null;
  document.getElementById("form").reset();
  document.getElementById("f-admissao").value = hoje();
  document.getElementById("btn-submit").textContent = "💾 Salvar";
  document.getElementById("wrap-salario").style.display = "";
  document.getElementById("form-overlay").style.display = "flex";
  document.getElementById("fab").classList.add("open");
  document.getElementById("f-nome").focus();
}

function fecharFormulario() {
  document.getElementById("form-overlay").style.display = "none";
  document.getElementById("assin-overlay").style.display = "none";
  document.getElementById("fab").classList.remove("open");
  editandoId = null;
}

// Cargo: atualiza label salário
document.getElementById("f-cargo").addEventListener("change", function() {
  const wrap = document.getElementById("wrap-salario");
  const lbl  = document.getElementById("lbl-salario");
  wrap.style.display = ehPorProducao(this.value) ? "none" : "";
  lbl.textContent = ehServente(this.value) ? "Diária (R$)" : "Salário (R$)";
});

document.getElementById("f-salario").addEventListener("blur", function() {
  const v = parseMoeda(this.value);
  if (v > 0) this.value = v.toFixed(2).replace(".",",");
});

// ── Salvar ────────────────────────────────────────────────
function lerCampos() {
  const v = id => (document.getElementById(id)||{}).value || "";
  const radios = name => { const r = document.querySelector(`input[name="${name}"]:checked`); return r ? r.value : ""; };
  return {
    nome:         v("f-nome").trim(),
    cargo:        v("f-cargo"),
    admissao:     v("f-admissao").trim(),
    salario:      ehPorProducao(v("f-cargo")) ? 0 : parseMoeda(v("f-salario")),
    telefone:     v("f-telefone").trim(),
    obs:          v("f-obs").trim(),
    // Pessoais
    nacionalidade: v("f-nacionalidade").trim(),
    estadocivil:   v("f-estadocivil"),
    nascimento:    v("f-nascimento").trim(),
    conjuge:       v("f-conjuge").trim(),
    localnasc:     v("f-localnasc").trim(),
    ufnasc:        v("f-ufnasc").trim().toUpperCase(),
    nomemae:       v("f-nomemae").trim(),
    instrucao:     radios("instrucao"),
    instrucaoStatus: radios("instrucao_status"),
    // Documentos
    cpf:           v("f-cpf").trim(),
    rg:            v("f-rg").trim(),
    orgaoemissor:  v("f-orgaoemissor").trim(),
    ufrg:          v("f-ufrg").trim().toUpperCase(),
    emissaorg:     v("f-emissaorg").trim(),
    ctps:          v("f-ctps").trim(),
    seriectps:     v("f-seriectps").trim(),
    ufctps:        v("f-ufctps").trim().toUpperCase(),
    emissaoctps:   v("f-emissaoctps").trim(),
    // Endereço
    endereco:      v("f-endereco").trim(),
    cep:           v("f-cep").trim(),
    cidade:        v("f-cidade").trim(),
    uf:            v("f-uf").trim().toUpperCase(),
  };
}

document.getElementById("form").addEventListener("submit", function(e) {
  e.preventDefault();
  const dados = lerCampos();
  if (!dados.nome || !dados.cargo) { alert("Nome e Cargo são obrigatórios."); return; }

  if (editandoId) {
    col.doc(editandoId).update(dados);
    editandoId = null;
  } else {
    col.add({ ...dados, ativo: true, criadoEm: firebase.firestore.FieldValue.serverTimestamp() });
  }
  fecharFormulario();
});

function editarFuncionario(id) {
  const f = funcionariosCache[id];
  if (!f) return;
  editandoId = id;

  const set = (fid, val) => { const el = document.getElementById(fid); if (el) el.value = val || ""; };
  set("f-nome", f.nome); set("f-cargo", f.cargo); set("f-admissao", f.admissao);
  set("f-salario", f.salario > 0 ? f.salario.toFixed(2).replace(".",",") : "");
  set("f-telefone", f.telefone); set("f-obs", f.obs);
  set("f-nacionalidade", f.nacionalidade); set("f-estadocivil", f.estadocivil);
  set("f-nascimento", f.nascimento); set("f-conjuge", f.conjuge);
  set("f-localnasc", f.localnasc); set("f-ufnasc", f.ufnasc);
  set("f-nomemae", f.nomemae);
  set("f-cpf", f.cpf); set("f-rg", f.rg); set("f-orgaoemissor", f.orgaoemissor);
  set("f-ufrg", f.ufrg); set("f-emissaorg", f.emissaorg);
  set("f-ctps", f.ctps); set("f-seriectps", f.seriectps);
  set("f-ufctps", f.ufctps); set("f-emissaoctps", f.emissaoctps);
  set("f-endereco", f.endereco); set("f-cep", f.cep);
  set("f-cidade", f.cidade); set("f-uf", f.uf);

  if (f.instrucao) { const r = document.querySelector(`input[name="instrucao"][value="${f.instrucao}"]`); if (r) r.checked = true; }
  if (f.instrucaoStatus) { const r = document.querySelector(`input[name="instrucao_status"][value="${f.instrucaoStatus}"]`); if (r) r.checked = true; }

  const porProd = ehPorProducao(f.cargo);
  document.getElementById("wrap-salario").style.display = porProd ? "none" : "";
  document.getElementById("lbl-salario").textContent = ehServente(f.cargo) ? "Diária (R$)" : "Salário (R$)";
  document.getElementById("btn-submit").textContent = "✓ Salvar alterações";

  document.getElementById("form-overlay").style.display = "flex";
  document.getElementById("fab").classList.add("open");
}

function toggleAtivo(id) {
  const f = funcionariosCache[id];
  if (!f) return;
  const acao = f.ativo === false ? 'ATIVAR' : 'DESATIVAR';
  const senha = prompt(`${acao} funcionário?\n${f.nome}\n\nDigite a senha:`);
  if (senha === null) return;
  if (senha !== '4512') { alert('Senha incorreta.'); return; }
  col.doc(id).update({ ativo: f.ativo === false });
}

function excluir(id) {
  const f = funcionariosCache[id];
  if (!f) return;
  const senha = prompt(`EXCLUIR FUNCIONÁRIO?\n\n${f.nome} — ${f.cargo}\n\nDigite a senha:`);
  if (senha === null) return;
  if (senha !== "4512") { alert("Senha incorreta."); return; }
  col.doc(id).delete();
}

// ── Consultar ──────────────────────────────────────────────
let consultandoId = null;

function consultarFuncionario(id) {
  const f = funcionariosCache[id];
  if (!f) return;
  consultandoId = id;
  const c = (label, val) => val ? `<div class="cons-campo"><span class="cons-label">${escHtml(label)}</span><span class="cons-valor">${escHtml(val)}</span></div>` : '';
  const sec = title => `<div class="form-section-title">${title}</div><div class="cons-grid">`;
  const instrucao = [f.instrucao, f.instrucaoStatus].filter(Boolean).join(' — ');
  document.getElementById('consultar-body').innerHTML = `
    ${sec('Identificação')}
      ${c('Nome', f.nome)}${c('Cargo', f.cargo)}${c('Admissão', f.admissao)}
      ${c(ehServente(f.cargo) ? 'Diária' : 'Salário', f.salario > 0 ? fmtMoeda(f.salario) : 'Por produção')}
      ${c('Telefone', f.telefone)}${c('Observações', f.obs)}
    </div>
    ${sec('Dados Pessoais')}
      ${c('Nacionalidade', f.nacionalidade)}${c('Estado Civil', f.estadocivil)}
      ${c('Nascimento', f.nascimento)}${c('Cônjuge', f.conjuge)}
      ${c('Local de Nascimento', f.localnasc)}${c('UF Nasc.', f.ufnasc)}
      ${c('Nome da Mãe', f.nomemae)}${c('Grau de Instrução', instrucao)}
    </div>
    ${sec('Documentos')}
      ${c('CPF', f.cpf)}${c('Identidade (RG)', f.rg)}
      ${c('Órgão Emissor', f.orgaoemissor)}${c('UF Identidade', f.ufrg)}
      ${c('Data Emissão RG', f.emissaorg)}${c('CTPS', f.ctps)}
      ${c('Série CTPS', f.seriectps)}${c('UF CTPS', f.ufctps)}
      ${c('Data Emissão CTPS', f.emissaoctps)}
    </div>
    ${sec('Endereço')}
      ${c('Endereço', f.endereco)}${c('CEP', f.cep)}
      ${c('Cidade', f.cidade)}${c('UF', f.uf)}
    </div>`;
  document.getElementById('consultar-overlay').style.display = 'flex';
}

function fecharConsultar() {
  document.getElementById('consultar-overlay').style.display = 'none';
  consultandoId = null;
}

function editarDoConsultar() {
  fecharConsultar();
  editarFuncionario(consultandoId);
}

function irParaAssinaturaDoConsultar() {
  document.getElementById('consultar-overlay').style.display = 'none';
  document.getElementById('assin-overlay').style.display = 'flex';
  if (!_canvasInited) { initCanvas(); _canvasInited = true; }
  limparAssinatura();
}

function voltarDaAssinatura() {
  document.getElementById('assin-overlay').style.display = 'none';
  if (consultandoId) {
    document.getElementById('consultar-overlay').style.display = 'flex';
  } else {
    document.getElementById('form-overlay').style.display = 'flex';
  }
}

// ── Assinatura ────────────────────────────────────────────
let _canvasInited = false;

function initCanvas() {
  const canvas = document.getElementById("assin-canvas");
  const ctx    = canvas.getContext("2d");

  function resize() {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (w === 0 || h === 0) return;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    canvas.width  = w * window.devicePixelRatio;
    canvas.height = h * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.strokeStyle = "#1a3322";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  }
  resize();

  let drawing = false;

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  canvas.addEventListener("mousedown",  e => { drawing = true; ctx.beginPath(); const p = pos(e); ctx.moveTo(p.x, p.y); e.preventDefault(); });
  canvas.addEventListener("mousemove",  e => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); });
  canvas.addEventListener("mouseup",    () => drawing = false);
  canvas.addEventListener("mouseleave", () => drawing = false);
  canvas.addEventListener("touchstart", e => { drawing = true; ctx.beginPath(); const p = pos(e); ctx.moveTo(p.x, p.y); e.preventDefault(); }, { passive: false });
  canvas.addEventListener("touchmove",  e => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); }, { passive: false });
  canvas.addEventListener("touchend",   () => drawing = false);
}

function limparAssinatura() {
  const canvas = document.getElementById("assin-canvas");
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
}

function canvasVazio() {
  const canvas = document.getElementById('assin-canvas');
  return !canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some(v=>v!==0);
}

function assinarEGerarPDF() {
  if (canvasVazio()) { alert('Por favor, assine antes de gerar o PDF.'); return; }
  gerarPDF();
}

// ── PDF ───────────────────────────────────────────────────
function gerarPDF() {
  if (typeof window.jspdf === "undefined") { alert("Biblioteca PDF não carregada. Verifique sua conexão."); return; }
  const { jsPDF } = window.jspdf;
  const doc   = new jsPDF({ unit: "mm", format: "a4" });
  const dados = consultandoId ? funcionariosCache[consultandoId] : lerCampos();
  if (!dados) return;
  const W    = 210;
  const mg   = 14;
  let y      = mg;

  // Cabeçalho
  doc.setFillColor(26, 51, 34);
  doc.rect(0, 0, W, 22, "F");
  doc.setTextColor(165, 214, 167);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("GREEN WALL — CONSTRUÇÃO E ACABAMENTO", W / 2, 10, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("FICHA DE REGISTRO DE EMPREGADO", W / 2, 17, { align: "center" });

  y = 28;
  doc.setTextColor(0);

  function titulo(txt) {
    doc.setFillColor(232, 245, 233);
    doc.rect(mg, y, W - mg * 2, 6, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 51, 34);
    doc.text(txt.toUpperCase(), mg + 2, y + 4.2);
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    y += 8;
  }

  function campo(label, valor, x, largura) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.setFontSize(8.5);
    doc.text(valor || "—", x, y + 4.5);
    doc.setDrawColor(200);
    doc.line(x, y + 5.5, x + largura - 2, y + 5.5);
    doc.setDrawColor(0);
  }

  function linha2(l1, v1, l2, v2) {
    const half = (W - mg * 2 - 4) / 2;
    campo(l1, v1, mg, half);
    campo(l2, v2, mg + half + 4, half);
    y += 12;
  }

  function linha1(label, valor) {
    campo(label, valor, mg, W - mg * 2);
    y += 12;
  }

  titulo("Identificação");
  linha1("Nome Completo", dados.nome);
  linha2("Cargo", dados.cargo, "Admissão", dados.admissao);
  linha2("Salário / Diária", dados.salario > 0 ? fmtMoeda(dados.salario) : "Por produção", "Telefone", dados.telefone);

  titulo("Dados Pessoais");
  linha2("Nacionalidade", dados.nacionalidade, "Estado Civil", dados.estadocivil);
  linha2("Data de Nascimento", dados.nascimento, "Cônjuge", dados.conjuge);
  linha2("Local de Nascimento", dados.localnasc, "UF Nasc.", dados.ufnasc);
  linha1("Nome da Mãe", dados.nomemae);
  const instrucaoTxt = [dados.instrucao, dados.instrucaoStatus].filter(Boolean).join(" — ");
  linha2("Grau de Instrução", instrucaoTxt, "Obs", dados.obs);

  titulo("Documentos");
  linha2("CPF", dados.cpf, "Identidade (RG)", dados.rg);
  linha2("Órgão Emissor", dados.orgaoemissor, "UF / Data Emissão RG", `${dados.ufrg} — ${dados.emissaorg}`);
  linha2("CTPS", dados.ctps, "Série / UF / Emissão CTPS", `${dados.seriectps} / ${dados.ufctps} — ${dados.emissaoctps}`);

  titulo("Endereço");
  linha1("Endereço", dados.endereco);
  linha2("CEP", dados.cep, "Cidade / UF", `${dados.cidade} — ${dados.uf}`);

  // Assinatura
  y += 4;
  if (y > 240) { doc.addPage(); y = 20; }

  titulo("Assinatura");
  const canvas = document.getElementById("assin-canvas");
  const assinImg = canvas.toDataURL("image/png");
  const canvasVazio = !canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data.some(v=>v!==0);

  if (!canvasVazio) {
    doc.addImage(assinImg, "PNG", mg, y, 80, 30);
  }

  doc.setDrawColor(100);
  doc.line(mg, y + 33, mg + 80, y + 33);
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(dados.nome || "Assinatura do Funcionário", mg + 40, y + 37, { align: "center" });

  // Data no rodapé
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, W - mg, 290, { align: "right" });

  const nomeArq = (dados.nome || "funcionario").replace(/\s+/g, "_").toLowerCase();
  doc.save(`ficha_${nomeArq}.pdf`);
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" });
}
