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
