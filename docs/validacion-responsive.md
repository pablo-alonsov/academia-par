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
