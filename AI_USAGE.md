# Uso de IA — Decision Data Ruta

Este documento registra honestamente cómo se usó IA a lo largo del proyecto, siguiendo lo pedido en el reto técnico. Se actualiza a medida que avanza el trabajo (backend, luego frontend).

## Herramientas de IA utilizadas y etapas

- **Claude (Anthropic), vía Claude Code**, en todas las etapas: diseño (spec de producto y arquitectura), planificación (planes de implementación tarea por tarea), implementación (código, tests, migraciones), y revisión (cada tarea del backend pasó por una revisión independiente de cumplimiento de spec y calidad de código antes de darse por completa).
- El backend se construyó con un flujo de **desarrollo dirigido por subagentes**: por cada una de las 18 tareas del plan de backend, un agente implementador (Claude) escribió el código siguiendo TDD, y un agente revisor independiente (Claude, sin ver el trabajo del implementador de antemano) evaluó cumplimiento de spec y calidad antes de aceptar la tarea como terminada. Los hallazgos de revisión que requerían corrección real se enviaron de vuelta al implementador y se re-verificaron con una revisión enfocada.

## Prompts/interacciones que influyeron en decisiones importantes

- La investigación de datos reales del mercado hipotecario ecuatoriano (tasas de interés, ratios DTI/LTV máximos, plazos típicos, score promedio nacional) se hizo con IA usando búsqueda web, y cada cifra se registró con su fuente citada en `underwriting_rule_parameters.source` y en la sección 4.1 del documento de diseño — ninguna cifra investigable se inventó.
- Donde el dato no es público (bandas de score exactas por banco, el modelo real de probabilidad de aprobación de un banco o de Decision Data), se decidió explícitamente construir un sistema de puntos ilustrativo y etiquetarlo como tal en el código, la spec y el README — nunca presentarlo como el modelo real.

## Código/diseño/documentación generados o asistidos por IA

- Prácticamente todo el código del backend (entidades, motor de reglas, autenticación JWT, endpoints REST, integración con el LLM, migraciones, seeds, tests) fue generado por agentes de IA a partir de un plan de implementación detallado (también redactado con asistencia de IA en una sesión previa), bajo dirección humana de alto nivel.
- El documento de diseño (`docs/superpowers/specs/2026-09-16-decision-data-ruta-design.md`) y los planes de implementación (`docs/superpowers/plans/`) también fueron redactados con asistencia de IA.

## Errores detectados en respuestas de IA

Detectados y corregidos durante el proceso de revisión automatizada (no por inspección manual línea por línea):

- **Versiones de paquetes `@nestjs/*` incompatibles**: en tres ocasiones distintas (`@nestjs/typeorm`, `@nestjs/jwt`, `@nestjs/passport`), una instalación `npm install` sin versión fijada trajo una versión mayor incompatible con el resto del stack NestJS 10 del proyecto (ESM-only o con rango de peer dependency roto). Detectado porque los tests fallaban o la app no compilaba; corregido fijando la versión alineada con `@nestjs/common`/`@nestjs/core` (`^10.x`).
- **Tipo de columna no inferible por TypeORM**: `AgentLog.userId`, tipado como `string | null` sin decorador explícito, generaba `design:type=Object` y hacía fallar la generación de la migración. Corregido añadiendo `type: 'uuid'` explícito (verificado como semánticamente correcto, ya que el campo referencia el `id` de `User`).
- **Configuración de rate-limiting hardcodeada**: el endpoint `/agent/explain` inicialmente fijaba los límites de throttling como literales en el código en vez de leer las variables de entorno `THROTTLE_LIMIT`/`THROTTLE_TTL_SECONDS` ya provisionadas desde una tarea anterior. Detectado en revisión de tarea, corregido para leer la configuración real vía `ConfigService`.
- **Trailers de atribución a IA en mensajes de commit**: en una tarea temprana, el mensaje de commit incluyó un trailer `Co-Authored-By: Claude...`, violando la convención del repo (que sí exige que este documento sea honesto sobre el uso de IA, pero mantiene los commits sin ese trailer). Detectado en revisión, corregido.

## Correcciones y refactorizaciones realizadas por el candidato

Ninguna corrección manual línea por línea fue necesaria durante la ejecución del plan de backend: el ciclo de implementación→revisión→corrección descrito arriba operó de forma autónoma bajo dirección del candidato, quien definió el alcance del producto, aprobó el diseño y el plan, y supervisó el proceso a nivel de resultados (qué tareas se completaron, qué hallazgos se aceptaron o se marcaron como deuda conocida) en vez de revisar cada línea de código generada.

## Pruebas y controles de calidad y seguridad utilizados

- TDD en todo el motor de reglas y en cada servicio nuevo: test que falla → implementación → test que pasa, documentado por tarea.
- Suite completa de Jest ejecutada antes de cada commit (26 tests al cierre del plan de backend).
- Cada tarea pasó por una revisión de código independiente (cumplimiento de spec + calidad), con un ciclo de corrección acotado cuando se encontraban hallazgos.
- Verificación manual end-to-end vía `curl` de cada endpoint nuevo contra una base de datos Postgres real con los datos sembrados.
- Revisión específica del mecanismo anti-alucinación del agente (el LLM nunca calcula ni devuelve cifras directamente; solo genera texto con placeholders `{{clave}}` que un resolutor determinista sustituye por valores reales del motor de reglas).

## Decisiones tomadas directamente por el candidato

- Alcance del MVP (una sola meta financiera: crédito hipotecario) y la decisión de mostrar el camino de rechazo a aprobación con la persona "Ana".
- Aprobación del diseño de producto, la arquitectura de tres subproyectos independientes, y el plan de implementación tarea por tarea antes de su ejecución.
- Dirección del proceso de ejecución del plan (continuar con el proyecto, delegando la implementación en el flujo de subagentes descrito arriba).

**Nota de transparencia:** en esta sesión, la implementación del backend se ejecutó de forma prácticamente autónoma por agentes de IA a partir del plan ya escrito, con el candidato dirigiendo el proceso a alto nivel más que revisando cada línea de código. Esto se documenta aquí explícitamente para que sea una representación honesta del proceso real, tal como pide el reto.
