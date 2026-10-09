# D'Ivna Confeitaria — site com cardápio, pedido pelo WhatsApp e painel de pedidos

Site estático (HTML, CSS e JavaScript puro). O pedido é montado no navegador e enviado para o
WhatsApp da confeiteira. Com o Supabase configurado, cada pedido também fica salvo num banco,
e a confeiteira acompanha tudo numa página privada (`pedidos.html`).

## Estrutura

```
index.html      site (início, trabalhos, cardápio, depoimentos, festas, sobre, dúvidas)
style.css       visual (cores, fontes, animações)
cardapio.js     sabores, categorias e preços  <- o arquivo que você mais vai editar
galeria.js      fotos da vitrine, do topo da página e da seção "Sobre"
depoimentos.js  depoimentos de clientes
script.js       funcionamento (sanfona, carrinho, WhatsApp, registro do pedido, vitrine)
config.js       endereço e chave do Supabase  <- preencher uma vez
pedidos.html    painel privado da confeiteira (login)
pedidos.css     visual do painel
pedidos.js      funcionamento do painel
supabase/
  pedidos.sql   cria o banco de pedidos e as regras de segurança
assets/         logo, ícone e imagem de prévia do link (og-imagem.jpg)
  galeria/      fotos dos produtos
```

## Rodar no VS Code

1. Abra a pasta do projeto no VS Code (Arquivo > Abrir Pasta).
2. Instale a extensão **Live Server** (Ritwick Dey).
3. Clique com o botão direito em `index.html` > **Open with Live Server**.
   O painel abre em `http://127.0.0.1:5500/pedidos.html`.

## O que você vai querer editar

- **Número do WhatsApp:** `script.js`, constante `WHATSAPP_NUMBER` (código do país + DDD + número, só dígitos).
  O telefone do rodapé acompanha esse valor.
- **Sabores e preços:** `cardapio.js` (o topo do arquivo explica passo a passo).
- **Quantidade mínima:** em `cardapio.js`, acrescente `minimo: 30` no grupo desejado.
- **Texto de apresentação:** `index.html`, procure por `EDITAR: texto sobre a confeitaria`.
- **Fotos dos produtos:** coloque os arquivos em `assets/galeria/` e liste em `galeria.js`
  (o topo do arquivo explica). Foto que ainda não existe aparece como um quadro "foto em breve".
- **Foto em cada categoria do cardápio:** em `cardapio.js`, acrescente `foto: "assets/galeria/arquivo.jpg"`
  na categoria; ela entra no lugar do ícone de cereja.
- **Depoimentos:** `depoimentos.js`. Só depoimentos reais, com autorização do cliente.
  Com a lista vazia, a seção some do site.
- **História, perguntas frequentes, horário e região de entrega:** `index.html`, procure por `EDITAR`.
  Os textos provisórios aparecem com **fundo amarelo** no site; troque todos antes de publicar
  (para achar: procure `class="completar"`).
- **Versículos:** `index.html`, procure por `EDITAR: versículo` (topo, faixa do meio e rodapé).
  Na faixa do meio, as palavras acendem sozinhas conforme a pessoa rola a página.
- **Fotos clarinhas de fundo:** `galeria.js`, `FUNDO_FESTAS` e `FUNDO_VERSICULO`.
- **Palavras da faixa que corre:** `index.html`, procure por `EDITAR: palavras da faixa`.
- **Cores:** `style.css`, bloco `:root` no começo.

Os efeitos de movimento ficam desligados para quem ativou "reduzir movimento" no celular
ou no computador; para essas pessoas o site aparece completo, só que parado.

### Tamanho das fotos

Fotos de celular costumam ter 3 a 5 MB, o que deixa o site lento. Antes de colocar no site, reduza
para uns 1200 pixels de largura (dá para fazer em squoosh.app, de graça, escolhendo JPG ou WebP).
Prefira fotos com boa luz e fundo limpo; as quadradas ou em pé ficam melhores na vitrine.

## Banco de pedidos e painel (Supabase, plano grátis)

Faça isto uma vez só. Enquanto o `config.js` estiver vazio, o site funciona como antes,
só com o WhatsApp.

1. **Criar o projeto:** entre em supabase.com, crie uma conta e um projeto novo
   (região *South America (São Paulo)*). Guarde a senha do banco que ele pede.
2. **Criar o banco:** no projeto, abra **SQL Editor**, cole todo o arquivo
   `supabase/pedidos.sql` e clique em **Run**.
3. **Criar o login da sua mãe:** em **Authentication > Users > Add user > Create new user**,
   coloque o e-mail e uma senha dela e marque **Auto Confirm User**.
4. **Dar acesso ao painel:** volte ao **SQL Editor** e rode (trocando o e-mail):
   ```sql
   insert into public.admins (user_id, email)
   select id, email from auth.users where email = 'EMAIL_DELA@exemplo.com'
   on conflict (user_id) do nothing;
   ```
5. **Fechar novos cadastros:** em **Authentication > Sign In / Providers**, desligue
   **Allow new users to sign up**. Assim ninguém cria conta sozinho.
6. **Ligar o site ao banco:** em **Project Settings > API Keys** (ou no botão **Connect**),
   copie o *Project URL* e a chave **publishable** (`sb_publishable_...`; em projetos antigos,
   a **anon public**, que começa com `eyJ`). Cole os dois no `config.js`.
   **Nunca** use a chave *secret* nem a *service_role*: o `config.js` fica público.
7. **Testar:** abra o site, faça um pedido de teste até o WhatsApp abrir e depois entre em
   `pedidos.html` com o e-mail e a senha da sua mãe. O pedido aparece como **Novo**.

### Como o painel funciona

- Cada pedido tem um número curto (ex.: `#K7M2Q`), que aparece na mensagem do WhatsApp e no
  painel, para a confeiteira saber qual é qual.
- O WhatsApp abre **antes** de salvar. Se o banco falhar ou estiver fora do ar, a venda segue normal.
- Tocar em "Finalizar" de novo sem mudar nada (o WhatsApp não abriu, toque duplo) não cria
  pedido repetido.
- Períodos: hoje, esta semana (segunda a domingo), este mês, mês passado ou datas escolhidas.
- **Vendido** soma só pedidos **Confirmados** e **Entregues**. Pedidos **Novos** aparecem à parte
  até ela confirmar no WhatsApp; **Cancelados** ficam fora dos totais.
- **Baixar planilha (CSV)** gera o arquivo do período e status escolhidos, que abre no Excel ou
  no Google Planilhas.
- O painel se atualiza sozinho a cada minuto e mantém o login no aparelho até ela tocar em **Sair**.
- Para trocar a senha dela: em **Authentication > Users**, apague o usuário, crie de novo com a
  senha nova e repita o passo 4. Os pedidos não são apagados.

### Segurança

As regras ficam no banco (`supabase/pedidos.sql`), não no código do site:
visitantes só conseguem **criar** pedido novo (sem escolher data, status nem valor diferente da
soma dos itens) e não leem nada. Só a conta cadastrada em `admins` vê os pedidos e muda o status.

### Plano grátis

Um projeto grátis do Supabase é pausado depois de uma semana com pouca atividade.
Com pedidos chegando ou com o painel sendo aberto isso não acontece; se acontecer, entre no
Supabase, abra o projeto e clique em **Resume project** (os dados continuam lá). Nesse meio tempo
o site e o WhatsApp continuam funcionando, só os pedidos não ficam salvos.

## Colocar no ar

1. **GitHub:** crie um repositório e envie o **conteúdo** desta pasta (o `index.html` na raiz).
2. **Vercel:** "Add New > Project", escolha o repositório e publique
   (framework: *Other*; não precisa de comando de build).
3. **Registro.br:** compre o domínio. Na Vercel, em *Settings > Domains*, adicione o domínio;
   ela mostra os registros DNS que devem ser cadastrados no Registro.br.

O painel fica em `seudominio.com.br/pedidos.html`. Ele não aparece em nenhum link do site e
pede para os buscadores não mostrarem a página.

Cada `git push` no repositório atualiza o site automaticamente.
