/* Configuración del Curso 5 (la edita el responsable de Dibork Learning; no contiene secretos).
   evaluacion.intentos: intentos de las situaciones aplicadas (forma A, luego B). evaluacion.umbral: nota GLOBAL mínima para aprobar.
   proyecto.intentos / proyecto.umbral: intentos del proyecto (forma A, luego B) y nota mínima del proyecto.
   global.peso_examen / global.peso_proyecto: ponderación de la nota global (deben sumar 1).
   servicio.url (opcional): servicio externo para respaldar textos largos en SCORM 1.2. Vacío = no se usa. */
window.IATU_CONFIG = window.IATU_CONFIG || {
  base: "",
  evaluacion: { intentos: 2, umbral: 80 },
  proyecto: { intentos: 2, umbral: 75 },
  global: { peso_examen: 0.4, peso_proyecto: 0.6 },
  servicio: { url: "", token: null },
  banner: ""
};
