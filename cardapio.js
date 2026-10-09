/* =====================================================================
   CARDÁPIO DA D'IVNA CONFEITARIA
   Este é o ÚNICO arquivo que você precisa editar para mudar sabores,
   preços e categorias. O site se monta sozinho a partir daqui.

   COMO EDITAR
   - Trocar um preço: mude o número do grupo (preco: 2.50) ou do item.
     Use ponto no lugar da vírgula (2.50, 3.30, 110.00).
   - Adicionar um sabor: acrescente o nome na lista "itens" do grupo.
     Se o grupo tem "preco", o sabor novo usa esse preço.
   - Remover um sabor: apague a linha dele.
   - Item com preço próprio: use { nome: "Nome", preco: 4.00 }.
   - Nova categoria: copie um bloco inteiro { id: ..., nome: ..., secoes: [...] }
     e cole depois da vírgula do bloco anterior.

   CAMPOS (todos opcionais, exceto id, nome e secoes)
   categoria:  id        identificador sem espaços (ex.: "salgados")
               nome      título que aparece no cardápio
               unidade   texto depois do preço (ex.: "a unidade")
               prefixoPedido     texto que antecede o nome do item no pedido
               prefixoSubtitulo  texto antes de "a partir de" (ex.: "Grande e coberto · ")
               foto      foto redonda no lugar da cereja (ex.: "assets/galeria/salgados.jpg")
   seção:      titulo    título do grupo (pode ser null)
               preco     preço padrão dos itens do grupo
               sufixoPreco  troca o texto depois do preço (ex.: "cada")
               prefixoPedido  prefixo só deste grupo
               minimo    quantidade mínima por item (padrão 1)
   item:       nome, preco, minimo, e para itens sob consulta:
               consultar: true, observacao, mensagemConsulta

   QUANTIDADE MÍNIMA: se algum grupo tiver mínimo (ex.: forminhas = 30),
   acrescente  minimo: 30  nesse grupo. O site passa a adicionar 30 no
   primeiro toque no "+" e mostra "mín. 30 un." ao lado do item.
   ===================================================================== */

// Aviso mostrado abaixo da lista de categorias (deixe "" para esconder).
const AVISO_CARDAPIO = "Forminhas convencionais · quantidade mínima de 30 unidades";

const CARDAPIO = [
  /* ------------------------------ SALGADOS ------------------------------ */
  {
    id: "salgados",
    nome: "Salgados",
    unidade: "a unidade",
    secoes: [
      {
        titulo: "Clássicos",
        preco: 2.00,
        itens: [
          "Coxinha",
          "Empada de frango",
          "Tortelete de queijo e presunto",
          "Bolinho de queijo",
          "Risole de queijo e presunto",
          "Pastel frito de frango",
          "Pastel frito misto",
          "Pastel de forno de frango",
          "Pastel de forno misto",
          "Boliviano",
          "Quibe",
          "Empada de carne",
          "Pastel de forno de carne",
          "Pastel frito de carne"
        ]
      },
      {
        titulo: "Especiais",
        preco: 2.50,
        itens: [
          "Coxinha com catupiry",
          "Quibe com recheio de carne",
          "Quibe com recheio de queijo",
          "Esfirra de carne",
          "Esfirra de frango",
          "Enrolado de salsicha",
          "Enrolado de queijo e presunto",
          "Bauru",
          "Tortelete de peito de peru",
          "Tortinha de atum",
          "Quiche de carne seca",
          "Saltenha de carne",
          "Tortinha sertaneja (charque com banana frita)",
          "Tortinha tropical (peito de peru e abacaxi)",
          "Risole de peito de peru",
          "Tortelete tropical (peito de peru, queijo e abacaxi)",
          "Tortinha de carne do sol com purê de aipim e queijo maçaricado",
          "Quiche de queijo e alho-poró"
        ]
      },
      {
        titulo: "Sofisticados",
        itens: [
          { nome: "Carpaccio de abacaxi ao vinagrete de gorgonzola", preco: 3.50 },
          { nome: "Tortinha de camarão", preco: 4.00 },
          { nome: "Barquete de camarão", preco: 5.00 },
          { nome: "Camarão empanado", preco: 5.00 },
          { nome: "Camarão empanado na tapioca", preco: 6.00 }
        ]
      }
    ]
  },

  /* ----------------------------- PÃO DELÍCIA ----------------------------- */
  {
    id: "pao-delicia",
    nome: "Pão Delícia",
    unidade: "a unidade",
    prefixoPedido: "Pão delícia — ",
    secoes: [
      {
        titulo: null,
        itens: [
          { nome: "Sem recheio", preco: 2.50 },
          { nome: "Tradicional", preco: 3.00 },
          { nome: "Romeu e Julieta", preco: 3.30 },
          { nome: "Frango", preco: 3.50 },
          { nome: "Calabresa", preco: 3.70 },
          { nome: "Bacon", preco: 3.70 },
          { nome: "Atum", preco: 4.00 },
          { nome: "Peito de peru", preco: 4.00 },
          { nome: "Salame", preco: 4.00 },
          { nome: "Carne seca", preco: 4.00 },
          { nome: "Camarão", preco: 5.00 }
        ]
      }
    ]
  },

  /* -------------------------------- DOCES -------------------------------- */
  {
    id: "doces",
    nome: "Doces",
    unidade: "a unidade",
    secoes: [
      {
        titulo: "Simples",
        preco: 2.00,
        itens: ["Brigadeiro", "Beijinho", "Empadinha aberta", "Moranguinho", "Casadinho"]
      },
      {
        titulo: "Brigadeiros diversos",
        preco: 2.50,
        itens: [
          "Olho de sogra",
          "Surpresa de uva",
          "Brigadeiro ninho",
          "Brigadeiro Oreo",
          "Brigadeiro napolitano",
          "Brigadeiro cupuaçu",
          "Brigadeiro de limão",
          "Brigadeiro prestígio",
          "Brigadeiro churros",
          "Brigadeiro amendoim",
          "Brigadeiro de paçoca",
          "Brigadeiro cappuccino"
        ]
      },
      {
        titulo: "Brigadeiro nobre",
        preco: 3.00,
        itens: ["Brigadeiro ao leite", "Brigadeiro meio amargo", "Brigadeiro branco", "Brulé"]
      },
      {
        titulo: "Doces finos",
        preco: 3.50,
        itens: [
          "Trufas",
          "Copinho de limão",
          "Caixinha perolada",
          "Floresta encantada",
          "Gota de maracujá",
          "Rosa de marzipã",
          "Copinho acrílico (brigadeiro, beijinho ou moranguinho)"
        ]
      },
      {
        titulo: "Doces finos especiais",
        preco: 4.00,
        itens: [
          "Camafeu de nozes",
          "Copinho de chocolate com cereja (com cabinho)",
          "Copinho de chocolate com physalis"
        ]
      },
      {
        titulo: "Morangos",
        preco: 5.00,
        itens: ["Morangos cobertos e banhados"]
      },
      {
        titulo: "Personalizados",
        itens: [
          {
            nome: "Doces personalizados",
            consultar: true,
            observacao: "A partir de R$ 4,00 a unidade",
            mensagemConsulta: "Gostaria de consultar doces personalizados."
          }
        ]
      }
    ]
  },

  /* --------------------------- TORTAS SALGADAS --------------------------- */
  {
    id: "tortas-salgadas",
    nome: "Tortas salgadas",
    secoes: [
      {
        titulo: "20 cm",
        prefixoPedido: "Torta salgada 20 cm — ",
        itens: [
          { nome: "Frango", preco: 110.00 },
          { nome: "Carne", preco: 120.00 },
          { nome: "Carne do sol", preco: 150.00 },
          { nome: "Carne seca com banana frita", preco: 150.00 },
          { nome: "Peito de peru", preco: 150.00 },
          { nome: "Camarão", preco: 160.00 }
        ]
      },
      {
        titulo: "25 cm",
        prefixoPedido: "Torta salgada 25 cm — ",
        itens: [
          { nome: "Frango", preco: 170.00 },
          { nome: "Carne seca com banana frita", preco: 220.00 },
          { nome: "Camarão", preco: 220.00 },
          { nome: "Peito de peru", preco: 220.00 }
        ]
      }
    ]
  },

  /* ------------------------------ PÃO METRO ------------------------------ */
  {
    id: "pao-metro",
    nome: "Pão metro",
    prefixoSubtitulo: "50 cm recheado · ",
    prefixoPedido: "Pão metro 50 cm — ",
    secoes: [
      {
        titulo: null,
        itens: [
          { nome: "Recheado com frango", preco: 130.00 },
          { nome: "Recheado com frango, queijo e presunto", preco: 150.00 },
          { nome: "Recheado com atum, queijo e cream cheese", preco: 170.00 },
          { nome: "Recheado com frango, queijo, cream cheese e peito de peru", preco: 180.00 }
        ]
      }
    ]
  },

  /* --------------------------- BOLO CASEIRINHO --------------------------- */
  {
    id: "bolo-caseirinho",
    nome: "Bolo caseirinho",
    prefixoSubtitulo: "Grande e coberto · ",
    prefixoPedido: "Bolo caseirinho — ",
    secoes: [
      {
        titulo: null,
        preco: 120.00,
        sufixoPreco: "cada",
        itens: ["Chocolate", "Coco", "Doce de leite", "Ninho", "Maracujá", "Limão", "Amendoim"]
      }
    ]
  },

  /* ------------------------------- SUCOS (1 L) ------------------------------- */
  {
    id: "sucos",
    nome: "Sucos da fruta (1 L)",
    secoes: [
      {
        titulo: null,
        itens: [
          { nome: "Suco de manga (1 L)", preco: 14.00 },
          { nome: "Suco de goiaba (1 L)", preco: 14.00 },
          { nome: "Suco de acerola (1 L)", preco: 14.00 },
          { nome: "Suco de mangaba (1 L)", preco: 16.00 },
          { nome: "Suco de graviola (1 L)", preco: 16.00 },
          { nome: "Suco de maracujá (1 L)", preco: 16.00 },
          { nome: "Suco de laranja (1 L)", preco: 18.00 },
          { nome: "Suco de cupuaçu (1 L)", preco: 18.00 },
          { nome: "Suco de morango (1 L)", preco: 20.00 }
        ]
      }
    ]
  },

  /* ---------------------------- LANCHES E POTES ---------------------------- */
  {
    id: "lanches-e-potes",
    nome: "Lanches e potes",
    secoes: [
      {
        titulo: null,
        itens: [
          { nome: "Salada de frutas (200 ml)", preco: 10.00 },
          { nome: "Cuscuz recheado no pote (250 ml)", preco: 12.00 },
          { nome: "Escondidinho de aipim com carne do sol no pote (250 ml)", preco: 12.00 },
          { nome: "Sanduíche de frango", preco: 10.00 },
          { nome: "Sanduíche integral de frango", preco: 12.00 },
          { nome: "Sanduíche integral de ricota com peito de peru", preco: 15.00 }
        ]
      }
    ]
  }
];
