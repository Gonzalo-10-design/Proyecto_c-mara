export default function Contacto() {
  return (
    <div className="w-full min-h-screen bg-gray-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0f3d28] mb-8">
          ¿Tienes alguna pregunta? ¡Contáctanos!
        </h1>
        <p className="text-lg sm:text-xl text-gray-700 mb-6">
          Si necesitas más información sobre nuestras convocatorias, subvenciones o cualquier otro servicio, no dudes en ponerte en contacto con nosotros. Estamos aquí para ayudarte a dar el siguiente paso.
        </p>

        <div className="text-lg sm:text-xl text-gray-700 mb-6">
          <p className="mb-4">
            <strong>Correo Electrónico:</strong>
            <a href="mailto:soporte@isateck.com" className="text-[#1ea34a] hover:underline">
               soporte@isateck.com
            </a>
          </p>
          <p>
            <strong>Dirección:</strong> Carrera 41C # 73-31, Barranquilla, Colombia.
          </p>
        </div>

        <div className="text-lg sm:text-xl text-gray-700">
          <p className="mb-4">
            <strong>Redes Sociales:</strong>
          </p>
          <div className="flex justify-center gap-6">
            <a href="https://www.linkedin.com/company/isateck" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#BEDBFF] text-[#0f3d28] px-4 py-2 rounded-lg hover:bg-[#1ea34a] transition duration-300">
              <i className="fab fa-linkedin-in"></i> LinkedIn
            </a>
            <a href="https://www.twitter.com/isateck" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#BEDBFF] text-[#0f3d28] px-4 py-2 rounded-lg hover:bg-[#1ea34a] transition duration-300">
              <i className="fab fa-x"></i> 
            </a>
            <a href="https://www.facebook.com/isateck" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#BEDBFF] text-[#0f3d28] px-4 py-2 rounded-lg hover:bg-[#1ea34a] transition duration-300">
              <i className="fab fa-facebook-f"></i> Facebook
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
