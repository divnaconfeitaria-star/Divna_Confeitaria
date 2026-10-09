/* =====================================================================
   DEPOIMENTOS DE CLIENTES
   Aparecem na seção "Quem provou, recomenda". O site se monta sozinho.

   Use só depoimentos de verdade (mensagens do WhatsApp, comentários no
   Instagram...) e peça autorização para mostrar o nome. O primeiro nome
   já basta (ex.: "Carla").

   COMO ADICIONAR
   Copie o modelo e cole dentro da lista, separando com vírgula:
     { nome: "Carla", ocasiao: "Aniversário de 15 anos", texto: "Os doces fizeram o maior sucesso!" },

   CAMPOS
   nome     quem escreveu
   ocasiao  opcional: festa ou motivo do pedido
   texto    o depoimento (de preferência curto: até umas 3 linhas)

   Se a lista ficar vazia ( [] ), a seção some do site.
   ===================================================================== */

// EDITAR: trocar os três modelos abaixo por depoimentos reais.
const DEPOIMENTOS = [
  {
    nome: "Nome do cliente",
    ocasiao: "Ocasião do pedido",
    texto: "Espaço para o depoimento de um cliente de verdade, copiado de uma mensagem do WhatsApp ou do Instagram."
  },
  {
    nome: "Nome do cliente",
    ocasiao: "Ocasião do pedido",
    texto: "Outro depoimento real entra aqui. Frases curtas funcionam melhor."
  },
  {
    nome: "Nome do cliente",
    ocasiao: "Ocasião do pedido",
    texto: "Mais um depoimento real. Com três ou mais, a seção fica bem completa."
  }
];
