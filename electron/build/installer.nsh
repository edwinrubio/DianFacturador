; DIAN Facturador — Custom NSIS installer script
; Referenced by electron/package.json: nsis.include -> "build/installer.nsh"
; electron-builder injects this script into the generated NSIS installer.
; Requires Unicode NSIS (enabled by default in electron-builder >= 22.x).

; ---------------------------------------------------------------------------
; Welcome page — shown before installation begins
; ---------------------------------------------------------------------------
!define MUI_WELCOMEPAGE_TITLE "Bienvenido a DIAN Facturador"
!define MUI_WELCOMEPAGE_TEXT "Este asistente le guiara en la instalacion de DIAN Facturador.$\r$\n$\r$\nDIAN Facturador le permite generar facturas electronicas, notas credito, notas debito y cotizaciones con integracion directa a la DIAN.$\r$\n$\r$\nHaga clic en Siguiente para continuar."

; ---------------------------------------------------------------------------
; Finish page — shown after successful installation
; ---------------------------------------------------------------------------
!define MUI_FINISHPAGE_TITLE "Instalacion Completada"
!define MUI_FINISHPAGE_TEXT "DIAN Facturador se ha instalado correctamente.$\r$\n$\r$\nNOTA: Al ejecutar por primera vez, Windows SmartScreen puede mostrar una advertencia porque el instalador no esta firmado digitalmente. Haga clic en 'Mas informacion' y luego en 'Ejecutar de todos modos'."

; ---------------------------------------------------------------------------
; Uninstall confirmation page — shown before uninstallation
; ---------------------------------------------------------------------------
!define MUI_UNCONFIRMPAGE_TEXT_TOP "Se eliminara DIAN Facturador de su equipo. Sus datos (facturas, clientes, productos) se conservaran en la carpeta de datos de usuario."
