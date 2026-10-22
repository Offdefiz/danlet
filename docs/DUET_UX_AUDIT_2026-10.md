# Duet — revisão de interface e qualidade (outubro de 2026)

## Implementações desta revisão

| Área | Problema encontrado | Solução |
| --- | --- | --- |
| Tema rosa glitter | A textura anterior era estática; o efeito não cintilava como solicitado | Granulação fina rosa + brilho branco com transição suave, cartas com relevo sutil e miniatura animada no seletor. Efeito só no tema `pink-glitter`, preservando nove alternativas |
| Acessibilidade | Brilho contínuo pode incomodar e o efeito não pode capturar toques | Camadas decorativas com `pointer-events: none`; mídia `prefers-reduced-motion` desativa as animações. Texto e botões mantêm painéis legíveis |
| Tela inicial | Tarefas, compromissos e matches ficavam distantes entre si | Painel funcional de resumo com números calculados dos dados reais e atalhos para Agenda, Dream Match e Lista |
| Pesquisa de imagem | Efeito colateral `setState` durante renderização em `DuetOrganizer` | Busca da imagem visível movida para `useEffect`, com limite de uma tentativa por referência nesta sessão |
| Calendário iPhone/Google | Arquivos exportados dependiam do fuso horário do dispositivo de quem exportou | Gerar eventos na hora do casal, explicitando `America/Sao_Paulo` em ICS e Google Agenda; dia atual calculado no fuso de Brasília |
| Navegação mobile | Seleção das abas pouco evidente | Estado ativo com realce de contraste, botões de toque mais perceptíveis e microinteração no botão central |
| Sem internet | A falha só era sinalizada após uma tentativa de salvar | Banner de estado offline informando a impossibilidade de sincronizar |

## Roteiro de auditoria funcional (necessário com login real)

- **Entrada e perfil:** selecionar as duas contas, efetuar login, recuperar senha, alterar e-mail e foto, desconectar, retorno ao PWA.
- **Preferências:** abrir tema, mudar seleção sem aplicar, cancelar, aplicar, recarregar e testar com a outra conta; ligar/desligar sons e push.
- **Dream Match:** gesto real para ambos os lados no iPhone, histórico, filtros, voto do parceiro, match e levar para planos.
- **Registros:** criar, alterar e excluir tarefas, notas e metas; proteger contra alterações simultâneas e conferir duas assinaturas.
- **Agenda:** adicionar/editar/excluir compromisso em cada aparelho, conferir horário no iPhone, abrir link Google e importar ICS.
- **Chat e notificações:** envio otimista, recebimento instantâneo com ambas as contas, histórico no sininho, contador, permissões iOS/FCM.
- **Resiliência:** conferir perda/reconexão de rede, teclado aberto, scroll em 320/375/390 px, barra inferior e botões visíveis.
- **Infra:** GitHub testes/lint/TypeScript/build, Render deploy `live`, login público no navegador móvel.

**Limites:** nenhum teste com credenciais das duas pessoas, tokens push reais ou operação de privacidade foi realizado nesta revisão. Os testes automatizados não certificam entrega de push em segundo plano nem a aprovação visual subjetiva da Letícia. Não supor que integrações sem chaves estejam funcionando.

## Evoluções recomendadas para comercialização (não implementadas)

1. **Conta e casal genéricos com convite seguro e revogação de acesso**. Hoje a identidade e tabelas são focadas em Daniel/Letícia; comercializar sem isolamento multi-casal seria inadequado. Prioridade **crítica**.
2. **Backup/exportação dos dados e imagens + política de privacidade/LGPD**. Recuperação e acesso por casal antes de cobrança.
3. **Agenda recorrente e integração Google Calendar via OAuth** com consentimento individual, evitando copiar eventos privados automaticamente.
4. **Sons/alertas por evento e quiet hours configuráveis**. O protótipo atual respeita preferências gerais de push, mas ainda não permite granularidade completa.
5. **Galeria de matches e mural colaborativo de fotos** com origem/licença e tarefas vinculadas.
6. **Branding comercial**: pesquisa de nome/domínio/marca, identidade não vinculada ao casamento, onboarding genérico e testes com usuários.
7. **Teste E2E em dois iPhones** e performance de animação para o modo glitter — condição de lançamento ao público.

### Segurança e custo

Conservar banco Supabase enquanto não houver migração comprovada. Não criar serviços pagos no Render, não expor dados do casal em logs ou PRs, e preservar os estilos e funcionalidades dos outros nove temas. `main` só recebe a alteração se CI ficar verde.
