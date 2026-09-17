# Plan de pruebas — Decision Data Ruta

**Fecha de ejecución:** 2026-09-17
**Entorno:** stack completo desplegado con Docker (backend + frontend en contenedores, sobre el Postgres real ya migrado y sembrado), con `ANTHROPIC_API_KEY` real — la primera vez que todo el sistema corre de punta a punta con un LLM real, sin ningún componente mockeado.

## 1. Objetivo y alcance

Verificar el sistema completo antes de la entrega: hasta este punto, toda la verificación de integración entre frontend y backend se había hecho por inspección de código (Docker no estaba disponible), nunca observando la app funcionar. Este plan cubre:

1. **Despliegue real** vía Docker.
2. **Pruebas funcionales E2E automatizadas** con Playwright, contra el stack real.
3. **Revisión de atributos de calidad** (requerimientos no funcionales, sección 8 del spec de diseño).
4. **Revisión de UI/UX.**

## 2. Estrategia

| Frente | Herramienta | Qué valida |
|---|---|---|
| Funcional E2E | Playwright (`frontend/e2e/`) | Camino feliz + casos borde, contra backend/DB/LLM reales |
| Accesibilidad | `@axe-core/playwright` (WCAG 2.1 A/AA) | Automatizado, en cada pantalla clave |
| Responsive | Proyecto Playwright `mobile-chrome` (Pixel 7) | Misma suite completa a ancho de teléfono |
| NFR | Inspección directa del sistema corriendo (curl, logs, DB) | Sección 8 del spec: seguridad, errores, testing, accesibilidad, observabilidad |
| UI/UX | Revisión de código + ejecución real + capturas | Consistencia visual, feedback, navegación |

## 3. Despliegue

```bash
cd infrastructure && docker compose up -d          # Postgres (ya migrado/sembrado)
cd .. && docker compose --env-file infrastructure/.env up -d --build
```

`docker-compose.yml` (raíz) construye `backend/Dockerfile` y `frontend/Dockerfile` y los une a la red `infrastructure_default` para que el backend alcance Postgres por nombre de servicio (`postgres`), sin duplicar el contenedor de datos ya sembrado.

**Incidente real encontrado al desplegar:** el volumen de Postgres ya existente se había inicializado en una sesión anterior con una contraseña distinta a la que ahora tiene `infrastructure/.env` — Postgres solo aplica `POSTGRES_PASSWORD` la primera vez que se crea el volumen, no en arranques posteriores. Se sincronizó con `ALTER USER decision_data WITH PASSWORD ...` sobre el contenedor ya corriendo, sin perder datos. **Lección operativa:** si el `.env` de infraestructura cambia después del primer `docker compose up`, hay que actualizar la contraseña dentro de la base manualmente o recrear el volumen — no basta con reiniciar el contenedor.

## 4. Casos de prueba E2E (Playwright)

34 tests (17 casos × 2 proyectos: `chromium` y `mobile-chrome`), corridos con sesión JWT real de Ana (`ana.demo@decisiondata.test`), reutilizada entre tests vía `storageState` para no agotar el rate limit de `/auth/login`.

| Archivo | Casos |
|---|---|
| `auth.spec.ts` | Ruta protegida sin sesión → redirige a `/login`; login inválido muestra error; login válido → `/camino` y persiste al recargar; logout limpia sesión; `/` redirige según sesión |
| `camino.spec.ts` | Diagnóstico inicial real (Ana no califica, score 640); panel del agente responde con texto real coherente; simulador recalcula en vivo y muestra DTI/LTV/cuota; el agente se actualiza tras recalcular (no se queda con el escenario viejo); el enlace al plan sigue al escenario vigente |
| `plan.spec.ts` | Generar plan desde un escenario que sí califica → 3 hitos con texto legible (no claves internas crudas) |
| `reglas.spec.ts` | Editar un parámetro persiste tras recargar; un valor vacío se rechaza en el cliente, en español |
| `accessibility.spec.ts` | Cero violaciones WCAG 2.1 A/AA en `/login`, `/camino`, `/reglas`; navegación por teclado en el login |

**Resultado: 33/34 pasando** (97%). El único fallo (`mobile-chrome`, test de re-explicación del agente) es el rate limiter de `/agent/explain` (20 req/60s) agotado por el volumen de la propia suite corriendo dos proyectos seguidos — comportamiento **correcto** del backend protegiendo el endpoint más caro, no un defecto de la app. Recomendación: en un entorno de CI dedicado, subir `THROTTLE_LIMIT` vía env o espaciar los proyectos.

Reproducir: `cd frontend && npx playwright test` (reporte HTML en `frontend/playwright-report/`).

## 5. Bugs reales encontrados y corregidos en esta pasada

Los tres surgieron directamente de correr el sistema real por primera vez — ninguno era detectable por inspección de código ni por los mocks usados hasta ahora.

### 5.1 — Crítico: el agente de IA devolvía texto vacío (`backend/src/agent/llm-client.service.ts`)
Claude Sonnet 5 antepone un bloque `thinking` al bloque `text` en su respuesta. El código solo miraba `response.content[0]`, así que con una API key real (nunca antes probada) `/agent/explain` devolvía `{"text":""}` en cada llamada — el panel del asesor de IA, una de las piezas centrales del producto, nunca mostraba nada. Corregido: buscar el primer bloque de tipo `text` en el arreglo, no asumir el índice 0. Test de regresión agregado (`llm-client.service.spec.ts`) cubriendo ambos órdenes de bloque.

### 5.2 — Crítico: el simulador nunca podía hacer que Ana calificara (`frontend/src/app/camino/simulador-panel.tsx`)
El simulador solo dejaba ajustar deuda e ingreso (palancas de DTI). Pero lo que bloquea a Ana es el LTV: pide financiar el 90% del inmueble contra un máximo de 80%, y ni el monto del préstamo ni el score eran ajustables en el simulador. Resultado: **ningún valor de deuda/ingreso lograba nunca "sí calificarías"** — el momento central de la demo ("ajusta hasta calificar") era irrealizable tal como estaba construido, aunque el spec de diseño (sección 4.2) menciona explícitamente "más ahorro para entrada" como una de las palancas previstas. Corregido: se agregó un campo de monto del préstamo al simulador. Verificado en vivo: con deuda=50, ingreso=1800, préstamo=60000, Ana sí califica.

### 5.3 — Importante: mensaje de validación en inglés dentro de una UI en español (`frontend/src/app/reglas/rule-parameter-row.tsx`)
Al vaciar el campo de un parámetro y guardar, `Number('')` da `0`, no `NaN`, así que el guard del lado del cliente nunca se activaba y la petición llegaba al backend, que respondía con el mensaje de `class-validator` en inglés ("value must not be less than 0.0001") mostrado tal cual en una interfaz en español. Corregido: rechazar explícitamente vacío/no-numérico/≤0 antes de llamar a la API.

## 6. Atributos de calidad (NFR) — verificados contra el sistema real, no solo leídos en el código

Mapeado a la sección 8 del spec de diseño.

| Atributo | Verificación realizada | Resultado |
|---|---|---|
| **Seguridad — JWT** | Login real, token válido, rutas protegidas rechazan sin token (`auth.spec.ts`) | ✅ |
| **Seguridad — validación de entrada** | `class-validator` en DTOs; probado en vivo con valores inválidos (deuda 0, parámetro vacío) | ✅ |
| **Seguridad — headers (helmet)** | `curl -I` contra el backend real: CSP, HSTS, X-Frame-Options, X-Content-Type-Options presentes | ✅ |
| **Seguridad — rate limiting** | `/agent/explain` y `/auth/login` limitados; **disparado realmente** durante esta prueba (ver §4) | ✅ (verificado en producción real, no en teoría) |
| **Seguridad — secretos por env** | `.env` con API key/contraseñas reales, confirmados `git check-ignore` en los 3 subproyectos | ✅ |
| **Seguridad — CORS** | `Access-Control-Allow-Origin: *` — abierto a cualquier origen | ⚠️ Aceptado para este alcance de demo (sin cookies, JWT vía header), a endurecer antes de producción real |
| **Seguridad — sin PII en logs** | `agent_logs.context_sent` inspeccionado en la DB real: solo métricas calculadas, sin nombre/email/contraseña | ✅ |
| **Manejo de errores** | Estados de carga/vacío/error explícitos en cada pantalla; `AllExceptionsFilter` global con logging (agregado en la revisión final del backend) | ✅ |
| **Testing** | Backend: 15 suites/31 tests. Frontend: 7 suites/16 tests unitarios + 34 E2E (33 pasando) | ✅ |
| **Accesibilidad** | axe-core (WCAG 2.1 A/AA): **0 violaciones** en `/login`, `/camino`, `/reglas`; navegación por teclado verificada | ✅ |
| **Responsive** | Suite completa corrida también en viewport móvil (Pixel 7): 16/17 casos pasan (el 17º es el rate-limit ya explicado) | ✅ |
| **Observabilidad** | `Logger` en el filtro global de excepciones; `AgentLog` audita cada interacción del agente (contexto, respuesta cruda, respuesta resuelta, si pasó validación) — confirmado con datos reales en la DB | ✅ |

## 7. Revisión de UI/UX

**Fortalezas confirmadas en vivo:**
- Estados de carga/error visibles y consistentes en todas las pantallas.
- El panel del agente ahora sigue el escenario vigente (corregido en la revisión final previa) — verificado con datos reales, no solo con mocks.
- Foco de teclado, hover y contraste funcionan (la corrección de clases de Tailwind v3 de la revisión final se sostiene: 0 violaciones de axe-core).

**Hallazgos nuevos de esta pasada:**
- **(Corregido)** Mensaje de error en inglés filtrándose a la UI en español (§5.3).
- **(Corregido)** El simulador no dejaba resolver el bloqueo real de Ana — la "aha moment" del producto era irrealizable (§5.2).
- **(Menor, no corregido)** El texto del agente a veces incluye valores de enum sin traducir en la oración (p. ej. "se considera *low*" en vez de "se considera *baja*") y una redundancia como "no calificarías (no)". Es contenido generado por el LLM combinando datos del contexto (`approvalCategory: "low"`) con prosa en español — el LLM usa el valor crudo del placeholder tal cual. No es un bug de resolución (el anti-alucinación funciona correctamente), es una oportunidad de pulir el prompt o traducir los valores de enum antes de pasarlos al contexto del agente.
- **(Menor, no corregido)** El campo de monto del préstamo agregado en esta pasada (§5.2) no tiene ninguna pista visual de que también sea editable para mejorar el LTV — un usuario real podría no darse cuenta de qué palanca mover. El texto del label ("con más ahorro para la entrada, baja este monto") es un intento mínimo de esto, pero no reemplaza mostrar el LTV objetivo junto al campo.
- **(Menor, ya conocido)** CORS abierto, variantes no usadas de `Button`/`Card` con residuos de Tailwind v4 — ver ledger de revisiones anteriores.

## 8. Pendiente / siguientes pasos

- Corregir la traducción de valores de enum en el contexto del agente (`approvalCategory`) si se quiere pulir el texto antes de la entrega.
- Considerar mostrar el LTV objetivo (o el "ahorro extra necesario") junto al nuevo campo de monto del préstamo en el simulador, para que la palanca sea autoexplicativa.
- Restringir CORS a un origen conocido antes de cualquier despliegue más allá de esta demo.
- Los Dockerfiles actuales son de una sola etapa (priorizando velocidad de entrega sobre tamaño de imagen) — candidatos a *multi-stage build* si se optimiza para producción real.
