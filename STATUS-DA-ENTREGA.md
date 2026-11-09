# Estado da entrega AURA · IBACS

## Incluído no projeto

- Aplicação React + TypeScript + Vite, Tailwind CSS v4, Motion for React e Lucide.
- Direção visual alinhada à referência enviada: fundo azul-lavanda, sidebar clara translúcida, hero índigo/azul, cartões de vidro, espaçamento generoso e microinterações.
- Navegação responsiva: Visão geral, Laboratório de acesso, Comunicação, IA assistiva, Intérprete Libras e Relatórios. Perfil/conta acessível pelo espaço institucional.
- Guia inicial opcional para selecionar preferências sem exigir diagnóstico.
- Preferências locais: contraste, texto ampliado, alvos maiores, redução de movimento, conforto sensorial, navegação simplificada, linguagem simples, legendas/transcrição, voz, notificações antecipadas e simulação aproximada de visão de cores.
- Comunicação alternativa: frases por símbolos, frases personalizadas, texto para voz, voz para texto quando o navegador suporta e frases salvas.
- Assistente com integração segura preparada por Supabase Edge Function + OpenAI Responses API; histórico local e sincronização das mensagens quando autenticado.
- Avatar 3D original do AURA implementado em Three.js: cabeça/rosto, tronco, ombros, cotovelos, mãos e dedos articulados, iluminação, pose ociosa, demonstração de articulação e rotação por arraste. A animação é demonstrativa, não é tradução de Libras.
- Intérprete Libras: preparação de mensagens, ditado por voz, seleção/cópia de texto e integração pronta para Hand Talk/Rybená. A tradução linguística depende do provedor oficial autorizado ou de uma biblioteca de sinais capturados e validados.
- Relatório CSV, histórico local, triagem básica e gráfico derivado de registros reais da sessão.
- SQL para autenticação/sincronização de preferências, atividades, frases CAA e histórico de IA, com RLS e concessões explícitas.
- Guia de instalação e configuração no README.

## Depende de credenciais/serviços externos

- Supabase: Project URL, publishable key e execução da migration SQL.
- IA: publicação da Edge Function e secrets `OPENAI_API_KEY`, `OPENAI_MODEL` e `APP_ORIGIN`.
- Rybená: contratação/liberação comercial do domínio para tradução automática.
- Hand Talk: licença/token oficial habilitado para o domínio final, caso escolhido.
- Transcrição: navegador compatível, conexão quando exigida e permissão de microfone.

## Limites conhecidos

- A descrição de imagens por visão computacional, legendagem de vídeo ao vivo e cotas/rate limit de IA por instituição ainda não foram implementados.
- O app não cria um motor próprio de leitor de tela. A estrutura semântica e os controles devem ser usados com NVDA, VoiceOver, TalkBack ou outra tecnologia assistiva instalada.
- Filtros de daltonismo são aproximações visuais, não avaliação clínica.
- A triagem interna verifica somente aspectos básicos e não é certificação WCAG.

## Validação realizada neste ambiente

- Sintaxe TS/TSX/JS: análise de parsing sem erros nos arquivos executáveis.
- CSS: parsing sem erros.
- A instalação de dependências npm expirou por indisponibilidade do registry neste ambiente. Por isso, `npm run typecheck`, `npm run build` e teste automatizado completo no navegador não foram executados aqui.

Antes de publicar, no computador de desenvolvimento, execute `npm install`, `npm run typecheck` e `npm run build`; depois faça testes manuais com teclado, zoom, leitores de tela e pessoas com diferentes necessidades de acesso.


## Atualização visual e Libras (08/11/2026)

- Identidade visual atualizada para azul-claro, com tipografia Sora + DM Sans.
- Navegação principal movida para uma barra horizontal superior, adaptada para rolagem horizontal em telas menores.
- Dashboard recebeu cartões de métricas, painéis, gráficos e estados com paleta azul-celeste e ciano; modo escuro continua disponível.
- Módulo de Libras passou a comparar Rybená, Hand Talk e ICOM, distinguindo tradução automática por avatar de interpretação humana por videochamada.
- A integração Rybená é carregada quando `VITE_LIBRAS_PROVIDER=rybena`; Hand Talk permanece opcional com token quando `VITE_LIBRAS_PROVIDER=handtalk`.
- Nenhum dos provedores foi contratado ou validado com credenciais do usuário nesta entrega. O carregamento de um script não comprova qualidade de tradução nem autorização comercial do domínio.


## Correção do módulo de Libras (08/11/2026)

- Removidos integralmente o iframe, o player de vídeo, o glossário SinaLib e a montagem de sequência de vídeos.
- O módulo passou a se chamar **Intérprete digital** e oferece preparação de texto, ditado por voz, seleção e cópia do conteúdo.
- O status da tela distingue ausência de provedor, carregamento, erro e script carregado.
- Hand Talk e Rybená continuam como integrações oficiais opcionais; seus avatares realizam a tradução automática quando autorizados. O ICOM permanece como opção para interpretação humana.
- A etapa posterior adicionou um personagem 3D original com animação demonstrativa de articulação. Essa animação não é apresentada como Libras e não traduz mensagens. Sem provedor autorizado, a plataforma informa que não realiza tradução.
- O IA Libras continua como ligação externa para reconhecimento no sentido Libras → português.


## Avatar 3D próprio (08/11/2026)

- Adicionada dependência `three@0.187.0` e tipos `@types/three@0.187.0` (MIT).
- Criado `src/components/LibrasAvatar3D.tsx` com modelo humanoide procedural em geometria 3D, rosto, roupa, braços, mãos e dedos articulados.
- Adicionada animação ociosa leve, demonstração de articulação sob comando e interação de rotação por arraste.
- O componente respeita o ajuste de redução de movimento e oferece fallback quando WebGL não estiver disponível.
- O palco do módulo Intérprete Libras agora mostra o personagem 3D próprio do AURA.
- Aviso linguístico explícito: movimentos de demonstração não são sinais de Libras e não traduzem o texto. A tradução real continua dependente de Hand Talk/Rybená autorizados ou de futuros dados de captura validados.
- Parsing TSX do App e do componente 3D validado; parsing CSS validado.
- `npm install` expirou por indisponibilidade do registry neste ambiente; build e verificação de tipos completos não foram executados.
