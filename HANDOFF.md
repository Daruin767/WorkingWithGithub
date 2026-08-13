# HANDOFF — SDD Finanzas

Resumen: App PWA local-first para llevar control de gastos y ahorros. Datos guardados en IndexedDB con backups cifrados.

Qué hay en el repo:
- src/: código fuente React + utilidades (idb.js, backup.js, alerts.js)
- src/components/: vistas y componentes principales (Dashboard, LimitsView, BackupPanel, etc.)
- src/__tests__/: suite de tests con Vitest

Requisitos para ejecutar:
1. Node >= 16/18 (recomendado Node 18+)
2. npm install
3. npm run dev

Backups cifrados: usar la UI (Backup → Crear y descargar backup cifrado). La app soporta backups automáticos no cifrados; CIFRADO requiere contraseña manual para descarga/restore.

Notas operacionales:
- Para habilitar export XLSX: `npm install xlsx`
- Tests: `npm test`
- Entorno: funciona en navegador moderno. Revisión final antes de release: ejecutar suite de tests y verificar backup/restore.

Contacto: autor del proyecto.
