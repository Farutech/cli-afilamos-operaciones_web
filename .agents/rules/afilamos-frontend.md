---
trigger: model_decision
description: Reglas de interfaz exclusivas de Ordeon Web. Usar al modificar o revisar su UI.
---

# Reglas de interfaz de Ordeon Web

**Alcance:** este archivo aplica únicamente al frontend de Ordeon POS. Sus decisiones visuales y
funcionales pertenecen a este producto. No es un estándar global de frontend ni de FaruTech.

Antes de crear o modificar componentes, inspecciona la implementación actual y el paquete
`pkg-ts-design-system` disponible en `../pkg-ts-design-system`. Verifica API, versión y patrones que
realmente consume esta aplicación.

## Presentación

- Mantén fondos oscuros y superficies elevadas sobrias cuando sean coherentes con la pantalla y el
  tema activo; usa bordes finos y transiciones discretas.
- Organiza pantallas transaccionales para que los formularios y el resumen de liquidación sean
  fáciles de revisar. Usa dos columnas o un resumen fijo solo cuando funcione en móvil y escritorio.
- Evita conteos internos, etiquetas duplicadas y badges sin una decisión útil para el usuario.
- Formatea moneda para Colombia y usa cifras monoespaciadas en totales cuando mejore su lectura.
- Conserva la iconografía consistente con los componentes y dependencias realmente usadas por la app.

## Caja

- En arqueo y cierre, captura y audita monto y cantidad de comprobantes para datáfono y transferencias.
- La supervisión debe permitir comparar diferencias de dinero y de número de transacciones.

## Límites

- No crees un componente base si el design system ya cubre el caso; si falta, confirma primero el
  patrón local y el alcance del cambio.
- Estas pautas no sustituyen accesibilidad, diseño adaptable ni la API real del design system.
- No impongas estos estilos a otros productos ni asumas que cada clase o componente está disponible;
  verifica la configuración y el paquete de este repositorio.
