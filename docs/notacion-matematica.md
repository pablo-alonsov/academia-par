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
