/* =====================================================================
   D'Ivna Confeitaria — pedidos.js
   Painel privado: login, pedidos por período, totais, status e planilha.
   Conversa direto com o Supabase (endereço e chave em config.js).
   A proteção de verdade está no banco (supabase/pedidos.sql): sem a
   conta autorizada, o banco não entrega nenhum pedido.
   ===================================================================== */
"use strict";

const CHAVE_SESSAO = "divna_painel_sessao";
const CHAVE_PERIODO = "divna_painel_periodo";
const ATUALIZAR_A_CADA_MS = 60 * 1000;
const POR_PAGINA = 1000;

const STATUS = {
  novo: "Novo",
  confirmado: "Confirmado",
  entregue: "Entregue",
  cancelado: "Cancelado"
};

/* ------------------------------- UTILITÁRIOS ------------------------------- */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dinheiro = (centavos) => formatoMoeda.format((Number(centavos) || 0) / 100).replace(/\s/g, " ");
const esc = (t) =>
  String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const doisDigitos = (n) => String(n).padStart(2, "0");
const dataISO = (d) => `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

function guardar(chave, valor) {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(valor));
  } catch (e) { /* navegador sem armazenamento */ }
}
function ler(chave) {
  try { return JSON.parse(localStorage.getItem(chave) || "null"); } catch (e) { return null; }
}

/* ------------------------------ CONEXÃO COM O BANCO ------------------------------ */

const BASE = typeof SUPABASE_URL === "string" ? SUPABASE_URL.trim().replace(/\/+$/, "") : "";
const CHAVE = typeof SUPABASE_CHAVE === "string" ? SUPABASE_CHAVE.trim() : "";
const configurado = () => BASE !== "" && CHAVE !== "";

let sessao = ler(CHAVE_SESSAO); // { access_token, refresh_token, expires_at, email }

class ErroSessao extends Error {}

function salvarSessao(dados) {
  sessao = {
    access_token: dados.access_token,
    refresh_token: dados.refresh_token,
    expires_at: dados.expires_at || Math.floor(Date.now() / 1000) + Number(dados.expires_in || 3600),
    email: (dados.user && dados.user.email) || (sessao && sessao.email) || ""
  };
  guardar(CHAVE_SESSAO, sessao);
}

async function chamarAuth(caminho, corpo, token) {
  const cabecalhos = { apikey: CHAVE, "Content-Type": "application/json" };
  if (token) cabecalhos.Authorization = `Bearer ${token}`;
  const resposta = await fetch(`${BASE}/auth/v1/${caminho}`, {
    method: "POST",
    headers: cabecalhos,
    body: JSON.stringify(corpo || {})
  });
  let dados = null;
  try { dados = await resposta.json(); } catch (e) { /* resposta sem corpo */ }
  return { ok: resposta.ok, status: resposta.status, dados };
}

let renovando = null;
function renovarSessao() {
  if (!sessao || !sessao.refresh_token) return Promise.reject(new ErroSessao());
  if (!renovando) {
    renovando = chamarAuth("token?grant_type=refresh_token", { refresh_token: sessao.refresh_token })
      .then((r) => {
        if (!r.ok || !r.dados || !r.dados.access_token) throw new ErroSessao();
        salvarSessao(r.dados);
      })
      .finally(() => { renovando = null; });
  }
  return renovando;
}

async function tokenAtual() {
  if (!sessao) throw new ErroSessao();
  if (Number(sessao.expires_at || 0) - 60 < Date.now() / 1000) await renovarSessao();
  return sessao.access_token;
}

/** Chamada à API de dados com a sessão da confeiteira (renova o acesso se precisar). */
async function api(metodo, caminho, corpo, extras = {}, tentativa = 0) {
  const token = await tokenAtual();
  const resposta = await fetch(`${BASE}/rest/v1/${caminho}`, {
    method: metodo,
    headers: { apikey: CHAVE, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...extras },
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });
  if (resposta.status === 401 && tentativa === 0) {
    await renovarSessao();
    return api(metodo, caminho, corpo, extras, 1);
  }
  if (resposta.status === 401) throw new ErroSessao();
  if (!resposta.ok) throw new Error(`Erro ${resposta.status}: ${await resposta.text()}`);
  return resposta.status === 204 ? null : resposta.json();
}

/* ------------------------------------ TELAS ------------------------------------ */

function mostrarTela(id) {
  ["tela-config", "tela-login", "tela-sem-acesso", "tela-painel"].forEach((t) => { $("#" + t).hidden = t !== id; });
  const logado = id === "tela-painel" || id === "tela-sem-acesso";
  $("#conta").hidden = !logado;
  $("#conta-email").textContent = logado && sessao ? sessao.email : "";
}

function irParaLogin(mensagem) {
  sessao = null;
  guardar(CHAVE_SESSAO, null);
  pararAtualizacao();
  mostrarTela("tela-login");
  mostrarErroLogin(mensagem || "");
  $("#login-senha").value = "";
}

function mostrarErroLogin(texto) {
  $("#erro-login").textContent = texto;
  $("#erro-login").hidden = !texto;
}

async function entrar(e) {
  e.preventDefault();
  const email = $("#login-email").value.trim();
  const senha = $("#login-senha").value;
  if (!email || !senha) {
    mostrarErroLogin("Preencha o e-mail e a senha.");
    return;
  }

  const botao = $("#btn-entrar");
  botao.disabled = true;
  botao.textContent = "Entrando...";
  mostrarErroLogin("");
  try {
    const r = await chamarAuth("token?grant_type=password", { email, password: senha });
    if (r.ok && r.dados && r.dados.access_token) {
      salvarSessao(r.dados);
      $("#login-senha").value = "";
      await abrirPainel();
    } else if (r.status === 400 || r.status === 401) {
      mostrarErroLogin("E-mail ou senha incorretos.");
    } else if (r.status === 429) {
      mostrarErroLogin("Muitas tentativas seguidas. Espere alguns minutos e tente de novo.");
    } else {
      mostrarErroLogin("Não foi possível entrar agora. Tente de novo em instantes.");
    }
  } catch (erro) {
    mostrarErroLogin("Sem conexão com o servidor. Verifique a internet e tente de novo.");
  } finally {
    botao.disabled = false;
    botao.textContent = "Entrar";
  }
}

async function sair() {
  const token = sessao && sessao.access_token;
  irParaLogin("");
  if (token) chamarAuth("logout", {}, token).catch(() => {});
}

async function abrirPainel() {
  try {
    const admin = await api("POST", "rpc/eh_admin", {});
    if (admin !== true) {
      mostrarTela("tela-sem-acesso");
      return;
    }
    mostrarTela("tela-painel");
    aplicarPeriodo(estado.periodo, false);
    await carregar();
    carregarDepoimentos(); // atualiza o número de pendentes na aba
    iniciarAtualizacao();
  } catch (erro) {
    if (erro instanceof ErroSessao) irParaLogin("Sua sessão expirou. Entre de novo.");
    else {
      mostrarTela("tela-painel");
      avisar("Não foi possível conectar ao banco. Verifique a internet e toque em Atualizar.", true);
    }
  }
}

/* ----------------------------------- PERÍODO ----------------------------------- */

const estado = {
  periodo: "semana",
  de: null,           // Date (início, incluso)
  ate: null,          // Date (fim, não incluso)
  status: "todos",
  pedidos: []
};

const salvo = ler(CHAVE_PERIODO);
if (salvo && ["hoje", "semana", "mes", "mes-passado"].includes(salvo)) estado.periodo = salvo;

function inicioDoDia(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function somarDias(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

function calcularIntervalo(periodo) {
  const hoje = inicioDoDia(new Date());
  switch (periodo) {
    case "hoje":
      return [hoje, somarDias(hoje, 1)];
    case "semana": {
      const desdeSegunda = (hoje.getDay() + 6) % 7; // semana de segunda a domingo
      const segunda = somarDias(hoje, -desdeSegunda);
      return [segunda, somarDias(segunda, 7)];
    }
    case "mes":
      return [new Date(hoje.getFullYear(), hoje.getMonth(), 1), new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)];
    case "mes-passado":
      return [new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1), new Date(hoje.getFullYear(), hoje.getMonth(), 1)];
    default:
      return [estado.de, estado.ate];
  }
}

function textoIntervalo() {
  const fim = somarDias(estado.ate, -1);
  const dia = (d, comMes) => d.toLocaleDateString("pt-BR", comMes ? { day: "numeric", month: "long" } : { day: "numeric" });
  const mesmoDia = dataISO(estado.de) === dataISO(fim);
  const mesmoMes = estado.de.getMonth() === fim.getMonth() && estado.de.getFullYear() === fim.getFullYear();
  if (estado.periodo === "mes" || estado.periodo === "mes-passado") {
    const nome = estado.de.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return nome.charAt(0).toUpperCase() + nome.slice(1);
  }
  if (mesmoDia) return estado.de.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  return `${dia(estado.de, !mesmoMes)} a ${dia(fim, true)}`;
}

function aplicarPeriodo(periodo, recarregar = true) {
  estado.periodo = periodo;
  $$("[data-periodo]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.periodo === periodo ? "true" : "false"));

  const formDatas = $("#form-datas");
  if (periodo === "datas") {
    formDatas.hidden = false;
    if (!$("#data-de").value || !$("#data-ate").value) {
      const [de, ate] = estado.de ? [estado.de, estado.ate] : calcularIntervalo("mes");
      $("#data-de").value = dataISO(de);
      $("#data-ate").value = dataISO(somarDias(ate, -1));
    }
    $("#data-de").focus();
    return; // espera a pessoa tocar em "Ver"
  }
  formDatas.hidden = true;
  guardar(CHAVE_PERIODO, periodo);
  [estado.de, estado.ate] = calcularIntervalo(periodo);
  if (recarregar) carregar();
}

function aplicarDatas(e) {
  e.preventDefault();
  const de = $("#data-de").value;
  const ate = $("#data-ate").value;
  if (!de || !ate) return;
  const [a, b] = de <= ate ? [de, ate] : [ate, de];
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  estado.de = new Date(ay, am - 1, ad);
  estado.ate = new Date(by, bm - 1, bd + 1);
  carregar();
}

/* --------------------------------- PEDIDOS --------------------------------- */

let carregando = false;

async function carregar() {
  if (!estado.de || !estado.ate || carregando) return;
  carregando = true;
  $("#intervalo").textContent = textoIntervalo();
  $("#btn-atualizar").disabled = true;
  $("#btn-atualizar").textContent = "Atualizando...";

  try {
    const filtros =
      "select=id,codigo,criado_em,cliente_nome,observacoes,itens,total_centavos,status" +
      `&criado_em=gte.${encodeURIComponent(estado.de.toISOString())}` +
      `&criado_em=lt.${encodeURIComponent(estado.ate.toISOString())}` +
      "&order=criado_em.desc";

    const todos = [];
    for (let pagina = 0; ; pagina++) {
      const lote = await api("GET", `pedidos?${filtros}&limit=${POR_PAGINA}&offset=${pagina * POR_PAGINA}`);
      todos.push(...lote);
      if (lote.length < POR_PAGINA) break;
    }
    estado.pedidos = todos;
    esconderAviso();
    desenhar();
  } catch (erro) {
    if (erro instanceof ErroSessao) irParaLogin("Sua sessão expirou. Entre de novo.");
    else avisar("Não foi possível carregar os pedidos. Verifique a internet e toque em Atualizar.", true);
  } finally {
    carregando = false;
    $("#btn-atualizar").disabled = false;
    $("#btn-atualizar").textContent = "Atualizar";
  }
}

function pedidosFiltrados() {
  return estado.status === "todos" ? estado.pedidos : estado.pedidos.filter((p) => p.status === estado.status);
}

function desenharResumo() {
  const soma = (lista) => lista.reduce((s, p) => s + Number(p.total_centavos || 0), 0);
  const vendidos = estado.pedidos.filter((p) => p.status === "confirmado" || p.status === "entregue");
  const novos = estado.pedidos.filter((p) => p.status === "novo");
  const cancelados = estado.pedidos.filter((p) => p.status === "cancelado");
  const validos = estado.pedidos.length - cancelados.length;

  $("#r-vendido").textContent = dinheiro(soma(vendidos));
  $("#r-vendido-qtd").textContent = `${plural(vendidos.length, "pedido confirmado", "pedidos confirmados")} ou entregue${vendidos.length === 1 ? "" : "s"}`;
  $("#r-novos").textContent = novos.length;
  $("#r-novos-valor").textContent = novos.length ? `somam ${dinheiro(soma(novos))}` : "nada pendente";
  $("#r-total").textContent = validos;
  $("#r-cancelados").textContent = plural(cancelados.length, "cancelado", "cancelados");
}

function quandoFoi(iso) {
  const d = new Date(iso);
  const semana = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  return `${semana}, ${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)} · ${doisDigitos(d.getHours())}h${doisDigitos(d.getMinutes())}`;
}

function templatePedido(p) {
  const itens = Array.isArray(p.itens) ? p.itens : [];
  const linhas = itens
    .map((i) => `<li><span>${esc(i.qtd)}× ${esc(i.nome)}</span><span>${dinheiro(Number(i.qtd) * Number(i.preco_centavos))}</span></li>`)
    .join("");
  const opcoes = Object.keys(STATUS)
    .map((s) => `<option value="${s}"${s === p.status ? " selected" : ""}>${STATUS[s]}</option>`)
    .join("");

  return (
    `<li class="adm-pedido" data-status="${esc(p.status)}" data-id="${esc(p.id)}">` +
    `<div class="adm-ped-topo">` +
    `<div class="adm-ped-id"><span class="adm-codigo">#${esc(p.codigo)}</span><time datetime="${esc(p.criado_em)}">${esc(quandoFoi(p.criado_em))}</time></div>` +
    `<strong class="adm-valor">${dinheiro(p.total_centavos)}</strong>` +
    `</div>` +
    `<p class="adm-cliente">${esc(p.cliente_nome)}</p>` +
    `<ul class="adm-itens">${linhas}</ul>` +
    (p.observacoes ? `<p class="adm-obs"><span>Observações:</span> ${esc(p.observacoes)}</p>` : "") +
    `<label class="adm-status"><span class="adm-selo">${STATUS[p.status] || esc(p.status)}</span>` +
    `<span class="sr-only">Status do pedido ${esc(p.codigo)}</span>` +
    `<select data-status-de="${esc(p.id)}">${opcoes}</select></label>` +
    `</li>`
  );
}

function desenhar() {
  desenharResumo();
  $$("[data-status]", $(".adm-chips-status")).forEach((b) =>
    b.setAttribute("aria-pressed", b.dataset.status === estado.status ? "true" : "false")
  );

  const lista = pedidosFiltrados();
  $("#lista").innerHTML = lista.map(templatePedido).join("");
  const vazio = $("#vazio");
  vazio.hidden = lista.length > 0;
  vazio.textContent = estado.pedidos.length === 0
    ? "Nenhum pedido neste período."
    : `Nenhum pedido com o status “${STATUS[estado.status] || ""}” neste período.`;
}

async function mudarStatus(select) {
  const id = select.dataset.statusDe;
  const pedido = estado.pedidos.find((p) => p.id === id);
  if (!pedido) return;
  const anterior = pedido.status;
  const novo = select.value;
  if (novo === anterior) return;

  select.disabled = true;
  try {
    const r = await api("PATCH", `pedidos?id=eq.${encodeURIComponent(id)}`, { status: novo }, { Prefer: "return=representation" });
    if (!Array.isArray(r) || r.length !== 1) throw new Error("Nada foi alterado");
    pedido.status = r[0].status;
    desenhar();
    avisar(`Pedido #${pedido.codigo} marcado como ${STATUS[pedido.status].toLowerCase()}.`);
    const mesmo = $(`[data-status-de="${CSS.escape(id)}"]`);
    if (mesmo) mesmo.focus();
  } catch (erro) {
    select.value = anterior;
    if (erro instanceof ErroSessao) irParaLogin("Sua sessão expirou. Entre de novo.");
    else avisar("Não foi possível salvar o status. Tente de novo.", true);
  } finally {
    select.disabled = false;
  }
}

/* ---------------------------------- PLANILHA ---------------------------------- */

function celula(valor) {
  let t = String(valor ?? "");
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; // evita fórmulas vindas do site no Excel
  return `"${t.replace(/"/g, '""')}"`;
}

function baixarCSV() {
  const lista = pedidosFiltrados();
  const reais = (c) => ((Number(c) || 0) / 100).toFixed(2).replace(".", ",");
  const linhas = [["Pedido", "Data", "Hora", "Cliente", "Itens", "Total (R$)", "Status", "Observações"]];

  lista
    .slice()
    .reverse() // do mais antigo para o mais novo
    .forEach((p) => {
      const d = new Date(p.criado_em);
      const itens = (Array.isArray(p.itens) ? p.itens : []).map((i) => `${i.qtd}x ${i.nome}`).join(" | ");
      linhas.push([
        p.codigo,
        `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}/${d.getFullYear()}`,
        `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`,
        p.cliente_nome,
        itens,
        reais(p.total_centavos),
        STATUS[p.status] || p.status,
        p.observacoes || ""
      ]);
    });

  const vendidos = lista.filter((p) => p.status === "confirmado" || p.status === "entregue");
  linhas.push([]);
  linhas.push(["", "", "", "", "Total vendido (confirmados e entregues)", reais(vendidos.reduce((s, p) => s + p.total_centavos, 0)), "", ""]);

  const texto = "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  const blob = new Blob([texto], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const sufixo = estado.status === "todos" ? "" : `-${estado.status}`;
  a.href = url;
  a.download = `pedidos-divna-${dataISO(estado.de)}-a-${dataISO(somarDias(estado.ate, -1))}${sufixo}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ----------------------------------- AVISOS ----------------------------------- */

let temporizadorAviso;
function avisar(texto, erro = false) {
  const el = $("#aviso");
  el.textContent = texto;
  el.classList.toggle("erro-aviso", erro);
  el.hidden = false;
  clearTimeout(temporizadorAviso);
  if (!erro) temporizadorAviso = setTimeout(esconderAviso, 4000);
}
function esconderAviso() {
  $("#aviso").hidden = true;
}

/* ------------------------------ DEPOIMENTOS ------------------------------
   Os clientes enviam pelo site; chegam como "pendente" e só aparecem no site
   depois de aprovados aqui (regras em supabase/depoimentos.sql). */

const STATUS_DEP = { pendente: "Pendente", aprovado: "Aprovado", escondido: "Escondido" };
// Reaproveita as cores dos pedidos: pendente = vermelho, aprovado = verde, escondido = cinza
const COR_DEP = { pendente: "novo", aprovado: "entregue", escondido: "cancelado" };
const depo = { itens: [], filtro: "pendente" };

const estrelasDep = (nota) => {
  const n = Math.round(Number(nota));
  return n >= 1 && n <= 5 ? "★".repeat(n) + "☆".repeat(5 - n) : "sem nota";
};

let temporizadorAvisoDep;
function avisarDep(texto, erro = false) {
  const el = $("#aviso-dep");
  el.textContent = texto;
  el.classList.toggle("erro-aviso", erro);
  el.hidden = !texto;
  clearTimeout(temporizadorAvisoDep);
  if (texto && !erro) temporizadorAvisoDep = setTimeout(() => { el.hidden = true; }, 4000);
}

async function carregarDepoimentos() {
  try {
    depo.itens = await api("GET", "depoimentos?select=id,criado_em,nome,ocasiao,texto,nota,status&order=criado_em.desc&limit=300");
    desenharDepoimentos();
  } catch (erro) {
    if (erro instanceof ErroSessao) irParaLogin("Sua sessão expirou. Entre de novo.");
    else avisarDep("Não foi possível carregar os depoimentos. Se é a primeira vez, confira se o arquivo supabase/depoimentos.sql já foi executado no Supabase.", true);
  }
}

function templateDep(d) {
  const quando = quandoFoi(d.criado_em);
  const botoes = [];
  if (d.status !== "aprovado") botoes.push(`<button type="button" class="adm-btn-sec adm-ok" data-dep-acao="aprovado" data-id="${esc(d.id)}">Aprovar</button>`);
  if (d.status !== "escondido") botoes.push(`<button type="button" class="adm-btn-sec" data-dep-acao="escondido" data-id="${esc(d.id)}">Esconder</button>`);
  botoes.push(`<button type="button" class="adm-btn-sec adm-perigo" data-dep-acao="apagar" data-id="${esc(d.id)}">Apagar</button>`);

  return (
    `<li class="adm-pedido" data-status="${COR_DEP[d.status] || "novo"}">` +
    `<div class="adm-ped-topo">` +
    `<div class="adm-ped-id"><span class="adm-codigo">${estrelasDep(d.nota)}</span><time datetime="${esc(d.criado_em)}">${esc(quando)}</time></div>` +
    `<span class="adm-selo adm-selo-dep">${STATUS_DEP[d.status] || esc(d.status)}</span>` +
    `</div>` +
    `<p class="adm-cliente">${esc(String(d.nome || "").trim() || "Cliente")}${d.ocasiao ? ` · ${esc(d.ocasiao)}` : ""}</p>` +
    `<p class="adm-dep-texto">${esc(d.texto)}</p>` +
    `<div class="adm-dep-acoes">${botoes.join("")}</div>` +
    `</li>`
  );
}

function desenharDepoimentos() {
  const pendentes = depo.itens.filter((d) => d.status === "pendente").length;
  const contador = $("#contador-dep");
  contador.textContent = pendentes;
  contador.hidden = pendentes === 0;

  $$("[data-dep-status]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.depStatus === depo.filtro ? "true" : "false"));
  const lista = depo.filtro === "todos" ? depo.itens : depo.itens.filter((d) => d.status === depo.filtro);
  $("#lista-dep").innerHTML = lista.map(templateDep).join("");
  const vazio = $("#vazio-dep");
  vazio.hidden = lista.length > 0;
  vazio.textContent = depo.filtro === "pendente" ? "Nenhum depoimento esperando aprovação." : "Nenhum depoimento aqui.";
}

async function agirNoDepoimento(id, acao) {
  const d = depo.itens.find((x) => x.id === id);
  if (!d) return;
  try {
    if (acao === "apagar") {
      if (!window.confirm("Apagar este depoimento de vez? Não dá para desfazer.")) return;
      const r = await api("DELETE", `depoimentos?id=eq.${encodeURIComponent(id)}`, undefined, { Prefer: "return=representation" });
      if (!Array.isArray(r) || r.length !== 1) throw new Error("Nada foi apagado");
      depo.itens = depo.itens.filter((x) => x.id !== id);
      avisarDep("Depoimento apagado.");
    } else {
      const r = await api("PATCH", `depoimentos?id=eq.${encodeURIComponent(id)}`, { status: acao }, { Prefer: "return=representation" });
      if (!Array.isArray(r) || r.length !== 1) throw new Error("Nada foi alterado");
      d.status = r[0].status;
      avisarDep(acao === "aprovado" ? "Depoimento aprovado: já aparece no site." : "Depoimento escondido do site.");
    }
    desenharDepoimentos();
  } catch (erro) {
    if (erro instanceof ErroSessao) irParaLogin("Sua sessão expirou. Entre de novo.");
    else avisarDep("Não foi possível salvar. Tente de novo.", true);
  }
}

function mostrarAba(aba) {
  $$("[data-aba]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.aba === aba ? "true" : "false"));
  $("#aba-pedidos").hidden = aba !== "pedidos";
  $("#aba-depoimentos").hidden = aba !== "depoimentos";
  if (aba === "depoimentos") carregarDepoimentos();
}

/* ------------------------------ ATUALIZAÇÃO AUTOMÁTICA ------------------------------ */

let relogio = null;
function iniciarAtualizacao() {
  pararAtualizacao();
  relogio = setInterval(atualizarSozinho, ATUALIZAR_A_CADA_MS);
}
function pararAtualizacao() {
  if (relogio) clearInterval(relogio);
  relogio = null;
}
function atualizarSozinho() {
  if (document.hidden || $("#tela-painel").hidden) return;
  const ativo = document.activeElement;
  if (ativo && ativo.tagName === "SELECT" && $("#lista").contains(ativo)) return; // não atrapalha quem está mexendo
  carregar();
  carregarDepoimentos();
}

/* ----------------------------------- INÍCIO ----------------------------------- */

function iniciar() {
  $("#form-login").addEventListener("submit", entrar);
  $("#btn-sair").addEventListener("click", sair);
  $("#btn-sair-2").addEventListener("click", sair);
  $("#btn-atualizar").addEventListener("click", carregar);
  $("#btn-csv").addEventListener("click", baixarCSV);
  $("#form-datas").addEventListener("submit", aplicarDatas);

  $$("[data-periodo]").forEach((b) => b.addEventListener("click", () => aplicarPeriodo(b.dataset.periodo)));
  $$("[data-status]", $(".adm-chips-status")).forEach((b) =>
    b.addEventListener("click", () => {
      estado.status = b.dataset.status;
      desenhar();
    })
  );
  $("#lista").addEventListener("change", (e) => {
    if (e.target.matches("select[data-status-de]")) mudarStatus(e.target);
  });
  $$("[data-aba]").forEach((b) => b.addEventListener("click", () => mostrarAba(b.dataset.aba)));
  $$("[data-dep-status]").forEach((b) =>
    b.addEventListener("click", () => {
      depo.filtro = b.dataset.depStatus;
      desenharDepoimentos();
    })
  );
  $("#btn-atualizar-dep").addEventListener("click", carregarDepoimentos);
  $("#lista-dep").addEventListener("click", (e) => {
    const botao = e.target.closest("[data-dep-acao]");
    if (botao) agirNoDepoimento(botao.dataset.id, botao.dataset.depAcao);
  });
  document.addEventListener("visibilitychange", atualizarSozinho);

  if (!configurado()) {
    mostrarTela("tela-config");
    return;
  }
  if (!sessao || !sessao.refresh_token) {
    irParaLogin("");
    return;
  }
  abrirPainel();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
else iniciar();
