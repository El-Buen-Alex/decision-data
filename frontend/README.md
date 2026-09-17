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
npm test
```

## Recorrido de demostración

1. `/login` — inicia sesión con la persona demo (`ana.demo@decisiondata.test` / `demo1234`).
2. `/camino` — diagnóstico actual ("hoy no calificarías" con los números reales de Ana), simulador de escenarios embebido, y el panel del asesor de IA explicando el resultado.
3. `/plan/[id]` — al elegir un escenario que sí califica, el plan de hitos generado (fechas y métricas reales del motor de reglas).
4. `/reglas` — panel de administración: edita un parámetro (p. ej. `MAX_HOUSING_DTI_RATIO`) y confirma que una nueva simulación en `/camino` refleja el cambio de inmediato, sin tocar código.

## Identidad de marca

La paleta de color (tema "midnight") y el logo se obtuvieron directamente de `https://decisiondata.ec/assets/styles.css` y `https://decisiondata.ec/assets/dd-lockup-white.png` / `dd-icon.png` — verificados en vivo contra el sitio real, no inventados. Ver `src/app/globals.css` y `public/brand/`.

## Limitaciones conocidas

- El verificado manual end-to-end completo (login → diagnóstico → simulador → plan → edición de regla en vivo → explicación del agente con un LLM real) no pudo ejecutarse en este entorno de desarrollo: Docker Desktop no estaba disponible para levantar Postgres/el backend, y `backend/.env` todavía tiene un `ANTHROPIC_API_KEY` de placeholder. La cobertura de tests unitarios (Jest + React Testing Library, mockeando la API) y una verificación campo por campo del contrato de cada endpoint contra el código real del backend sustituyeron esa verificación en vivo. Antes de la entrega, se recomienda levantar `docker compose up -d` en `../infrastructure`, correr el backend, poner una API key real de Anthropic, y hacer el recorrido completo una vez en un navegador real.
- Igual que el backend, `/agent/ask` y `/agent/plan` no están implementados — solo `/agent/explain`.
