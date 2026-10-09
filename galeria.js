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
const FOTO_SOBRE = "";

// Fotos que aparecem bem clarinhas, quase sumindo, no fundo de duas faixas do site.
// Funcionam melhor fotos com bastante coisa (mesa de festa, bandeja cheia). Deixe "" para usar só a cor.
const FUNDO_FESTAS = "";      // faixa vermelha "Festas e eventos"
const FUNDO_VERSICULO = "";   // faixa do versículo

// EDITAR: trocar os quadros abaixo pelas fotos reais (os que estão com foto "" são só modelo).
const GALERIA = [
  { foto: "", legenda: "Mesa de doces para aniversário", categoria: "Festas", destaque: true },
  { foto: "", legenda: "Doces finos em forminhas", categoria: "Doces finos", destaque: true },
  { foto: "", legenda: "Bolo caseirinho coberto", categoria: "Bolos e tortas", destaque: true },
  { foto: "", legenda: "Salgados sortidos", categoria: "Salgados" },
  { foto: "", legenda: "Brigadeiros gourmet", categoria: "Doces finos" },
  { foto: "", legenda: "Torta salgada de 25 cm", categoria: "Bolos e tortas" },
  { foto: "", legenda: "Pão metro recheado", categoria: "Salgados" },
  { foto: "", legenda: "Doces personalizados", categoria: "Festas" }
];
