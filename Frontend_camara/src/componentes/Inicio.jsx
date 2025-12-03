export default function Inicio() {
  return (
    <div className="w-full min-h-screen bg-gray-100 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0f3d28] mb-8">
          Solución Inteligente para Medición de Nivel de Tanques Industriales
        </h1>

        <p className="text-lg sm:text-xl text-gray-700 mb-6 text-justify">
          En <span className="text-[#0041A3] font-semibold">ISATECK</span> desarrollamos una solución avanzada para la medición de niveles de líquidos en tanques industriales. 
          Este sistema utiliza tecnologías de análisis óptico y térmico integradas en un módulo compacto y de alta precisión, diseñado para operar en entornos exigentes.
        </p>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-[#0041A3] mb-4">¿Cómo funciona?</h2>
          <p className="text-lg sm:text-xl text-gray-700 mb-6 text-justify">
            Gracias a su capacidad de procesamiento local y su arquitectura optimizada, el equipo genera información en tiempo real sobre el comportamiento térmico del tanque, 
            permitiendo estimar el nivel sin intervención directa ni contacto con el contenido. Su enfoque no invasivo lo convierte en una alternativa eficiente frente a métodos tradicionales de monitoreo.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-8 mb-12">
          <div className="bg-white p-6 shadow-md rounded-lg w-full sm:w-1/2">
            <h3 className="font-bold text-lg text-[#0041A3] mb-4">Beneficios</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Precisión en tiempo real</li>
              <li>Sin contacto físico con el contenido</li>
              <li>Bajo costo de mantenimiento</li>
              <li>Adaptabilidad a diversas industrias</li>
            </ul>
          </div>
          <div className="bg-white p-6 shadow-md rounded-lg w-full sm:w-1/2">
            <h3 className="font-bold text-lg text-[#0041A3] mb-4">Sectores de Aplicación</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Petroquímico</li>
              <li>Agroindustria</li>
              <li>Farmacéutico</li>
              <li>Almacenamiento industrial</li>
            </ul>
          </div>
        </div>

        <p className="text-lg sm:text-xl text-gray-700 mb-6 text-justify">
          El sistema reduce costos de instalación y mantenimiento, minimiza riesgos operativos y facilita el monitoreo continuo sin modificar la infraestructura existente. 
          Su integración es rápida, limpia y compatible con plataformas de supervisión industrial.
        </p>

        <div className="mt-8">
          <a
            href="/demo"
            className="bg-[#0041A3] text-white px-6 py-3 rounded-lg font-semibold text-lg transition-all hover:bg-[#00357f]"
          >
            Solicitar una Demo
          </a>
        </div>
      </div>
    </div>
  );
}