# PULSAR · S.Y.N.A.P.S.E.

Monitor de salud para astronautas que corre entero en un portátil, sin red. PULSAR es el asistente que ve el astronauta; S.Y.N.A.P.S.E. (*System for Yielding Neuro-physical Assessment & Predictive Spaceflight Evaluation*) es la plataforma que hay debajo.

Responde al reto [Create Health Monitoring Software for Astronauts on Space Missions](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/) del NASA Space Apps Challenge 2026: recoger indicadores de salud y ayudar al astronauta a evaluarlos y a actuar sin depender de un médico en la Tierra.

> **Apoyo a la decisión, no un dispositivo médico.** No está validado clínicamente, y los indicadores de entorno (radiación, CO₂) son simulados.

## Estado

| Pieza | Estado |
| --- | --- |
| HUD del frontend (semáforo, núcleo 3D, sliders, tendencia) | Hecho |
| Sistema de diseño (paleta y elementos) | Hecho |
| Contrato de telemetría (JSON Schema + tipos) | Hecho, sin validación en ejecución |
| Fatiga ocular por cámara (PERCLOS) | Hecho, con puntuación provisional y sin probar con cámara real |
| Motor de reglas | Provisional en el frontend, con umbrales sin fuente clínica |
| Backend FastAPI, voz, modelo de fatiga entrenado | Pendiente |
| Gemelo del cuerpo en SVG, intro forense, test PVT-B | Pendiente |

## Funcionalidades

### Disponibles

- **Semáforo de tres niveles.** Verde, ámbar o rojo, con su escalado: autocuidado, avisar a la tripulación o contactar con el flight surgeon.
- **Explicación de cada alerta.** El panel "Por qué este estado" lista los factores que la provocan y el riesgo del HRP de NASA asociado.
- **Fatiga ocular sin contacto.** La webcam mide el porcentaje de tiempo con los ojos cerrados (PERCLOS) en una ventana de 60 s. El vídeo se procesa en el navegador y no sale de la máquina.
- **Simulación del entorno.** Sliders de radiación, CO₂ de cabina y horas de sueño para ver cómo cambia la decisión.
- **Tendencia de fatiga.** Gráfica de los últimos 2 minutos con la línea de alerta.
- **Núcleo 3D del asistente.** Cambia de color con el estado.
- **Accesible.** Navegable por teclado, respeta la preferencia de movimiento reducido y se adapta a móvil.

### Previstas

- Motor de reglas en el backend, con umbrales contrastados y tarjetas de contramedidas.
- Asistente por voz sin manos: faster-whisper, Gemma 2 2B en Ollama y Piper TTS, todo en local.
- Modelo de fatiga entrenado con datos reales de privación de sueño (UTA-RLDD y DROZY).
- Postura y asimetría de brazos, test de vigilancia PVT-B y pulso por cámara (experimental).
- Gemelo del cuerpo que se ilumina por sistemas e intro forense "caja negra".

## Arquitectura

Todo es local. El navegador procesa el vídeo; un FastAPI en el mismo portátil procesará la voz y las reglas.

```
Navegador (Next.js)                         Backend local (pendiente)
┌──────────────────────────────┐            ┌──────────────────────────┐
│ vision-hud  cámara → PERCLOS │            │ rules_engine  decisión   │
│      │                       │ telemetría │ voice_engine  voz        │
│      ▼                       │ ─────────► │                          │
│ sim-core    store (Zustand)  │ ◄───────── │                          │
│      │                       │  decisión  └──────────────────────────┘
│      ▼                       │
│ HUD: semáforo, 3D, gráficas  │
└──────────────────────────────┘
```

Cada pieza hace una sola cosa: la visión mide, las reglas deciden y el modelo de lenguaje solo redacta. Ninguna toma decisiones clínicas por su cuenta.

## Stack

| Capa | Tecnología |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Animación y 3D | Framer Motion, Three.js |
| Gráficas | Apache ECharts |
| Estado | Zustand |
| Visión | MediaPipe Face Landmarker (`@mediapipe/tasks-vision`) |
| Backend (pendiente) | Python, FastAPI, faster-whisper, Ollama, Piper |

## Estructura

```
├── shared/
│   └── telemetry.schema.json     contrato entre frontend y backend
├── frontend/
│   └── src/
│       ├── app/                  página y layout
│       ├── styles/
│       │   └── design-system.css paleta y elementos
│       └── modules/
│           ├── sim-core/         store, HUD, núcleo 3D, sliders, tendencia
│           ├── vision-hud/       cámara y PERCLOS
│           └── voice-ai/         (pendiente)
├── content/, possible-solution/  material del taller original de Copilot
└── data/                         dataset del taller
```

## Puesta en marcha

Hace falta Node.js; está probado con la versión 24.

```bash
cd frontend
```

```bash
npm install
```

```bash
npm run dev
```

Abre `http://localhost:3000`. Para la fatiga ocular pulsa **Activar cámara** y concede el permiso.

La primera vez, el modelo de cara se descarga de Google. Para usarlo sin red, guárdalo como `frontend/public/mediapipe/face_landmarker.task` y cambia `MODEL_URL` en [FaceMonitor.tsx](frontend/src/modules/vision-hud/FaceMonitor.tsx).

### Comandos

Todos se ejecutan desde `frontend/`.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm test` | Tests de la lógica de telemetría |
| `npm run lint` | ESLint |

## Contrato de telemetría

[shared/telemetry.schema.json](shared/telemetry.schema.json) es la única fuente de verdad de los datos. Sus tipos están en [telemetry.ts](frontend/src/modules/sim-core/telemetry.ts).

| Sección | Contenido |
| --- | --- |
| `biometrics` | Fatiga, PERCLOS, bostezos, postura, pulso con su confianza, resultados del PVT |
| `selfReport` | Sueño, ánimo, presión, glucosa y temperatura introducidos a mano |
| `environment` | Radiación, CO₂ de cabina, modo de gravedad y peligros activos |
| `decision` | Estado, escalado, sistemas afectados, riesgo HRP y factores |
| `voice` | Modo manos libres, transcripción y respuesta |

Para escribir en el store desde cualquier módulo:

```ts
import { useTelemetry } from "@/modules/sim-core/store";

useTelemetry.getState().patch("biometrics", { perclos: 0.2 });
```

Cada `patch` recalcula la decisión.

## Sistema de diseño

[design-system.css](frontend/src/styles/design-system.css) define la paleta y los elementos. Los colores se usan como utilidades de Tailwind (`bg-panel`, `text-accent`, `border-line`).

| Token | Uso |
| --- | --- |
| `void`, `panel`, `raised`, `line` | Fondos y bordes, de más oscuro a más claro |
| `ink`, `muted` | Texto principal y secundario |
| `accent` | Cian de PULSAR: foco, enlaces, datos en vivo |
| `ok`, `warn`, `crit` | Verde, ámbar y rojo; solo para indicar estado |

Elementos: `.hud-panel`, `.hud-title`, `.hud-value`, `.hud-label`, `.hud-btn` (y `.hud-btn-ghost`), `.hud-status` y `.hud-range`.

## Privacidad y límites

- El vídeo de la cámara no se guarda ni se envía; solo llegan al store los números derivados.
- Los datos de fatiga con los que se entrenará el modelo son de personas en tierra, no de astronautas.
- Los umbrales actuales del semáforo son provisionales y no tienen fuente clínica.
- No detecta SANS ni mide la variabilidad cardiaca por cámara.

## Cómo contribuir

- El código nuevo va en ramas aparte (`feat/...`), no en `main`.
- Cada módulo es dueño de su carpeta; lo compartido pasa por el contrato de telemetría.
- Antes de subir cambios: `npm test` y `npm run lint` desde `frontend/`.

## Origen y licencia

Este repositorio parte del taller [Coding with an AI pair programmer](./hackathon.md) de GitHub Copilot, cuyo material se conserva en `content/` y `possible-solution/`. Licencia [MIT](./LICENSE.txt).
