# Ochama

Novo núcleo do OChart / Oraculum.

Este repositório está sendo construído a partir de uma auditoria do OChart legado, com arquitetura modular e responsabilidades bem separadas.

## Princípios

- O OChart legado permanece congelado como referência funcional.
- Primeiro auditamos, depois projetamos, depois implementamos.
- DATA não conhece UI.
- CHART não carrega dados.
- INTERACTION roteia intenção do usuário.
- UI não contém lógica matemática de domínio.
- `app` orquestra; não concentra funcionalidades.
- Arquivos grandes são sinal de auditoria, não um limite rígido.

## Estado

### Fase 1 — Fundação do core: concluída

- Renderização de candles funcionando.
- Navegação por pointer/touch.
- Escala linear e logarítmica.
- Zoom/pan de viewport.
- Fit inicial e fit manual.
- Normalização e validação de candles.
- Proteções básicas contra estado inválido.
- Testes unitários do núcleo matemático e da normalização.

A fundação estável termina aqui. A próxima etapa deve adicionar capacidades de produto sem refatoração estrutural desnecessária.
