# Decision Data Ruta — Backend

API REST en NestJS: motor de reglas de elegibilidad hipotecaria, autenticación, endpoints de simulación/plan/hitos, panel de reglas en vivo, y el agente de IA de solo-ayuda.

Diseño completo: [`docs/superpowers/specs/2026-09-16-decision-data-ruta-design.md`](../docs/superpowers/specs/2026-09-16-decision-data-ruta-design.md).

## Prerrequisitos

- Node.js 20+ (probado con 22.x)
- Docker + Docker Compose (para Postgres)
- Una API key de Anthropic válida (para el endpoint `/agent/explain`; el resto de la API funciona sin ella)

## Instalación y ejecución

Desde la raíz del repo:

```bash
# 1. Levantar Postgres
cd infrastructure
cp .env.example .env
docker compose up -d

# 2. Configurar y arrancar el backend
cd ../backend
cp .env.example .env
# Editar .env: reemplazar ANTHROPIC_API_KEY por una key real de Anthropic
npm install
npm run migration:run
npm run seed
npm run start:dev
```

La API queda en `http://localhost:3001`.

## Pruebas

```bash
npm test
```

## Credenciales de la demo

El seed crea una persona sintética, "Ana", que hoy **no calificaría** para el crédito hipotecario que busca (score y DTI insuficientes):

- Email: `ana.demo@decisiondata.test`
- Password: `demo1234`

Login:

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"ana.demo@decisiondata.test\",\"password\":\"demo1234\"}"
```

## Recorrido de demostración (endpoints)

1. `POST /auth/login` → token JWT.
2. `GET /underwriting/profile`, `GET /underwriting/goal` → situación actual de Ana.
3. `POST /underwriting/simulations` → simula un escenario (motor de reglas, determinista).
4. `POST /agent/explain` → el agente narra el resultado de una simulación (requiere `ANTHROPIC_API_KEY` real).
5. `POST /underwriting/plans` → genera un plan de hitos a partir de una simulación.
6. `GET /underwriting/plans/:id` → plan con sus hitos.
7. `GET /underwriting/rule-parameters` / `PATCH /underwriting/rule-parameters/:key` → panel de reglas en vivo: cambia un parámetro (p. ej. `MAX_HOUSING_DTI_RATIO`) y una nueva simulación refleja el cambio de inmediato, sin tocar código.

## Sobre el modelo de aprobación y las bandas de score

El sistema de puntos que calcula la "probabilidad de aprobación" (`backend/src/rules-engine/calculators/approval-probability.scorer.ts`) y las bandas de score (`score-band.classifier.ts`) son **ilustrativos**, construidos para esta demo — no son el modelo real de riesgo de Decision Data (que usaría algo como SHAP/XGBoost entrenado con datos reales), ni las bandas oficiales de ningún buró. Los parámetros con datos reales investigados (tasas hipotecarias, DTI/LTV máximos, plazos) están documentados con su fuente en la sección 4.1 del documento de diseño y en cada fila de `underwriting_rule_parameters` (columna `source`).

## Limitaciones conocidas

- Solo `POST /agent/explain` está implementado. `/agent/ask` (preguntas libres del usuario) y `/agent/plan` (redacción del plan) fueron deliberadamente dejados como trabajo futuro una vez que el patrón completo (context builder → plantilla LLM → resolutor anti-alucinación → log) quedó probado end-to-end con `/explain` — extenderlos es repetir el mismo patrón con un prompt distinto.
- El modelo de aprobación y las bandas de score son ilustrativos (ver sección anterior), no el motor de riesgo real de Decision Data.
- Sin integración real con bancos, BIESS o el buró real de Decision Data — todos los datos de crédito son sintéticos.
- El agente depende de un proveedor LLM externo (Anthropic); no hay fallback si el proveedor falla.
