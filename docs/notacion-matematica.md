# Notación matemática

Los títulos y enunciados planificados utilizan números y símbolos cuando describen una operación concreta. Las explicaciones verbales se conservan cuando tienen una función didáctica.

`MathText` presenta fracciones verticales (`5/8`), potencias (`2^3`, `cm³`), raíces enteras (`√36`) y casillas completas (`□/20`, `10^□`) en contenidos de Matemáticas y Física y química. El tamaño depende del texto que lo rodea y respeta el mínimo tipográfico móvil. Los símbolos heredan el color del tema y cada expresión incluye una lectura accesible en español.

Es una capa de presentación: los campos de respuesta, los valores de las opciones, las soluciones y la corrección conservan su formato y comportamiento. No interpreta HTML ni ejecuta expresiones. Las fechas, enlaces y expresiones ambiguas quedan literales. Las potencias compuestas del banco mantienen paréntesis y superíndices Unicode explícitos.

La actualización del banco utiliza la reconciliación existente: conserva los identificadores y las modificaciones docentes. No añade clases, resultados, comprobaciones de aprendizaje ni asignaciones.

## Validación del 15 de noviembre de 2026

- TypeScript sin errores; 214 pruebas automáticas correctas, incluidas 17 nuevas sobre interpretación y presentación. Una comprobación posterior de los últimos cambios de contenido pasó 23 pruebas de notación y reconciliación.
- Revisión visual local a 360, 390, 768 y 1440 px, con ambos perfiles y temas claro y oscuro. Títulos, tarjetas y consignas sin desbordamiento horizontal; fracciones, potencias, raíces y casillas legibles. Sin errores en la consola del navegador de revisión.
- Corrección de fracciones equivalentes, separación de permisos, borradores y conservación de personalizaciones cubiertas por las pruebas existentes.
- La revisión responsive utiliza un navegador de escritorio con tamaños de pantalla definidos; no sustituye una comprobación en dispositivos iOS o Android físicos.

## Entrada de respuestas

`MathAnswerField` añade un constructor de fracciones y potencias al texto editable, sin cambiar el formato persistido. La alumna completa numerador y denominador, o base y exponente, y pulsa Insertar. El botón de signo permite escribir negativos con teclados móviles. El constructor sustituye la selección actual o inserta en el cursor; Cancelar y Escape conservan el texto anterior. Enter dentro del constructor inserta la expresión y no envía el formulario.

La vista «Así se verá» presenta la respuesta con la misma notación que los ejercicios. No calcula ni evalúa lo escrito. También se formatean las respuestas entregadas y las copias de borradores según la asignatura del material del que proceden.

Las potencias se ofrecen en respuestas abiertas y procedimientos. Las respuestas numéricas y de fracciones mantienen el objetivo de obtener el resultado final: escribir `2^3` no cuenta como resolver cuánto vale. La plantilla de procedimiento está disponible para ambas alumnas en materias matemáticas y continúa siendo opcional. Los campos de Lengua conservan las tildes y la edición habitual.

Validación: 226 pruebas automáticas correctas y TypeScript sin errores. Prueba visual a 360, 390, 768 y 1440 px, en claro y oscuro: controles de al menos 44 px, campos móviles de más de 16 px, constructor sin desbordamientos y lectura clara de la notación. Se comprobaron selección, signos, validación del denominador cero, Enter, Escape y Cancelar. En una copia local se guardó y recuperó `6/8` tras recargar, se entregó como equivalente a `3/4` y se conservó `2^3` en el procedimiento de otra entrega. Ambas quedaron pendientes de revisión y ninguna habilidad se marcó como aprendida. La base local se restauró exactamente después de la prueba; estas entregas no se publican.

## Raíces y operadores

El mismo editor incluye «Raíz» y los botones `×` y `÷` en respuestas abiertas y procedimientos. El constructor de raíz utiliza un único número entero no negativo, presenta `√49` sin calcularlo y mantiene las acciones Insertar, Cancelar, Enter y Escape. Los operadores se insertan con espacios para facilitar su lectura. La vista previa también se activa con raíces u operadores sin fracciones ni potencias. El modo de expresiones se controla mediante `allowExpressions`; las casillas de resultado final mantienen su comportamiento anterior.

Validación ampliada: 229 pruebas correctas y TypeScript sin errores. En la copia local se comprobó la inserción y recuperación de `√49 × 2 ÷ √36`, la sustitución de la selección, el rechazo de números negativos en el constructor y la conservación del resto del texto al cancelar. La entrega conservó la expresión y quedó pendiente de revisión, sin resultado automático ni habilidades comprobadas. Se verificaron controles de al menos 44 px, texto móvil de 18,56 px y ausencia de desbordamiento horizontal a 360, 390, 768 y 1440 px. La base local volvió a su copia original después de las pruebas.

## Operaciones completas desde el móvil

Los botones `(`, `)`, `+` y `=` completan el teclado de expresiones. Los paréntesis se insertan sin espacios añadidos; la suma y la igualdad añaden separación para facilitar la lectura. Se mantienen la selección, el cursor, el límite de longitud y el texto que rodea la inserción. Los controles de construcción y los signos forman grupos visuales; en móvil los signos se distribuyen en dos filas de botones de 44 × 44 px. La vista previa también se muestra para una operación sin fracciones, potencias ni raíces.

Validación de esta ampliación: TypeScript sin errores y 41 pruebas correctas sobre el editor, la corrección y la recuperación de borradores. La comprobación visual local incluyó móvil de 360 px, tableta de 768 px y PC de 1440 px, sin desbordamiento horizontal, en claro y oscuro. Se escribió `(2 + 3) = 5` utilizando los botones para los signos, se guardó y reapareció íntegra tras recargar. La expresión es una muestra de QA local; no se añade a las respuestas reales de la academia. La corrección y los permisos permanecen sin cambios.
