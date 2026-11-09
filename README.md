# AURA · Plataforma de Acessibilidade Inteligente

Aplicação React + TypeScript + Vite com identidade visual inspirada na referência enviada: azul-claro, navegação superior em vidro, tipografia DM Sans + Sora, hero azul-celeste, cartões translúcidos e microinterações com respeito à preferência de movimento reduzido.

## 1. Requisitos

- Node.js 20.19+ ou 22.12+.
- npm 10+ recomendado.
- Conta Supabase para autenticação e sincronização.
- Provedor automático de Libras: Rybená (alternativa recomendada) ou Hand Talk; ambos dependem das condições comerciais e da liberação do domínio.
- Chave de API OpenAI configurada somente como secret da Edge Function.

## 2. Executar localmente

No terminal, dentro da pasta `AURA-IBACS`:

```bash
npm install
cp .env.example .env.local
npm run dev
```

No Windows PowerShell, se a política bloquear `npm.ps1`, use:

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Também é possível executar `INICIAR-WINDOWS.bat` com duplo clique. O script instala as dependências na primeira execução e inicia o Vite.

Abra o endereço local informado pelo Vite, normalmente `http://localhost:5173`.

## 3. Supabase — autenticação e banco de dados

1. Crie ou escolha um projeto Supabase exclusivo para o AURA.
2. No painel, copie a Project URL e a chave publishable (não use service_role/secret key no frontend).
3. Preencha `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
VITE_LIBRAS_PROVIDER=none
VITE_HANDTALK_TOKEN=
```

4. Execute no SQL Editor o conteúdo de `supabase/migrations/202611080001_aura_accessibility_core.sql`.
5. Em Authentication > URL Configuration, configure a URL local e os domínios reais de produção.
6. Teste cadastro e login na área Perfil e conta.

A migração cria `accessibility_preferences`, `activity_logs`, `aac_phrases` e `ai_chat_messages`, habilita RLS, revoga permissões públicas e concede somente as operações necessárias a usuários autenticados. As políticas vinculam cada registro a `auth.uid()`.

> A Data API do Supabase passou a exigir concessões explícitas (`GRANT`) para novas tabelas em projetos abrangidos pela mudança de 30/10/2026. A migração inclui esses grants e as políticas RLS correspondentes. Não conceda acesso `anon` às tabelas pessoais.

## 4. IA generativa — Edge Function

A chave OpenAI nunca deve ficar no React, em `VITE_*`, no Git ou no navegador.

Com o Supabase CLI instalado e autenticado, na raiz do projeto:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase functions deploy inclusive-assistant
supabase secrets set OPENAI_API_KEY=SUA_CHAVE_OPENAI
supabase secrets set OPENAI_MODEL=gpt-6-luna
supabase secrets set APP_ORIGIN=https://SEU-DOMINIO-DE-PRODUCAO
```

A função está em `supabase/functions/inclusive-assistant/index.ts`. O arquivo `supabase/config.toml` mantém a validação JWT habilitada (`verify_jwt = true`). A função chama a Responses API no servidor e não persiste a conversa na OpenAI (`store: false`).

A conta autenticada do Supabase precisa estar ativa para invocar o assistente. A disponibilidade do modelo depende da conta e do projeto OpenAI. Troque `OPENAI_MODEL` por outro modelo liberado para sua conta, caso necessário.

`APP_ORIGIN` é recomendado em produção para restringir a origem do navegador. Em desenvolvimento, use `http://localhost:5173` ou deixe a variável ausente até configurar o domínio final. Planeje também limites de uso por conta antes de disponibilizar a IA publicamente.

## 5. Libras — Rybená, Hand Talk e interpretação humana

O AURA não utiliza VLibras. O módulo oferece alternativas e diferencia tradução automática por avatar de interpretação humana ao vivo.


### Intérprete Libras — abordagem do AURA

O player de vídeos/glossário foi removido. A área **Intérprete digital** agora inclui um personagem 3D original do AURA, renderizado em tempo real com Three.js. O modelo possui rosto, tronco, ombros, cotovelos, palmas e dedos articulados, iluminação 3D, rotação por arraste e demonstração de articulação.

**Limite linguístico importante:** a animação de apresentação é demonstrativa e não representa sinais de Libras. O avatar próprio ainda não converte frases em Libras. A tradução Português → Libras só é declarada quando um provedor validado e autorizado (Hand Talk ou Rybená) estiver conectado; nesses casos, o avatar de tradução é fornecido pelo próprio provedor. O personagem 3D do AURA é a base visual e de rigging para uma futura biblioteca de movimentos capturados e validados com pessoas fluentes em Libras.

**Não foi encontrada uma alternativa gratuita, aberta e validada para tradução livre Português → Libras com avatar que atenda ao requisito do projeto sem utilizar VLibras.** O projeto LibrasVoz publicado no GitHub descreve um avatar 3D e modelo seq2seq, mas o README lista VLibras como fallback e o repositório não disponibiliza pesos/artefatos de modelo treinado nem evidência de validação institucional suficiente para ser adotado como intérprete confiável. A pesquisa aberta Kozha trabalha com bases de outras línguas de sinais e não pode ser tratada como Libras.

Fontes pesquisadas:
- Governo Federal — informações oficiais sobre VLibras: https://www.gov.br/governodigital/pt-br/acessibilidade-e-usuario/vlibras
- Projeto experimental LibrasVoz: https://github.com/held95/librasvoz
- Projeto de pesquisa Kozha: https://kozha-translate.com/

Para oferecer tradução Português → Libras no AURA sem VLibras, conecte Hand Talk ou Rybená por licença/autorizações oficiais. Para atendimento e situações complexas, mantenha o canal de interpretação humana ICOM. O avatar próprio usa Three.js (`three` e `@types/three`) e pode ser executado localmente sem token; isso habilita a cena 3D e a demonstração de articulação, não uma tradução linguística.

### Rybená — alternativa recomendada para o portal

A documentação oficial da Rybená disponibiliza integração por script CDN para sites desenvolvidos em React, Vue e Angular. Para ativar depois de contratar/liberar o domínio, defina em `.env.local`:

```env
VITE_LIBRAS_PROVIDER=rybena
```

O AURA carrega `https://cdn.rybena.com.br/dom/master/latest/rybena.js` com o player posicionado à direita. A documentação de instalação apresenta o script básico sem token no trecho de instalação, mas a solução é comercial: a página de planos anuncia R$ 715/mês no Básico e R$ 1.100/mês no Customizável (valores consultados em 08/11/2026), com um domínio por plano e teste de 7 dias sujeito à liberação comercial. Confirme valores, contrato e autorização do domínio diretamente com a Rybená antes de publicar.

- Planos: https://www.rybena.com.br/planos/
- Documentação técnica: https://docs.rybena.com.br/docs/getting-started/installation

### Hand Talk

Para continuar com Hand Talk, configure:

```env
VITE_LIBRAS_PROVIDER=handtalk
VITE_HANDTALK_TOKEN=SEU_TOKEN_OFICIAL
```

O script oficial é carregado e a classe `HT` é inicializada com o token. O token precisa ser fornecido pelo serviço e autorizado para o domínio cadastrado.

- Plugin: https://www.handtalk.me/br/plugin/
- Documentação: https://docs.handtalk.me/docs/introducao/

### ICOM — interpretação humana complementar

O ICOM oferece interpretação de Libras por videochamada com intérpretes humanos. É mais apropriado para atendimento, reuniões, eventos e conversas que exigem interpretação contextual; não substitui o plugin que traduz automaticamente textos do site. A plataforma deve ser contratada e integrada com o fornecedor conforme o caso de uso.

- Site: https://www.icom.app/

Para desativar os widgets automáticos, use `VITE_LIBRAS_PROVIDER=none`. Não configure Rybená e Hand Talk simultaneamente para evitar widgets sobrepostos. Após alterar `.env.local`, reinicie o Vite. O status "script carregado" confirma apenas o carregamento do recurso, não certifica qualidade linguística da tradução; valide a funcionalidade com pessoas surdas usuárias de Libras.

## 6. O que funciona sem serviços externos

- Navegação por seções e pesquisa dos módulos.
- Guia opcional de início: o botão principal do painel abre a seleção inicial de preferências, sem perguntar diagnósticos.
- Tema claro/escuro, contraste reforçado, texto ampliado, alvos maiores, movimento reduzido, modo sensorial tranquilo, modo de navegação simplificada e linguagem direta.
- Preferências guardadas localmente no navegador.
- Histórico de conversa e sincronização de mensagens quando a conta Supabase está conectada.
- Prancha CAA com composição de frases, mensagens personalizadas e leitura por voz via Speech Synthesis.
- Campo de legenda editável e transcrição via Web Speech API quando o navegador suportar e autorizar o microfone.
- Exportação CSV do histórico local.
- Triagem básica da tela atual (rótulos de campos, nomes de botões e atributo alt).
- Distribuição de atividade no painel calculada a partir dos registros reais da sessão.

## 7. O que exige configuração externa

- Supabase: login, sincronização entre dispositivos e persistência em banco.
- OpenAI: respostas generativas reais via Edge Function.
- Rybená: tradução automática via script quando o provedor está selecionado e o domínio possui autorização/licença.
- Hand Talk: tradução automática com token ativo e domínio autorizado, se selecionado.
- Tradução automática Português → Libras: depende de Hand Talk ou Rybená autorizado para o domínio. O avatar 3D próprio ainda não interpreta frases; movimentos linguísticos exigem biblioteca de sinais capturada e validada.
- ICOM: canal de interpretação humana, mediante contratação e integração institucional.
- Transcrição de fala: depende de suporte do navegador, conexão e permissão do microfone.
- Leitores de tela: a aplicação oferece HTML semântico, rótulos e foco de teclado; a leitura é executada por NVDA, VoiceOver, TalkBack ou outra tecnologia assistiva instalada no dispositivo. O AURA não substitui esses leitores.
- Descrição automática de imagens por visão computacional, legendagem de vídeo ao vivo e controle de uso/rate limit da IA por instituição ainda não estão implementados.

## 8. Limites e validação de acessibilidade

A triagem incorporada é deliberadamente limitada e não é certificação WCAG. Antes de uma apresentação como produto institucional, valide todas as telas com teclado, NVDA, VoiceOver, TalkBack, zoom de 200%/400%, alto contraste e testes participativos com pessoas com diferentes necessidades. Simulações de daltonismo são apenas aproximações visuais, não instrumentos clínicos.

## 9. Avatar 3D do AURA

O personagem é modelado proceduralmente em Three.js para evitar depender de um vídeo ou de um avatar comercial no preview. O componente está em `src/components/LibrasAvatar3D.tsx`. Para testar, abra **Intérprete Libras** e use **Testar movimento do avatar**. Arraste sobre a cena para girar o personagem. O ajuste `Reduzir animações` desativa o movimento contínuo e mantém uma pose estática.

A próxima etapa linguística é adquirir ou produzir dados de captura de movimento de sinais reais, com sincronização das mãos, corpo e expressões faciais, e validar cada sequência com pessoas surdas fluentes em Libras. Não associar movimentos demonstrativos a palavras como se fossem tradução.

## 10. Build

```bash
npm run typecheck
npm run build
npm run preview
```

Configure domínio, redirects de autenticação, secrets e o provedor de Libras escolhido antes da publicação.
