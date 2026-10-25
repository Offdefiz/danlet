# Dream Match: auditoria de busca e swipe

Data: 25/10/2026. Base auditada: `main` em `8f355d861f3e4ede86fa47faec6f328629d85385` (2.8.4), que já inclui `79fb110` (2.8.3) e `6e5bac2` (2.8.2). Durante a implementação, o main avançou para `e93cbe3dcc56c108658af062229a57fa8659b85b` (2.8.5, PR #42), já com swipe e celebração de Match. A proposta foi integrada a essa atualização, preservando sua interface. As correções desta proposta são a versão 2.8.6. A auditoria distingue teste automatizado, consulta real ao provedor e validação em produção.

## Conclusão

A busca aceita termos de qualquer região, mas não comprova cobertura universal nem disponibilidade da fotografia. O maior bloqueio observado é uma miniatura do Instagram responder HTTP 200 com HTML. Isso não é uma imagem utilizável em `<img>`. O swipe e as mensagens foram corrigidos para lidar com esse caso, mas o acesso à mídia original continua dependendo de terceiros.

## Fluxo no main e alterações propostas

1. `findReferences` exige sessão autenticada e vínculo com o casal. O termo é normalizado, limitado a 100 caracteres e preservado nas três variantes. Campo vazio usa Minas Gerais ou decoração de casamento.
2. `searchWeb` consulta Firecrawl `/v2/search` com web e imagens. Há modo sem chave e modo com `FIRECRAWL_API_KEY`; não há mais filtro de país BR. O cache público em memória dura 15 minutos.
3. `findAutonomousDreamPhotos` aceita apenas posts/Reels/TV reais de Instagram para locais, Pins para decoração e miniaturas em hosts permitidos. Canonicaliza links, remove repetidos e ignora perfis sem post e imagens de outros hosts. Mantém a localização no texto da consulta; não valida coordenadas nem a localização real do estabelecimento.
4. No main 2.8.4, falhas eram reduzidas a `blocked`, e cada 429 ainda disparava novas consultas. A proposta diferencia limite, autorização, demora e falha do provedor. 429/401/403 interrompem as variantes; fotos já encontradas são preservadas, inclusive se o bloqueio ocorrer ao consultar metadados. O limite por consulta voltou de 12 a 10.
5. `Retry-After` aceita segundos e data HTTP. O botão aguarda o período indicado, ou 60 segundos quando ausente. A tela esclarece que isso permite **tentar novamente**, sem prometer que a quota diária foi renovada. Não há reenvio automático.
6. O baralho introduzido no main 2.8.5 foi preservado: gesto horizontal para Passar/Curtir, gesto para cima para Super Like, rotação, selos, animação de saída, contador e botões. As correções foram integradas ao próprio `DreamSwipeDeck`, sem deixar outro baralho concorrente. O voto agora depende da fotografia carregada; movimento reduzido também desliga o giro e só a fotografia ativa é requisitada. A celebração de Match já publicada foi preservada.
7. A decisão fica desabilitada até o evento de carregamento da imagem. Erro de mídia ou espera superior a 12 segundos mostra aviso, embed oficial, link original e recarga. Também é possível pular sem registrar voto. O embed não é considerado confirmação de imagem disponível, pois pode ser bloqueado pela plataforma.
8. Curtir, Passar e Super Like importam a referência e gravam o voto. Recusas vão ao histórico; a estrela permanece pessoal e o Match depende dos dois votos positivos. Escolhas simultâneas são bloqueadas na mesma tela; erro de gravação permite nova tentativa. Não houve migração ou alteração de permissões do banco.
9. Sem fotos, a mensagem diferencia indisponibilidade do provedor de ausência de mídia. Foi recuperado um caminho externo **opcional**, removido do modal na 2.8.4: busca de imagens com filtro Instagram ou busca nativa do Pinterest. Isso não é uma busca concluída dentro do Duet nem uma solicitação de cadastro manual.

## Evidência real de disponibilidade

Foram feitas duas consultas sem chave a partir do ambiente de auditoria, com limite 5 por fonte. Não são testes do IP do Render nem de um iPhone autenticado.

| Consulta | Firecrawl | Tempo | Páginas / imagens | Verificação de duas miniaturas |
|---|---|---:|---:|---|
| Paris, França, Instagram | HTTP 200 | 4,45 s | 5 / 5 | Ambas HTTP 200, `text/html`; indisponíveis como imagem nessa requisição |
| Jardim romântico, Pinterest | HTTP 200 | 8,02 s | 5 / 5 | Ambas HTTP 200, `image/jpeg` |

Amostras de origem e miniatura testadas:

- Instagram: `https://www.instagram.com/p/DcCSVx7udeR/` → `https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3963811283601053585`
- Instagram: `https://www.instagram.com/p/DUIePEoDRlk/` → `https://lookaside.instagram.com/seo/google_widget/crawler/?media_id=3821435707726866959`
- Pinterest: `https://br.pinterest.com/pin/709176272554799622/` → `https://i.pinimg.com/736x/cb/9e/6b/cb9e6b74e9da0ed21d4c9dcea4508282.jpg`
- Pinterest: `https://br.pinterest.com/pin/472033604709308521/` → `https://i.pinimg.com/736x/a1/47/e0/a147e079dbabd62858a79e2a9a3ae94f.jpg`

O 429 foi simulado nos testes; não provocamos esgotamento deliberado de quota. URLs e resultados podem expirar ou mudar.

## Testes prioritários

| Prioridade | Cenário | Evidência / critério |
|---|---|---|
| P0 | Cidade, bairro, país e caracteres não latinos | Testes preservam o termo em todas as variantes; incluem Paris, Shinjuku, 京都, Tiradentes e Rua das Flores |
| P0 | 429 inicial e após resultados parciais | Interrompe variantes, respeita Retry-After, mantém fotos já encontradas, distingue mensagens |
| P0 | 429 no enriquecimento da foto | Interrompe novas buscas e novos scrapes sem perder miniaturas prontas |
| P0 | Miniatura HTML, erro e carregamento travado | Testes de componente desabilitam votos, permitem recarga/pular e mostram o fallback após 12 s |
| P0 | Curtir/Passar/Super Like e clique duplicado | Componente só permite decisão após imagem carregada, envia decisão correta, bloqueia duplicação e permite repetir após falha |
| P1 | Sem resultados / perfis sem fotos / host falso | Nenhum card inventado; até três variantes, apenas fotos da plataforma correta, mensagem honesta |
| P1 | Cache e falha no corpo HTTP 200 | Cópias do cache impedem mutação; `success:false` gera erro e não é guardado como sucesso |
| P1 | Timeout do provedor e 401/403 | Erro tipado; 401/403 não repetem consultas; aborto ocorre em 14 s por chamada |
| P1 | Match e favoritos | Suíte existente preserva Super Like individual, Match mútuo e histórico separado |
| P1 | Build, tipos e regressões | Dependências instaladas pelo `bun.lock` com `bun install --frozen-lockfile --ignore-scripts`; suíte completa, ESLint sem regra estética, build e TypeScript |
| P0 antes de anunciar funcionamento em produção | Dois usuários reais no Render e Safari/PWA iOS | Ainda exige validação autenticada: voto compartilhado, recusa persistente, Match e mídia com o IP/cookies do usuário. Não foi simulado como concluído |

Validação local de navegador: Chromium em 390×844 e 1280×900, com o componente real e uma cópia temporária do JPEG acima para isolar o layout da disponibilidade externa. Swipe para Curtir e botão de Super Like foram exercitados; nenhum erro de página nem overflow horizontal. Foram inspecionadas capturas das duas larguras, incluindo os controles por botão do baralho já publicado. A validação encontrou e corrigiu uma corrida de carregamento de imagem já presente no cache do navegador, com teste de regressão. Isso não equivale a Safari/PWA nem à gravação autenticada no banco de produção.

Resultado da suíte final após integração do main 2.8.5: 235 testes automatizados. ESLint sem erros; permanecem avisos preexistentes. Build de produção e TypeScript sem erros.

O build também regenerou `routeTree.gen.ts` para incluir a rota de status já existente no main; antes da regeneração, o TypeScript acusava essa rota ausente. Não foi criada uma nova rota nesta proposta.

## Riscos que permanecem

- **P0, mídia do Instagram:** URL em host permitido e HTTP 200 não comprovam imagem. Login, proteção contra hotlink, HTML, posts privados/removidos e expiração podem deixar a busca sem cards votáveis. O fallback oficial também pode exigir acesso ou ser bloqueado.
- **P0, quota:** o plano sem chave compartilha limites por IP e dia. Outras instâncias/abas podem consumir a quota; o cache é local ao processo e desaparece em reinícios. O bloqueio de reenvio da interface não é um limitador global no servidor.
- **P1, cobertura e relevância:** o índice pode ser esparso e palavras em português podem prejudicar buscas internacionais. Preservar o termo não prova que o post corresponda ao local, que o estabelecimento exista ali ou que aceite eventos.
- **P1, latência:** até três buscas e dois enriquecimentos sequenciais, cada um com timeout de 14 s, podem se aproximar de 70 s em falhas sucessivas. Não há orçamento total ou cancelamento propagado ao fechar o modal.
- **P1, gravação concorrente:** importação da referência e gravação do voto são operações separadas. Uma falha pode deixar referência sem voto; duas contas importando simultaneamente dependem das garantias do banco. Esta proposta não adiciona transação nem unicidade por URL canônica.
- **P1, catálogo já salvo:** `hasDreamPhoto` continua identificando candidatos pela existência de caminho/URL, sem provar disponibilidade futura. O carregamento confirmado nesta proposta é dos novos cards de busca; a tela antiga de descoberta mantém seu tratamento de mídia anterior.
- **P2, erros do plano com chave:** HTTP 402 por créditos esgotados usa a mensagem genérica de indisponibilidade; não tem diagnóstico próprio como 429. Não se deve prometer que configurar uma chave elimine limites.

## Repositórios consultados

- [3DJakob/react-tinder-card](https://github.com/3DJakob/react-tinder-card): referência para limiar de arraste, resposta visual e botões equivalentes ao swipe. A versão consultada, 1.6.4, declara peers React 16/17/18 e spring/web 9.5.5; não foi adicionada ao React 19 do Duet. Nenhum código foi copiado.
- [motiondivision/motion](https://github.com/motiondivision/motion): gestos, valores de movimento e molas. Foi reutilizado `framer-motion` 14 já presente no projeto, sem aumentar dependências.
- [Firecrawl: limites oficiais](https://github.com/firecrawl/firecrawl-docs/blob/main/rate-limits.mdx): o modo sem chave tem limites diários por IP e retorna 429 quando excedidos. Nenhum limite numérico diário foi presumido.


## Correção 2.8.7: miniatura falhou, mas o post está visível

Uma captura enviada após a publicação mostrou um caso que a barreira da 2.8.6 tratava incorretamente: a imagem direta falhava, a publicação oficial aparecia com foto, mas os votos permaneciam bloqueados e uma segunda camada de título cobria o post.

A correção distingue foto direta de prévia incorporada. O carregamento do script não libera escolhas: um iframe de publicação em host oficial deve emitir load, ou uma imagem Pinterest válida gerada pelo widget deve carregar. Isso libera os botões sem continuar exigindo a miniatura que falhou. Observadores e ouvintes são removidos ao sair do card; publicação atrasada pode recuperar a tela depois do timeout. Não há captura ou inspeção do conteúdo de iframe entre origens: um iframe carregado pode ainda mostrar uma restrição da plataforma, e não é tratado como prova de que todos os pixels da foto foram validados.

O post incorporado não recebe o gradiente nem o título sobreposto do card e preserva seus próprios gestos. A decisão nesse modo usa os botões externos; a foto direta mantém os gestos do swipe. Se nenhuma prévia carregar, há aviso, recarga, link original e pulo sem voto.

Testes de regressão cobrem os três votos após fallback oficial, script sem publicação, iframe não confiável, demora, evento atrasado de card anterior, expiração do timer antigo e mídia Pinterest. Um teste local em Chromium reproduz o fluxo com miniatura HTML e publicação incorporada simulada; isso não substitui teste real autenticado no Safari do usuário.
