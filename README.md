# Duet Aurora — edição alternativa independente

Nova abordagem ao Duet, implementada em uma branch isolada do repositório `Offdefiz/danlet`, usando HTML, CSS e JavaScript puro (sem dependências, build ou serviços pagos).

## Objetivo
Comparar com o Duet atual um design com menos ruído, hierarquia clara, primeiro uso imediato, navegação inferior simples, privacidade por padrão e movimentos sutis.

## Funcionalidades reais deste protótipo
- Onboarding local com nomes e data do casal
- Contador de dias juntos
- Explorar seis ideias de encontros com fotografias ilustrativas
- Favoritar, selecionar encontros (Dream Match), pular e rever
- Memórias (criar e excluir)
- Planos (criar, concluir, reabrir e excluir)
- Bilhetes locais (criar e excluir)
- Exportação JSON e exclusão de dados locais
- PWA instalável, service worker e suporte offline dos recursos locais
- Layout responsivo, textos em PT-BR, reduced motion, teclado e foco visível

## Limites importantes
**Esta edição não se conecta ao banco de produção do Duet, não possui contas, chat entre dispositivos, fotos privadas ou notificações push.** Os dados permanecem apenas no localStorage do navegador. Um casal em dois aparelhos não compartilha dados. A pesquisa de Instagram/Pinterest abre a busca externa; não importa conteúdo automaticamente nem simula resultados reais. As imagens dos cartões vêm de Unsplash e são somente ilustrações de ideias.

## Publicação
Render Static Site: repo `https://github.com/Offdefiz/danlet`, branch `duet-alternative-aurora-2026`, build `echo ready`, diretório publicado `.`. **Nunca usar `main` para esta implantação.**

## Próxima arquitetura se aprovado
Criar projeto Supabase dedicado ao Aurora (isolado do Duet original) com Auth, tabelas de casais, membros, planos, memórias e mensagens, policies RLS por participação e Realtime privado. Usar publicável no frontend e segredos somente no servidor. Implementar push consentido com filas e confirmação de entrega, sem prometer entrega garantida em iOS.

## Referências UX
- https://elements.envato.com/learn/ux-ui-design-trends
- https://www.designstudiouiux.com/blog/mobile-app-ui-ux-design-trends/
- https://www.w3.org/WAI/WCAG22/quickref/

## Segurança
Não reutilizar credenciais nem o banco da produção. Não há variáveis de ambiente nesta branch. Antes de ativar sincronização, requer autenticação, isolamento por casal e testes de RLS.
