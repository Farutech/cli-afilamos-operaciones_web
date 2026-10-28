# Instrucciones de agente — Ordeon Web

## Contexto obligatorio
- Hub: `../engineering-hub/AGENTS.md`, `../engineering-hub/docs/09_ai/06-ecosystem-workspace.md` y `../engineering-hub/docs/09_ai/10-project-discovery-and-design.md`.
- Para SDD/MVP que cruce producto o componentes, sigue `../engineering-hub/.agents/skills/spec-driven-delivery/SKILL.md`.
- No empieces implementación si el Hub no está incluido o accesible.
- Para un cambio que cruce repos, sigue `../engineering-hub/.agents/skills/cross-repo-change/SKILL.md`.
- Para UI, sigue `../engineering-hub/.agents/skills/frontend-change/SKILL.md`, apóyate en `../engineering-hub/.agents/skills/design-taste-frontend/SKILL.md` para dirección visual/anti-slop y respeta siempre la pauta local de Ordeon (`.agents/rules/afilamos-frontend.md`). La skill describe el método; los requisitos aprobados de Ordeon deciden comportamiento y presentación.
- Producto: ../cli-afilamos-operaciones/AGENTS.md y requisitos pertinentes.
- Lee allí el contexto/plan y los requisitos/prototipos vigentes según la autoridad de `docs/README.md`; este repo es dueño de implementación web, no de redefinir el comportamiento del producto.
- API: ../engineering-hub/contracts/afilamos-operaciones/api.openapi.yaml es draft; contrasta con la API real.
- UI Ordeon: `.agents/rules/afilamos-frontend.md` y el paquete instalado en `../pkg-ts-design-system`.
- Requisitos, prototipos y criterios de aceptación: localiza la fuente indicada en la tarea/producto y verifica que esté aprobada y vigente. Si no se identifica una fuente canónica o su estado, pregunta antes de diseñar o cambiar UI.

## Precedencia y decisiones
- Las instrucciones del sistema, seguridad y permisos de la tarea son límites superiores.
- Para decisiones propias de Ordeon Web, este archivo y sus reglas locales concretan las guías comunes. Una excepción local debe tener alcance claro; no copies esa excepción a otro producto.
- El Hub define el método y los estándares comunes obligatorios aplicables. No uses una recomendación genérica para contradecir un requisito o prototipo aprobado de Ordeon.
- Si requisito, prototipo, regla local, comportamiento actual o contrato se contradicen, no elijas por criterio visual propio: presenta las fuentes, el impacto y pregunta cuál debe prevalecer. Espera acuerdo antes del cambio dependiente.
- Separa evidencia confirmada, mock/prototipo y comportamiento conectado a servicios reales. No conviertas datos de ejemplo ni el contrato OpenAPI draft en comportamiento aprobado.

## Rol y alcance
- Implementa y valida el frontend en este repositorio.
- En una tarea transversal, coordina los cambios API, worker y paquete que sean necesarios para el flujo solicitado.
- Reutiliza componentes del design system; verifica su API y versión antes de crear alternativas.
- No inventes endpoints ni campos; separa claramente prototipos mock de integración real.
- Antes de editar, revisa el flujo afectado, estados de interacción, responsive, accesibilidad y componentes/patrones existentes; si falta una decisión de producto o diseño necesaria, pregunta y espera respuesta.
- Implementa una slice de usuario acordada, no pantallas desconectadas del MVP. Si el prototipo/SDD/contrato y la UI actual discrepan, expón el conflicto antes de elegir o cambiar.

## Seguridad y validación
- No expongas secretos de `.npmrc` o `.env*`. Cambia lockfiles cuando un cambio de dependencias lo requiera y revisa su diff; modifica CI solo si está dentro del alcance solicitado.
- Para todo cambio ejecutable, corre los checks afectados y siempre `npm run lint`, `npm run test` y `npm run build`; revisa toda su salida, corrige errores y warnings relevantes y repite la validación. Un exit code 0 no basta si quedaron advertencias relevantes.
- Para cambios de interfaz, inicia la app local y verifica el flujo afectado con navegador/automatización, consola y solicitudes de red en viewports móvil, tablet y escritorio. Revisa accesibilidad e interacción para usuarios nuevos siguiendo la skill `frontend-change`. Si no hay browser o entorno usable, reporta la brecha y no declares validación visual/E2E completa.
- Aplica la regla visual local de Ordeon sin extenderla a otros productos.
