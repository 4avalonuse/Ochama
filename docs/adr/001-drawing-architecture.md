# ADR 001 — Arquitetura de desenhos do OCHAMA

## Decisões

- Desenhos são persistidos em coordenadas de mercado: timestamp + price; nunca pixels.
- NORMAL/LOG pertence ao viewport. O modelo de desenho não conhece escala.
- Renderização transforma mercado em tela a cada render.
- Hit-test ocorre em espaço de tela, com tolerância em pixels.
- A lógica específica de hit-test pertence à ferramenta registrada, não a geometry.js.
- O registry é um catálogo de ferramentas, não um framework de plugins.
- O core define o contrato comum do documento; cada ferramenta define sua geometria específica.
- Ferramentas não dependem umas das outras.
- Storage não conhece viewport nem canvas.
- Tipos desconhecidos no carregamento são ignorados com warning; os demais desenhos continuam.
- History usa snapshots e mantém sequence/timestamp para futura coordenação global.
- Não existe ainda Undo Coordinator global.
- Não existe ainda backend para desenhos; a primeira persistência é localStorage.
