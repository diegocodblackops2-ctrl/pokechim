/* Configuración de integración del Curso 5 (la edita el responsable de Dibork Learning; no contiene secretos).
   servicio.url: URL base del servicio autorizado de corrección/evidencias. Vacío = evaluación formal bloqueada.
   servicio.token(learnerId): función que devuelve el token firmado que emite el LMS para el participante.
   El token NUNCA debe derivarse solo del learner_id del cliente en producción (ver docs/INTEGRACION_DIBORK.md). */
window.IATU_CONFIG = window.IATU_CONFIG || {
  base: "",
  servicio: { url: "", token: null },
  banner: ""
};
