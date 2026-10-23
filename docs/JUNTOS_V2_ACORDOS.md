# Juntos v2 — acordos dos dois

O Juntos oferece 22 sugestões em seis categorias: refeições (inclusive 'Guacamole hoje?'), tempo a dois, bem-estar, casa, organização e passeios. Qualquer pessoa pode propor outra ideia com data e horário.

Proposta manual: quem cria já aceita. Proposta automática: os dois começam sem resposta. Em ambos os casos, só vira registro na Agenda e em Planos quando os dois usuários vinculados aceitam. O RPC transacional vote_duet_proposal bloqueia a proposta para impedir duas confirmações simultâneas; uma recusa deixa a proposta fora da Agenda.

A agenda recebe um único registro com origem juntos-agreed, ligado à proposta original. As tabelas couple_proposals e couple_proposal_votes têm RLS para o casal. Notificações de proposta incluem link para abrir Juntos.

O agendador verifica a cada ~20 minutos. O limite é até 12 alertas proativos por dia e por pessoa, em janelas horárias 09:00–20:59 de São Paulo. Seis são propostas interativas (9, 11, 13, 15, 17, 19h) e seis são mensagens leves. Mensagens leves podem ser suprimidas quando o usuário esteve ativo nos últimos 25 minutos; propostas não. Não há avisos proativos após as 21h. O sistema permite desativar notificações; mensagens reais e outras atividades têm regras separadas.

Implantação: aplicar drizzle/migrations/0008_juntos_mutual_proposals.sql no Supabase de produção antes de publicar o código. Confirmar sucesso nos testes, deploy live e push real com duas instalações iOS. GitHub Actions pode atrasar ou falhar, e os avisos dependem do Firebase e da permissão dos celulares.
