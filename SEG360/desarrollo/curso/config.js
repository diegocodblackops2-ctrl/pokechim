/* Seguridad 360 · configuración del paquete (la edita quien administra el campus; no contiene secretos).
   rutas: códigos de ruta incluidos en este paquete (["SST"], ["CIBER"], ["EPP"] o los tres).
   evaluacion.perfil: "portable" (banco portátil dentro del paquete) o "dibork_verified" (el campus entrega y corrige).
   evaluacion.origen_lms: origen de la página del campus para los mensajes postMessage ("*" = cualquiera).
   herramientas_vista_previa: solo para la vista previa local; en los paquetes del campus va en false. */
window.S360_CONFIG = window.S360_CONFIG || {
  base: "",
  rutas: null,
  evaluacion: { perfil: "portable", intentos: 2, umbral_situaciones: 80, umbral_ruta: 80, umbral_tarea: 80, peso_situaciones: 0.4, peso_tarea: 0.6, origen_lms: "*" },
  herramientas_vista_previa: true,
  vista_previa_sin_bloqueo: false
};
