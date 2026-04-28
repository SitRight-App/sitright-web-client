# sitright-web-client

Web client del sistema **SitRight**. React + TypeScript + Vite + Tailwind.

## Sobre el proyecto

Parte de la tesis **SitRight**: aplicación web con machine learning e IoT para mejorar la ergonomía postural en trabajadores sedentarios limeños mediante chaleco inteligente.

**Equipo:** Christopher Lecca, Mariano Ames (UPC — Ingeniería de Software).

## Qué hace

- Dashboard en tiempo real con el estado postural del trabajador.
- Alertas visuales cuando la postura es inadecuada por más de 5 minutos.
- Recomendaciones ergonómicas según el tipo de desviación detectada.
- Historial y reportes semanales.
- Configuración del chaleco (vinculación, calibración).
- Autenticación de usuarios.

## Arquitectura

Features organizados por bounded context del backend (Screaming Architecture). Cada feature contiene sus propios `components/`, `pages/`, `services/`, `hooks/`, `store/`, `types/`.

## Stack

- React 18 + TypeScript (strict mode)
- Vite
- TailwindCSS
- TanStack Query
- React Router
- Zustand (cuando aplica)

## Relación con otros repos

- **sitright-backend-api** — API REST que este cliente consume.
- **sitright-workspace** — documentación, ADRs y backlog (privado).

## Licencia

Proyecto académico — UPC 2026.
