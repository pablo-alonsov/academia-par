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
