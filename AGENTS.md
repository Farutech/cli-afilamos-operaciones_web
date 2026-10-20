# Instrucciones de agente — Ordeon Web

## Contexto obligatorio
- Hub: ../engineering-hub/AGENTS.md y ../engineering-hub/docs/09_ai/06-ecosystem-workspace.md.
- No empieces implementación si el Hub no está incluido o accesible.
- Para un cambio que cruce repos, sigue `../engineering-hub/.agents/skills/cross-repo-change/SKILL.md`.
- Para UI, sigue `../engineering-hub/.agents/skills/frontend-change/SKILL.md` y la pauta local de Ordeon de este repo.
- Producto: ../cli-afilamos-operaciones/AGENTS.md y requisitos pertinentes.
- API: ../engineering-hub/contracts/afilamos-operaciones/api.openapi.yaml es draft; contrasta con la API real.
- UI Ordeon: `.agents/rules/afilamos-frontend.md` y el paquete instalado en `../pkg-ts-design-system`.

## Rol y alcance
- Implementa y valida el frontend en este repositorio.
- En una tarea transversal, coordina los cambios API, worker y paquete que sean necesarios para el flujo solicitado.
- Reutiliza componentes del design system; verifica su API y versión antes de crear alternativas.
- No inventes endpoints ni campos; separa claramente prototipos mock de integración real.

## Seguridad y validación
- No expongas secretos de `.npmrc` o `.env*`. Cambia lockfiles cuando un cambio de dependencias lo requiera y revisa su diff; modifica CI solo si está dentro del alcance solicitado.
- Usa los scripts existentes en package.json. Validación documentada: npm run build, npm run test.
- Aplica la regla visual local de Ordeon sin extenderla a otros productos.
