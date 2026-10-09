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
    $("#campo-ocasiao").value = cliente.ocasiao || "";
    $("#campo-obs").value = cliente.obs || "";
  } catch (erro) {
    /* ignora */
  }
}

function salvarCliente() {
  try {
    localStorage.setItem(
      CHAVE_CLIENTE,
      JSON.stringify({ nome: $("#campo-nome").value, ocasiao: $("#campo-ocasiao").value, obs: $("#campo-obs").value })
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
  // Com "foto" na categoria (cardapio.js), a foto entra no lugar do ícone de cereja.
  const icone = cat.foto
    ? `<img src="${esc(cat.foto)}" alt="" width="56" height="56" loading="lazy" decoding="async">`
    : ICONES.cereja;
  return (
    `<article class="categoria revelar" data-categoria="${esc(cat.id)}">` +
    `<h3 class="categoria-titulo"><button type="button" class="categoria-botao" id="${idBotao}" aria-expanded="false" aria-controls="${idPainel}">` +
    `<span class="cat-icone${cat.foto ? " com-foto" : ""}">${icone}</span>` +
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
  const ocasiao = $("#campo-ocasiao").value.trim();
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
    `Ocasião: ${ocasiao}`,
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
const INTERVALO_ENTRE_PEDIDOS_MS = 5000;
let ultimoPedidoNovoEm = 0;

function prepararPedido() {
  const nome = $("#campo-nome").value.trim().slice(0, 80);
  // O banco tem um campo só para observações: a ocasião vai na primeira linha dele.
  const ocasiao = $("#campo-ocasiao").value.trim().slice(0, 80);
  const obsDigitada = $("#campo-obs").value.trim();
  const obs = [`Ocasião: ${ocasiao}`, obsDigitada].filter(Boolean).join("\n").slice(0, 1000);
  const itens = idsNoCarrinho().map((id) => ({
    nome: ITENS[id].nomePedido,
    qtd: carrinho[id],
    preco_centavos: ITENS[id].centavos
  }));
  const assinatura = JSON.stringify([itens, nome, obs]);

  const ultimo = lerUltimoPedido();
  const recente = ultimo && Date.now() - Number(ultimo.criado || 0) < JANELA_REPETIDO_MS;
  if (recente && ultimo.assinatura === assinatura && ultimo.id && ultimo.codigo) return ultimo;

  // Pedido NOVO só a cada 5 segundos neste aparelho (freio simples contra robôs; o WhatsApp abre igual).
  if (Date.now() - ultimoPedidoNovoEm < INTERVALO_ENTRE_PEDIDOS_MS) return null;
  ultimoPedidoNovoEm = Date.now();

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

function mostrarErroOcasiao(mostrar) {
  $("#erro-ocasiao").hidden = !mostrar;
  $("#campo-ocasiao").setAttribute("aria-invalid", mostrar ? "true" : "false");
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
  if (!$("#campo-ocasiao").value.trim()) {
    mostrarErroOcasiao(true);
    $("#campo-ocasiao").focus();
    return;
  }
  mostrarErroOcasiao(false);
  salvarCliente();

  // Robôs preenchem o campo-armadilha: nesse caso o pedido não vai para o banco (o WhatsApp abre igual).
  const pareceRobo = $("#campo-armadilha").value.trim() !== "";
  const pedido = bancoAtivo() && !pareceRobo ? prepararPedido() : null;
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
  $("#campo-ocasiao").addEventListener("input", () => {
    if ($("#campo-ocasiao").value.trim()) mostrarErroOcasiao(false);
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

/* --------------------------- VITRINE DE FOTOS (galeria.js) --------------------------- */

// Quantas fotos aparecem antes do botão "Ver mais fotos".
const FOTOS_POR_VEZ = 8;

const FOTOS = (typeof GALERIA !== "undefined" && Array.isArray(GALERIA) ? GALERIA : [])
  .filter((f) => f && (f.foto || f.legenda))
  .map((f) => ({
    foto: String(f.foto || "").trim(),
    legenda: String(f.legenda || "").trim(),
    categoria: String(f.categoria || "").trim(),
    destaque: Boolean(f.destaque)
  }));

const vitrine = { filtro: "Todas", mostrarTodas: false, atual: 0, origem: null };

// Quadro mostrado enquanto a foto não foi colocada (foto: "" em galeria.js).
function templateFotoVazia(legenda) {
  return (
    `<span class="foto-vazia">${ICONES.cereja}` +
    `<span class="foto-vazia-legenda">${esc(legenda || "Foto")}</span>` +
    `<span class="foto-vazia-aviso">foto em breve</span></span>`
  );
}

const fotosFiltradas = () =>
  vitrine.filtro === "Todas" ? FOTOS : FOTOS.filter((f) => f.categoria === vitrine.filtro);
const fotosAmpliaveis = () => fotosFiltradas().filter((f) => f.foto);

function renderizarFiltros() {
  const categorias = [...new Set(FOTOS.map((f) => f.categoria).filter(Boolean))];
  const area = $("#filtros-galeria");
  area.hidden = categorias.length < 2;
  area.innerHTML = ["Todas", ...categorias]
    .map((c) => `<button type="button" class="filtro" data-filtro="${esc(c)}" aria-pressed="false">${esc(c)}</button>`)
    .join("");
}

function renderizarGaleria() {
  const lista = fotosFiltradas();
  const visiveis = vitrine.mostrarTodas ? lista : lista.slice(0, FOTOS_POR_VEZ);
  let ampliavel = 0; // posição entre as fotos que abrem ampliadas

  $("#galeria").innerHTML = visiveis
    .map((f, i) => {
      // "cortina": a foto se revela ao entrar na tela; as da mesma linha entram em sequência
      const abertura = `<li class="galeria-item cortina" style="--atraso:${(i % 4) * 0.09}s">`;
      if (!f.foto) return `${abertura}${templateFotoVazia(f.legenda)}</li>`;
      return (
        `${abertura}<button type="button" class="galeria-botao" data-foto="${ampliavel++}" aria-label="Ampliar foto: ${esc(f.legenda)}">` +
        `<img src="${esc(f.foto)}" alt="${esc(f.legenda)}" loading="lazy" decoding="async">` +
        `<span class="galeria-legenda" aria-hidden="true">${esc(f.legenda)}</span>` +
        `</button></li>`
      );
    })
    .join("");

  $("#galeria-mais").hidden = vitrine.mostrarTodas || lista.length <= FOTOS_POR_VEZ;
  $$("[data-filtro]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.filtro === vitrine.filtro ? "true" : "false"));
  if (iniciado) iniciarEntradaSuave(); // fotos novas (filtro, "ver mais") também ganham a entrada
}

function renderizarMosaico() {
  const destaques = FOTOS.filter((f) => f.destaque).slice(0, 3);
  if (!destaques.length) return;

  const mosaico = $("#hero-mosaico");
  mosaico.innerHTML = destaques
    .map((f, i) =>
      `<div class="mosaico-item cortina" style="--atraso:${0.25 + i * 0.15}s">` +
      (f.foto
        ? `<img src="${esc(f.foto)}" alt="${esc(f.legenda)}" decoding="async"${i === 0 ? ' fetchpriority="high"' : ""}>`
        : templateFotoVazia(f.legenda)) +
      `</div>`
    )
    .join("");
  mosaico.hidden = false;
  $(".hero").classList.add("com-mosaico");
}

function renderizarVitrine() {
  if (!FOTOS.length) return; // sem fotos, a seção continua escondida
  renderizarFiltros();
  renderizarCarrossel();
  $("#trabalhos").hidden = false;
  aplicarModoVitrine();
}

// "Todas" mostra o carrossel; os outros filtros mostram a grade só com aquele tipo.
function aplicarModoVitrine() {
  const todas = vitrine.filtro === "Todas";
  $("#carrossel").hidden = !todas;
  $("#galeria").hidden = todas;
  if (todas) {
    $("#galeria-mais").hidden = true;
    $$("[data-filtro]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.filtro === "Todas" ? "true" : "false"));
    requestAnimationFrame(() => irParaSlide(carrossel.atual, false));
    iniciarRelogioCarrossel();
  } else {
    renderizarGaleria();
  }
}

/* -------------------------- CARROSSEL (filtro "Todas") -------------------------- */

const CARROSSEL_INTERVALO_MS = 4500;
const ICONE_PAUSA =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
const ICONE_PLAY =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';

const carrossel = {
  atual: 0,
  pausado: false,         // botão de pausa
  pausaTemporaria: false, // mouse em cima, dedo tocando, foco do teclado
  naTela: false,
  relogio: null,
  agendado: false
};

const slidesCarrossel = () => $$(".carrossel-slide", $("#carrossel-trilho"));

function renderizarCarrossel() {
  let ampliavel = 0;
  $("#carrossel-trilho").innerHTML = FOTOS.map((f, i) => {
    const legenda =
      `<span class="carrossel-legenda">` +
      (f.categoria ? `<span class="carrossel-categoria">${esc(f.categoria)}</span>` : "") +
      `<span>${esc(f.legenda)}</span></span>`;
    const miolo = f.foto
      ? `<button type="button" class="carrossel-botao" data-foto="${ampliavel++}" aria-label="Ampliar foto: ${esc(f.legenda)}">` +
        `<img src="${esc(f.foto)}" alt="${esc(f.legenda)}"${i > 2 ? ' loading="lazy"' : ""} decoding="async">${legenda}</button>`
      : templateFotoVazia(f.legenda);
    return `<li class="carrossel-slide" aria-roledescription="slide" aria-label="${i + 1} de ${FOTOS.length}">${miolo}</li>`;
  }).join("");

  // Até 12 fotos: bolinhas. Mais que isso: contador "3 de 20".
  $("#carrossel-pontos").innerHTML =
    FOTOS.length <= 12
      ? FOTOS.map((f, i) => `<button type="button" class="carrossel-ponto" data-slide="${i}" aria-label="Ir para a foto ${i + 1}: ${esc(f.legenda)}"></button>`).join("")
      : `<span class="carrossel-contagem" id="carrossel-contagem"></span>`;

  const variasFotos = FOTOS.length > 1;
  $("#carrossel-anterior").hidden = !variasFotos;
  $("#carrossel-proxima").hidden = !variasFotos;
  $("#carrossel-pausa").hidden = !variasFotos;
  marcarSlideAtivo(0);
}

function marcarSlideAtivo(indice) {
  carrossel.atual = indice;
  slidesCarrossel().forEach((s, i) => s.classList.toggle("ativo", i === indice));
  $$(".carrossel-ponto").forEach((p, i) => p.setAttribute("aria-current", i === indice ? "true" : "false"));
  const contagem = $("#carrossel-contagem");
  if (contagem) contagem.textContent = `${indice + 1} de ${FOTOS.length}`;
}

// Slide cujo centro está mais perto do centro do carrossel
function slideMaisCentral() {
  const trilho = $("#carrossel-trilho");
  const centro = trilho.scrollLeft + trilho.clientWidth / 2;
  let melhor = 0;
  let menorDistancia = Infinity;
  slidesCarrossel().forEach((s, i) => {
    const distancia = Math.abs(s.offsetLeft + s.offsetWidth / 2 - centro);
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      melhor = i;
    }
  });
  return melhor;
}

function irParaSlide(indice, suave = true) {
  const slides = slidesCarrossel();
  if (!slides.length) return;
  const alvo = slides[(indice + slides.length) % slides.length];
  const trilho = $("#carrossel-trilho");
  trilho.scrollTo({
    left: alvo.offsetLeft + alvo.offsetWidth / 2 - trilho.clientWidth / 2,
    behavior: suave && !reduzMovimento() ? "smooth" : "auto"
  });
}

const carrosselPodeAndar = () =>
  !carrossel.pausado &&
  !carrossel.pausaTemporaria &&
  carrossel.naTela &&
  !document.hidden &&
  !$("#carrossel").hidden &&
  !$("#foto-ampliada").open &&
  slidesCarrossel().length > 1;

// Recomeça a contagem (depois de a pessoa mexer, a próxima troca espera o tempo todo)
function iniciarRelogioCarrossel() {
  clearInterval(carrossel.relogio);
  carrossel.relogio = setInterval(() => {
    if (carrosselPodeAndar()) irParaSlide(carrossel.atual + 1);
  }, CARROSSEL_INTERVALO_MS);
}

function atualizarBotaoPausa() {
  const botao = $("#carrossel-pausa");
  botao.innerHTML = carrossel.pausado ? ICONE_PLAY : ICONE_PAUSA;
  botao.setAttribute("aria-label", carrossel.pausado ? "Continuar o carrossel" : "Pausar o carrossel");
}

function ligarCarrossel() {
  const caixa = $("#carrossel");
  const trilho = $("#carrossel-trilho");

  // Quem prefere menos movimento começa com o carrossel parado
  carrossel.pausado = reduzMovimento();
  atualizarBotaoPausa();

  trilho.addEventListener("scroll", () => {
    if (carrossel.agendado) return;
    carrossel.agendado = true;
    requestAnimationFrame(() => {
      carrossel.agendado = false;
      const indice = slideMaisCentral();
      if (indice !== carrossel.atual) marcarSlideAtivo(indice);
    });
  }, { passive: true });

  const navegar = (indice) => {
    irParaSlide(indice);
    iniciarRelogioCarrossel();
  };
  $("#carrossel-anterior").addEventListener("click", () => navegar(carrossel.atual - 1));
  $("#carrossel-proxima").addEventListener("click", () => navegar(carrossel.atual + 1));
  $("#carrossel-pontos").addEventListener("click", (e) => {
    const ponto = e.target.closest("[data-slide]");
    if (ponto) navegar(Number(ponto.dataset.slide));
  });
  $("#carrossel-pausa").addEventListener("click", () => {
    carrossel.pausado = !carrossel.pausado;
    atualizarBotaoPausa();
    iniciarRelogioCarrossel();
  });

  trilho.addEventListener("click", (e) => {
    const botao = e.target.closest("[data-foto]");
    if (botao) abrirFoto(Number(botao.dataset.foto), botao);
  });
  trilho.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); navegar(carrossel.atual - 1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); navegar(carrossel.atual + 1); }
  });

  // Pausa enquanto a pessoa está mexendo
  let retomar;
  caixa.addEventListener("mouseenter", () => { carrossel.pausaTemporaria = true; });
  caixa.addEventListener("mouseleave", () => {
    carrossel.pausaTemporaria = false;
    iniciarRelogioCarrossel();
  });
  trilho.addEventListener("touchstart", () => {
    carrossel.pausaTemporaria = true;
    clearTimeout(retomar);
    retomar = setTimeout(() => {
      carrossel.pausaTemporaria = false;
      iniciarRelogioCarrossel();
    }, 6000);
  }, { passive: true });
  caixa.addEventListener("focusin", () => { carrossel.pausaTemporaria = true; });
  caixa.addEventListener("focusout", (e) => {
    if (!caixa.contains(e.relatedTarget)) carrossel.pausaTemporaria = false;
  });

  // Só anda quando está na tela
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entrada]) => { carrossel.naTela = entrada.isIntersecting; }, { threshold: 0.3 }).observe(caixa);
  } else {
    carrossel.naTela = true;
  }

  // Ao girar o celular ou mudar o tamanho da janela, recentra a foto atual
  let espera;
  window.addEventListener("resize", () => {
    clearTimeout(espera);
    espera = setTimeout(() => irParaSlide(carrossel.atual, false), 150);
  });

  iniciarRelogioCarrossel();
}

/* ------------------------------- FOTO AMPLIADA ------------------------------- */

function mostrarFotoAmpliada(indice) {
  const fotos = fotosAmpliaveis();
  if (!fotos.length) return;
  vitrine.atual = (indice + fotos.length) % fotos.length;
  const f = fotos[vitrine.atual];

  const img = $("#foto-img");
  img.src = f.foto;
  img.alt = f.legenda;
  $("#foto-legenda").textContent = f.legenda;
  $("#foto-contagem").textContent = fotos.length > 1 ? `${vitrine.atual + 1} de ${fotos.length}` : "";
  $("#foto-anterior").hidden = fotos.length < 2;
  $("#foto-proxima").hidden = fotos.length < 2;
}

function abrirFoto(indice, origem) {
  const dialogo = $("#foto-ampliada");
  if (typeof dialogo.showModal !== "function") {
    // Navegador antigo, sem janela de diálogo: abre a foto numa aba.
    const f = fotosAmpliaveis()[indice];
    if (f) abrirLink(f.foto);
    return;
  }
  vitrine.origem = origem || null;
  mostrarFotoAmpliada(indice);
  dialogo.showModal();
  document.body.classList.add("sem-rolagem");
}

function ligarEventosVitrine() {
  $("#filtros-galeria").addEventListener("click", (e) => {
    const botao = e.target.closest("[data-filtro]");
    if (!botao || botao.dataset.filtro === vitrine.filtro) return;
    vitrine.filtro = botao.dataset.filtro;
    vitrine.mostrarTodas = false;
    aplicarModoVitrine();
  });

  ligarCarrossel();

  $("#galeria").addEventListener("click", (e) => {
    const botao = e.target.closest("[data-foto]");
    if (botao) abrirFoto(Number(botao.dataset.foto), botao);
  });

  $("#galeria-mais").addEventListener("click", () => {
    const antes = $$(".galeria-item").length;
    vitrine.mostrarTodas = true;
    renderizarGaleria();
    // Leva o foco para a primeira foto nova, para quem navega pelo teclado.
    const primeiraNova = $$(".galeria-item")[antes];
    const alvo = primeiraNova && $("button", primeiraNova);
    if (alvo) alvo.focus();
  });

  const dialogo = $("#foto-ampliada");
  $("#foto-fechar").addEventListener("click", () => dialogo.close());
  $("#foto-anterior").addEventListener("click", () => mostrarFotoAmpliada(vitrine.atual - 1));
  $("#foto-proxima").addEventListener("click", () => mostrarFotoAmpliada(vitrine.atual + 1));

  // Toque fora da foto fecha
  dialogo.addEventListener("click", (e) => {
    if (e.target === dialogo) dialogo.close();
  });

  dialogo.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") mostrarFotoAmpliada(vitrine.atual - 1);
    else if (e.key === "ArrowRight") mostrarFotoAmpliada(vitrine.atual + 1);
  });

  // Arrastar o dedo para o lado troca de foto
  let toqueX = null;
  dialogo.addEventListener("touchstart", (e) => { toqueX = e.touches[0].clientX; }, { passive: true });
  dialogo.addEventListener("touchend", (e) => {
    if (toqueX === null) return;
    const distancia = e.changedTouches[0].clientX - toqueX;
    toqueX = null;
    if (Math.abs(distancia) > 50 && fotosAmpliaveis().length > 1) {
      mostrarFotoAmpliada(vitrine.atual + (distancia < 0 ? 1 : -1));
    }
  });

  dialogo.addEventListener("close", () => {
    document.body.classList.remove("sem-rolagem");
    $("#foto-img").src = "data:,";
    if (vitrine.origem && document.contains(vitrine.origem)) vitrine.origem.focus();
  });
}

/* ------------------------- DEPOIMENTOS E SOBRE ------------------------- */

/* ----------------- DEPOIMENTOS: lista aprovada + formulário do cliente -----------------
   Os depoimentos enviados pelo formulário ficam "pendentes" no banco e só aparecem aqui
   depois que a confeiteira aprova no painel (supabase/depoimentos.sql). */

const CHAVE_ULTIMO_DEPOIMENTO = "divna_ultimo_depoimento";
const ESPERA_ENTRE_DEPOIMENTOS_MS = 60 * 1000;
const MAX_DEPOIMENTOS_NA_TELA = 12;
// Mesma regra do banco: sem endereços de internet no texto.
const TEM_LINK = /(https?:\/\/|www\.|\.com\b|\.br\b)/i;

function estrelasDaNota(nota) {
  const n = Math.round(Number(nota));
  return n >= 1 && n <= 5 ? "★".repeat(n) + "☆".repeat(5 - n) : "";
}

function templateDepoimento(d, i) {
  const estrelas = estrelasDaNota(d.nota);
  return (
    `<figure class="depoimento revelar" style="transition-delay:${Math.min(i, 2) * 0.08}s">` +
    `<span class="depoimento-aspas" aria-hidden="true">“</span>` +
    (estrelas ? `<span class="depoimento-estrelas" role="img" aria-label="Nota ${Math.round(Number(d.nota))} de 5">${estrelas}</span>` : "") +
    `<blockquote><p>${esc(String(d.texto).trim())}</p></blockquote>` +
    `<figcaption><span class="depoimento-nome">${esc(String(d.nome || "").trim() || "Cliente")}</span>` +
    (d.ocasiao ? `<span class="depoimento-ocasiao">${esc(d.ocasiao)}</span>` : "") +
    `</figcaption></figure>`
  );
}

function mostrarDepoimentos(lista) {
  const area = $("#lista-depoimentos");
  area.innerHTML = lista.map(templateDepoimento).join("");
  area.hidden = lista.length === 0;
  iniciarEntradaSuave();
}

// Depoimentos escritos à mão em depoimentos.js + os já aprovados no banco
async function carregarDepoimentos() {
  const proprios = (typeof DEPOIMENTOS !== "undefined" && Array.isArray(DEPOIMENTOS) ? DEPOIMENTOS : [])
    .filter((d) => d && String(d.texto || "").trim());
  mostrarDepoimentos(proprios);
  if (!bancoAtivo()) return;

  try {
    const base = SUPABASE_URL.trim().replace(/\/+$/, "");
    const resposta = await fetch(
      `${base}/rest/v1/depoimentos?select=nome,ocasiao,texto,nota,criado_em&order=criado_em.desc&limit=${MAX_DEPOIMENTOS_NA_TELA}`,
      { headers: cabecalhosBanco() }
    );
    if (!resposta.ok) return; // sem banco pronto: segue só com os da lista
    const doBanco = await resposta.json();
    if (Array.isArray(doBanco)) mostrarDepoimentos([...proprios, ...doBanco].slice(0, MAX_DEPOIMENTOS_NA_TELA));
  } catch (erro) {
    /* sem conexão: segue só com os da lista */
  }
}

function ligarFormularioDepoimento() {
  const form = $("#form-depoimento");
  const mostrarErro = (texto) => { $("#dep-erro").textContent = texto; $("#dep-erro").hidden = !texto; };
  const mostrarOk = (texto) => { $("#dep-ok").textContent = texto; $("#dep-ok").hidden = !texto; };

  // Sem banco configurado, só o botão do WhatsApp fica disponível
  if (!bancoAtivo()) {
    form.classList.add("sem-banco");
    return;
  }

  const lerEspera = () => {
    try { return Number(localStorage.getItem(CHAVE_ULTIMO_DEPOIMENTO) || 0); } catch (e) { return 0; }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    mostrarErro("");
    mostrarOk("");

    const texto = $("#dep-texto").value.trim();
    const nome = $("#dep-nome").value.trim().slice(0, 60);
    const ocasiao = $("#dep-ocasiao").value.trim().slice(0, 80);
    const marcada = form.querySelector('input[name="nota"]:checked');
    const nota = marcada ? Number(marcada.value) : null;

    if (!nota) {
      mostrarErro("Escolha uma nota de 1 a 5 estrelas.");
      form.querySelector(".estrelas-grupo").scrollIntoView({ block: "center", behavior: reduzMovimento() ? "auto" : "smooth" });
      $("#nota-5").focus({ preventScroll: true });
      return;
    }
    if (texto.length < 10) {
      mostrarErro("Conte um pouquinho mais: o depoimento precisa ter pelo menos 10 letras.");
      $("#dep-texto").focus();
      return;
    }
    if (TEM_LINK.test(`${nome} ${ocasiao} ${texto}`)) {
      mostrarErro("Por segurança, não aceitamos endereços de internet no depoimento.");
      $("#dep-texto").focus();
      return;
    }
    if (!$("#dep-aceite").checked) {
      mostrarErro("Marque a caixinha para autorizar que o depoimento apareça no site.");
      $("#dep-aceite").focus();
      return;
    }
    if (Date.now() - lerEspera() < ESPERA_ENTRE_DEPOIMENTOS_MS) {
      mostrarErro("Você acabou de enviar um depoimento. Espere um minutinho para enviar outro.");
      return;
    }
    // Robô: campo-armadilha preenchido. Finge que deu certo e não envia nada.
    if ($("#dep-armadilha").value.trim()) {
      mostrarOk("Agradecemos o carinho! Seu depoimento foi enviado e aparece aqui depois que a Ivna aprovar.");
      return;
    }

    const botao = $("#dep-enviar");
    botao.disabled = true;
    botao.textContent = "Enviando...";
    try {
      const base = SUPABASE_URL.trim().replace(/\/+$/, "");
      const resposta = await fetch(`${base}/rest/v1/depoimentos`, {
        method: "POST",
        headers: cabecalhosBanco(),
        body: JSON.stringify({ id: novoId(), nome, ocasiao, texto, nota })
      });
      if (resposta.ok) {
        try { localStorage.setItem(CHAVE_ULTIMO_DEPOIMENTO, String(Date.now())); } catch (erro) { /* ignora */ }
        form.reset();
        mostrarOk("Agradecemos o carinho! Seu depoimento foi enviado e aparece aqui depois que a Ivna aprovar.");
      } else {
        const corpo = await resposta.text();
        if (corpo.includes("depoimentos_sem_links")) mostrarErro("Por segurança, não aceitamos endereços de internet no depoimento.");
        else if (corpo.includes("Muitos envios")) mostrarErro("Estamos recebendo muitos envios agora. Tente de novo em alguns minutos.");
        else mostrarErro("Não foi possível enviar agora. Tente de novo em instantes ou mande pelo WhatsApp.");
      }
    } catch (erro) {
      mostrarErro("Sem conexão com o servidor. Verifique a internet ou mande pelo WhatsApp.");
    } finally {
      botao.disabled = false;
      botao.textContent = "Enviar depoimento";
    }
  });
}

function renderizarDepoimentos() {
  carregarDepoimentos();
  ligarFormularioDepoimento();
}

function renderizarSobre() {
  const foto = typeof FOTO_SOBRE === "string" ? FOTO_SOBRE.trim() : "";
  const area = $("#sobre-foto");
  // Sem "lazy": é uma foto só, importante, e já fica perto do começo da seção.
  area.innerHTML = foto
    ? `<img src="${esc(foto)}" alt="A confeiteira da D'Ivna Confeitaria" decoding="async">`
    : templateFotoVazia("Foto da confeiteira");
  // Se a foto não carregar por qualquer motivo, mostra o quadro no lugar do texto solto.
  const img = $("img", area);
  if (img) img.addEventListener("error", () => { area.innerHTML = templateFotoVazia("Foto da confeiteira"); });
}

// Links com data-whatsapp="mensagem" abrem o WhatsApp com a mensagem pronta.
function ligarLinksWhatsApp() {
  $$("[data-whatsapp]").forEach((a) => {
    a.href = linkWhatsApp(`Olá, ${NOME_LOJA}! ${a.dataset.whatsapp}`);
  });
}

// Esconde links do menu e do rodapé que apontam para seções escondidas (ex.: sem depoimentos).
function esconderLinksSemDestino() {
  $$('a[href^="#"]').forEach((a) => {
    const alvo = a.hash.length > 1 && document.getElementById(a.hash.slice(1));
    if (alvo && alvo.hidden) (a.closest("li") || a).hidden = true;
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

let observadorEntrada = null;

// Pode ser chamada de novo: só observa o que ainda não apareceu.
function iniciarEntradaSuave() {
  const alvos = $$(".revelar:not(.visivel), .cortina:not(.visivel)");
  if (!("IntersectionObserver" in window) || reduzMovimento()) {
    alvos.forEach((el) => el.classList.add("visivel"));
    return;
  }
  if (!observadorEntrada) {
    observadorEntrada = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add("visivel");
            observadorEntrada.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
  }
  alvos.forEach((el) => observadorEntrada.observe(el));
}

/* ----------------------------------- EFEITOS -----------------------------------
   Títulos que sobem palavra por palavra, faixa de palavras correndo, fotos do topo
   em profundidade, fotos de fundo quase sumindo e o versículo que acende ao rolar.
   Quem configurou o celular para "reduzir movimento" vê tudo parado. */

const efeitos = { ativos: false, agendado: false, palavrasVerso: [] };
const limitar = (n, min, max) => Math.min(max, Math.max(min, n));

// Troca cada palavra do texto por um <span>, mantendo <em> e outras marcações.
function separarPalavras(el, criar) {
  let i = 0;
  const percorrer = (no) => {
    Array.from(no.childNodes).forEach((filho) => {
      if (filho.nodeType === Node.ELEMENT_NODE) {
        percorrer(filho);
        return;
      }
      if (filho.nodeType !== Node.TEXT_NODE) return;
      const pedacos = document.createDocumentFragment();
      filho.textContent.split(/(\s+)/).forEach((parte) => {
        if (!parte) return;
        pedacos.appendChild(/^\s+$/.test(parte) ? document.createTextNode(parte) : criar(parte, i++));
      });
      no.replaceChild(pedacos, filho);
    });
  };
  percorrer(el);
}

function prepararTitulos() {
  $$("#titulo-hero, .titulo-secao").forEach((titulo) =>
    separarPalavras(titulo, (palavra, i) => {
      const fora = document.createElement("span");
      const dentro = document.createElement("span");
      fora.className = "palavra";
      dentro.textContent = palavra;
      dentro.style.setProperty("--i", i);
      fora.appendChild(dentro);
      return fora;
    })
  );

  const verso = $("#versiculo-texto p");
  if (verso) {
    separarPalavras(verso, (palavra) => {
      const span = document.createElement("span");
      span.className = "palavra-verso";
      span.textContent = palavra;
      return span;
    });
    efeitos.palavrasVerso = $$(".palavra-verso", verso);
  }
}

// A faixa precisa de cópias suficientes do grupo de palavras para nunca aparecer um buraco.
function montarFaixa() {
  const trilho = $(".faixa-trilho");
  const grupo = trilho && $(".faixa-grupo", trilho);
  if (!grupo) return;

  const ajustar = () => {
    $$(".faixa-grupo", trilho).slice(1).forEach((g) => g.remove());
    const largura = grupo.getBoundingClientRect().width;
    if (!largura) return;
    const copias = Math.ceil(window.innerWidth / largura) + 1;
    for (let i = 0; i < copias; i++) trilho.appendChild(grupo.cloneNode(true));
    trilho.style.setProperty("--grupo", `${largura}px`);
    trilho.style.setProperty("--duracao", `${Math.round(largura / 55)}s`); // ~55 pixels por segundo
  };

  ajustar();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustar);
  let espera;
  window.addEventListener("resize", () => {
    clearTimeout(espera);
    espera = setTimeout(ajustar, 200);
  });
}

// Fotos clarinhas no fundo das faixas (FUNDO_FESTAS e FUNDO_VERSICULO, em galeria.js).
function aplicarFundos() {
  const foto = (valor) => (typeof valor === "string" ? valor.trim() : "");
  const urlCss = (caminho) => `url("${caminho.replace(/["\\]/g, "\\$&")}")`;

  const festas = foto(typeof FUNDO_FESTAS !== "undefined" ? FUNDO_FESTAS : "");
  if (festas) {
    const camada = document.createElement("div");
    camada.className = "festas-foto fundo-parallax";
    camada.setAttribute("aria-hidden", "true");
    camada.style.backgroundImage = urlCss(festas);
    $("#festas").prepend(camada);
  }

  const versiculo = foto(typeof FUNDO_VERSICULO !== "undefined" ? FUNDO_VERSICULO : "");
  const fundoVerso = $("#versiculo-fundo");
  if (fundoVerso) {
    if (versiculo) fundoVerso.style.backgroundImage = urlCss(versiculo);
    else fundoVerso.classList.add("sem-foto");
  }
}

function atualizarEfeitos() {
  efeitos.agendado = false;
  const alturaTela = window.innerHeight;
  $(".topo").classList.toggle("rolou", window.scrollY > 8);
  if (!efeitos.ativos) return;

  // Fotos do topo sobem em velocidades diferentes (profundidade)
  const mosaico = $("#hero-mosaico");
  if (!mosaico.hidden && window.scrollY < alturaTela * 1.5) {
    mosaico.style.setProperty("--rolagem", `${window.scrollY}px`);
  }

  // Fotos de fundo andam mais devagar que a página
  $$(".fundo-parallax").forEach((camada) => {
    const caixa = camada.parentElement.getBoundingClientRect();
    if (caixa.bottom < 0 || caixa.top > alturaTela) return;
    const distancia = caixa.top + caixa.height / 2 - alturaTela / 2;
    camada.style.transform = `translate3d(0, ${(distancia * -0.15).toFixed(1)}px, 0)`;
  });

  // Versículo: as palavras acendem conforme a faixa sobe na tela
  const palavras = efeitos.palavrasVerso;
  if (palavras.length) {
    const caixa = $(".versiculo").getBoundingClientRect();
    if (caixa.bottom > 0 && caixa.top < alturaTela) {
      const progresso = limitar((alturaTela * 0.9 - caixa.top) / (caixa.height * 0.8), 0, 1);
      palavras.forEach((p, i) => {
        p.style.opacity = (0.16 + 0.84 * limitar(progresso * (palavras.length + 1) - i, 0, 1)).toFixed(3);
      });
    }
  }
}

function agendarEfeitos() {
  if (efeitos.agendado) return;
  efeitos.agendado = true;
  requestAnimationFrame(atualizarEfeitos);
}

function ligarEfeitos() {
  efeitos.ativos = !reduzMovimento();
  // O versículo começa apagado e vai acendendo (só com os efeitos ligados)
  if (efeitos.ativos) efeitos.palavrasVerso.forEach((p) => { p.style.opacity = "0.16"; });
  window.addEventListener("scroll", agendarEfeitos, { passive: true });
  window.addEventListener("resize", agendarEfeitos);
  atualizarEfeitos();
}

function iniciar() {
  prepararCardapio();
  lerCarrinhoSalvo();
  renderizarCategorias();
  $$("[data-controle]").forEach(renderizarControle);
  lerCliente();
  ligarEventos();

  renderizarMosaico();
  renderizarVitrine();
  renderizarDepoimentos();
  renderizarSobre();
  ligarEventosVitrine();
  ligarLinksWhatsApp();
  esconderLinksSemDestino();

  prepararTitulos();
  montarFaixa();
  aplicarFundos();
  ligarEfeitos();

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
