/* =====================================================================
   D'Ivna Confeitaria — script.js
   Cardápio em sanfona, carrinho e envio do pedido pelo WhatsApp.
   Os dados do cardápio ficam em cardapio.js.
   ===================================================================== */
"use strict";

/* ------------------------- CONFIGURAÇÃO (edite aqui) ------------------------- */

// WhatsApp que recebe os pedidos: código do país + DDD + número, só dígitos.
// Exemplo: (71) 98231-0364  ->  "5571982310364"
const WHATSAPP_NUMBER = "5571982310364";

// Nome que aparece na primeira linha da mensagem enviada.
const NOME_LOJA = "D'Ivna Confeitaria";

// Quantidade máxima por item (evita digitar um número exagerado por engano).
const QTD_MAXIMA = 999;

// Chaves de gravação no navegador (para o carrinho não se perder ao recarregar).
const CHAVE_CARRINHO = "divna_carrinho";
const CHAVE_CLIENTE = "divna_cliente";
const CHAVE_ULTIMO_PEDIDO = "divna_ultimo_pedido";

// O endereço e a chave do banco de pedidos ficam em config.js.

/* ------------------------------- UTILITÁRIOS ------------------------------- */

const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => Array.from(raiz.querySelectorAll(seletor));

const formatoMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
// Valores são guardados em centavos para evitar erros de arredondamento.
const dinheiro = (centavos) => formatoMoeda.format(centavos / 100).replace(/ /g, " ");

const esc = (texto) =>
  String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const slug = (texto) =>
  String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const reduzMovimento = () =>
  Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

const ICONES = {
  cereja:
    '<svg width="30" height="30" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M20 35C22 24 32 14 44 9" stroke="#9C7A5B" stroke-width="2" stroke-linecap="round"/><path d="M42 37C41 26 42 17 44 9" stroke="#9C7A5B" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="46" r="11" fill="#B3202B"/><circle cx="42" cy="48" r="11" fill="#B3202B"/><circle cx="16.5" cy="42" r="2.6" fill="#fff" fill-opacity="0.45"/><circle cx="38.5" cy="44" r="2.6" fill="#fff" fill-opacity="0.45"/></svg>',
  seta:
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  mais:
    '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M9 3v12M3 9h12"/></svg>',
  menos:
    '<svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M3 9h12"/></svg>',
  balao:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5z"/></svg>'
};

/* ----------------------------- DADOS DO CARDÁPIO ----------------------------- */

const ITENS = {};  // id -> item (somente itens que vão para o carrinho)
const ORDEM = [];  // ids na ordem em que aparecem no cardápio

function prepararCardapio() {
  const usados = new Set();

  CARDAPIO.forEach((cat) => {
    cat.secoes.forEach((sec) => {
      sec.itens = sec.itens.map((bruto) => {
        const item = typeof bruto === "string" ? { nome: bruto } : { ...bruto };
        const precoBruto = Number(item.preco ?? sec.preco);
        const consultar = Boolean(item.consultar) || !Number.isFinite(precoBruto);

        item.consultar = consultar;
        item.preco = consultar ? null : precoBruto;
        item.centavos = consultar ? 0 : Math.round(precoBruto * 100);
        item.minimo = Math.max(1, Number(item.minimo || sec.minimo || cat.minimo || 1));
        item.nomePedido = (sec.prefixoPedido ?? cat.prefixoPedido ?? "") + item.nome;
        item.categoriaId = cat.id;

        let id = slug(item.id || [cat.id, sec.titulo, item.nome].filter(Boolean).join(" "));
        while (usados.has(id)) id += "-x";
        usados.add(id);
        item.id = id;

        if (!consultar) {
          ITENS[id] = item;
          ORDEM.push(id);
        }
        return item;
      });
    });
  });
}

/* ----------------------------------- ESTADO ----------------------------------- */

let carrinho = {}; // id -> quantidade

function lerCarrinhoSalvo() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || "{}");
    Object.keys(salvo).forEach((id) => {
      const qtd = parseInt(salvo[id], 10);
      if (ITENS[id] && qtd > 0) carrinho[id] = Math.min(qtd, QTD_MAXIMA);
    });
  } catch (erro) {
    carrinho = {};
  }
}

function salvarCarrinho() {
  try {
    localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinho));
  } catch (erro) {
    /* navegador sem armazenamento: segue sem salvar */
  }
}

function lerCliente() {
  try {
    const cliente = JSON.parse(localStorage.getItem(CHAVE_CLIENTE) || "{}");
    $("#campo-nome").value = cliente.nome || "";
    $("#campo-obs").value = cliente.obs || "";
  } catch (erro) {
    /* ignora */
  }
}

function salvarCliente() {
  try {
    localStorage.setItem(
      CHAVE_CLIENTE,
      JSON.stringify({ nome: $("#campo-nome").value, obs: $("#campo-obs").value })
    );
  } catch (erro) {
    /* ignora */
  }
}

const idsNoCarrinho = () => ORDEM.filter((id) => carrinho[id] > 0);
const totalCentavos = () => idsNoCarrinho().reduce((soma, id) => soma + carrinho[id] * ITENS[id].centavos, 0);

/* --------------------------- MONTAGEM DO CARDÁPIO --------------------------- */

function textoApoio(cat) {
  const precos = [];
  cat.secoes.forEach((sec) => sec.itens.forEach((i) => { if (!i.consultar) precos.push(i.centavos); }));
  if (!precos.length) return "";

  const menor = Math.min(...precos);
  const maior = Math.max(...precos);
  let texto = menor === maior ? dinheiro(menor) : `A partir de ${dinheiro(menor)}`;
  if (cat.unidade) texto += ` ${cat.unidade}`;
  if (cat.prefixoSubtitulo) {
    if (texto.startsWith("A partir")) texto = "a" + texto.slice(1);
    texto = cat.prefixoSubtitulo + texto;
  }
  return texto;
}

function linkWhatsApp(mensagem) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensagem)}`;
}

function templateItem(item, mostrarPreco) {
  const obs = item.consultar && item.observacao ? `<span class="item-obs">${esc(item.observacao)}</span>` : "";
  const minimo = item.minimo > 1 ? `<span class="item-obs">mín. ${item.minimo} un.</span>` : "";
  const preco = !item.consultar && mostrarPreco ? `<span class="item-preco">${dinheiro(item.centavos)}</span>` : "";

  let controle;
  if (item.consultar) {
    const mensagem = `Olá, ${NOME_LOJA}! ${item.mensagemConsulta || `Gostaria de consultar: ${item.nome}.`}`;
    controle = `<a class="btn-consultar" href="${esc(linkWhatsApp(mensagem))}" target="_blank" rel="noopener" aria-label="Consultar ${esc(item.nome)} pelo WhatsApp">${ICONES.balao}<span>Consultar</span></a>`;
  } else {
    controle = `<div class="item-controle" data-controle="${item.id}"></div>`;
  }

  return `<li class="item"><span class="item-textos"><span class="item-nome">${esc(item.nome)}</span>${obs}${minimo}</span>${preco}${controle}</li>`;
}

function templateSecao(cat, sec) {
  const precos = new Set(sec.itens.filter((i) => !i.consultar).map((i) => i.centavos));
  const uniforme = precos.size === 1;

  // Quando todos os itens do grupo custam o mesmo, o preço aparece uma vez só, no título.
  const sufixo = sec.sufixoPreco ?? cat.unidade ?? "";
  const textoPreco = uniforme ? `${dinheiro([...precos][0])}${sufixo ? " " + sufixo : ""}` : "";

  let topo = "";
  if (sec.titulo || textoPreco) {
    topo =
      `<div class="secao-topo">` +
      (sec.titulo ? `<h4 class="secao-titulo">${esc(sec.titulo)}</h4>` : "<span></span>") +
      (textoPreco ? `<span class="secao-preco">${esc(textoPreco)}</span>` : "") +
      `</div>`;
  }

  return `<div class="secao">${topo}<ul class="lista-itens">${sec.itens.map((i) => templateItem(i, !uniforme)).join("")}</ul></div>`;
}

function templateCategoria(cat) {
  const idBotao = `cat-botao-${cat.id}`;
  const idPainel = `cat-painel-${cat.id}`;
  return (
    `<article class="categoria revelar" data-categoria="${esc(cat.id)}">` +
    `<h3 class="categoria-titulo"><button type="button" class="categoria-botao" id="${idBotao}" aria-expanded="false" aria-controls="${idPainel}">` +
    `<span class="cat-icone">${ICONES.cereja}</span>` +
    `<span class="cat-textos"><span class="cat-nome">${esc(cat.nome)}</span><span class="cat-apoio">${esc(textoApoio(cat))}</span></span>` +
    `<span class="cat-seta">${ICONES.seta}</span>` +
    `</button></h3>` +
    `<div class="categoria-painel" id="${idPainel}" role="region" aria-labelledby="${idBotao}">` +
    `<div class="categoria-conteudo"><div class="categoria-miolo">${cat.secoes.map((s) => templateSecao(cat, s)).join("")}</div></div>` +
    `</div></article>`
  );
}

function renderizarCategorias() {
  $("#categorias").innerHTML = CARDAPIO.map(templateCategoria).join("");

  const aviso = $("#aviso-min");
  if (typeof AVISO_CARDAPIO === "string" && AVISO_CARDAPIO.trim()) {
    aviso.textContent = AVISO_CARDAPIO;
    aviso.hidden = false;
  }
}

/* ------------------------ CONTROLES DE QUANTIDADE (+ / −) ------------------------ */

function htmlControle(item, qtd) {
  const nome = esc(item.nomePedido);
  const id = item.id;
  if (!qtd) {
    return `<button type="button" class="btn-mais" data-acao="adicionar" data-id="${id}" aria-label="Adicionar ${nome}">${ICONES.mais}</button>`;
  }
  return (
    `<div class="stepper" role="group" aria-label="Quantidade de ${nome}">` +
    `<button type="button" data-acao="menos" data-id="${id}" aria-label="Diminuir quantidade de ${nome}">${ICONES.menos}</button>` +
    `<input type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${qtd}" data-qtd data-id="${id}" aria-label="Quantidade de ${nome}">` +
    `<button type="button" data-acao="mais" data-id="${id}" aria-label="Aumentar quantidade de ${nome}">${ICONES.mais}</button>` +
    `</div>`
  );
}

function renderizarControle(el) {
  const id = el.dataset.controle;
  const item = ITENS[id];
  if (!item) return;

  const ativo = document.activeElement;
  const tinhaFoco = el.contains(ativo);
  const acao = tinhaFoco ? ativo.dataset.acao : null;
  const qtd = carrinho[id] || 0;

  el.innerHTML = htmlControle(item, qtd);

  // Mantém o foco do teclado no lugar certo depois de redesenhar o botão.
  if (tinhaFoco) {
    const alvo = qtd
      ? $(`[data-acao="${acao === "adicionar" ? "mais" : acao}"]`, el) || $("input", el)
      : $('[data-acao="adicionar"]', el);
    if (alvo) alvo.focus();
  }
}

/**
 * Altera a quantidade de um item.
 * ctx: { origem: "lista" | "painel", preservarControle: bool, semMinimo: bool }
 */
function definirQuantidade(id, qtd, ctx = {}) {
  const item = ITENS[id];
  if (!item) return;

  qtd = Math.max(0, Math.min(QTD_MAXIMA, Math.floor(qtd) || 0));
  if (qtd > 0 && qtd < item.minimo && !ctx.semMinimo) qtd = item.minimo;

  if (qtd === 0) delete carrinho[id];
  else carrinho[id] = qtd;

  sincronizar({ ...ctx, id });
}

function tratarAcao(botao) {
  const id = botao.dataset.id;
  const item = ITENS[id];
  if (!item) return;

  const origem = botao.closest("#painel-carrinho") ? "painel" : "lista";
  const atual = carrinho[id] || 0;

  switch (botao.dataset.acao) {
    case "adicionar":
      definirQuantidade(id, item.minimo, { origem });
      break;
    case "mais":
      definirQuantidade(id, atual + 1, { origem });
      break;
    case "menos":
      definirQuantidade(id, atual <= item.minimo ? 0 : atual - 1, { origem });
      break;
    case "remover":
      definirQuantidade(id, 0, { origem });
      break;
  }
}

/* ----------------------------- SINCRONIZAÇÃO DA TELA ----------------------------- */

function sincronizar(ctx = {}) {
  if (ctx.id) {
    // Quando a pessoa está digitando na própria lista, não redesenha o campo dela.
    if (!(ctx.preservarControle && ctx.origem === "lista")) {
      const el = $(`[data-controle="${ctx.id}"]`);
      if (el) renderizarControle(el);
    }
  } else {
    $$("[data-controle]").forEach(renderizarControle);
  }
  atualizarPainel(ctx);
  atualizarResumo();
  salvarCarrinho();
}

function linhaCarrinho(id) {
  const item = ITENS[id];
  const qtd = carrinho[id];
  return (
    `<div class="linha-carrinho" data-linha="${id}">` +
    `<div class="linha-textos">` +
    `<h3 class="linha-nome">${esc(item.nomePedido)}</h3>` +
    `<span class="linha-calculo" data-calculo="${id}">${qtd} × ${dinheiro(item.centavos)}</span>` +
    `<span class="linha-subtotal" data-subtotal="${id}">${dinheiro(qtd * item.centavos)}</span>` +
    `</div>` +
    `<div class="linha-acoes">${htmlControle(item, qtd)}` +
    `<button type="button" class="link-discreto link-remover" data-acao="remover" data-id="${id}" aria-label="Remover ${esc(item.nomePedido)} do carrinho">Remover</button>` +
    `</div></div>`
  );
}

function atualizarPainel(ctx = {}) {
  const ids = idsNoCarrinho();
  const lista = $("#itens-carrinho");

  $("#carrinho-vazio").hidden = ids.length > 0;
  lista.hidden = ids.length === 0;

  if (ctx.preservarControle && ctx.origem === "painel" && ctx.id && carrinho[ctx.id]) {
    // Digitando no painel: só atualiza os textos da linha, sem redesenhar o campo.
    const item = ITENS[ctx.id];
    const qtd = carrinho[ctx.id];
    const calculo = $(`[data-calculo="${ctx.id}"]`, lista);
    const subtotal = $(`[data-subtotal="${ctx.id}"]`, lista);
    if (calculo) calculo.textContent = `${qtd} × ${dinheiro(item.centavos)}`;
    if (subtotal) subtotal.textContent = dinheiro(qtd * item.centavos);
  } else {
    const ativo = document.activeElement;
    const seletor =
      lista.contains(ativo) && ativo.dataset && ativo.dataset.id && ativo.dataset.acao
        ? `[data-id="${ativo.dataset.id}"][data-acao="${ativo.dataset.acao}"]`
        : null;

    lista.innerHTML = ids.map(linhaCarrinho).join("");

    if (seletor) {
      const novo = $(seletor, lista) || $(".stepper button", lista) || $("#campo-nome");
      if (novo) novo.focus();
    }
  }

  $("#total-valor").textContent = dinheiro(totalCentavos());
  $("#btn-finalizar").disabled = ids.length === 0;
  $("#btn-limpar").hidden = ids.length === 0;
  if (!ids.length) $("#whatsapp-fallback").hidden = true;
}

let produtosAntes = 0;
let temporizadorAnuncio;
let iniciado = false;

function atualizarResumo() {
  const ids = idsNoCarrinho();
  const n = ids.length;
  const total = totalCentavos();
  const rotulo = `${n} ${n === 1 ? "produto" : "produtos"}`;

  const contador = $("#contador");
  contador.textContent = n;
  contador.hidden = n === 0;
  if (n > 0 && n !== produtosAntes) {
    contador.classList.remove("pulo");
    void contador.offsetWidth; // reinicia a animação
    contador.classList.add("pulo");
  }
  produtosAntes = n;

  $("#btn-carrinho").setAttribute("aria-label", n ? `Abrir carrinho, ${rotulo}` : "Abrir carrinho");
  $("#barra-texto").textContent = `${rotulo} · ${dinheiro(total)}`;
  atualizarBarra();

  if (iniciado) {
    clearTimeout(temporizadorAnuncio);
    temporizadorAnuncio = setTimeout(() => {
      $("#anuncio").textContent = n ? `Carrinho com ${rotulo}. Total ${dinheiro(total)}.` : "Carrinho vazio.";
    }, 500);
  }
}

/* --------------------------------- SANFONA --------------------------------- */

function definirCategoria(art, abrir) {
  art.classList.toggle("aberta", abrir);
  const botao = $(".categoria-botao", art);
  if (botao) botao.setAttribute("aria-expanded", abrir ? "true" : "false");
}

function alternarCategoria(art) {
  const abrir = !art.classList.contains("aberta");
  const anterior = $(".categoria.aberta");

  if (anterior && anterior !== art) definirCategoria(anterior, false); // uma aberta por vez
  definirCategoria(art, abrir);

  if (abrir) {
    const esperar = Boolean(anterior && anterior !== art);
    setTimeout(() => {
      const topo = art.getBoundingClientRect().top;
      if (topo < 72 || topo > window.innerHeight * 0.55) {
        if (art.scrollIntoView) art.scrollIntoView({ behavior: reduzMovimento() ? "auto" : "smooth", block: "start" });
      }
    }, esperar ? 340 : 60);
  }
}

/* ---------------------------------- CARRINHO ---------------------------------- */

const painelAberto = () => $("#painel-carrinho").classList.contains("aberto");
let elementoAnterior = null;

function atualizarBarra() {
  $("#barra").hidden = idsNoCarrinho().length === 0 || painelAberto();
}

function abrirPainel() {
  if (painelAberto()) return;
  elementoAnterior = document.activeElement;
  $("#painel-carrinho").classList.add("aberto");
  $("#painel-carrinho").setAttribute("aria-hidden", "false");
  $("#overlay").classList.add("aberto");
  document.body.classList.add("sem-rolagem");
  atualizarBarra();
  $("#titulo-carrinho").focus();
}

function fecharPainel() {
  if (!painelAberto()) return;
  $("#painel-carrinho").classList.remove("aberto");
  $("#painel-carrinho").setAttribute("aria-hidden", "true");
  $("#overlay").classList.remove("aberto");
  document.body.classList.remove("sem-rolagem");
  atualizarBarra();

  const volta = elementoAnterior && document.contains(elementoAnterior) && !elementoAnterior.closest("[hidden]")
    ? elementoAnterior
    : $("#btn-carrinho");
  volta.focus({ preventScroll: true });
}

function elementosFocaveis(raiz) {
  return $$('a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])', raiz).filter(
    (el) => !el.closest("[hidden]")
  );
}

function prenderFoco(e) {
  const painel = $("#painel-carrinho");
  const lista = elementosFocaveis(painel);
  if (!lista.length) return;
  const primeiro = lista[0];
  const ultimo = lista[lista.length - 1];
  const ativo = document.activeElement;

  if (e.shiftKey && (ativo === primeiro || ativo === $("#titulo-carrinho"))) {
    e.preventDefault();
    ultimo.focus();
  } else if (!e.shiftKey && ativo === ultimo) {
    e.preventDefault();
    primeiro.focus();
  }
}

/* --------------------------- PEDIDO PELO WHATSAPP --------------------------- */

function montarMensagem(codigo) {
  const nome = $("#campo-nome").value.trim();
  const obs = $("#campo-obs").value.trim();
  const linhas = idsNoCarrinho().map((id) => {
    const item = ITENS[id];
    return `${carrinho[id]}x ${item.nomePedido} — ${dinheiro(carrinho[id] * item.centavos)}`;
  });

  return [
    `Olá, ${NOME_LOJA}! Gostaria de fazer um pedido:`,
    ...(codigo ? [`Pedido nº ${codigo}`] : []),
    "",
    ...linhas,
    "",
    `Total: ${dinheiro(totalCentavos())}`,
    `Nome: ${nome}`,
    `Observações: ${obs || "—"}`
  ].join("\n");
}

/* ----------------------- REGISTRO DO PEDIDO NO BANCO -----------------------
   Quando config.js tem o endereço e a chave do Supabase, cada pedido finalizado
   também é salvo no banco, para aparecer no painel pedidos.html.
   O WhatsApp abre ANTES e independe disso: se o banco falhar, a venda segue. */

const bancoAtivo = () =>
  typeof SUPABASE_URL === "string" && typeof SUPABASE_CHAVE === "string" &&
  SUPABASE_URL.trim() !== "" && SUPABASE_CHAVE.trim() !== "";

function numerosAleatorios(n) {
  const v = new Uint32Array(n);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(v);
  else for (let i = 0; i < n; i++) v[i] = Math.floor(Math.random() * 4294967296);
  return Array.from(v);
}

function novoId() {
  if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const h = numerosAleatorios(16).map((n) => (n & 255).toString(16).padStart(2, "0"));
  h[6] = "4" + h[6][1];
  h[8] = ((parseInt(h[8], 16) & 0x3f) | 0x80).toString(16);
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
}

// Toques repetidos em "Finalizar" com o mesmo pedido, dentro deste tempo, contam como um só.
const JANELA_REPETIDO_MS = 30 * 60 * 1000;

// Código curto que a cliente vê na mensagem e a confeiteira vê no painel (sem 0/O, 1/I).
function novoCodigo() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return numerosAleatorios(5).map((n) => letras[n % letras.length]).join("");
}

function lerUltimoPedido() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_ULTIMO_PEDIDO) || "null");
  } catch (erro) {
    return null;
  }
}

function guardarUltimoPedido(pedido) {
  try {
    localStorage.setItem(CHAVE_ULTIMO_PEDIDO, JSON.stringify(pedido));
  } catch (erro) {
    /* ignora */
  }
}

/**
 * Monta o pedido a ser registrado. Se a pessoa tocar em "Finalizar" de novo
 * sem mudar nada (o WhatsApp não abriu, toque duplo...), reaproveita o mesmo
 * número, e o banco recusa a cópia sozinho: o painel não mostra pedido repetido.
 */
function prepararPedido() {
  const nome = $("#campo-nome").value.trim().slice(0, 80);
  const obs = $("#campo-obs").value.trim().slice(0, 1000);
  const itens = idsNoCarrinho().map((id) => ({
    nome: ITENS[id].nomePedido,
    qtd: carrinho[id],
    preco_centavos: ITENS[id].centavos
  }));
  const assinatura = JSON.stringify([itens, nome, obs]);

  const ultimo = lerUltimoPedido();
  const recente = ultimo && Date.now() - Number(ultimo.criado || 0) < JANELA_REPETIDO_MS;
  if (recente && ultimo.assinatura === assinatura && ultimo.id && ultimo.codigo) return ultimo;

  const pedido = {
    id: novoId(),
    codigo: novoCodigo(),
    criado: Date.now(),
    assinatura,
    registrado: false,
    dados: { cliente_nome: nome, observacoes: obs, itens, total_centavos: totalCentavos() }
  };
  guardarUltimoPedido(pedido);
  return pedido;
}

function cabecalhosBanco() {
  const chave = SUPABASE_CHAVE.trim();
  const cabecalhos = { apikey: chave, "Content-Type": "application/json", Prefer: "return=minimal" };
  // Chaves antigas ("anon", começam com eyJ) também vão no Authorization.
  if (chave.startsWith("eyJ")) cabecalhos.Authorization = `Bearer ${chave}`;
  return cabecalhos;
}

async function registrarPedido(pedido) {
  if (!bancoAtivo() || pedido.registrado) return;
  try {
    const resposta = await fetch(`${SUPABASE_URL.trim().replace(/\/+$/, "")}/rest/v1/pedidos`, {
      method: "POST",
      headers: cabecalhosBanco(),
      body: JSON.stringify({ id: pedido.id, codigo: pedido.codigo, ...pedido.dados }),
      keepalive: true // termina de enviar mesmo se a pessoa sair da página
    });
    // 409 = este pedido já tinha sido salvo antes (toque repetido).
    if (resposta.ok || resposta.status === 409) {
      pedido.registrado = true;
      guardarUltimoPedido(pedido);
    } else {
      console.warn("Pedido não foi salvo no banco:", resposta.status, await resposta.text());
    }
  } catch (erro) {
    console.warn("Pedido não foi salvo no banco:", erro);
  }
}

function abrirLink(url) {
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function mostrarErroNome(mostrar) {
  $("#erro-nome").hidden = !mostrar;
  $("#campo-nome").setAttribute("aria-invalid", mostrar ? "true" : "false");
}

function aplicarMinimos() {
  let mudou = false;
  idsNoCarrinho().forEach((id) => {
    if (carrinho[id] < ITENS[id].minimo) {
      carrinho[id] = ITENS[id].minimo;
      mudou = true;
    }
  });
  if (mudou) sincronizar({});
}

function finalizarPedido() {
  aplicarMinimos();
  if (!idsNoCarrinho().length) return;

  if (!$("#campo-nome").value.trim()) {
    mostrarErroNome(true);
    $("#campo-nome").focus();
    return;
  }
  mostrarErroNome(false);
  salvarCliente();

  const pedido = bancoAtivo() ? prepararPedido() : null;
  const url = linkWhatsApp(montarMensagem(pedido ? pedido.codigo : null));
  abrirLink(url); // primeiro o WhatsApp, sempre

  $("#link-fallback").href = url;
  $("#whatsapp-fallback").hidden = false;

  if (pedido) registrarPedido(pedido);
}

/* ------------------------------- EVENTOS GERAIS ------------------------------- */

function limparCarrinho() {
  carrinho = {};
  sincronizar({});
}

function ligarEventos() {
  // Cliques em botões de quantidade e nos cabeçalhos das categorias
  document.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-acao]");
    if (botao) {
      tratarAcao(botao);
      return;
    }
    const cabecalho = e.target.closest(".categoria-botao");
    if (cabecalho) alternarCategoria(cabecalho.closest(".categoria"));
  });

  // Digitar a quantidade (útil para pedidos de dezenas de unidades)
  document.addEventListener("input", (e) => {
    const campo = e.target;
    if (!campo.matches || !campo.matches("input[data-qtd]")) return;

    const limpo = campo.value.replace(/\D/g, "").slice(0, 3);
    if (campo.value !== limpo) campo.value = limpo;
    if (limpo === "" || parseInt(limpo, 10) < 1) return; // espera o fim da digitação

    const origem = campo.closest("#painel-carrinho") ? "painel" : "lista";
    definirQuantidade(campo.dataset.id, parseInt(limpo, 10), { origem, preservarControle: true, semMinimo: true });
  });

  document.addEventListener("change", (e) => {
    const campo = e.target;
    if (!campo.matches || !campo.matches("input[data-qtd]")) return;

    const id = campo.dataset.id;
    const origem = campo.closest("#painel-carrinho") ? "painel" : "lista";
    let qtd = parseInt(campo.value.replace(/\D/g, ""), 10);

    if (!qtd) {
      definirQuantidade(id, 0, { origem }); // vazio ou zero remove o item
      return;
    }
    qtd = Math.min(qtd, QTD_MAXIMA);
    if (ITENS[id] && qtd < ITENS[id].minimo) qtd = ITENS[id].minimo;
    campo.value = qtd;
    definirQuantidade(id, qtd, { origem, preservarControle: true });
  });

  // Esc fecha o carrinho; Tab fica preso dentro dele enquanto está aberto
  document.addEventListener("keydown", (e) => {
    if (!painelAberto()) return;
    if (e.key === "Escape") {
      e.preventDefault();
      fecharPainel();
    } else if (e.key === "Tab") {
      prenderFoco(e);
    }
  });

  $("#btn-carrinho").addEventListener("click", abrirPainel);
  $("#barra-abrir").addEventListener("click", abrirPainel);
  $("#fechar-carrinho").addEventListener("click", fecharPainel);
  $("#overlay").addEventListener("click", fecharPainel);
  $("#btn-finalizar").addEventListener("click", finalizarPedido);

  $("#campo-nome").addEventListener("input", () => {
    if ($("#campo-nome").value.trim()) mostrarErroNome(false);
    salvarCliente();
  });
  $("#campo-obs").addEventListener("input", salvarCliente);

  // "Limpar carrinho" pede um segundo toque para confirmar
  let aguardandoConfirmacao = false;
  let temporizadorLimpar;
  const botaoLimpar = $("#btn-limpar");
  const redefinirLimpar = () => {
    aguardandoConfirmacao = false;
    botaoLimpar.textContent = "Limpar carrinho";
  };
  botaoLimpar.addEventListener("click", () => {
    if (!aguardandoConfirmacao) {
      aguardandoConfirmacao = true;
      botaoLimpar.textContent = "Toque de novo para limpar tudo";
      temporizadorLimpar = setTimeout(redefinirLimpar, 4000);
      return;
    }
    clearTimeout(temporizadorLimpar);
    redefinirLimpar();
    limparCarrinho();
  });
}

/* ------------------------------ DETALHES DA PÁGINA ------------------------------ */

function formatarTelefone(numero) {
  const digitos = numero.replace(/\D/g, "");
  const local = digitos.startsWith("55") && digitos.length >= 12 ? digitos.slice(2) : digitos;
  const ddd = local.slice(0, 2);
  const resto = local.slice(2);
  const corte = resto.length - 4;
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`;
}

function iniciarEntradaSuave() {
  const alvos = $$(".revelar:not(.visivel)");
  if (!("IntersectionObserver" in window) || reduzMovimento()) {
    alvos.forEach((el) => el.classList.add("visivel"));
    return;
  }
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (entrada.isIntersecting) {
          entrada.target.classList.add("visivel");
          observador.unobserve(entrada.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );
  alvos.forEach((el) => observador.observe(el));
}

function iniciar() {
  prepararCardapio();
  lerCarrinhoSalvo();
  renderizarCategorias();
  $$("[data-controle]").forEach(renderizarControle);
  lerCliente();
  ligarEventos();

  $("#ano").textContent = new Date().getFullYear();
  const telefone = $("#rodape-whatsapp");
  telefone.textContent = formatarTelefone(WHATSAPP_NUMBER);
  telefone.href = `https://wa.me/${WHATSAPP_NUMBER}`;

  atualizarPainel();
  atualizarResumo();
  iniciarEntradaSuave();
  iniciado = true;
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
else iniciar();
