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

## Estándar de Diseño Moderno y UI/UX (SaaS Vanguardista / Linear / Apple Design)
Todo componente o pantalla construida en este repositorio DEBE cumplir estrictamente con los 5 pilares de diseño moderno y rechazar código genérico o desalineado ("anti-slop"):

1. **Materiales Premium y Capas Atmosféricas (Apple / Linear SaaS Aesthetic)**:
   - Fondos: Base profunda `bg-slate-950` combinada con tarjetas elevadas semitransparentes `bg-slate-900/60` o `bg-slate-900/80` con desenfoque de fondo `backdrop-blur-md`.
   - Bordes: Delgados y refinados (`border border-slate-800` o `border-white/10`). Prohibidos los bordes toscos, estridentes o de colores sólidos brillantes sin propósito funcional.
   - Sombreado: Sombras suaves y contenidas (`shadow-lg`, `shadow-sm`), sin efectos anticuados.

2. **Jerarquía Visual y Composición Bento Grid**:
   - Cabeceras estandarizadas: Título con icono temático contenido a la izquierda, y acciones principales (ej: botones primarios `+ Registrar...`) siempre alineados a la derecha.
   - Layouts de 2 columnas o Bento Grid para pantallas transaccionales (ej. Columna operativa a la izquierda, tarjeta resumen fija/sticky a la derecha).
   - Eliminación radical de ruido visual: No usar badges de depuración innecesarios, textos redundantemente obvios como "(1 disp.)" o etiquetas duplicadas (como poner "Caja" debajo de "Efectivo").

3. **Tipografía y Contraste Numérico**:
   - Monedas y valores financieros siempre en fuente monoespaciada (`font-mono font-bold`) y con formato regional (`$ 50.000` con puntos de miles `es-CO`).
   - Usar el componente canónico `CurrencyInput` para captura monetaria.
   - Contrastes claros: Verde esmeralda (`text-emerald-400`) para valores pagados/saldados, rojo/rosa (`text-rose-400`) para saldo pendiente o egresos, e índigo/violeta (`text-indigo-400`) para selecciones y primarios.

4. **Iconografía Coherente**:
   - Iconos unificados mediante `lucide-react`. Tamaño consistente (`w-4 h-4` en títulos y `w-3.5 h-3.5` en botones/items).
   - Prohibido mezclar arbitrariamente emojis con iconos vectoriales o alternar estilos incoherentes entre pantallas.

5. **Reglas Operativas y de Cierre de Caja**:
   - En cierres y arqueos de caja, para medios electrónicos (Datáfono / Vouchers y Transferencias Bancarias) se debe permitir capturar y auditar tanto el **Monto ($)** como la **Cantidad de Transacciones / Comprobantes (Tirilla Lote / Extracto)**, permitiendo verificar descuadres no solo en dinero sino en cantidad de procesos.

## Escalamiento
- Si necesitas un dato/endpoint que no existe en la API: pregunta, no lo inventes de forma permanente.
