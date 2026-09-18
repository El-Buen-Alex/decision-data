# Decision Data Ruta — Frontend

Recorrido en Next.js: diagnóstico → simulador → plan de hitos → checklist final, con un panel de reglas en vivo y el panel del agente de IA. Consume la API del backend (`../backend`) a través de un cliente tipado propio — sin código compartido entre subproyectos.

Diseño completo: [`docs/superpowers/specs/2026-09-16-decision-data-ruta-design.md`](../docs/superpowers/specs/2026-09-16-decision-data-ruta-design.md).

## Prerrequisitos

- Node.js 20+
- El backend corriendo en `http://localhost:3001` (ver `../backend/README.md`) para cualquier verificación con datos reales

## Instalación y ejecución

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

La app queda en `http://localhost:3000`.

## Pruebas

```bash
npm test               # unitarios (Jest + Testing Library)
npx playwright test    # E2E contra la app real corriendo (login → diagnóstico → simulador → plan → check-in → reglas)
```

El recorrido completo end-to-end (Docker + Postgres real + un `ANTHROPIC_API_KEY` real, sin mocks) ya se verificó dos veces — ver `docs/test-plan.md` para el detalle y los bugs reales que esa verificación encontró.

## Recorrido de demostración

1. `/login` — inicia sesión con la persona demo (`ana.demo@decisiondata.test` / `demo1234`).
2. `/camino` — diagnóstico actual ("hoy no calificarías" con los números reales de Ana), simulador de escenarios embebido, y el panel del asesor de IA explicando el resultado.
3. `/plan/[id]` — al elegir un escenario que sí califica, el plan de hitos generado (fechas y métricas reales del motor de reglas).
4. `/reglas` — panel de administración: edita un parámetro (p. ej. `MAX_HOUSING_DTI_RATIO`) y confirma que una nueva simulación en `/camino` refleja el cambio de inmediato, sin tocar código.

## Identidad de marca

La paleta de color (tema "midnight") y el logo se obtuvieron directamente de `https://decisiondata.ec/assets/styles.css` y `https://decisiondata.ec/assets/dd-lockup-white.png` / `dd-icon.png` — verificados en vivo contra el sitio real, no inventados. Ver `src/app/globals.css` y `public/brand/`.

## Limitaciones conocidas

- Igual que el backend, `/agent/ask` y `/agent/plan` no están implementados — solo `/agent/explain`.
- El texto del agente a veces cita un valor de enum sin traducir del contexto (p. ej. "se considera *low*" en vez de "*baja*") — un problema de redacción del prompt, no del mecanismo anti-alucinación en sí (ver `docs/test-plan.md` §7).
- CORS está abierto (`Access-Control-Allow-Origin: *`) — aceptable para esta demo (JWT por header, sin cookies), debería fijarse a un origen concreto antes de cualquier despliegue real.

## Próximos pasos

- Un panel de "Mis planes" que liste varias metas/escenarios en paralelo, no solo el último plan creado (evaluado y descartado a favor del seguimiento por check-in para esta entrega — ver `AI_USAGE.md`).
- Completar `/agent/ask` y `/agent/plan` reutilizando el mismo patrón (context builder → plantilla → resolutor anti-alucinación) ya probado en `/agent/explain`.
- Pulir la redacción del prompt del agente para que nunca cite un valor de enum en inglés dentro de una respuesta en español.
