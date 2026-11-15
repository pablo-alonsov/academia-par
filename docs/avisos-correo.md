# Avisos de academia PAR

Preparación con Resend. El destinatario está fijado en el servidor a palonsovilla@gmail.com y el nombre visible es academia PAR. No se ha conectado una cuenta ni se ha enviado un correo real durante el desarrollo. El panel muestra Pendiente de configuración mientras falten los datos del proveedor.

## Activación

1. Crear una cuenta propia en Resend. Para una prueba inicial sin dominio, Resend permite onboarding@resend.dev únicamente hacia el correo asociado a esa cuenta. No se presenta ese remitente de pruebas como una dirección profesional propia.
2. Para el remitente propio, verificar un dominio en Resend y elegir una dirección de ese dominio, por ejemplo avisos@tu-dominio.es. No se puede suplantar el dominio gmail.com. academia PAR es el nombre visible; la dirección real depende del remitente autorizado.
3. Crear una API key con permiso de envío. Configurar RESEND_API_KEY como secreto de ejecución del mismo proyecto de Sites; no guardarla en archivos publicados, código del navegador ni conversaciones. Configurar NOTIFICATION_FROM con la dirección de correo, sin nombre visible ni saltos de línea. NOTIFICATIONS_ENABLED=false permite desactivar los envíos; al omitirla, una configuración completa los habilita.
4. Publicar de nuevo la última versión guardada para aplicar la revisión de variables de Sites. En Hoy y esta semana → Avisos por correo, actualizar estado y enviar un Correo de prueba. Comprobar aceptación en Resend y llegada real a Gmail (también Spam). La aceptación de la API no acredita por sí sola la llegada a la bandeja de entrada.
5. Activada la conexión, los avisos nuevos se intentan automáticamente después del guardado. Los avisos pendientes registrados desde la instalación se conservan; Reintentar avisos procesa hasta diez por petición. No se inventan avisos del historial anterior a esta función.

Fuentes oficiales: https://resend.com/docs/api-reference/emails/send-email, https://resend.com/docs/dashboard/emails/idempotency-keys y https://resend.com/docs/knowledge-base/403-error-resend-dev-domain.

## Qué genera un aviso

Entregar una actividad; registrar el trabajo de un recurso; crear, modificar o eliminar un examen propio; guardar una duda; añadir, revisar o retirar una palabra; personalizar el perfil o favoritos; subir un archivo o foto de perfil; guardar o descartar un borrador con contenido. Los guardados automáticos se agrupan como máximo en un aviso por alumna, actividad/recurso y hora UTC. Las revisiones de borrador sin cambio de contenido no notifican.

Las visitas, recargas, apertura de enlaces y acciones docentes no se presentan como actividad de una alumna. Tampoco notifican los reintentos de la misma operación, conflictos de guardado o escrituras rechazadas. Abrir un recurso o enviar un resultado nunca equivale a aprendizaje comprobado.

El aviso contiene quién, qué y cuándo; título/materia, datos del examen, vista previa acotada de la duda o metadatos útiles según el caso. No copia soluciones, notas privadas, respuestas completas, procedimiento escrito, borradores, claves ni adjuntos. El único enlace abre la raíz canónica de la academia; el panel docente sigue exigiendo su contraseña. No hay integración de Gmail ni se exige ChatGPT a las alumnas.

## Persistencia y reintentos

notification_outbox es una tabla interna de D1 excluida de los snapshots y parches de alumnas y docentes. El registro de notificación y la escritura de la acción se confirman en el mismo batch transaccional; las guardas de propiedad, CAS y nonce impiden registrar escrituras perdidas o reintentos duplicados. El esquema se añade sin tocar datos existentes; la creación diferida permite actualizar una base publicada sin sustituir sus tablas. La migración 0002 y el snapshot de Drizzle conservan el esquema de referencia.

Una lease persistida impide enviar la misma fila a la vez desde dos peticiones. Una vez aceptado el aviso, no vuelve a enviarse. Un timeout o error incierto conserva el cuerpo y la clave de idempotencia originales. Un rechazo definitivo del proveedor permite crear una nueva generación de envío con cuerpo corregido y clave distinta; no se reutiliza una identidad para dos cuerpos. Las identidades de Resend duran 24 horas: fuera del margen de 23 horas se bloquea un envío incierto para evitar duplicados y se pide revisar el registro del proveedor.

El intento de envío se programa con ctx.waitUntil después de la respuesta, sin hacer depender el guardado del resultado de Resend. La cola permanece en D1 si termina esa ventana. Los errores se reintentan con el siguiente movimiento de una alumna que encuentre avisos elegibles o con el botón docente; no se ha configurado un cron ni se promete entrega durante una interrupción prolongada sin nuevas peticiones. GET y renderizar un panel nunca envían correo.

## Validación

197 pruebas automatizadas y TypeScript pasan. Se prueban permisos, destinatario/remitente fijados en el servidor, escape de HTML y cabeceras, fechas de Madrid, rol real de la alumna, integridad del guardado, transacciones, idempotencia, concurrencia, corrección de configuración tras un rechazo explícito, leases y lecturas obsoletas. Los envíos de integración se simulan y no llegan a Resend.

La plantilla HTML se revisó en navegador a 390 px. El panel se revisó en PC, móvil de 390 px y tableta de 768 px, temas claro/oscuro y controles de al menos 44 px. Un examen y una duda ficticios locales generaron dos avisos En espera sin credenciales; las pruebas se retiran restaurando la copia local previa. Esto no certifica renderizado en aplicaciones reales de Gmail/Outlook/Safari ni acredita entrega de correo real. La muestra outputs/email-qa/ejemplo-aviso.html está identificada como ficticia.
