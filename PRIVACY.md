Política de privacidad — SDD Finanzas

Última actualización: 2026-08-13

Resumen
Esta aplicación gestiona datos personales mínimos necesarios para operar como una herramienta de finanzas personales: correo electrónico para registro, y datos de transacciones, metas, límites y backups que el usuario crea.

Qué se recoge
- Datos de cuenta: id, email, moneda seleccionada y ajustes locales.
- Transacciones: montos, fecha, categoría, vínculos a metas/artículos.
- Backups: archivos JSON que pueden ser cifrados por el usuario con contraseña.
- Eventos locales generados por la app (alertas, notificaciones) almacenadas en IndexedDB.

Uso y retención
Todos los datos se almacenan localmente en el dispositivo del usuario (IndexedDB). La app no envía datos a servidores externos por defecto, salvo cuando el usuario explícitamente sube/descarga backups a una URL que proporcione. Los backups cifrados requieren contraseña proporcionada por el usuario; la contraseña no se almacena en la app.

Compartir datos
La app no comparte datos con terceros salvo que el usuario lo haga (por ejemplo, subir backup a un endpoint o exportar archivos). Cuando se utiliza un endpoint externo, el manejo de esos datos está sujeto a la política de quien provea ese servicio.

Seguridad
- Backups pueden cifrarse con AES-GCM con clave derivada vía PBKDF2.
- Recomendamos usar una contraseña fuerte y conservarla en un gestor de contraseñas.

El usuario y control
El usuario puede exportar, eliminar y restaurar sus datos localmente. Para borrar completamente los datos, eliminar la base IndexedDB del sitio o usar funcionalidades de la app para borrar registros.

Contacto
Para preguntas sobre privacidad o datos, abra un issue en el repositorio o contacte al mantenedor del proyecto.
