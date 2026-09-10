export const metadata = {
  title: "Términos y Condiciones · JURIDICTAS",
  description: "Términos y condiciones de uso de la plataforma JURIDICTAS.",
};

export default function TerminosPage() {
  const lastUpdate = "10 de septiembre de 2026";

  return (
    <>
      <h1 className="text-3xl font-bold">Términos y Condiciones de Uso</h1>
      <p className="text-sm text-slate-500">Última actualización: {lastUpdate}</p>

      <h2>1. Aceptación de los Términos</h2>
      <p>
        Estos Términos y Condiciones (en adelante, &ldquo;los Términos&rdquo;) regulan
        el acceso y uso de la plataforma <strong>JURIDICTAS</strong> (en adelante,
        &ldquo;la Plataforma&rdquo;), un sistema de gestión para estudios jurídicos
        operado en la República Argentina.
      </p>
      <p>
        Al registrarse, acceder o utilizar la Plataforma, el usuario acepta de forma
        expresa, plena y sin reservas estos Términos, así como la{" "}
        <a href="/privacidad">Política de Privacidad</a>. Si no está de acuerdo,
        debe abstenerse de utilizar el servicio.
      </p>

      <h2>2. Descripción del Servicio</h2>
      <p>
        JURIDICTAS es un software como servicio (SaaS) que ofrece herramientas para
        la gestión integral de estudios jurídicos, incluyendo:
      </p>
      <ul>
        <li>Administración de casos, expedientes y procedimientos.</li>
        <li>Gestión de clientes, contactos y conflictos de interés.</li>
        <li>Control de plazos, audiencias y agenda.</li>
        <li>Administración de honorarios, cobros y gastos.</li>
        <li>Documentos, escritos, plantillas y biblioteca jurídica.</li>
        <li>Funciones opcionales de inteligencia artificial.</li>
      </ul>
      <p>
        El servicio se presta bajo la modalidad de suscripción y puede incluir un
        período de prueba gratuito (trial) según el plan elegido.
      </p>

      <h2>3. Registro y Cuenta de Usuario</h2>
      <p>
        Para acceder a la Plataforma es necesario crear una cuenta. El usuario se
        compromete a:
      </p>
      <ul>
        <li>Proporcionar información veraz, exacta y actualizada.</li>
        <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
        <li>Notificar de inmediato cualquier uso no autorizado de su cuenta.</li>
        <li>No compartir la cuenta con terceros ajenos al estudio registrado.</li>
      </ul>
      <p>
        El usuario es responsable de todas las actividades realizadas desde su
        cuenta. JURIDICTAS no será responsable por daños derivados del uso indebido
        de las credenciales por parte del usuario.
      </p>

      <h2>4. Planes, Precios y Facturación</h2>
      <p>
        JURIDICTAS ofrece distintos planes de suscripción cuyos precios, límites y
        funcionalidades se encuentran publicados en{" "}
        <a href="/#precios">la sección de precios</a>.
      </p>
      <ul>
        <li>
          <strong>Período de prueba (trial):</strong> los nuevos estudios pueden
          acceder a un período gratuito de 14 días sin necesidad de tarjeta de
          crédito. Al finalizar, deberán contratar un plan pago para continuar.
        </li>
        <li>
          <strong>Facturación:</strong> los planes se facturan mensualmente. Los
          pagos se procesan a través de Mercado Pago u otros medios habilitados.
        </li>
        <li>
          <strong>Renovación automática:</strong> las suscripciones se renuevan
          automáticamente el mismo día de cada mes. El usuario puede cancelar en
          cualquier momento desde su panel.
        </li>
        <li>
          <strong>Cambios de plan:</strong> los upgrades se aplican de inmediato.
          No se admiten downgrades durante el período contratado.
        </li>
        <li>
          <strong>Reembolsos:</strong> no se realizan reembolsos por períodos ya
          facturados, salvo error atribuible a JURIDICTAS.
        </li>
      </ul>

      <h2>5. Uso Aceptable</h2>
      <p>El usuario se compromete a NO utilizar la Plataforma para:</p>
      <ul>
        <li>Actividades ilícitas, fraudulentas o contrarias a la moral y las buenas costumbres.</li>
        <li>Almacenar contenido que infrinja derechos de propiedad intelectual de terceros.</li>
        <li>Realizar ingeniería inversa, descompilar o intentar vulnerar la seguridad del sistema.</li>
        <li>Automatizar el acceso mediante bots, scrapers u otros medios no autorizados.</li>
        <li>Revender, sublicenciar o ceder el acceso a terceros sin autorización expresa.</li>
        <li>Introducir virus, malware o cualquier código dañino.</li>
      </ul>
      <p>
        El incumplimiento de estas obligaciones facultará a JURIDICTAS a suspender o
        dar de baja la cuenta, sin perjuicio de las acciones legales que
        correspondan.
      </p>

      <h2>6. Propiedad Intelectual</h2>
      <p>
        Todos los derechos sobre el software, marca, diseño, código fuente,
        documentación y demás elementos de JURIDICTAS son titularidad exclusiva de
        JURIDICTAS o de sus licenciantes. El usuario no adquiere ningún derecho de
        propiedad sobre los mismos, limitándose su uso a lo previsto en estos
        Términos.
      </p>
      <p>
        El <strong>contenido que el usuario carga</strong> (casos, documentos,
        escritos, datos de clientes) es de su exclusiva propiedad y
        responsabilidad. JURIDICTAS no reclama derechos sobre dicho contenido.
      </p>

      <h2>7. Confidencialidad y Secreto Profesional</h2>
      <p>
        JURIDICTAS reconoce la especial sensibilidad de la información manejada por
        los estudios jurídicos, alcanzada por el secreto profesional (art. 244 y
        ccdtes. del Código Penal, Ley 23.187 y normas concordantes).
      </p>
      <p>
        JURIDICTAS se compromete a tratar dicha información con estricta
        confidencialidad, implementando medidas técnicas y organizativas de
        seguridad adecuadas al riesgo, conforme a la Ley 25.326 de Protección de
        Datos Personales.
      </p>

      <h2>8. Servicios de Inteligencia Artificial</h2>
      <p>
        La Plataforma puede ofrecer funcionalidades de inteligencia artificial a
        través de proveedores externos (como DeepSeek, OpenAI, Anthropic u otros).
      </p>
      <ul>
        <li>
          El <strong>módulo de IA</strong> es una funcionalidad incluida según el
          plan contratado.
        </li>
        <li>
          El <strong>consumo</strong> de IA (tokens, llamadas a la API) es
          facturado directamente por el proveedor elegido por el usuario, según la
          clave de API que éste configure. JURIDICTAS no cobra por este consumo.
        </li>
        <li>
          El usuario es responsable de configurar su propia clave de API y de
          cumplir con los términos del proveedor elegido.
        </li>
        <li>
          JURIDICTAS no garantiza la exactitud, exhaustividad ni actualidad de los
          resultados generados por IA. Dichos resultados deben ser siempre
          verificados por un profesional del derecho.
        </li>
      </ul>

      <h2>9. Disponibilidad del Servicio</h2>
      <p>
        JURIDICTAS procura mantener la Plataforma disponible de forma continua,
        pero no garantiza un servicio ininterrumpido ni libre de errores. Podrán
        realizarse tareas de mantenimiento programado o no programado, intentando
        minimizar el impacto.
      </p>
      <p>
        No seremos responsables por interrupciones derivadas de causas de fuerza
        mayor, fallas de proveedores de internet, ataques informáticos u otras
        circunstancias ajenas a nuestro control razonable.
      </p>

      <h2>10. Limitación de Responsabilidad</h2>
      <p>
        En la máxima medida permitida por la legislación argentina, JURIDICTAS no
        será responsable por:
      </p>
      <ul>
        <li>Pérdidas indirectas, lucro cesante o daño consecuente.</li>
        <li>Decisiones profesionales tomadas por el usuario sobre la base de la información del sistema.</li>
        <li>Errores u omisiones en datos ingresados por el usuario.</li>
        <li>Uso indebido de las credenciales de acceso.</li>
        <li>Contenido cargado por el usuario que infrinja derechos de terceros.</li>
      </ul>
      <p>
        La responsabilidad total de JURIDICTAS frente al usuario, por cualquier
        causa, se limita al monto efectivamente abonado por éste en los últimos 12
        meses.
      </p>

      <h2>11. Suspensión y Baja de Cuenta</h2>
      <p>
        JURIDICTAS podrá suspender o dar de baja la cuenta del usuario en caso de:
      </p>
      <ul>
        <li>Incumplimiento de estos Términos.</li>
        <li>Falta de pago de la suscripción.</li>
        <li>Uso fraudulento o ilícito de la Plataforma.</li>
        <li>Requerimiento de autoridad judicial o administrativa competente.</li>
      </ul>
      <p>
        Asimismo, el usuario puede solicitar la baja de su cuenta en cualquier
        momento. La solicitud de baja se formaliza desde el panel y otorga un plazo
        de 30 días para descargar todos los archivos antes de la eliminación
        definitiva, la cual es <strong>irreversible</strong>.
      </p>

      <h2>12. Modificaciones</h2>
      <p>
        JURIDICTAS podrá modificar estos Términos en cualquier momento. Las
        modificaciones serán notificadas al usuario con al menos 30 días de
        anticipación y entrarán en vigor una vez transcurrido dicho plazo. El uso
        continuado del servicio implica la aceptación de los nuevos términos.
      </p>

      <h2>13. Ley Aplicable y Jurisdicción</h2>
      <p>
        Estos Términos se rigen por las leyes de la República Argentina. Para
        cualquier controversia derivada de su interpretación o aplicación, las
        partes se someten a la jurisdicción de los Tribunales Ordinarios de la
        Ciudad Autónoma de Buenos Aires, con renuncia expresa a cualquier otro
        fuero o jurisdicción que pudiera corresponder.
      </p>

      <h2>14. Contacto</h2>
      <p>
        Para cualquier consulta relativa a estos Términos, el usuario puede
        comunicarse a:
      </p>
      <ul>
        <li>
          Email: <a href="mailto:contacto@juridictas.ar">contacto@juridictas.ar</a>
        </li>
        <li>Sitio web: <a href="https://juridictas.ar">https://juridictas.ar</a></li>
      </ul>
    </>
  );
}
