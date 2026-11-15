# Revisión de interfaz · 11 de noviembre de 2026

Revisión realizada en Brave mediante tamaños de viewport representativos. Se comprobaron los dos perfiles de alumna y el panel docente. Las medidas siguientes son píxeles CSS; no son pruebas sobre dispositivos físicos ni una certificación completa de WCAG.

| Formato | Tamaños utilizados |
| --- | --- |
| Móvil estrecho | 320 × 568 |
| Móvil vertical | 390 × 844 |
| Altura reducida al escribir | 390 × 500 |
| Móvil horizontal | 844 × 390 |
| Tableta vertical | 768 × 1024 |
| Tableta horizontal / portátil | 1024 × 768 |
| PC | 1440 × 900 |

## Correcciones

- Ruta de navegación móvil de 14 px, en una segunda fila de la cabecera para conservar el espacio de los controles.
- Ventanas compartidas y recursos de Biblioteca mediante portales al `body`. La animación de las páginas termina sin una transformación persistente: antes esa transformación convertía la página en el marco del formulario de exámenes.
- Cabecera de ventana accesible, contenido desplazable, límites ligados al viewport visual y áreas seguras. El formulario de exámenes mantiene sus acciones disponibles y usa una columna en móvil.
- Campos de fecha y columnas con mínimos flexibles; tipografía de entrada de 16 px en móvil, ajuste de textos largos y bordes de campos con mayor contraste.
- Panel docente con distribución adaptable, filtros flexibles y acciones de al menos 44 px. Se corrigió la especificidad que mantenía «Semana/Todas» en 36 px.
- El mes conserva celdas de al menos 44 px dentro de una región horizontal cuando falta espacio; el documento completo no se ensancha. Se ofrece también la vista Agenda.
- Menú lateral desplazable con poca altura, fondo inerte y trampa de foco. Ventanas, menús de perfil y vistas de detalle restauran el foco a su origen; la pantalla de sesión enfoca su título al entrar.
- Contraste de textos y estados de las vistas de alumna revisado en ambos temas; se oscureció el bloque principal y se ajustaron etiquetas. La preferencia de movimiento reducido conserva la regla global que desactiva animaciones y transiciones.

## Recorridos comprobados

La cobertura combinada de los tamaños anteriores incluye selector de perfiles, Inicio, Mi camino, Practicar y sus filtros, actividad numérica, pistas, autoevaluación, Mis clases y detalle de sesión, Biblioteca y ventana de recurso, Calendario y examen. En el panel docente se revisaron semana, alumnas, ficha y habilidades, banco, creación de actividad, recursos, preparación de clase, pantalla de sesión, cierre y pendientes.

Comprobaciones específicas:

- Sin desplazamiento horizontal del documento en las vistas revisadas. La región mensual estrecha sí se desplaza deliberadamente; se comprobó también su desplazamiento con teclado.
- Campos etiquetados, controles alcanzables con teclado, foco visible, Tab y Mayús+Tab dentro de ventanas, Escape y retorno al control de origen.
- Menú lateral a 844 × 390: el último control se alcanza desplazando el menú; el foco permanece dentro y vuelve al botón de apertura al salir.
- Perfil: apertura y recorrido con flechas, cierre con Escape y recuperación del foco.
- Examen en 320 × 568, 390 × 844, 390 × 500, 768 × 1024, 844 × 390 y 1440 × 900: campos contenidos, ventana dentro del viewport, desplazamiento completo y acciones accesibles. Se escribió un borrador sin guardarlo para comprobar el espacio al editar.
- Contraste calculado de textos sobre fondos sólidos, una vez asentadas las transiciones, en ambos temas; los gradientes se revisaron por separado. Las observaciones tomadas durante entradas y salidas animadas no se interpretan como contraste en reposo.
- Sesión temporal exclusivamente local: abrir, empezar, editar, guardar, cerrar sin marcar una habilidad como comprobada y consultar el resumen desde Rocío. El diario compartido se revisó a 320, 768 y 1440 px y no contenía las notas ni la observación privadas de la prueba.

## Comprobaciones técnicas

- TypeScript sin errores.
- 28 pruebas existentes de autenticación, autorización, calendario, actualización de contenidos, fecha de inicio, corrección matemática y privacidad.
- Integración local de preparación y cierre, cierre repetido sin duplicar la comprobación, fracciones equivalentes, entrega y revisión, persistencia, aislamiento de exámenes y archivos R2.
- Material temporal local identificado como `qa-responsive-session`, retirado al terminar y con restauración de los datos anteriores. Las comprobaciones de interfaz no crean clases ni resultados de demostración en producción.

Los estilos nuevos de ventanas y panel docente están separados en `app/components/dialog.css` y `app/components/teacher.css`. No se modificaron el currículo, el inicio del seguimiento ni el sistema de acceso.

## Navegación y materias · 12 de noviembre de 2026

- Cabecera fija comprobada al desplazarse a 320 y 390 px (104 px de altura) y a 768 px (75 px). Sin ensanchar el documento; PC mantiene su distribución habitual.
- Apertura del perfil por pulsación real mientras la página estaba a 1458 px y cierre con Escape: se conserva la misma posición. Los movimientos de foco usan `preventScroll`.
- «Volver arriba», de 44 × 44 px, devuelve el scroll a cero y el foco al contenido; comprobado en móvil y PC. Se oculta con el menú móvil y queda inerte al abrir una ventana modal.
- Aviso de inicio del seguimiento retirado de las vistas; permanece la lógica de fecha inicial acordada.
- Materias de examen comprobadas en los perfiles de Rocío y Alejandra y en el formulario docente: Conocimiento del Medio solo para Rocío; Física y química para Alejandra. Cambiar la alumna vacía una materia incompatible en el borrador. Se cancelaron todos los formularios de esta revisión, sin escribir exámenes.
- TypeScript, 28 pruebas existentes y comprobaciones de normalización y deduplicación de materias correctos.


## Borradores, feedback y seguimiento · 12 de noviembre de 2026

Validación en navegador con tamaños emulados; no son pruebas en dispositivos físicos ni una certificación formal de WCAG.

- Rocío: Inicio, Mi camino, Practicar, Mis clases, Biblioteca y Calendario a 320×568, 390×844, 768×1024, 1024×768 y 1440×900, sin desbordamiento horizontal.
- Alejandra: las seis vistas a 320×568, 768×1024 y 1440×900, con un encabezado principal por vista y sin desbordamiento horizontal.
- Docente: las cinco vistas a 320×568, 768×1024 y 1440×900, sin desbordamiento horizontal. Banco y biblioteca muestran doce tarjetas, permiten ampliar a veinticuatro, buscar y limpiar filtros.
- Exámenes: formulario a 320 y 390 px, campos a 16 px y ventana con desplazamiento interno. Navegación mensual con flechas: un único día en la secuencia de Tab. Agenda inicial en móvil, con preferencia por perfil.
- Cabecera móvil a scroll 1563 px: permanece en la parte superior; abrir el perfil y cerrar con Escape conserva la posición. Volver arriba devuelve el scroll a cero y el foco a main.
- Contrastes medidos: texto secundario 6,18:1 en claro y 8,46:1 en oscuro; límites de controles 3,56:1 y 4,90:1 respectivamente. Se mantienen foco visible y reglas de movimiento reducido.
- Borrador de fracciones: respuesta equivalente 6/8, procedimiento, comentario, autoevaluación y dos pistas conservados al salir y recargar; acceso Continuar desde Inicio. La última pista recibe foco aunque desaparezca el botón. Entrega correcta por equivalencia y procedimiento pendiente de revisión, con historial completo; repetir conserva la actividad en el catálogo.
- Biblioteca: respuesta guardada, cierre, recarga y recuperación desde Inicio. Dos usos conservados de forma independiente, uno revisado y otro pendiente. Abrir la última revisión muestra el feedback anterior y su fecha.
- Dudas respondidas siguen disponibles y el indicador de respuesta nueva se elimina al consultarla. La última comprobación con ayuda muestra fecha y evidencia, sin notas privadas.
- Colección de palabras: original, tilde, regla y frase conservados tras recargar. Color y avatar actualizados también en el selector de perfiles.
- Docente: preparar, guardar y abrir, caducidad del acceso y recuperación con el editor abierto; cierre único actualiza diario y siguiente paso sin crear comprobación implícita. La vista previa excluye notas privadas.
- Error docente: estado No se ha guardado, salida al selector, nuevo acceso y recuperación explícita de notas locales; guardado posterior confirmado. La copia local docente usa sessionStorage y no promete sobrevivir al cierre de la pestaña.
- Revisión docente de un resultado con procedimiento: feedback visible en la alumna y estado revisado independiente de la corrección automática. Al desaparecer el botón que abrió una ventana, el foco vuelve a main.
- Asignación destacada desde el banco comprobada de principio a fin: categoría Para hacer en clase y actividad principal en Inicio.

Todos los registros de interfaz se identificaron como QA y se crearon únicamente en la base local. Las integraciones de API y archivos solo admiten loopback. La base local se restaura desde su copia previa al terminar; no se generan clases, respuestas ni logros de prueba en producción.

Comprobación final: TypeScript y 62 pruebas automatizadas correctos; integraciones locales de API y R2 correctas. Restauración local verificada: 0 sesiones, entregas, comprobaciones, borradores o palabras de prueba, conservando 2 alumnas, 30 habilidades, 119 actividades y 21 recursos.

## Compatibilidad de teléfonos e iPad · 12 de noviembre de 2026

Referencia solicitada: iPhone 12 como modelo de iPhone más antiguo previsto, Android sin modelo concreto e iPad. La comprobación se ha realizado en Brave/Chromium mediante viewport emulado. No se dispone en este entorno de Safari/WebKit ni de dispositivos físicos. Las medidas son píxeles CSS y no simulan por sí solas el sistema operativo.

| Recorrido | Viewports revisados |
| --- | --- |
| Alejandra, seis secciones, primero teléfonos (42 comprobaciones) | 320×568, 360×800, 390×844, 412×915, 430×932, 844×390, 956×440 |
| Alejandra, seis secciones, después iPad y vista dividida (48 comprobaciones) | 768×1024, 1024×768, 820×1180, 1180×820, 1024×1366, 1366×1024, 507×834, 375×1024 |
| Docente, cinco secciones en tableta (15 comprobaciones) | 768×1024, 1194×834, 507×834 |
| Docente, cinco secciones en PC (10 comprobaciones) | 1440×900, 1920×1080 |

No se detectó desbordamiento horizontal del documento en estas vistas ni campos visibles por debajo de 16 px. La región mensual del calendario mantiene su desplazamiento interno deliberado. La revisión anterior de Rocío y de ambos temas sigue documentada arriba.

Cambios y recorridos específicos:

- Meta viewport con `viewport-fit=cover`, áreas seguras y `interactive-widget=resizes-content` donde el navegador lo admite. Zoom disponible. La cabecera también se fija en iPad táctil ancho y el menú se adapta a teléfonos horizontales de hasta 1200 px y poca altura.
- Ventanas ligadas a `VisualViewport`, con ajuste del desplazamiento interno al campo enfocado. Formulario de examen revisado además a 390×320 como aproximación de poca altura disponible: dentro del viewport, sin ensanchar el documento. No equivale a abrir un teclado de iOS.
- Bloqueo de desplazamiento compartido entre menú y ventanas apiladas para conservar la posición de la página. Prefijo WebKit para el desenfoque y tamaños alternativos cuando no se admite `dvh`.
- Respuesta de fracciones con botones «−» y «/»: inserción en el cursor, foco conservado, guardado, salida, recarga y recuperación. Entrega equivalente correcta y procedimiento pendiente de revisión; no se modifica automáticamente una habilidad.
- Una pestaña antigua de Alejandra intenta guardar después de seleccionar Rocío en otra pestaña: recibe 409, se muestra el selector y no escribe en Rocío. Al volver a Alejandra, se conservan ambas versiones y se elige expresamente la que se guarda.
- Salir a otra página y volver mediante el historial conserva el editor y permite guardar. No se afirma haber reproducido la suspensión de una aplicación por Android/iOS: el navegador de automatización mantuvo ambas pestañas con visibilidad `visible`.
- Palabra original y corregida con autocorrección, mayúsculas automáticas y corrector desactivados. Recarga, recuperación explícita del formulario y guardado con fecha de revisión 20/11/2026 comprobados en Rocío.
- Acceso local de Rocío caducado durante una edición: «Continuar y guardar» recupera el acceso, guarda una sola palabra editada y conserva frase y fecha. Menú docente abierto y cerrado al bajar por el banco: se libera el bloqueo de página; «Volver arriba» devuelve el foco a `main` y el scroll a cero.
- Valoración docente pendiente recuperada tras guardar notas, salir y recargar en la misma pestaña. Se conservan habilidad, estado, evidencia y fecha. Un problema detectado con eventos del campo de fecha se corrigió mediante el componente compartido `DateInput`; la fecha se verificó también en D1 después de recuperar y cerrar. Cierre único confirmado como realizado.
- Pruebas automatizadas y de API: 92 correctas y TypeScript sin errores. Incluyen versiones de sesión estrictamente crecientes, conflictos entre dispositivos, peticiones con perfil esperado, reintentos idempotentes de dudas y subidas, firmas y MIME de archivos, dimensiones de fotos y geometría del viewport. Cuatro pruebas de carreras verifican que una lectura completa lenta no reemplace una entrega reciente ni recupere el perfil anterior, también entre continuaciones de promesas. Integraciones locales de API y R2 correctas.

Límites de validación: quedan sin verificar sobre hardware real Safari de iPhone/iPad, sus selectores de fecha, teclados, cámara, suspensión del sistema y decodificación HEIC. La subida desde el selector de archivos del navegador de automatización no pudo completarse porque la extensión no tiene acceso a URLs de archivo; no se ampliaron sus permisos. La validación de formato, persistencia, descarga y permisos sí se ejecutó en la integración local de R2. El procesamiento de fotos se comprobó con pruebas de tamaños y nombres, sin atribuirle una prueba real de cámara o conversión HEIC.

Referencias primarias utilizadas para la adaptación: [viewport y teclado en Chrome](https://developer.chrome.com/blog/viewport-resize-behavior/), [áreas seguras en WebKit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/), [HEIC y canvas en Safari 17](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/), [teclado según inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode) y [limitaciones del MIME de Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob/type). El código detecta capacidades; no presupone que todos los Android o todas las versiones de iOS se comporten igual.

Limpieza final: servidor local detenido y copia exacta inicial restaurada. Verificado: 2 alumnas, 30 habilidades, 119 actividades y 21 recursos; cero sesiones, respuestas, observaciones, exámenes, archivos, borradores o palabras de QA. Los registros de producción no se usan como fixtures de prueba.

## Colores, avatares y foto opcional · 12 de noviembre de 2026

- Catálogo compartido entre servidor y cliente: 16 colores y 28 avatares de iniciales/iconos. Ocho opciones iniciales y botón para mostrar todas; el icono elegido sigue visible al contraer la lista. El color y el icono se mantienen al recargar. Las fotos aparecen en el inicio, la cabecera, el selector de perfiles y las tarjetas docentes.
- Personalización desplegada con todos los iconos a 320×568, 390×844, 844×390, 768×1024, 1024×768 y 1440×900: sin desbordamiento del documento y todos los botones del panel con al menos 44×44 px. Temas claro y oscuro revisados. Contraste del blanco sobre los 16 colores entre 5,36:1 y 10,44:1; del color sobre su fondo suave entre 4,75:1 y 8,94:1.
- Imagen sintética JPEG de 4032×3024: recorte y conversión en el navegador, vista previa circular de 512×512 y cancelación sin subir. Guardar, recargar, cambiar de perfil, ver foto en el selector sin acceso, volver a entrar, elegir icono, reutilizar foto y quitarla comprobados de principio a fin. La presentación de Alejandra permanece independiente.
- El selector de archivos automatizado no está disponible porque la extensión de Brave no tiene acceso a URLs de archivo; no se ampliaron sus permisos. Para comprobar el resto del recorrido se utilizó un botón temporal exclusivo del desarrollo local que suministraba esa imagen sintética al mismo manejador de selección. Se retiraron el botón y la imagen pública antes de compilar. No se afirma haber probado cámara ni selección nativa de fotos en Safari/iOS.
- Subida y enlace al perfil atómicos; reintentos de una foto ya retirada o reemplazada devuelven conflicto sin reactivarla. Las actualizaciones de color/favoritos y los cambios docentes solo actualizan los campos enviados, conservando una foto guardada simultáneamente. Versiones de estudiante monotónicas para ordenar los patches.
- Ruta pública limitada a la foto activa de Rocío o Alejandra, con versión exacta, propósito avatar, propietario, tamaño y tipo verificados. Los archivos de clase no se pueden publicar por esa ruta y las fotos no se pueden adjuntar como evidencias o recursos. Retirar la foto o elegir icono deja su URL pública sin acceso; el objeto anterior se conserva fuera de los materiales académicos.
- 104 pruebas automáticas y TypeScript correctos. Integración HTTP/R2 local de foto, persistencia, versiones, reintentos, permisos y retirada correcta. Los fixtures locales de integración restauran el perfil original y limpian sus propios archivos y tokens; los datos publicados se comprueban solo mediante lecturas.
- Limpieza final de esta revisión: retirado únicamente el objeto R2 de la foto sintética de interfaz y restaurada la copia exacta inicial de D1. Cero archivos, sesiones, entregas o comprobaciones de QA; se conservan las 2 alumnas, 30 habilidades, 119 actividades y 21 recursos locales.

## Marca Academia PAR · 13 de noviembre de 2026

- Nombre actualizado en selector, título principal, barra lateral, pie de página, título del navegador, metadatos de Sites y documentación. El monograma «a» sigue representando «academia».
- Selector revisado a 390×844, 768×1024 y 1440×900: nombre correcto y sin desbordamiento. Comprobados también barra lateral y pie desde el perfil de Rocío.
- Se conservan el enlace publicado, los identificadores de datos, la cookie, las claves locales y las cabeceras internas para mantener accesos, preferencias y borradores existentes. Esos identificadores técnicos no forman parte de la marca que muestra la interfaz.
- TypeScript y las 104 pruebas existentes correctos. Esta revisión no introduce datos de demostración, asignaciones, clases ni resultados en producción; las comprobaciones del estado actual son de lectura.

## Acceso a personalización desde el perfil · 13 de noviembre de 2026

- Retirada la etiqueta «Acceso por perfil» de la cabecera de las alumnas; el panel docente conserva su indicación «Panel protegido».
- Nueva opción «Personalizar presentación» en el menú del avatar de ambas alumnas. Abre el panel de Inicio, lo desplaza a la vista y enfoca su resumen. Se conserva el acceso que ya existía en Inicio.
- Comprobado desde Inicio, Calendario y un ejercicio en Practicar, también desde un borrador abierto dentro de Inicio. Una respuesta local pendiente se guarda antes de navegar y se recupera con su contenido intacto; no se entrega ni se crea una valoración.
- Móvil 390×844, tableta 768×1024 y PC 1440×900: opción accesible, panel abierto, foco correcto y sin desbordamiento. Apertura mediante ArrowDown y Enter comprobada. Las solicitudes se consumen una vez y se cancelan si cambia la navegación o el perfil.
- TypeScript correcto. El único borrador usado para esta comprobación pertenece a la base local; se restaura su copia previa antes de publicar.


## Inicio, acompañamiento e historial de recursos · 13 de noviembre de 2026

Alcance actualizado de la ampliación. La ejecución local del 13/11/2026 completó **147 de 147 pruebas automatizadas** y `npx tsc --noEmit` sin errores. La integración local ampliada de API y la revisión visual final también terminaron correctamente. La publicación sigue en curso: estos resultados no afirman todavía que la versión esté desplegada. Los recuentos de las secciones anteriores corresponden a sus versiones y fechas y no se suman al actual.

- Inicio diferencia la selección docente, la continuación de un borrador y una propuesta opcional autónoma del banco. La propuesta no crea una asignación ni atribuye aprendizaje o un diagnóstico. Los trabajos ya entregados dan acceso a consultarlos y a su revisión, conservando los intentos.
- La última clase, la última comprobación y el próximo examen se muestran solo cuando existen datos reales. Sin esos registros, una nota inicial explica el estado y permanecen las acciones de práctica y de guardar una pregunta. No se añaden historiales ni avances ficticios para presentar la aplicación.
- Actividades y recursos incluyen `supportMode`: **Puedes hacerla sola**, **Con docente** o **Por confirmar**. Es independiente de Para hacer en clase, Para casa y Opcionales, y también de la revisión docente posterior. Los registros personalizados sin modo confirmado quedan Por confirmar. El banco docente permite filtrar y editar el modo; enviar para casa una tarea con docente muestra un aviso sin bloquear la decisión.
- Un recurso con actividad externa asociada abre el mismo editor de actividad desde Practicar y Biblioteca. Se consulta conjuntamente el historial relacionado por sus identificadores, manteniendo la actividad y asignación de cada entrega. Compartir recurso no marca como realizada otra tarea o adaptación. Se conserva la sección de origen, los filtros y el retorno del foco; un recurso sin actividad externa asociada mantiene su editor propio.
- Las copias antiguas de borradores de Biblioteca o de otras actividades del mismo recurso se muestran como recuperables. La elección es explícita y conserva la copia actual antes de cambiarla. No hay sustitución silenciosa, entrega automática ni migración destructiva de respuestas o borradores anteriores. Cada copia permanece vinculada a su alumna.
- El modo que utiliza la actividad externa asociada se ajusta en el Banco de actividades; el editor del recurso lo aclara cuando existe esa relación. Los cambios no se propagan automáticamente a otras adaptaciones y no cambian el estado de aprendizaje.

Recorridos finales comprobados en local:

- Inicio de ambas alumnas, incluida la situación inicial y los casos con actividad principal docente, alternativa explícita y devolución real del fixture local. Se revisaron 320, 390, 768, 1024 y 1440 px, en los temas claro y oscuro, sin desbordamiento horizontal del documento. El acceso a personalización desde el desplegable sigue disponible.
- Biblioteca → Practicar conserva la misma respuesta guardada en el editor de la actividad externa enlazada. Una entrega nueva se registra una sola vez y aparece en ambos historiales. Las respuestas y devoluciones anteriores conservan su contenido y contexto; una asignación nueva permanece Sin hacer aunque exista una entrega antigua del recurso, y se distingue el trabajo de otro encargo de la misma actividad.
- Recuperación explícita de un borrador anterior: se conservan ambas copias. Importar texto de otra actividad reinicia las pistas del destino y mantiene las originales en la copia de origen. Abrir la elección sin confirmarla y recargar no altera el valor del borrador actual.
- Edición docente del acompañamiento y aviso al asignar para casa una actividad con docente revisados a 390 y 1024 px. El aviso permite continuar y no cambia por sí solo la categoría ni el aprendizaje.

Al terminar se detuvo el servidor local y se restauró la copia exacta inicial de D1: 2 alumnas, 30 habilidades, 119 actividades y 21 recursos; cero sesiones, respuestas, archivos, exámenes o borradores de QA. Estos fixtures y resultados corresponden al entorno local. La publicación y su comprobación posterior siguen pendientes.

La validación visual de esta ampliación se limita al entorno local Brave/Chromium y a tamaños de viewport emulados. La emulación de un móvil o un iPad no demuestra compatibilidad nativa con Safari/WebKit, sus selectores, teclado, cámara ni suspensión del sistema. Esas comprobaciones sobre dispositivos físicos continúan pendientes. Las comprobaciones locales y sus fixtures no constituyen clases, resultados ni logros reales de las alumnas, y no deben publicarse como tales.


## Navegación de alumnas y etiquetas de Inicio · v16 · 13 de noviembre de 2026

La ejecución local final de v16 completó **147 de 147 pruebas automatizadas**, TypeScript sin errores y comprobación de diferencias sin incidencias. La QA visual de los recorridos siguientes ha terminado. Esta ejecución es independiente de la revisión anterior, aunque coincida el recuento de pruebas. La publicación sigue en curso: no se afirma todavía que v16 esté desplegada.

- Las alumnas tienen Inicio, Mi camino, Practicar, Mis clases y Calendario. Se retira su acceso separado a Biblioteca. Dentro de Practicar, los accesos superiores **Ejercicios** y **Recursos y materiales** reúnen ambos tipos de trabajo.
- El panel docente conserva Biblioteca para gestionar recursos; mantiene también Hoy y esta semana, Alumnas, Banco de actividades y Calendario. No se añade Practicar al menú docente.
- En Inicio, el ejercicio opcional del banco utiliza **Ejercicio para empezar**, la acción **Empezar ejercicio** y la nota **Ejercicio opcional disponible.** La actividad elegida por el docente y la continuación de trabajos guardados conservan su significado. El cambio de texto no crea una asignación ni un resultado de aprendizaje.
- La reorganización de recursos conserva favoritos, borradores, archivos y consulta de historiales. Se mantienen el editor común de las actividades externas enlazadas, el contexto de las asignaciones y la recuperación explícita de copias anteriores. No se migran destructivamente ni se borran entregas o borradores de la antigua Biblioteca de alumnas.

Recorridos locales comprobados:

- Inicio y menús de Rocío y Alejandra con los textos exactos **Ejercicio para empezar**, **Empezar ejercicio** y **Ejercicio opcional disponible.** El panel docente mantiene Biblioteca y no muestra Practicar.
- Practicar conserva filtros independientes entre Ejercicios y Recursos y materiales, favoritos y el borrador de un recurso sin actividad externa asociada. El recurso enlazado abre el editor de su actividad externa y conserva la respuesta guardada.
- En Recursos y materiales, entregar desde Borradores un recurso sin actividad externa asociada y cerrar mantiene el modo y los filtros, devuelve el foco a la tarjeta y la identifica como **Recurso consultado**.
- Distribución revisada a 390×844 en oscuro, 768×1024 en claro, 1440×900 y PC de 1536 px de ancho, sin desbordamiento horizontal del documento. Los botones del selector de contenido alcanzan 60 px en el móvil revisado.

Al finalizar se detuvo el servidor local y se restauró la copia exacta inicial: 2 alumnas, 30 habilidades, 119 actividades y 21 recursos; cero registros de QA, respuestas, borradores, archivos, sesiones o exámenes locales. La publicación y su comprobación posterior siguen en curso.

La validación visual se realizó en Brave/Chromium con viewport emulado. No constituye una prueba nativa de Safari, teclado, cámara ni suspensión de iOS/Android; esos límites se mantienen.


## Tareas asignadas al principio de Practicar · v17 · 13 de noviembre de 2026

La ejecución local final de v17 completó **156 de 156 pruebas automatizadas**, TypeScript y comprobación de diferencias sin errores. La QA de navegador descrita a continuación terminó correctamente. Los resultados de v16 se conservan como revisión anterior. La publicación sigue en curso; no se afirma todavía que v17 esté desplegada.

- Practicar prioriza **Lo que tienes asignado** cuando existen tareas docentes pendientes, incluidas las actividades externas asignadas. Debajo, **Más para practicar** mantiene el resto de ejercicios y recursos disponibles.
- La condición de pendiente corresponde a cada asignación concreta y a su entrega. Un trabajo anterior del recurso o de otra asignación de la misma actividad no completa el nuevo encargo. La entrega retira la tarea del bloque pendiente y conserva el historial; no acredita por sí sola aprendizaje ni revisión docente.
- Una asignación que el docente haya marcado Opcionales conserva su etiqueta. Los registros opcionales creados automáticamente por practicar libremente no aparecen como nuevas tareas docentes.
- Si no existen tareas pendientes, permanece la vista habitual de Ejercicios y Recursos y materiales, sin añadir un bloque vacío de asignaciones. Se conservan filtros, favoritos, borradores y acceso al trabajo anterior.

Recorridos comprobados exclusivamente en el entorno local de `127.0.0.1:5183`:

- Alejandra, sin asignaciones: se mantiene la vista habitual de v16 y no aparece un bloque vacío de tareas asignadas.
- Rocío, con cuatro tareas pendientes del fixture: dos encargos de matemáticas de la misma actividad, una actividad externa y una tarea explícitamente opcional del docente. Los registros opcionales automáticos y los encargos ya entregados quedan excluidos.
- Entregar el encargo A reduce las pendientes de cuatro a tres; B continúa pendiente y recibe el foco. Filtrar por Inglés o cambiar a Recursos y materiales conserva las tres tareas asignadas en la parte superior, antes del catálogo opcional.
- La última actividad externa permanece pendiente aunque haya un uso anterior del recurso. Entregarla reduce de una a cero las pendientes: desaparecen los encabezados del bloque asignado, vuelve la vista habitual de Practicar y el foco pasa a Ejercicios. El historial conserva los tres intentos de matemáticas del recorrido.
- Distribución comprobada en PC de 1536 px de ancho y 1440×900, móvil 390×844 en oscuro y tableta 768×1024 en claro: tareas asignadas primero, catálogo después y sin desbordamiento horizontal del documento.

Al terminar se detuvo el servidor local y se restauró la copia exacta inicial de D1: 2 alumnas, 30 habilidades, 119 actividades y 21 recursos; cero asignaciones, respuestas, exámenes, archivos, sesiones o borradores locales. Los fixtures no representan trabajos ni aprendizaje reales de las alumnas. La publicación y su comprobación posterior siguen en curso.

La QA visual se realizó mediante Brave/Chromium con viewport emulado. No acredita validación nativa de Safari, teclado, cámara ni suspensión de iOS/Android.


## Fichas PDF y espacio de la flecha en selectores · v18 · 13 de noviembre de 2026

La ejecución local de v18 completó **160 de 160 pruebas automatizadas**, TypeScript sin errores y comprobación de diferencias sin incidencias. La integración ampliada de archivos con R2 y los recorridos visuales siguientes han pasado. La importación de los dos originales en producción y la publicación siguen pendientes: no se afirma que v18 esté desplegada ni que las fichas estén ya importadas en producción. Las 156 pruebas y los recorridos anteriores se conservan como historial de v17.

- Ajuste global del espacio interior de los selectores para separar su flecha del borde derecho y del texto. Se comprobó un espacio final de 44 px y separación de 16 px para la flecha en los selectores nativos revisados de las alumnas y del formulario docente.
- Incorporación prevista de los originales completos `Alejandra_Ficha_12_Noviembre.pdf` y `Rocio_Ficha_12_Noviembre.pdf`: dos recursos propios y dos actividades reutilizables de tipo En papel enlazadas, cada uno con el perfil correspondiente. La inspección previa de las cuatro páginas no encontró solucionarios, notas docentes, calificaciones, adjuntos ni anotaciones privadas. No es necesario recortar o editar los PDFs.
- Consulta desde Practicar → Recursos y materiales, con el filtro Fichas PDF: abrir el PDF en una pestaña nueva y disponer de descarga, usando las rutas autenticadas de materiales. No se publica el archivo por la ruta pública de avatares ni se presupone que todo navegador tenga el mismo visor nativo. El enlace de apertura, tanto de alumna como docente, solicita `#view=FitH`; su ajuste inicial al ancho se comprobó visualmente en el visor integrado de Brave/Chromium a 768 px.
- Resolución mediante las respuestas y entregas existentes: identificar ejercicio y apartado, escribir respuesta/procedimiento o adjuntar foto o PDF del trabajo para revisión docente. No se incorpora un editor de PDF, no se transforman los originales en formularios rellenables y no se autocorrigen sus ejercicios al importar la ficha.
- Biblioteca docente: Crear ejercicio abre el formulario existente con los datos de la ficha; Asignar ficha utiliza el diálogo de asignación existente. La importación por sí sola no crea encargos, sesiones, respuestas ni resultados. El límite de subida permanece en 8 MB.

La integración ampliada de R2 comprobó el tipo MIME PDF y la conservación de los bytes de ambos originales. La descarga mantiene `attachment` por defecto y la visualización `inline` requiere petición explícita. La alumna propietaria y el docente obtuvieron acceso 200; el otro perfil recibió 403 y el acceso sin sesión, 401. Los archivos privados o retirados conservaron su protección.

Recorridos locales comprobados:

- Ambos PDFs originales se abrieron en el visor integrado de Brave y mostraron sus dos páginas, sin editar ni volver a generar los documentos.
- La aplicación se revisó con ambos perfiles a 390 px en oscuro, 768 px y 1440 px: sin desbordamiento horizontal del documento y con botones de materiales de al menos 44 px.
- Rocío guardó un borrador, lo reabrió y entregó una respuesta del fixture: quedó una entrega pendiente de revisión con el PDF conservado. No se generó autocorrección ni comprobación de dominio.
- En Biblioteca se creó un recurso PDF de prueba reutilizando el archivo. Crear ejercicio abrió el formulario sin escribir automáticamente; guardar una actividad En papel y Asignar ficha → Para casa hizo aparecer el encargo primero en las tareas pendientes de Rocío. Al abrirlo se conservaron su asignación actual y el acceso al PDF.

Estos recorridos y entregas son fixtures locales; no representan trabajos ni aprendizaje reales de las alumnas. La fecha del título de una ficha no crea una sesión ni atribuye contenido impartido o aprendido. La inspección y las pruebas usaron los originales completos, sin autoría ni modificación de PDF. El ajuste al ancho corresponde al enlace de apertura de la aplicación y a la vista del navegador; no modifica el PDF.

Al terminar se retiraron las referencias locales de prueba y los dos PDFs de R2 utilizados por los fixtures, se detuvo el servidor y se restauró la copia local inicial exacta: 2 alumnas, 30 habilidades, 119 actividades y 21 recursos; cero archivos, respuestas, asignaciones, sesiones, exámenes y borradores. Esta limpieza no equivale a importar los documentos en producción.

La QA visual se realizó en Brave/Chromium con viewport emulado y su visor PDF integrado. No equivale a validar Safari nativo, su visor PDF, teclado, cámara ni suspensión del sistema móvil.


## Menú de perfil y simplificación de la vista de alumna · 15 de noviembre de 2026

Se sustituyó el cierre por blur del desplegable superior por cierre con puntero exterior o foco que llegue a otro elemento. Un blur con destino nulo ya no desmonta el botón antes del click. La apertura con puntero no fuerza el foco, y la apertura con teclado enfoca el primer o último elemento; funciona también al pasar de puntero a teclado con el menú ya abierto. Escape restaura el foco y Tab permite salir. El cambio de perfil conserva la espera del guardado pendiente y la validación del servidor.

Inicio presenta una acción principal, la revisión nueva y el próximo examen real cuando existan. Alternativas, seguimiento y personalización siguen disponibles sin ocupar el primer plano. Practicar mantiene asignaciones pendientes primero, búsqueda visible y filtros plegables. Las tarjetas conservan estado de borrador/revisión y la necesidad de docente, sin repetir objetivos ni duraciones. La consigna y el material permanecen visibles en el ejercicio; detalles, explicación, comentario e historial se despliegan. Las pistas se revelan junto a la respuesta y conservan su registro y foco. No se cambian los datos pedagógicos, permisos ni payloads de entrega.

Verificación local: 160/160 pruebas automatizadas y TypeScript sin errores. Recorridos en el navegador integrado de ChatGPT, con anchos de 360, 390, 768 y 1440 px y temas claro/oscuro, sin desbordamiento horizontal tras terminar las transiciones. Se comprobó cambiar de perfil desde avatar y menú lateral; flechas/Home/End, Escape y salida con Tab; guardar una respuesta con una pista y autoevaluación, cambiar entre ambos perfiles, reabrir y entregar; resultado automático correcto con revisión pendiente; enlace al historial; revisión docente nueva visible; asignaciones antes del catálogo; filtros de asignatura y recursos. Los registros utilizados para estos recorridos son exclusivamente fixtures locales. La base local se restaura desde la copia previa al recorrido.

Límite de la verificación: los tamaños son emulados en Chromium. No se dispone aquí de Safari/Chrome en un iPhone físico, teclado virtual de iOS ni un iPad real; no se afirma certificación nativa de esos dispositivos. La corrección elimina la secuencia de cierre por pérdida de foco que encaja con el fallo comunicado.

Se renombró el mismo proyecto de Sites a https://academia-par.movingflair1.chatgpt.site. El enlace anterior devuelve una redirección 307 al nuevo y el nuevo responde 200 sin exigir ChatGPT. D1/R2 no se migran ni se sustituyen. Cookies y almacenamiento local dependen del origen: hay que volver a seleccionar perfil; las copias sin sincronizar que solo estén en el origen anterior no se trasladan automáticamente.


## Tipografía general en móvil y tableta · 15 de noviembre de 2026

La tipografía usa una escala común: +16 % hasta 600 px y +12 % hasta 1100 px, también en pantallas táctiles de hasta 1400 px para incluir tabletas grandes en horizontal. Los textos secundarios tienen un mínimo de 13 px en esos tamaños. En escritorio amplio con ratón la escala sigue en 1, sin mínimo añadido: se conservan los valores anteriores. Marca gráfica e iniciales de avatares mantienen sus tamaños para respetar sus cajas. Los clamp se escalan completos y el aumento afecta solo a las fuentes, sin zoom de la página ni cambios en los datos.

Se verificaron las 420 declaraciones de font-size modificadas y se comprobó que las demás declaraciones existentes permanecen iguales. En el navegador integrado, el cuerpo mide 16,24 px a 360/390 px, 15,68 px a 768/1024/1100 px y los 14 px originales a 1101/1440 px. Los campos móviles de examen y filtros miden 18,56 px; en la tableta de 1024 px, 17,92 px.

Recorridos locales: panel docente y selector de perfiles, calendario y formulario Nuevo examen a 390/360 px y 1024 px, Inicio de Alejandra a 768 px, consigna/respuesta/autoevaluación y filtros de Practicar a 390 px, ambos temas. No se guardaron formularios ni respuestas de prueba. Sin desbordamiento horizontal del documento en los tamaños comprobados; las autoevaluaciones conservan 48 px de alto y el diálogo conserva su desplazamiento vertical. La revisión se realiza con tamaños emulados de Chromium, sin atribuirla a un iPhone/iPad físico.
