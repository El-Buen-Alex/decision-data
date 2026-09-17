# Decision Data Ruta — Diseño

**Fecha:** 2026-09-16
**Contexto:** Reto técnico final — Proceso de selección de desarrolladores 2026, Decision Data.
**Entrega:** viernes 18 de septiembre de 2026, 09:00 (Ecuador).

## 1. Problema y visión de producto

Decision Data es un buró de crédito e inteligencia económica regulado en Ecuador (Superintendencia de Bancos, LOPDP/COMF). Su oferta B2C actual (Panorama, Live Score Dashboard) ya cubre "ver tu score". El reto pide explícitamente algo que **no** sea un dashboard genérico ni una banca web.

**Insight de producto:** a una persona le importa su score cuando necesita algo concreto (una casa, un carro), no como métrica abstracta. El valor real no es mostrar el número — es acompañar el camino desde donde está hoy hasta calificar para lo que quiere, con pasos concretos y verificables.

**Producto:** *Decision Data Ruta* — una experiencia que, para una meta financiera concreta (crédito hipotecario), diagnostica si la persona calificaría hoy, simula escenarios de mejora con cálculos reales de elegibilidad, y construye un plan de hitos hacia la meta, con un agente de IA que ayuda a entender y navegar el proceso (sin decidir ni calcular nada).

**Persona objetivo (MVP):** "Ana", aspirante que **hoy sería rechazada o recibiría condiciones desfavorables** para un crédito hipotecario (score/DTI insuficientes). El recorrido demuestra el camino de rechazo a aprobación.

## 2. Alcance del MVP

**Dentro de alcance:**
- Una sola meta financiera: crédito hipotecario.
- Un motor de reglas de elegibilidad hipotecaria, determinista y parametrizable.
- Un simulador de escenarios ("qué pasaría si") sobre ese motor.
- Un plan de hitos generado a partir de un escenario elegido.
- Un agente de IA de solo-ayuda (explicación, redacción, respuestas a preguntas) sin autoridad sobre ningún número.
- Datos 100% sintéticos (perfil de crédito, deudas, ingresos).
- Autenticación simple (para cumplir persistencia de estado por usuario).

**Fuera de alcance (declarado explícitamente, no es un olvido):**
- Múltiples metas financieras simultáneas (auto, alquiler, etc.) — el motor se diseña extensible a futuro, pero el MVP solo implementa hipotecario.
- Integración real con bancos, BIESS o el buró real de Decision Data.
- Gestión de múltiples usuarios/roles administrativos más allá de un login simple.
- Notificaciones, pagos o cualquier flujo transaccional real.

## 3. Arquitectura general

```
decision-data/
  backend/          NestJS — API REST, motor de reglas, agente, persistencia
  frontend/          Next.js — recorrido, simulador, panel del agente
  infrastructure/     docker-compose (Postgres), migraciones, seed de datos sintéticos
  docs/
  AI_USAGE.md
  README.md
```

**Principio de independencia:** `backend`, `frontend` e `infrastructure` no comparten código ni tipos. Cada uno define sus propios contratos (duplicación intencional).

**Flujo:** `Next.js` → HTTP/REST → `NestJS` → `Postgres`.

**Estándares de código (aplican a los tres subproyectos donde corresponda):**
- TypeScript estricto (`strict: true`), sin `any` no justificado.
- DTOs, interfaces y entidades en archivos separados por responsabilidad (nunca mezclados con controller o service):
  ```
  underwriting/
    dto/create-simulation.dto.ts
    interfaces/simulation-result.interface.ts
    entities/simulation.entity.ts
    underwriting.controller.ts
    underwriting.service.ts
    underwriting.module.ts
  ```
- Envelope de respuesta uniforme en toda la API:
  ```json
  { "status": "success" | "error", "message": "string", "data": {} }
  ```
- `AllExceptionsFilter` global en NestJS: cualquier error (validación, negocio, no manejado) se traduce al mismo envelope, nunca una forma distinta.
- Sin expresiones inline complejas (ternarios anidados, cadenas comprimidas); pasos explícitos con variables nombradas.
- Funciones entre 40 y 80 líneas; fuera de ese rango solo con justificación aprobada.
- Configuración 100% por variables de entorno desde el primer commit (`ConfigModule` con validación de esquema al arrancar; `.env.example` sin secretos en cada subproyecto que lo requiera).

## 4. Motor de reglas — elegibilidad hipotecaria

Vive en `backend/src/rules-engine`, es puro (sin IA, sin efectos secundarios) y sus parámetros están en la tabla `underwriting_rule_parameter` (editable sin tocar código).

### 4.1 Parámetros investigados

| Parámetro | Dato real | Fuente | Valor adoptado |
|---|---|---|---|
| Tasa hipotecaria banca privada | Promedio 7.35% anual (jun 2026); rango 6.80%–9.10% | BCE vía [Primicias](https://www.primicias.ec/economia/tasas-interes-creditos-hipotecarios-ecuador-junio-biess-plazos-requisitos-126377/) | 7.35% base |
| Tasa VIS/VIP | 4.99% (mar 2026) | [El Diario](https://www.eldiario.ec/negocios/bancos-en-ecuador-estas-son-las-tasas-de-interes-vigentes-para-los-servicios-financieros-este-2026-04032026/) | 4.99% si inmueble < umbral VIS |
| DTI máximo (housing ratio) | Cuota ≤ ~40% del ingreso | [Primicias](https://www.primicias.ec/economia/consejos-credito-hipotecario-compra-vivienda-tasas-plazos-92280/) | 40% |
| DTI total (toda la deuda) | 35%–50% recomendado | Ídem | 50% |
| LTV máximo banca privada | Pichincha 80-83%; Internacional exige 20% entrada | [Pichincha](https://www.pichincha.com/blog/quienes-pueden-acceder-prestamo-credito-hipotecario), [Banco Internacional](https://www.bancointernacional.com.ec/producto/credito-hipotecario/) | 80% base; 85% si score "excelente" |
| Plazo típico | Hasta 20-25 años (banca privada) | Primicias | 20 años por defecto (5–25 configurable) |
| Escala de score | Ecuador real: 1-999; promedio nacional 2024 = 862 | [Extra.ec](https://www.extra.ec/noticia/economia/score-crediticio-ecuador-1-999-funciona-mejorarlo-acceder-creditos-161166.html) | Escala 0-1000 (marca Decision Data), banda "bueno" calibrada alrededor de 862 |

**No investigable (declarado explícitamente en README y en la app):**
- Bandas exactas de score por banco: no son públicas. Se calibran con el promedio nacional real como ancla y se etiquetan como "bandas propias, no oficiales".
- Modelo de probabilidad de aprobación: cada entidad usa un modelo propietario no público. Se implementa como sistema de puntos ilustrativo, declarado como tal, nunca presentado como el modelo real de un banco o de Decision Data.

### 4.2 Cálculos

- **DTI** = (deudas actuales + cuota estimada del nuevo crédito) / ingreso mensual neto.
- **LTV** = monto del préstamo / valor del inmueble.
- **Cuota mensual** (amortización francesa): `M = P × [r(1+r)^n] / [(1+r)^n − 1]`.
- **Probabilidad de aprobación**: sistema de puntos (banda de score + cumplimiento DTI + cumplimiento LTV + estabilidad laboral/tipo de ingreso/mora reciente) → categoría (Baja/Media/Alta) + % ilustrativo.
- **Simulación**: dado un conjunto de ajustes (bajar deuda, más ahorro para entrada, esperar N meses, mejorar utilización), el motor recalcula los cuatro valores anteriores de forma determinista y reproducible. Cada simulación se persiste con sus inputs, outputs y la versión de parámetros usada.

## 5. Modelo de datos

| Entidad | Campos clave |
|---|---|
| `User` | credenciales, perfil demo asociado |
| `CreditProfile` | score, utilización de tarjetas, deudas vigentes, ingreso, tipo de ingreso, antigüedad laboral, mora reciente |
| `MortgageGoal` | valor del inmueble, tipo (privada/VIS-VIP), monto deseado |
| `UnderwritingRuleParameter` | `key`, `value`, `description`, `source` |
| `Simulation` | inputs, outputs (DTI/LTV/cuota/score proyectado/probabilidad), versión de reglas, timestamp |
| `Plan` / `Milestone` | hitos con métrica objetivo y fecha (calculados por el motor) |
| `AgentLog` | contexto enviado al agente, respuesta, resultado de validación anti-alucinación |

## 6. Agente de IA — solo ayuda

Vive en `backend/src/agent`. **Nunca calcula ni decide** — el motor de reglas es la única fuente de verdad numérica.

**Mecanismo anti-alucinación:** el motor produce una salida estructurada (`{ score, dti, ltv, cuotaMensual, probabilidad, mesesParaMeta, ... }`). El agente redacta texto con placeholders que referencian esas claves (`"Hoy tu score es {{score}}..."`). Un resolutor determinista en el backend sustituye cada placeholder por el valor real antes de responder. Si el agente referencia una clave inexistente, el resolutor rechaza esa parte y usa un mensaje seguro genérico — es estructuralmente imposible que el agente invente una cifra.

**Endpoints:**
- `POST /agent/explain` — explica el resultado de una simulación.
- `POST /agent/ask` — responde preguntas del usuario (rate-limited).
- `POST /agent/plan` — redacta el plan/checklist a partir de hitos ya calculados por el motor.

## 7. Recorrido (mapeado a la demo de 9 minutos)

Metáfora visual: camino/línea de tiempo literal hacia la meta — no tarjetas de KPI, no dashboard.

1. **Entrada** — perfil demo de Ana precargado.
2. **Diagnóstico** — score/DTI/LTV actuales vs. la meta; resultado honesto ("hoy no calificarías") con el motivo exacto; el agente lo explica en un panel lateral.
3. **Simulador embebido** — el usuario ajusta variables y ve el camino recalcularse en vivo.
4. **Plan con hitos** — al elegir un escenario, se genera el camino con hitos mensuales (fechas/métricas del motor, texto del agente).
5. **Checklist final** — al alcanzar la meta simulada, resumen + documentos para el banco.
6. **Panel de reglas (admin)** — ver/editar en vivo los parámetros del motor (DTI máx, LTV máx, tasa base, etc.) y su efecto inmediato.

El panel de reglas (6) es la respuesta diseñada al requisito de "modificación en vivo solicitada por el panel" (4 min de la presentación): un ajuste de parámetro sin tocar código, con efecto inmediato y visible.

El panel del agente es visible en las pantallas 2–5, dando transparencia al uso de IA sin que domine la interfaz.

## 8. Requisitos no funcionales

- **Seguridad:** JWT para auth, `class-validator` en todo DTO de entrada, headers de seguridad (helmet), rate limiting en `/agent/*` (`@nestjs/throttler`), secretos solo por variables de entorno, sin PII real en ningún dato ni log.
- **Manejo de errores:** estados explícitos de carga, vacío y falla en cada pantalla; `AllExceptionsFilter` global en backend.
- **Testing:** prioridad máxima en pruebas unitarias del motor de reglas (casos límite de DTI/LTV, verificación de la fórmula de amortización contra valores conocidos); pruebas de integración de los endpoints principales; pruebas de componentes clave del frontend.
- **Accesibilidad/responsive:** diseño mobile-first, navegación por teclado, etiquetas ARIA en elementos interactivos.
- **Observabilidad:** logging estructurado; `AgentLog` como registro auditable de cada interacción del agente.

## 9. Prácticas de repositorio

- Commits con mensajes de estilo humano/profesional, sin trailers de atribución a herramientas de IA (la declaración de uso de IA vive en `AI_USAGE.md`, que sí debe ser completo y honesto — son cosas distintas, no hay conflicto).
- Historial de commits incremental que muestre evolución real, no una sola entrega monolítica.
- `README.md` con instalación, ejecución, pruebas y recorrido de demostración.
- `.env.example` sin secretos por subproyecto.
- `docker-compose.yml` en `infrastructure/` para levantar Postgres localmente.
- Migraciones y seed de datos sintéticos versionados.
- Diagrama/explicación de arquitectura (este documento + un diagrama simple en el README).
- `AI_USAGE.md`: herramientas usadas, prompts que influyeron en decisiones importantes, qué generó/asistió la IA, errores detectados en respuestas de IA, correcciones propias, pruebas/controles de calidad y seguridad, decisiones tomadas directamente por el candidato.
- Sección de limitaciones conocidas y próximos pasos.

## 10. Riesgos y evolución a producción

**Riesgos principales:** (a) el modelo de probabilidad de aprobación es ilustrativo, no un modelo real de riesgo — para producción se reemplazaría por el modelo real de Decision Data (mencionan SHAP/XGBoost) entrenado con datos reales; (b) las bandas de score son una calibración propia, no oficiales; (c) el agente depende de un proveedor LLM externo — para producción se necesitaría fallback si el proveedor falla, y monitoreo de costos/latencia.

**Qué cambiaría para producción:** integración con el motor de scoring real y regulado de Decision Data en vez del motor de reglas ilustrativo; autenticación robusta (MFA, verificación de identidad); auditoría regulatoria completa (SB-DTL-2020-1036, LOPDP); soporte multi-meta (no solo hipotecario); observabilidad y alerting de producción; revisión legal de cualquier cifra de "probabilidad de aprobación" mostrada a usuarios reales.
