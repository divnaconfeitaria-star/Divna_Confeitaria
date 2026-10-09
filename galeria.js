/* =====================================================================
   FOTOS DA D'IVNA CONFEITARIA
   Aqui ficam as fotos da vitrine "Nossos trabalhos", as do topo da página
   e a foto da seção "Sobre". O site se monta sozinho a partir daqui.

   COMO ADICIONAR UMA FOTO
   1. Coloque o arquivo na pasta  assets/galeria/  (ex.: mesa-aniversario.jpg).
      De preferência JPG, com uns 1200 pixels de largura.
   2. Acrescente uma linha na lista GALERIA, copiando o modelo:
        { foto: "assets/galeria/mesa-aniversario.jpg", legenda: "Mesa de aniversário", categoria: "Festas" },
   3. Para a foto aparecer também no topo da página, acrescente  destaque: true
      (o topo mostra as 3 primeiras fotos marcadas como destaque).

   CAMPOS
   foto       caminho do arquivo. Vazio ("") mostra um quadro "foto em breve".
   legenda    texto curto que aparece na foto ampliada e ajuda quem usa leitor de tela.
   categoria  agrupa as fotos nos botões de filtro (ex.: "Festas", "Doces finos").
   destaque   true para usar a foto no topo da página.

   Para remover uma foto, apague a linha dela.
   ===================================================================== */

// Foto da confeiteira na seção "Sobre" (deixe "" enquanto não tiver).
const FOTO_SOBRE = "assets/galeria/sobre-confeiteira.jpg";

// Fotos que aparecem bem clarinhas, quase sumindo, no fundo de duas faixas do site.
// Funcionam melhor fotos com bastante coisa (mesa de festa, bandeja cheia). Deixe "" para usar só a cor.
const FUNDO_FESTAS = "assets/galeria/bolo-carnaval.jpg";            // faixa vermelha "Festas e eventos"
const FUNDO_VERSICULO = "assets/galeria/bolo-happy-birthday.jpg";   // faixa do versículo

// EDITAR: legendas provisórias, ajuste ao gosto. A ordem aqui é a ordem do carrossel.
const GALERIA = [
  { foto: "assets/galeria/bolo-chocolate-morangos.jpg", legenda: "Bolo de chocolate com morangos", categoria: "Bolos e tortas", destaque: true },
  { foto: "assets/galeria/camarao-kataifi.jpg", legenda: "Camarão com massa kataifi", categoria: "Salgados", destaque: true },
  { foto: "assets/galeria/doces-coloridos.jpg", legenda: "Brigadeiros e docinhos coloridos", categoria: "Doces finos" },
  { foto: "assets/galeria/cesta-cafe-da-manha.jpg", legenda: "Cesta de café da manhã", categoria: "Cestas" },
  { foto: "assets/galeria/bolo-happy-birthday.jpg", legenda: "Bolo branco com laço", categoria: "Bolos e tortas", destaque: true },
  { foto: "assets/galeria/bolo-carnaval.jpg", legenda: "Bolo de carnaval", categoria: "Festas" },
  { foto: "assets/galeria/coxinhas.jpg", legenda: "Coxinhas", categoria: "Salgados" },
  { foto: "assets/galeria/cestinhas-chocolate.jpg", legenda: "Cestinhas de chocolate com creme", categoria: "Doces finos" },
  { foto: "assets/galeria/bolo-flores.jpg", legenda: "Bolo com flores e girassol", categoria: "Bolos e tortas" },
  { foto: "assets/galeria/cesta-balao-roxo.jpg", legenda: "Cesta com balão de coração", categoria: "Cestas" },
  { foto: "assets/galeria/bolo-nossa-senhora.jpg", legenda: "Bolo de Nossa Senhora", categoria: "Festas" },
  { foto: "assets/galeria/salgados-variados.jpg", legenda: "Salgados variados", categoria: "Salgados" },
  { foto: "assets/galeria/beijinho-morango.jpg", legenda: "Beijinho com coração de morango", categoria: "Doces finos" },
  { foto: "assets/galeria/bolo-hamburguer.jpg", legenda: "Bolo hambúrguer", categoria: "Bolos e tortas" },
  { foto: "assets/galeria/bolo-branca-de-neve.jpg", legenda: "Bolo Branca de Neve", categoria: "Festas" },
  { foto: "assets/galeria/tortinhas-salgadas.jpg", legenda: "Tortinhas salgadas", categoria: "Salgados" },
  { foto: "assets/galeria/doces-dourados-maracuja.jpg", legenda: "Dourados e cestinhas de maracujá", categoria: "Doces finos" },
  { foto: "assets/galeria/cesta-namorados.jpg", legenda: "Cesta de Dia dos Namorados", categoria: "Cestas" },
  { foto: "assets/galeria/bolo-aniversario-polaroids.jpg", legenda: "Bolo de aniversário com fotos", categoria: "Bolos e tortas" },
  { foto: "assets/galeria/bolo-batizado.jpg", legenda: "Bolo de batizado", categoria: "Festas" },
  { foto: "assets/galeria/pao-metro-recheado.jpg", legenda: "Pão recheado", categoria: "Salgados" },
  { foto: "assets/galeria/copinhos-oreo.jpg", legenda: "Copinhos de Oreo", categoria: "Doces finos" },
  { foto: "assets/galeria/cesta-laco-amarelo.jpg", legenda: "Cesta de presente", categoria: "Cestas" },
  { foto: "assets/galeria/bolo-real-madrid.jpg", legenda: "Bolo de futebol", categoria: "Bolos e tortas" },
  { foto: "assets/galeria/bolo-patrulha.jpg", legenda: "Bolo Patrulha Canina", categoria: "Festas" },
  { foto: "assets/galeria/esfirras-gergelim.jpg", legenda: "Esfirras com gergelim", categoria: "Salgados" },
  { foto: "assets/galeria/brigadeiros-coracao-dourado.jpg", legenda: "Brigadeiros com coração dourado", categoria: "Doces finos" },
  { foto: "assets/galeria/cesta-junina.jpg", legenda: "Cesta junina", categoria: "Cestas" },
  { foto: "assets/galeria/camarao-tapioca.jpg", legenda: "Camarão empanado na tapioca", categoria: "Salgados" },
  { foto: "assets/galeria/tarteletes-tomate.jpg", legenda: "Tarteletes com tomatinho", categoria: "Salgados" }
];
