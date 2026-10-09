/* Configuración del Curso 5 (la edita el responsable de Dibork Learning; no contiene secretos).
   evaluacion.intentos: intentos de las situaciones aplicadas (forma A, luego B). evaluacion.umbral: nota GLOBAL mínima para aprobar.
   proyecto.intentos / proyecto.umbral: intentos del proyecto (forma A, luego B) y nota mínima del proyecto.
   proyecto.correccion: "docente" (el LMS recibe la entrega y la califica un profesor) o "automatica" (pauta automática).
   proyecto.origen_lms: origen de la página del LMS para los avisos postMessage (ej.: "https://learning.dibork.cl"); "*" = cualquiera.
   global.peso_examen / global.peso_proyecto: ponderación de la nota global (deben sumar 1).
   servicio.url (opcional): servicio externo para respaldar textos largos en SCORM 1.2. Vacío = no se usa. */
window.IATU_CONFIG = window.IATU_CONFIG || {
  base: "",
  evaluacion: { intentos: 2, umbral: 80 },
  proyecto: { intentos: 2, umbral: 75, correccion: "docente", origen_lms: "*" },
  global: { peso_examen: 0.4, peso_proyecto: 0.6 },
  servicio: { url: "", token: null },
  banner: ""
};
