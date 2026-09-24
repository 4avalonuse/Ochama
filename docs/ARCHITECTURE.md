# Ochama — Arquitetura

## Objetivo

Reconstruir o OChart com uma separação clara de responsabilidades, preservando as funcionalidades comprovadas do projeto legado e evitando carregar acoplamentos desnecessários.

## Camadas candidatas

```text
USER
 ↓
INTERACTION
 ↓
INTENT
 ├── VIEWPORT
 ├── DRAWINGS
 └── SELECTION
 ↓
STATE
 ↓
CHART / RENDER
```

Domínios previstos:

```text
src/
├── app/
├── data/
├── chart/
├── viewport/
├── interaction/
├── drawings/
├── studies/
├── ui/
├── state/
├── utils/
└── styles/
```

Esta árvore é uma hipótese inicial. Nenhum arquivo do legado será copiado ou movido antes da auditoria.

## Regra de reconstrução

1. Auditar o legado.
2. Identificar responsabilidades reais.
3. Definir contratos entre módulos.
4. Criar a fundação do Ochama.
5. Migrar/reimplementar uma capacidade por vez.
6. Testar a cada etapa.
