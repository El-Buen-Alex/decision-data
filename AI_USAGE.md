# Uso de IA — Decision Data Ruta

Este documento registra honestamente cómo se usó IA a lo largo del proyecto, siguiendo lo pedido en el reto técnico. Se actualiza a medida que avanza el trabajo (backend, luego frontend).

## Herramientas de IA utilizadas y etapas

- **Claude (Anthropic), vía Claude Code**, en todas las etapas: diseño (spec de producto y arquitectura), planificación (planes de implementación tarea por tarea), implementación (código, tests, migraciones), y revisión (cada tarea del backend pasó por una revisión independiente de cumplimiento de spec y calidad de código antes de darse por completa).
- Tanto el backend (19 tareas) como el frontend (11 tareas) se construyeron con el mismo flujo de **desarrollo dirigido por subagentes**: por cada tarea, un agente implementador (Claude) escribió el código siguiendo TDD donde aplicaba, y un agente revisor independiente (Claude, sin ver el trabajo del implementador de antemano) evaluó cumplimiento de spec y calidad antes de aceptar la tarea como terminada. Los hallazgos de revisión que requerían corrección real se enviaron de vuelta al implementador y se re-verificaron con una revisión enfocada.

## Prompts/interacciones que influyeron en decisiones importantes

- La investigación de datos reales del mercado hipotecario ecuatoriano (tasas de interés, ratios DTI/LTV máximos, plazos típicos, score promedio nacional) se hizo con IA usando búsqueda web, y cada cifra se registró con su fuente citada en `underwriting_rule_parameters.source` y en la sección 4.1 del documento de diseño — ninguna cifra investigable se inventó.
- Donde el dato no es público (bandas de score exactas por banco, el modelo real de probabilidad de aprobación de un banco o de Decision Data), se decidió explícitamente construir un sistema de puntos ilustrativo y etiquetarlo como tal en el código, la spec y el README — nunca presentarlo como el modelo real.
- La identidad visual del frontend (paleta "midnight", tipografía, logo) se verificó contra el sitio real de Decision Data (`decisiondata.ec/assets/styles.css`, `/assets/dd-lockup-white.png`, `/assets/dd-icon.png`) antes de implementarla: se hizo una petición HTTP directa al sitio en vivo y se comparó cada valor hexadecimal citado en el plan contra el CSS real, confirmando coincidencia exacta antes de escribir cualquier código — ningún color fue inventado ni asumido de una descripción textual sin verificar.

## Código/diseño/documentación generados o asistidos por IA

- Prácticamente todo el código del backend (entidades, motor de reglas, autenticación JWT, endpoints REST, integración con el LLM, migraciones, seeds, tests) y del frontend (scaffold Next.js, identidad de marca, cliente API tipado, contexto de autenticación, las pantallas del recorrido, el panel de reglas en vivo, el panel del agente) fue generado por agentes de IA a partir de planes de implementación detallados (también redactados con asistencia de IA en una sesión previa), bajo dirección humana de alto nivel.
- El documento de diseño (`docs/superpowers/specs/2026-09-16-decision-data-ruta-design.md`) y los planes de implementación (`docs/superpowers/plans/`) también fueron redactados con asistencia de IA.

## Errores detectados en respuestas de IA

Detectados y corregidos durante el proceso de revisión automatizada (no por inspección manual línea por línea):

- **Versiones de paquetes `@nestjs/*` incompatibles**: en tres ocasiones distintas (`@nestjs/typeorm`, `@nestjs/jwt`, `@nestjs/passport`), una instalación `npm install` sin versión fijada trajo una versión mayor incompatible con el resto del stack NestJS 10 del proyecto (ESM-only o con rango de peer dependency roto). Detectado porque los tests fallaban o la app no compilaba; corregido fijando la versión alineada con `@nestjs/common`/`@nestjs/core` (`^10.x`).
- **Tipo de columna no inferible por TypeORM**: `AgentLog.userId`, tipado como `string | null` sin decorador explícito, generaba `design:type=Object` y hacía fallar la generación de la migración. Corregido añadiendo `type: 'uuid'` explícito (verificado como semánticamente correcto, ya que el campo referencia el `id` de `User`).
- **Configuración de rate-limiting hardcodeada**: el endpoint `/agent/explain` inicialmente fijaba los límites de throttling como literales en el código en vez de leer las variables de entorno `THROTTLE_LIMIT`/`THROTTLE_TTL_SECONDS` ya provisionadas desde una tarea anterior. Detectado en revisión de tarea, corregido para leer la configuración real vía `ConfigService`.
- **Trailers de atribución a IA en mensajes de commit**: en una tarea temprana, el mensaje de commit incluyó un trailer `Co-Authored-By: Claude...`, violando la convención del repo (que sí exige que este documento sea honesto sobre el uso de IA, pero mantiene los commits sin ese trailer). Detectado en revisión, corregido.
- **Instalador de shadcn/ui generó CSS incompatible**: `npx shadcn@latest init -d` trajo por defecto un estilo pensado para Tailwind v4, que rompió el build de este proyecto (en Tailwind v3). Detectado al compilar, corregido revirtiendo la configuración de marca a la ya establecida y remapeando los tokens de shadcn sobre las variables CSS reales de la marca. Dos componentes generados (`button.tsx`, `card.tsx`) quedaron con algunas variantes/clases que referencian variables CSS de v4 inexistentes — no usadas por ninguna pantalla del plan, documentadas como deuda técnica conocida en vez de ignoradas silenciosamente.
- **Configuración de Jest incompleta para alias de rutas**: el archivo `jest.config.js` no resolvía el alias `@/` (definido en `tsconfig.json`) porque `ts-jest` no lo lee automáticamente; los tests que importaban con `@/...` fallaban con "Cannot find module". Detectado al ejecutar tests, corregido agregando `moduleNameMapper`.
- **Falta de manejo de errores en dos pantallas** (ejemplos de código generado que no cumplía completamente el propio estándar del proyecto de "todo estado explícito de carga/vacío/error"): la pantalla de creación de plan (`/plan/nuevo`) originalmente solo mostraba un spinner indefinido si la generación del plan fallaba, sin mensaje de error; y la fila editable del panel de reglas (`/reglas`) no mostraba ningún aviso si el guardado de un parámetro fallaba (por ejemplo, por un valor inválido) — el usuario solo veía que el botón volvía a su estado normal sin saber si el cambio se guardó. Ambos detectados en revisión de código (el segundo específicamente porque el panel de reglas es la funcionalidad de "modificación en vivo" que el jurado va a probar), corregidos agregando estados de error visibles y, en el caso del panel de reglas, validación antes de enviar la solicitud.

## Correcciones y refactorizaciones realizadas por el candidato

Ninguna corrección manual línea por línea fue necesaria durante la ejecución de ninguno de los dos planes: el ciclo de implementación→revisión→corrección descrito arriba operó de forma autónoma bajo dirección del candidato, quien definió el alcance del producto, aprobó el diseño y el plan, y supervisó el proceso a nivel de resultados (qué tareas se completaron, qué hallazgos se aceptaron, se corrigieron o se marcaron como deuda conocida) en vez de revisar cada línea de código generada.

## Pruebas y controles de calidad y seguridad utilizados

- TDD en todo el motor de reglas y en cada servicio/componente nuevo (backend y frontend): test que falla → implementación → test que pasa, documentado por tarea.
- Suite completa de Jest ejecutada antes de cada commit (28 tests al cierre del plan de backend; 11 tests al cierre del plan de frontend).
- Cada tarea pasó por una revisión de código independiente (cumplimiento de spec + calidad), con un ciclo de corrección acotado cuando se encontraban hallazgos.
- Verificación manual end-to-end vía `curl` de cada endpoint nuevo del backend contra una base de datos Postgres real con los datos sembrados.
- Revisión específica del mecanismo anti-alucinación del agente (el LLM nunca calcula ni devuelve cifras directamente; solo genera texto con placeholders `{{clave}}` que un resolutor determinista sustituye por valores reales del motor de reglas); se agregó además una segunda capa de defensa (rechazo de dígitos sueltos fuera de placeholders) tras encontrarse que la garantía original tenía un hueco.
- Para cada pantalla del frontend, el contrato con el backend (rutas, forma del DTO/respuesta) se verificó campo por campo contra el código real del backend en el mismo repositorio, no solo contra el plan escrito (que en algunos puntos había quedado desactualizado respecto al backend real tras sus propias correcciones).
- **Limitación conocida y declarada honestamente:** el walkthrough manual end-to-end completo en un navegador real (login → diagnóstico → simulador → plan → edición de regla en vivo → explicación del agente con un LLM real) no se pudo ejecutar en este entorno de desarrollo — Docker Desktop no estaba disponible para levantar Postgres/el backend, y la API key de Anthropic seguía siendo un placeholder. La verificación de la integración se hizo por inspección de contrato (tipos y formas de datos comparados campo por campo contra el código real) y pruebas unitarias con la API mockeada, no por observación directa de la app funcionando end-to-end. Se recomienda hacer este recorrido una vez, en un navegador real, antes de la entrega o la demo.

## Decisiones tomadas directamente por el candidato

- Alcance del MVP (una sola meta financiera: crédito hipotecario) y la decisión de mostrar el camino de rechazo a aprobación con la persona "Ana".
- Aprobación del diseño de producto, la arquitectura de tres subproyectos independientes, y el plan de implementación tarea por tarea antes de su ejecución.
- Dirección del proceso de ejecución del plan (continuar con el proyecto, delegando la implementación en el flujo de subagentes descrito arriba).

**Nota de transparencia:** en esta sesión, tanto el backend como el frontend se implementaron de forma prácticamente autónoma por agentes de IA a partir de los planes ya escritos, con el candidato dirigiendo el proceso a alto nivel más que revisando cada línea de código. Esto se documenta aquí explícitamente para que sea una representación honesta del proceso real, tal como pide el reto — incluyendo la limitación declarada arriba sobre la verificación end-to-end nunca ejecutada en vivo.
