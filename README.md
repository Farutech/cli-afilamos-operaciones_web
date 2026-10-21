# Ordeon POS — Web Frontend (`cli-afilamos-operaciones_web`)

Frontend Web de **Ordeon POS** para Afilamos Hermanos S.A.S., desarrollado con **React 19**, **TypeScript**, **Vite 8**, **TailwindCSS** y componentes del ecosistema **`@farutech/design-system`**.

Este repositorio es un **componente de cliente** del proyecto orquestador `cli-afilamos-operaciones`.

---

## 🧭 Alineación de Requerimientos («Un Solo Norte»)

Este frontend web está 100% alineado con las especificaciones de negocio sin discrepancias ni vacíos de alcance, cumpliendo estrictamente con:
1. **`cli-afilamos-operaciones/docs/Ordeon-SDD/`**: Específicamente `31-bdd-solicitudes-clientes-y-catalogos.md`, `32-bdd-pagos-anticipos-y-entregas.md`, `33-bdd-taller-flujos-y-procesos.md`, `34-bdd-caja-y-control-financiero.md` y `37-bdd-interfaz-captura-y-reportes.md`.
2. **`cli-afilamos-operaciones/docs/CONTEXTO-Y-PLAN.md`**: Decisiones tomadas con el cliente (Decisión 9: Design System FaruTech, Decisión 6: Entregas multi-OT consolidadas, etc.).

### Implementación de Invariantes en la UI
- **Invariante #1 (Inventario Previo 100%):** En el modal de confirmación de solicitud de mostrador, si existen líneas de ítems de tipo producto/inventario, el formulario exige liquidar el 100% del valor de dichas líneas antes de habilitar el botón "Confirmar Solicitud".
- **Invariante #2 (Entrega con Saldo Cero):** En el módulo de Entregas (`/entregas`), los pedidos con saldo pendiente mayor a cero muestran el badge de alerta y deshabilitan el botón de "Despachar y Emitir Remisión", guiando al operador al panel de cobro de saldo antes de la entrega física.
- **Invariante #3 (Anti-Autoaprobación en UI):** Los modales de excepción (descuento fuera de rango, waiver de anticipo inferior a la regla, anulación de OT y aprobación de descuadre) exigen el PIN de un supervisor con credenciales distintas a las del usuario autenticado en la sesión.
- **Invariante #4 (Arqueo Ciego en Caja):** El modal de arqueo de caja presenta la grilla de denominaciones físicas (billetes y monedas de $100.000 a $50) sin mostrar el saldo teórico esperado del sistema. Si tras registrar el conteo el backend retorna necesidad de VoBo por descuadre, se abre automáticamente el modal de autorización de supervisor con justificación obligatoria.

---

## 🏛 Módulos Funcionales

| Módulo | Ruta | Capacidades Clave |
|---|---|---|
| **Caja Registradora** | `/caja` | Apertura de turno con fondo inicial, registro de cobros (efectivo, datáfono, transferencias, crédito interno), arqueo ciego, justificación de descuadre y cierre de turno. |
| **Mostrador / POS** | `/solicitudes` | Captura rápida de solicitudes de afilado y productos, cálculo automático de anticipo mínimo, selector de cliente y confirmación. |
| **Taller / Kanban** | `/taller` | Tablero Kanban por etapas operativas (Diagnóstico, Vaciado, Afilado, Asentado, Control Calidad), filtros por operario y asignación de ítems. |
| **Entregas** | `/entregas` | Cola de despachos de mostrador, verificación de saldo cero, entrega consolidada multi-OT para el mismo cliente y generación de remisión. |
| **Administración** | `/admin` | Parámetros del sistema, configuración de reglas de anticipo, auditoría y catálogos. |

---

## 💻 Desarrollo y Ejecución Local

### Prerrequisitos
- Node.js 20+ y npm

### Comandos

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (por defecto en http://localhost:5173)
npm run dev

# Compilar para producción (typecheck + vite build)
npm run build

# Ejecutar linter y formateo
npm run lint
```

---

## 🧪 Pruebas Automatizadas

Las pruebas end-to-end y de regresión sobre este frontend se orquestan desde el proyecto de pruebas unificado en:
- `cli-afilamos-operaciones/test/` ejecutando los escenarios BDD con **Playwright** y **`Farutech.Framework.Automation`**.

```powershell
# Ejecución de pruebas E2E de Frontend desde el orquestador
cd ../cli-afilamos-operaciones
dotnet test test/Afilamos.Operaciones.Automation.csproj --filter "Category=Frontend"
```

---

## 📄 Gobernanza

- `repository.yaml` — Contrato de orquestación con el hub
- `application.yaml` — Contrato de runtime
- `AGENTS.md` — Directrices y límites de actuación de agentes de IA
