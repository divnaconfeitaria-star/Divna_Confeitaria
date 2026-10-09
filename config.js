/* =====================================================================
   D'Ivna Confeitaria — config.js
   Ligação com o banco de pedidos (Supabase). Usado pelo site e pelo painel.

   ONDE ACHAR OS VALORES: no Supabase, abra o projeto e vá em
   "Project Settings" > "API" (ou o botão "Connect" no topo).
   - SUPABASE_URL:   o "Project URL", ex.: https://abcdefgh.supabase.co
   - SUPABASE_CHAVE: a chave pública, "publishable" (começa com sb_publishable_)
                     ou, nos projetos antigos, a "anon public" (começa com eyJ).

   NUNCA coloque aqui a chave "secret" nem a "service_role": este arquivo
   fica público na internet.

   Enquanto os dois valores estiverem vazios, o site funciona normalmente
   só com o WhatsApp, sem salvar os pedidos.
   ===================================================================== */

const SUPABASE_URL = "https://vhduzicyvkiaawgjqgds.supabase.co";
const SUPABASE_CHAVE = "sb_publishable_BxqOr8MNFlASEcvKsUQokw_ipQC4F2u";
