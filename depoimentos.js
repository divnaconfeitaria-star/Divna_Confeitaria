/* =====================================================================
   DEPOIMENTOS DE CLIENTES
   Aparecem na seção "Quem provou, recomenda".

   DE ONDE VÊM
   1. Do formulário do site: o cliente escreve, o depoimento chega ao painel
      (pedidos.html, aba "Depoimentos") como PENDENTE e só aparece no site
      depois que a confeiteira aprovar. É o caminho principal.
      Precisa do banco configurado (supabase/depoimentos.sql).
   2. Desta lista, para depoimentos que você queira colocar à mão (por exemplo,
      uma mensagem de WhatsApp ou um comentário do Instagram). Peça autorização
      para mostrar o nome; o primeiro nome já basta.

   COMO ADICIONAR À MÃO
   Copie o modelo e cole dentro da lista, separando com vírgula:
     { nome: "Carla", ocasiao: "Aniversário de 15 anos", texto: "Os doces fizeram o maior sucesso!", nota: 5 },

   CAMPOS
   nome     quem escreveu (se vazio, aparece "Cliente")
   ocasiao  opcional: festa ou motivo do pedido
   texto    o depoimento (de preferência curto: até umas 3 linhas)
   nota     opcional: de 1 a 5 estrelas
   ===================================================================== */

const DEPOIMENTOS = [
  // Lista vazia de propósito: os depoimentos entram pelo formulário do site.
];
