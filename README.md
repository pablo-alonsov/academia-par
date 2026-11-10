# Academia ARP

Academia privada para las clases individuales de Rocío (6.º Primaria) y Alejandra (2.º ESO). React 19, TypeScript y rutas de servidor compatibles con Next.js mediante Vinext; Tailwind/CSS con temas accesibles. Cloudflare D1 conserva los registros y R2 los archivos. Sites aloja la versión privada.

## Acceso

Las alumnas eligen un perfil y entran sin contraseña, por petición expresa. El servidor limita cada sesión a los datos del perfil elegido, pero cualquier visitante admitido puede cambiar entre ambos perfiles: el selector no identifica personalmente a la alumna. El panel docente requiere su contraseña; el servidor guarda solamente su hash, aplica límites a intentos y usa una cookie HttpOnly.

La publicación de Sites es privada para el propietario y exige su acceso de plataforma antes del selector. No se ha abierto el sitio a Internet ni enviado invitaciones. Usarlo desde otra cuenta requiere configurar posteriormente el acceso de Sites; no basta con compartir la URL. En un equipo ya autorizado, las alumnas solo eligen su perfil.

La contraseña docente inicial solicitada está configurada como secreto de alojamiento y en el archivo local ignorado `.dev.vars`. No forma parte del código cliente ni del repositorio. El nombre de la variable es `TEACHER_PIN_HASH` (PBKDF2 SHA-256, 100000 iteraciones, sal aleatoria).

## Uso

1. Entra en **Mi panel docente**. Abre **Alumnas** para ajustar las prioridades y el mapa de habilidades.
2. En **Banco de actividades**, revisa el material planificado, adáptalo y asígnalo como actividad de clase, casa u opcional. En la ficha puedes destacar una actividad asignada en el inicio.
3. **Preparar clase** crea una sesión con la fecha que elijas, sin inventar horas. La pantalla de sesión recupera el siguiente paso, guarda cambios, distingue notas privadas y material compartido y permite cambiar los tiempos.
4. Al cerrar, revisa la vista previa para la alumna. Un único cierre guarda el diario y el siguiente paso. Solo una valoración explícita añade una comprobación al aprendizaje.
5. Revisa las entregas desde la semana. Las fracciones se comparan por equivalencia exacta; las respuestas abiertas esperan revisión. Las pistas y autoevaluaciones se guardan por separado del resultado.
6. En **Calendario**, registra pruebas y sus temas. **Preparar repaso** crea una sesión vinculada al examen con una fecha elegida expresamente.

No hay historial de demostración. Las 42 actividades y 20 habilidades iniciales son material planificado. Los 9 recursos incluyen consignas y notas de acceso: véase `docs/recursos.md`. Las webs externas no transmiten resultados a esta aplicación.

## Datos y permisos

Las tablas separan alumnas, asignaturas, habilidades, sesiones, actividades reutilizables, asignaciones, respuestas, recursos, evidencias, observaciones, dudas, exámenes y archivos. Cada entidad tiene identificador estable, alumna cuando corresponde, contenido JSON y fecha de actualización. Las observaciones conservan el historial de comprobaciones; cambiar un estado sin marcar una comprobación no inventa una fecha.

Los endpoints verifican rol y pertenencia en el servidor. Las vistas de alumna usan listas explícitas de campos autorizados: nunca incluyen soluciones docentes, observaciones privadas ni claves de almacenamiento. Los archivos se descargan a través de una ruta autenticada con control de alumna y de visibilidad. El cierre utiliza una operación atómica con identificador de operación y observación estable para evitar duplicados, incluso con peticiones simultáneas.

`localStorage` solo guarda tema y orden de widgets. Los contenidos pedagógicos están en D1 y los adjuntos en R2. Los datos locales de desarrollo y los publicados son independientes. Los adjuntos admiten los tipos indicados y hasta 8 MB.

## Desarrollo

Requiere Node.js >=22.13 y npm. El proyecto incluye `package-lock.json` y las herramientas de Sites.

- `npm ci` instala dependencias.
- `npm run db:generate` genera una nueva migración cuando cambia `db/schema.ts`; las migraciones aplicadas no se modifican.
- `npm run build` genera el Worker y la configuración local de D1/R2.
- Aplica las migraciones pendientes locales: `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_clammy_eternals.sql`.
- `npm run dev` sirve en loopback, normalmente `http://127.0.0.1:5173`.
- `node node_modules/typescript/bin/tsc --noEmit` comprueba tipos.
- `node --experimental-strip-types --test tests/grading.test.mjs tests/policy.test.mjs` comprueba corrección y privacidad.
- La prueba `tests/api.integration.mjs` solo admite una base de datos local en loopback, usa `ARP_TEST_PIN` en el entorno del proceso y limpia sus registros `qa-*`. No la dirijas a producción.

La publicación utiliza `.openai/hosting.json`, migraciones versionadas, el secreto en Sites y el flujo oficial de empaquetado. Los archivos `.dev.vars`, `.wrangler`, `node_modules` y los resultados de compilación quedan fuera del repositorio.

## Alcance

Incluye preparación, desarrollo y cierre de sesiones, mapa editable, diario, biblioteca, banco, entregas y revisión, evidencias y calendario. No integra Google Calendar, servicios externos de notas, pagos, IA ni envío de mensajes. El calendario tiene vista mensual y agenda propia. No se añaden porcentajes de dominio sin fundamento ni comparaciones entre alumnas.

El diseño contempla foco visible, áreas interactivas amplias, contraste, teclado, modales accesibles y movimiento reducido. La validación realizada no equivale a una auditoría formal completa de WCAG 2.1 AA.
