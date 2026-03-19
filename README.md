# Mi Platica - Finanzas Personales

Aplicacion web para registrar ingresos y gastos personales en Google Sheets, con una interfaz simple y una entrada rapida asistida por IA para convertir texto libre en registros estructurados.

## Stack

- Frontend: React 19 + TypeScript + Vite
- Backend: Node.js + Express + TypeScript (ejecutado con tsx)
- Integraciones: Google OAuth 2.0, Google Sheets API, Google Drive API, Gemini API
- UI: Tailwind CSS, Motion, Lucide React

## Arquitectura

- Cliente SPA en React para autenticacion, captura de movimientos y visualizacion de ultimos registros.
- Servidor Express en [server.ts](server.ts).
- El servidor gestiona OAuth con Google.
- El servidor expone endpoints para listar hojas, consultar ultimos movimientos y agregar filas.
- El servidor sirve Vite en modo desarrollo y archivos estaticos en produccion.
- Persistencia en Google Sheets (hoja Registros), sin base de datos local.

## Flujo funcional

1. El usuario inicia sesion con Google.
2. Selecciona una hoja de calculo.
3. Registra un ingreso o gasto (manual o con entrada IA).
4. El backend agrega el movimiento en la hoja Registros.
5. El frontend consulta y muestra los ultimos movimientos.

## Variables de entorno

Crear un archivo .env en la raiz con:

- GEMINI_API_KEY
- APP_URL
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET

## Ejecucion local

Requisitos: Node.js 18+

1. Instalar dependencias:
   npm install
2. Configurar variables de entorno en .env.
3. Iniciar en desarrollo:
   npm run dev
4. Abrir en el navegador:
   http://localhost:3000

## Scripts

- npm run dev: inicia servidor Express con Vite en modo middleware.
- npm run build: genera el build del frontend.
- npm run preview: previsualiza el build de Vite.
- npm run lint: validacion de tipos con TypeScript.

## Estructura base

- [server.ts](server.ts): API y autenticacion con Google.
- [src/App.tsx](src/App.tsx): interfaz principal y logica de interaccion.
- [src/main.tsx](src/main.tsx): punto de entrada de React.
- [index.html](index.html): plantilla HTML.
