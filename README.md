# Gestor administrativo para Supabase

App web en React + Vite + TypeScript para administrar la jerarquia:

- programas
- unidades
- objetivos_aprendizaje -> indicadores_evaluacion
- evaluaciones -> criterios_evaluacion y actividades_evaluacion
- unidad_habilidades
- unidad_conocimientos
- unidad_conocimientos_previos
- unidad_actitudes
- unidad_palabras_clave
- unidad_lecturas_sugeridas

La interfaz evita mostrar foreign keys como dato principal y crea los hijos desde el detalle de su padre para que las relaciones se asignen automaticamente.

## Variables de entorno

Crea un archivo `.env.local` con:

```bash
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_publishable_key
VITE_GOOGLE_CLIENT_ID=tu_google_oauth_client_id
VITE_GOOGLE_DRIVE_FOLDER_ID=id_de_la_carpeta_en_drive
```

Compatibilidad con claves legacy:

```bash
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

Si defines ambas claves, la app usa primero `VITE_SUPABASE_PUBLISHABLE_KEY`.

Para la comparacion con PDFs de Google Drive:

- `VITE_GOOGLE_CLIENT_ID`: client ID OAuth 2.0 de Google para una app web.
- `VITE_GOOGLE_DRIVE_FOLDER_ID`: carpeta especifica donde estan los PDFs pendientes o fuente.

La app solicita acceso de solo lectura a Google Drive y lista los PDFs de esa carpeta. En el detalle del programa puedes activar `Comparar con PDF` para abrir una vista lado a lado.

## Requisito de acceso

La app usa solo claves publicas en el frontend. Por eso, tus tablas deben tener politicas RLS adecuadas para lectura y escritura con esa clave, o una configuracion equivalente en tu proyecto.

## Scripts

```bash
npm install
npm run dev
npm run build
```

## Despliegue recomendado

La opcion mas simple para compartir esta app es **Vercel**, porque este proyecto es Vite puro y genera archivos estaticos.

### 1. Sube el repositorio

```bash
git init
git add .
git commit -m "Inicial"
```

Luego subelo a GitHub, GitLab o Bitbucket.

### 2. Crea el proyecto en Vercel

- Importa el repositorio en Vercel.
- Framework: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

### 3. Configura las variables de entorno en Vercel

Usa los mismos nombres de `.env.example`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_ANON_KEY` solo si aun usas la clave legacy
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_DRIVE_FOLDER_ID`

### 4. Ajusta Google OAuth para el dominio publicado

Como la app abre Google Drive desde el navegador, el dominio publico debe estar autorizado en tu cliente OAuth de Google.

Agrega en **Authorized JavaScript origins** al menos:

- `https://TU-DOMINIO.vercel.app`

Si despues apuntas un dominio propio, agrega tambien ese origen exacto:

- `https://visor.tudominio.com`

### 5. Comparte la URL

Una vez desplegada, la otra persona solo entra al enlace y usa la app.

## Advertencia importante

Esta app **no tiene login ni roles**. Eso significa que cualquier persona con la URL puede leer y modificar la base de datos segun las politicas RLS que dejaste abiertas para `anon`.

Si la vas a compartir, compartela solo con personas de confianza o agrega una capa externa de proteccion antes de abrirla a mas gente.

## Estructura principal

- `src/config/entities.ts`: labels, columnas visibles, inputs y orden por entidad.
- `src/lib/supabase.ts`: cliente y validacion de variables de entorno.
- `src/services/`: CRUD generico y carga jerarquica.
- `src/components/`: layout, formularios, tablas y bloques reutilizables.
- `src/pages/`: programas, detalle de programa y detalle de unidad.
