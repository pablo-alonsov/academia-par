# Academia PAR

Academia para las clases individuales de Rocío (6.º Primaria) y Alejandra (2.º ESO). React 19, TypeScript y rutas de servidor compatibles con Next.js mediante Vinext; Tailwind/CSS con temas accesibles. Cloudflare D1 conserva los registros y R2 los archivos. Sites aloja la aplicación con acceso directo por enlace.

## Acceso

Enlace publicado: https://academia-par.movingflair1.chatgpt.site. El enlace anterior redirige al actual. Se conserva el mismo proyecto con sus datos D1 y archivos R2; las sesiones y preferencias locales pertenecen a cada origen, así que hay que volver a elegir perfil al usar la dirección nueva. Las copias de trabajo que solo existan sin sincronizar en el almacenamiento del enlace anterior no se trasladan automáticamente.

Las alumnas abren el enlace y eligen su perfil sin contraseña y sin iniciar sesión en ChatGPT, por petición expresa. El servidor limita cada sesión a los datos del perfil elegido, pero cualquier persona con el enlace puede elegir o cambiar entre ambos perfiles: el selector no identifica personalmente a la alumna. El panel docente requiere su contraseña; el servidor guarda solamente su hash, aplica límites a intentos y usa una cookie HttpOnly.

Las nuevas entradas duran 24 horas desde la selección del perfil. El plazo es absoluto: recargar, practicar o volver a la pestaña no lo renueva. Al caducar, la aplicación vuelve al selector y exige elegir de nuevo; el panel docente conserva su contraseña. Los borradores se mantienen en su perfil y dispositivo. Las sesiones emitidas antes del cambio conservan su fecha de caducidad original hasta la siguiente entrada.

El acceso de Sites está configurado como público para permitir entrar directamente desde cualquier dispositivo. Las notas privadas y las funciones de gestión requieren la sesión docente validada en el servidor. Las sesiones de aplicación dependen de su token aleatorio y caducidad, no de una cuenta o cabecera de ChatGPT. Se solicita a los buscadores que no indexen la aplicación; esto no sustituye al control de permisos.

La contraseña docente inicial solicitada está configurada como secreto de alojamiento y en el archivo local ignorado `.dev.vars`. No forma parte del código cliente ni del repositorio. El nombre de la variable es `TEACHER_PIN_HASH` (PBKDF2 SHA-256, 100000 iteraciones, sal aleatoria).

## Uso

El menú de las alumnas es **Inicio · Mi camino · Practicar · Mis clases · Calendario**. Practicar reúne **Ejercicios** y **Recursos y materiales**; no hay una Biblioteca separada para las alumnas. El panel docente conserva **Biblioteca** para gestionar los recursos, junto a Hoy y esta semana, Alumnas, Banco de actividades y Calendario.

1. Entra en **Mi panel docente**. Abre **Alumnas** para ajustar las prioridades y el mapa de habilidades.
2. En **Banco de actividades**, revisa el material planificado, adáptalo y asígnalo como actividad de clase, casa u opcional. En la ficha puedes destacar una actividad asignada en el inicio.
3. **Preparar clase** crea una sesión con la fecha que elijas, sin inventar horas. La pantalla de sesión recupera el siguiente paso, guarda cambios, distingue notas privadas y material compartido y permite cambiar los tiempos.
4. Al cerrar, revisa la vista previa para la alumna. Un único cierre guarda el diario y el siguiente paso. Solo una valoración explícita añade una comprobación al aprendizaje.
5. Revisa las entregas desde la semana. Las fracciones se comparan por equivalencia exacta; las respuestas abiertas esperan revisión. Las pistas y autoevaluaciones se guardan por separado del resultado.
6. En **Calendario**, cada alumna puede añadir, editar y eliminar sus propios exámenes y temas; el docente puede gestionar los de ambas. **Preparar repaso** crea una sesión vinculada al examen con una fecha elegida expresamente.

El seguimiento comienza el lunes 16 de noviembre de 2026. Antes de esa fecha, el panel abre en la semana del 16 al 19; las nuevas sesiones tienen fecha del 16 o posterior. Las estadísticas y el diario de seguimiento cuentan desde el inicio acordado; cualquier registro histórico anterior se conserva y se puede consultar desde la ficha docente. No se generan sesiones de forma automática.

El banco inicial contiene 119 actividades, 30 habilidades y 21 recursos, todos planificados. Rocío trabaja potencias y raíces básicas, potencias de 10, acentuación, ortografía e inglés global; Tecnología queda reservada para el segundo trimestre. Alejandra trabaja fracciones, porcentajes, potencias, densidad, concentración, estructura atómica, sintaxis e inglés global. El plan de temas se puede ajustar en la ficha docente.

**Practicar** muestra al principio **Lo que tienes asignado** cuando hay tareas docentes pendientes, incluidas las actividades externas asignadas. La tarea conserva su categoría, su fecha si existe y su actividad concreta. Una asignación sigue pendiente hasta recibir una entrega vinculada a esa misma asignación: entregar otra actividad o un encargo anterior del recurso no la completa. Las tareas que el docente marque Opcionales conservan esa etiqueta; los registros opcionales automáticos de la práctica libre no se convierten en tareas docentes. Al entregar, la tarea sale del bloque pendiente y su trabajo permanece en el historial, sin cambiar por sí solo el aprendizaje.

Después aparece **Más para practicar**, con el resto de ejercicios y recursos disponibles. Si no hay tareas pendientes, se mantiene la vista habitual sin un bloque vacío de asignaciones. Practicar tiene dos accesos de contenido: **Ejercicios** y **Recursos y materiales**. Ejercicios muestra primero las actividades propias, con filtros por asignatura, tema, búsqueda y acompañamiento. Se pueden abrir sin asignación previa; entregar una respuesta crea su registro opcional y conserva las ayudas y la autoevaluación. Las tareas asignadas mantienen sus categorías. Recursos y materiales conserva los enlaces y archivos seleccionados, los favoritos, los borradores y los historiales que antes se consultaban en Biblioteca. En ordenador se amplía la letra de la navegación y del perfil, manteniendo el menú móvil.

El acompañamiento para realizar una tarea se indica por separado de su destino: **Puedes hacerla sola** (`independent`), **Con docente** (`teacher`) o **Por confirmar** (`unspecified`). Una respuesta abierta puede hacerse sola y esperar revisión posterior. Dictados con guion privado, escuchas leídas por el profesor y conversaciones por turnos se identifican cuando necesitan docente. Los contenidos personalizados sin modo confirmado no se presuponen autónomos. El docente puede editar el modo en actividades y recursos; asignar para casa una actividad con docente muestra un aviso y permite continuar tras revisar sus materiales y acompañamiento.

Los recursos nuevos son páginas concretas, fichas y simulaciones con una consigna, duración y nivel. Véanse `docs/recursos-rocio.md`, `docs/recursos-alejandra.md` y el catálogo base `docs/recursos.md`. Densidad y Construye un átomo de PhET se ejecutaron; donde el audio o un juego no se ha ejecutado, queda anotado. Las webs externas no transmiten resultados a esta aplicación.

## Fichas PDF · v18 pendiente de importación en producción

Se prevé incorporar las dos fichas completas aportadas por el usuario, `Alejandra_Ficha_12_Noviembre.pdf` y `Rocio_Ficha_12_Noviembre.pdf`, como dos recursos propios con dos actividades reutilizables de tipo En papel vinculadas. Cada ficha tiene dos páginas y no contiene un solucionario privado. El archivo se mantiene completo y sin modificar, accesible desde el perfil correspondiente y el panel docente mediante las rutas autenticadas de materiales. Esta incorporación no crea asignaciones, sesiones, respuestas ni comprobaciones de aprendizaje; la fecha impresa identifica el material y no acredita una clase registrada.

En **Practicar → Recursos y materiales**, el filtro **Fichas PDF** permite localizar estos materiales. La ficha puede abrirse en una pestaña nueva para consultarla con el visor PDF disponible en el navegador o descargarse. El enlace solicita ajustar la página al ancho disponible; se ha comprobado en el visor integrado de Brave/Chromium y el comportamiento final depende del navegador. Para resolverla se utiliza el circuito existente de respuesta abierta o trabajo en papel: indicar el número del ejercicio y sus apartados, escribir el procedimiento o adjuntar una foto/PDF del cuaderno y entregar para revisión docente. No se añade un editor de PDF ni campos rellenables al original, y los ejercicios de estas fichas no se autocorrigen por importar el archivo.

En **Biblioteca**, un recurso PDF ofrece **Crear ejercicio**, que abre el formulario existente de actividad con los datos iniciales de la ficha sin guardarla automáticamente. Después de guardarla, **Asignar ficha** abre el diálogo de asignación existente. Guardar una actividad y asignarla son decisiones separadas. Las subidas mantienen el límite de 8 MB por archivo.

La validación local de v18 completó 160 de 160 pruebas automatizadas, TypeScript, comprobación de diferencias e integración de archivos con R2. Se comprobó la consulta de ambos originales sin modificarlos, la entrega pendiente de revisión y el recorrido docente de creación y asignación. La aplicación se revisó en anchos de 390, 768 y 1440 px, incluidos los botones y el espacio interior de los selectores. No acredita Safari nativo. Al terminar se retiraron los fixtures y se restauró la copia local inicial. La importación de los dos originales en producción y la publicación siguen pendientes de confirmación; los detalles y límites de la QA figuran en `docs/validacion-responsive.md`.

## Seguimiento y recuperación

Inicio distingue **Elegida para ti**, **Continuar trabajo** y **Ejercicio para empezar**. Prioriza la actividad seleccionada por el docente; si no existe, ofrece continuar un borrador y, después, un ejercicio opcional del banco marcado para hacer sola. En este último caso, la acción se llama **Empezar ejercicio** y la nota indica **Ejercicio opcional disponible.** Este ejercicio no crea una asignación, no acredita aprendizaje ni supone un diagnóstico automático. Cuando el trabajo ya está entregado, da acceso a consultarlo o revisar su devolución. Muestra una alternativa cuando corresponde y deja otros borradores en un apartado secundario.

Las referencias de última clase, comprobación y examen aparecen cuando existen registros reales. Si no los hay, Inicio lo explica en una única nota inicial y mantiene disponibles la práctica y guardar una pregunta. No rellena el espacio con fechas, clases o logros inventados.

Practicar conserva los intentos y permite repetir sin borrar entregas. Si un recurso de **Practicar → Recursos y materiales** tiene una actividad externa asociada, esa entrada y la de la actividad abren el mismo editor y muestran juntos los trabajos relacionados. Se conservan los identificadores de actividad, asignación y recurso, así como el contexto de la tarea elegida; una entrega no completa automáticamente otra asignación o adaptación del mismo recurso. Al volver, se mantiene la sección de origen, sus filtros y el foco en la tarjeta correspondiente. Los recursos que no se abran mediante una actividad asociada conservan su editor propio. Abrir una web no registra aciertos externos. Las dudas respondidas siguen disponibles.

Los borradores anteriores de la antigua Biblioteca de alumnas o de otras actividades del recurso se ofrecen como **Copias conservadas**, con recuperación explícita. No sustituyen silenciosamente al borrador actual ni se entregan por abrir el recurso. Esta unificación organiza la navegación y la consulta del historial sin una migración destructiva: conserva las respuestas y los borradores anteriores, separados por alumna. La forma de trabajo de una actividad externa asociada se edita en el Banco de actividades; no se propaga automáticamente a otras adaptaciones del recurso.

Guardar un borrador y entregar son operaciones distintas. La aplicación indica si está pendiente, guardando, guardada en el servidor o conservada solamente en el dispositivo. Las entregas tienen identificador de intento para evitar duplicados al reintentar; no eliminan una versión de borrador diferente creada desde otra pestaña. Cuando caduca el acceso, se vuelve al selector y las copias locales se conservan para recuperarlas después de elegir de nuevo el perfil. Una petición antigua no se reenvía con otro perfil.

Rocío dispone de una colección editable de palabras, con original, corrección, explicación, frase y fecha de revisión. Alejandra puede añadir datos, qué busca, cálculo y respuesta con unidades junto al resultado. Las preferencias de avatar y color y los recursos favoritos pertenecen a cada alumna. El docente puede fijar hasta tres recursos y destacar una actividad principal y una alternativa.

Desde **Inicio → Personalizar presentación**, o desde el desplegable del avatar superior, cada alumna puede elegir entre 16 colores y 28 avatares de iconos o iniciales. El acceso del desplegable conserva el trabajo pendiente y abre directamente las opciones en Inicio. Puede seleccionar una foto, revisar su vista previa y guardarla expresamente. La foto se recorta al centro, se prepara como JPEG cuadrado de hasta 512 px y se recodifica sin copiar los metadatos del original. Admite JPG, PNG, WebP y HEIC/HEIF cuando el navegador pueda decodificarlos; si no, solicita JPG o PNG. Se puede volver a un icono, reutilizar la foto guardada o quitar su referencia.

La foto activa aparece también en el selector sin iniciar sesión, igual que el nombre y el avatar del perfil. Solo la foto activa tiene esta ruta pública; requiere que el archivo sea de tipo avatar, pertenezca a esa alumna y coincida con la versión vigente. Al quitarla o elegir un icono, la ruta deja de servirla. Los archivos de clase y notas docentes conservan sus controles de acceso y no se pueden convertir en fotos de perfil. Las fotos se almacenan en R2 con un propósito separado y no aparecen como materiales académicos. Cambiar o retirar la foto no borra físicamente objetos anteriores ni modifica el historial de aprendizaje.

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
- `node --test tests/*.test.mjs` ejecuta la batería de permisos, persistencia, concurrencia, corrección, privacidad, recuperación, personalización y utilidades móviles. La validación local de v18 completó 160 de 160 pruebas, TypeScript y comprobación de diferencias sin incidencias. Los resultados visuales y de integración se conservan por revisión en `docs/validacion-responsive.md`; no implican que la publicación o la importación en producción hayan terminado.
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


## Avisos por correo

La conexión con Resend está preparada para notificar al docente las acciones confirmadas de Rocío y Alejandra, con el nombre visible academia PAR. El panel Hoy y esta semana muestra el estado real y los últimos avisos. Sin RESEND_API_KEY y NOTIFICATION_FROM no se envían correos. La activación, el alcance, los límites de reintento y la validación se detallan en [docs/avisos-correo.md](docs/avisos-correo.md). El destinatario y las credenciales no se exponen en los datos de las alumnas.
