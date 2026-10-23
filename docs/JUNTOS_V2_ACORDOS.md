# Juntos v2 — acordos dos dois

O Juntos oferece 22 sugestões em seis categorias: refeições (inclusive 'Guacamole hoje?'), tempo a dois, bem-estar, casa, organização e passeios. Qualquer pessoa pode propor outra ideia com data e horário.

Proposta manual: quem cria já aceita. Proposta automática: os dois começam sem resposta. Em ambos os casos, só vira registro na Agenda e em Planos quando os dois usuários vinculados aceitam. O RPC transacional vote_duet_proposal bloqueia a proposta para impedir duas confirmações simultâneas; uma recusa deixa a proposta fora da Agenda.

A agenda recebe um único registro com origem juntos-agreed, ligado à proposta original. As tabelas couple_proposals e couple_proposal_votes têm RLS para o casal. Notificações de proposta incluem link para abrir Juntos.

**Cadência atual (23/10/2026):** o GitHub Actions aciona o servidor aproximadamente a cada **20 minutos, 24 horas por dia**, inclusive madrugada. O Duet não impõe um teto adicional diário: existem **72 janelas por dia por pessoa** em São Paulo, cada uma com marcador idempotente para evitar repetições da mesma janela. Não existe supressão por atividade recente. Seis das janelas durante o dia trazem propostas interativas (9h, 11h, 13h, 15h, 17h, 19h), e as demais são mensagens leves variadas; o conjunto de frases foi ampliado para 73 textos com rotação por data, horário e destinatário. Uma pessoa pode desativar suas notificações nas preferências, e isso precisa continuar sendo respeitado. Os limites técnicos de FCM, GitHub, Render e as definições do iOS continuam valendo; intervalos não são garantidos ao minuto. Notificações geradas pelas ações do casal não contam contra um teto diário e são tratadas independentemente.

Implantação: aplicar drizzle/migrations/0008_juntos_mutual_proposals.sql no Supabase de produção antes de publicar o código. Confirmar sucesso nos testes, deploy live e push real com duas instalações iOS. GitHub Actions pode atrasar ou falhar, e os avisos dependem do Firebase e da permissão dos celulares.
