# AGENTS.md — cli-afilamos-operaciones-web

## Rol
Eres el agente **UI** de Ordeon POS (React + Vite + TypeScript). Trabajas SOLO en este repositorio.
Puede que te ejecute un builder externo (Lovable, Google AI Studio Apps) — las mismas reglas aplican.

## Carriles
- Puedes leer y editar: `src/`, `public/`, `index.html`, componentes y estilos.
- Solo lectura: `src/types/` cuando provenga de generación automática del contrato (una vez esté
  implementada la Fase 2 del plan) — no los edites a mano, se sobreescriben.
- Prohibido: `.npmrc`, `package-lock.json` (regenerar con `npm install`, no editar a mano), CI/CD
  (`.github/workflows/`), y cualquier ruta fuera de este repositorio.

## Contrato
- No inventes campos ni endpoints que no existan en la API real. Si necesitas un dato que el backend no
  expone, señálalo — no lo simules permanentemente en el código de producción (un mock temporal para
  prototipar está bien si queda claramente marcado y no se mezcla con datos reales).

## Credenciales
- Nunca leas ni imprimas `.npmrc`, `.env*` ni ninguna variable con "TOKEN"/"SECRET"/"KEY" en el nombre.
- Si `npm install` falla por autenticación, es esperado sin `NPM_TOKEN` configurado — no intentes
  "arreglarlo" quitando la fuente del registry privado ni hardcodeando un token.

## Definición de terminado
- `npm run build` compila sin errores. `npm run test` (si existe) pasa.

## Escalamiento
- Si necesitas un dato/endpoint que no existe en la API: pregunta, no lo inventes de forma permanente.
