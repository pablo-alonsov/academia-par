# Academia ARP

Academia para las clases individuales de Rocío (6.º Primaria) y Alejandra (2.º ESO). React 19, TypeScript y rutas de servidor compatibles con Next.js mediante Vinext; Tailwind/CSS con temas accesibles. Cloudflare D1 conserva los registros y R2 los archivos. Sites aloja la aplicación con acceso directo por enlace.

## Acceso

Las alumnas abren el enlace y eligen su perfil sin contraseña y sin iniciar sesión en ChatGPT, por petición expresa. El servidor limita cada sesión a los datos del perfil elegido, pero cualquier persona con el enlace puede elegir o cambiar entre ambos perfiles: el selector no identifica personalmente a la alumna. El panel docente requiere su contraseña; el servidor guarda solamente su hash, aplica límites a intentos y usa una cookie HttpOnly.

El acceso de Sites está configurado como público para permitir entrar directamente desde cualquier dispositivo. Las notas privadas y las funciones de gestión requieren la sesión docente validada en el servidor. Las sesiones de aplicación dependen de su token aleatorio y caducidad, no de una cuenta o cabecera de ChatGPT. Se solicita a los buscadores que no indexen la aplicación; esto no sustituye al control de permisos.

La contraseña docente inicial solicitada está configurada como secreto de alojamiento y en el archivo local ignorado `.dev.vars`. No forma parte del código cliente ni del repositorio. El nombre de la variable es `TEACHER_PIN_HASH` (PBKDF2 SHA-256, 100000 iteraciones, sal aleatoria).

## Uso

1. Entra en **Mi panel docente**. Abre **Alumnas** para ajustar las prioridades y el mapa de habilidades.
2. En **Banco de actividades**, revisa el material planificado, adáptalo y asígnalo como actividad de clase, casa u opcional. En la ficha puedes destacar una actividad asignada en el inicio.
3. **Preparar clase** crea una sesión con la fecha que elijas, sin inventar horas. La pantalla de sesión recupera el siguiente paso, guarda cambios, distingue notas privadas y material compartido y permite cambiar los tiempos.
4. Al cerrar, revisa la vista previa para la alumna. Un único cierre guarda el diario y el siguiente paso. Solo una valoración explícita añade una comprobación al aprendizaje.
5. Revisa las entregas desde la semana. Las fracciones se comparan por equivalencia exacta; las respuestas abiertas esperan revisión. Las pistas y autoevaluaciones se guardan por separado del resultado.
6. En **Calendario**, cada alumna puede añadir, editar y eliminar sus propios exámenes y temas; el docente puede gestionar los de ambas. **Preparar repaso** crea una sesión vinculada al examen con una fecha elegida expresamente.

El seguimiento comienza el lunes 16 de noviembre de 2026. Antes de esa fecha, el panel abre en la semana del 16 al 19; las nuevas sesiones tienen fecha del 16 o posterior. Las estadísticas y el diario de seguimiento cuentan desde el inicio acordado; cualquier registro histórico anterior se conserva y se puede consultar desde la ficha docente. No se generan sesiones de forma automática.

El banco contiene 119 actividades, 30 habilidades y 21 recursos, todos planificados. Rocío trabaja potencias y raíces básicas, potencias de 10, acentuación, ortografía e inglés global; Tecnología queda reservada para el segundo trimestre. Alejandra trabaja fracciones, porcentajes, potencias, densidad, concentración, estructura atómica, sintaxis e inglés global. El plan de temas se puede ajustar en la ficha docente.

**Practicar** muestra primero los ejercicios propios, con filtros por asignatura, tema y búsqueda. Se pueden abrir sin asignación previa; entregar una respuesta crea su registro opcional y conserva las ayudas y la autoevaluación. Las tareas asignadas mantienen sus categorías. El selector de contenido permite consultar también recursos externos. En ordenador se amplía la letra de la navegación y del perfil, manteniendo el menú móvil.

Los recursos nuevos son páginas concretas, fichas y simulaciones con una consigna, duración y nivel. Véanse `docs/recursos-rocio.md`, `docs/recursos-alejandra.md` y el catálogo base `docs/recursos.md`. Densidad y Construye un átomo de PhET se ejecutaron; donde el audio o un juego no se ha ejecutado, queda anotado. Las webs externas no transmiten resultados a esta aplicación.

## Seguimiento y recuperación

Inicio destaca la actividad elegida, sus alternativas, los borradores y el último feedback. Practicar conserva los intentos y permite repetir sin borrar entregas. Biblioteca separa utilizar un recurso de recibir una revisión; abrir una web no registra aciertos externos. Las dudas respondidas siguen disponibles.

Guardar un borrador y entregar son operaciones distintas. La aplicación indica si está pendiente, guardando, guardada en el servidor o conservada solamente en el dispositivo. Las entregas tienen identificador de intento para evitar duplicados al reintentar; no eliminan una versión de borrador diferente creada desde otra pestaña. Cuando caduca el acceso, se puede volver a entrar sin desmontar el editor. Una petición antigua no se reenvía con otro perfil.

Rocío dispone de una colección editable de palabras, con original, corrección, explicación, frase y fecha de revisión. Alejandra puede añadir datos, qué busca, cálculo y respuesta con unidades junto al resultado. Las preferencias de avatar y color y los recursos favoritos pertenecen a cada alumna. El docente puede fijar hasta tres recursos y destacar una actividad principal y una alternativa.

El panel muestra un resumen por alumna y una cola de revisión por prioridad. La preparación contextual incluye búsqueda de actividades, duración y favoritas, y permite guardar y abrir la sesión. Un cierre confirmado no puede ser sobrescrito por un autosave antiguo; si otra pestaña ya cerró, las notas no publicadas quedan consultables como borrador local. Los materiales se pueden hacer privados o retirar de forma reversible, manteniendo sus relaciones con los trabajos.

Los estados de habilidad no son porcentajes. «Por empezar» no rellena ningún indicador; la última comprobación incluye también el trabajo con ayuda, con su fecha y evidencia. La propiedad de una habilidad con historial no puede cambiar: adaptarla a la otra alumna crea una habilidad nueva sin trasladar resultados.

## Datos y permisos

Las tablas separan alumnas, asignaturas, habilidades, sesiones, actividades reutilizables, asignaciones, respuestas, recursos, evidencias, observaciones, dudas, exámenes, archivos, borradores (`drafts`) y colección de palabras (`word_entries`). Cada entidad tiene identificador estable, alumna cuando corresponde, contenido JSON y fecha de actualización. Las observaciones conservan el historial de comprobaciones; cambiar un estado sin marcar una comprobación no inventa una fecha.

Los endpoints verifican rol y pertenencia en el servidor. Las peticiones del cliente indican el perfil esperado: si otra pestaña cambia la cookie, se detienen y se vuelve al selector antes de escribir con otro perfil. Las vistas de alumna usan listas explícitas de campos autorizados: nunca incluyen soluciones docentes, observaciones privadas ni claves de almacenamiento. Los archivos se descargan a través de una ruta autenticada con control de alumna y de visibilidad. El cierre utiliza una operación atómica con identificador de operación y observación estable para evitar duplicados, incluso con peticiones simultáneas.

`localStorage` guarda el tema, el orden de widgets, las preferencias de vista y los indicadores de lectura, la ayuda inicial y una copia de recuperación de los borradores, siempre separada por perfil y actividad o recurso. Los borradores también se guardan en D1. Las notas docentes pendientes de una sesión se recuperan desde `sessionStorage`: sobreviven a una recarga en la misma pestaña, pero no se promete conservar esa copia local si se cierra la pestaña. El guardado confirmado del servidor sí permanece entre dispositivos. Los contenidos pedagógicos están en D1 y los adjuntos en R2. Las actualizaciones del material planificado se reconcilian por identificador y por campo con la versión anterior: conservan las ediciones docentes y todas las valoraciones, evidencias e historiales; las escrituras usan una comprobación de concurrencia. Los metadatos internos de esta actualización no se envían a ningún cliente. Las mutaciones devuelven únicamente las filas afectadas y sus proyecciones autorizadas; un autosave no vuelve a descargar todo el banco. Los datos locales de desarrollo y los publicados son independientes. Los adjuntos admiten los tipos indicados y hasta 8 MB.

## Desarrollo

Requiere Node.js >=22.13 y npm. El proyecto incluye `package-lock.json` y las herramientas de Sites.

- `npm ci` instala dependencias.
- `npm run db:generate` genera una nueva migración cuando cambia `db/schema.ts`; las migraciones aplicadas no se modifican.
- `npm run build` genera el Worker y la configuración local de D1/R2.
- Aplica las migraciones pendientes locales: `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_clammy_eternals.sql`.
- En una base local ya creada con la primera migración, aplica solo la nueva `drizzle/0001_narrow_whistler.sql` con el mismo comando de D1; añade borradores y palabras sin modificar las tablas existentes.
- `npm run dev` sirve en loopback, normalmente `http://127.0.0.1:5173`.
- `node node_modules/typescript/bin/tsc --noEmit` comprueba tipos.
- `node --test tests/*.test.mjs` ejecuta las 92 pruebas de permisos, persistencia, concurrencia, corrección, privacidad, recuperación y utilidades móviles.
- El test de integración `tests/api.integration.mjs` solo admite una base de datos local en loopback, usa `ARP_TEST_PIN` en el entorno del proceso y limpia sus registros `qa-*`. No lo dirijas a producción.

La publicación utiliza `.openai/hosting.json`, migraciones versionadas, el secreto en Sites y el flujo oficial de empaquetado. Los archivos `.dev.vars`, `.wrangler`, `node_modules` y los resultados de compilación quedan fuera del repositorio.

## Alcance

Incluye preparación, desarrollo y cierre de sesiones, mapa editable, diario, biblioteca, banco, entregas y revisión, evidencias y calendario. No integra Google Calendar, servicios externos de notas, pagos, IA ni envío de mensajes. El calendario tiene vista mensual y agenda propia. No se añaden porcentajes de dominio sin fundamento ni comparaciones entre alumnas.

El diseño contempla foco visible, áreas interactivas amplias, contraste, teclado, modales accesibles y movimiento reducido. La validación realizada no equivale a una auditoría formal completa de WCAG 2.1 AA.

La revisión de distribución, ventanas, exámenes y teclado en tamaños de móvil, tableta y PC está documentada en `docs/validacion-responsive.md`. En móvil la ruta «Mi academia · página» ocupa su propia fila. Las ventanas se montan fuera de las páginas animadas y conservan desplazamiento y foco dentro del viewport.

La barra superior permanece visible al desplazarse en móvil y tableta: hasta 900 px, en teléfonos horizontales de poca altura y en dispositivos de puntero táctil, también iPad ancho. El botón «Volver arriba» aparece tras bajar más de 320 px y devuelve el foco al contenido antes de subir. La altura real de la cabecera determina la separación de anclas y de la ayuda. El aviso visible de inicio del seguimiento se retiró; la fecha que aplica la lógica de sesiones sigue siendo el 16 de noviembre. Las opciones de examen se adaptan a la alumna: Rocío tiene Conocimiento del Medio y Alejandra Física y química; los cambios de opciones no reescriben exámenes guardados.

La adaptación móvil utiliza áreas seguras, viewport visual para los formularios, campos de al menos 16 px y controles de signo negativo y fracción junto a las respuestas matemáticas. No se desactiva el zoom. Al recuperar conexión o volver a la página se comprueban el perfil y la versión del servidor antes de reanudar el guardado. Dudas y palabras pendientes tienen recuperación local explícita por alumna; el cierre docente conserva también la valoración y su fecha en la misma pestaña.

Las fotos JPEG y las HEIC/HEIF que el navegador pueda decodificar se preparan como JPEG con un lado máximo de 2560 px, sin ampliar originales pequeños. Se aceptan originales de preparación de hasta 20 MiB; el archivo enviado debe caber en 8 MiB. Si no hay decodificador HEIC, se puede conservar el original dentro de ese límite para descargarlo, sin prometer previsualización. El servidor valida el contenido real del archivo y evita duplicados al reintentar una misma subida. La matriz de validación y los límites de las pruebas de Safari, cámara y teclado nativos están en `docs/validacion-responsive.md`.

El cambio de perfil está disponible en el menú lateral y en el desplegable del avatar superior. La ayuda del menú se muestra una vez por perfil y navegador, se cierra automáticamente tras unos 12 segundos (se pausa al leerla con el puntero o el teclado), puede cerrarse manualmente y puede volver a abrirse desde el avatar. Las transiciones respetan la preferencia de movimiento reducido.
