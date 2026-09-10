export const metadata = {
  title: "Política de Privacidad · JURIDICTAS",
  description: "Política de Privacidad de la plataforma JURIDICTAS conforme a la Ley 25.326.",
};

export default function PrivacidadPage() {
  const lastUpdate = "10 de septiembre de 2026";

  return (
    <>
      <h1 className="text-3xl font-bold">Política de Privacidad</h1>
      <p className="text-sm text-slate-500">Última actualización: {lastUpdate}</p>

      <p>
        Esta Política de Privacidad describe cómo <strong>JURIDICTAS</strong>{" "}
        recopila, utiliza, almacena y protege los datos personales de sus usuarios,
        en cumplimiento de la <strong>Ley 25.326 de Protección de Datos
        Personales</strong>, su Decreto Reglamentario 1558/2001 y las
        disposiciones de la <strong>Agencia de Acceso a la Información Pública
        (AAIP)</strong>.
      </p>

      <h2>1. Responsable del Tratamiento</h2>
      <p>
        El responsable del tratamiento de los datos personales es JURIDICTAS, con
        domicilio en la República Argentina. Para cualquier consulta relativa a
        esta Política, puede contactarnos en{" "}
        <a href="mailto:privacidad@juridictas.ar">privacidad@juridictas.ar</a>.
      </p>

      <h2>2. Datos que Recopilamos</h2>
      <p>Recopilamos las siguientes categorías de datos:</p>

      <h3>a) Datos proporcionados por el usuario</h3>
      <ul>
        <li>Nombre y apellido, email, teléfono y datos de contacto.</li>
        <li>Nombre y datos del estudio jurídico.</li>
        <li>Credenciales de acceso (contraseña, almacenada con hash bcrypt).</li>
        <li>
          Datos de clientes, contrapartes, expedientes, documentos y demás
          información que el usuario cargue voluntariamente en la Plataforma.
        </li>
      </ul>

      <h3>b) Datos generados por el uso del servicio</h3>
      <ul>
        <li>Registros de actividad (logs) con IP, fecha y hora, navegador.</li>
        <li>Métricas de uso y errores, para fines de diagnóstico y mejora.</li>
        <li>Información de facturación y pagos (a través de Mercado Pago u otros procesadores).</li>
      </ul>

      <h3>c) Datos sensibles (con especial protección)</h3>
      <p>
        Dada la naturaleza del servicio, la Plataforma puede contener información
        especialmente sensible (datos de causas penales, datos de salud,
        información sujeta a secreto profesional). JURIDICTAS aplica medidas de
        seguridad reforzadas para esta información, conforme al artículo 9 de la
        Ley 25.326.
      </p>

      <h2>3. Finalidad del Tratamiento</h2>
      <p>Los datos personales son tratados para las siguientes finalidades:</p>
      <ul>
        <li>Proveer el servicio contratado y gestionar la cuenta del usuario.</li>
        <li>Procesar pagos y emitir comprobantes.</li>
        <li>Enviar notificaciones operativas (vencimientos, cambios, avisos).</li>
        <li>
          Enviar comunicaciones comerciales sobre nuevos productos o
          actualizaciones (el usuario puede oponerse en cualquier momento).
        </li>
        <li>Prevenir fraudes y garantizar la seguridad de la Plataforma.</li>
        <li>Cumplir con obligaciones legales, contables y fiscales.</li>
      </ul>

      <h2>4. Base Legal del Tratamiento</h2>
      <p>El tratamiento se funda en:</p>
      <ul>
        <li>
          El <strong>consentimiento expreso</strong> del usuario al aceptar esta
          Política (art. 5, Ley 25.326).
        </li>
        <li>
          La <strong>ejecución del contrato</strong> de prestación de servicios.
        </li>
        <li>
          El <strong>cumplimiento de obligaciones legales</strong> (fiscales,
          contables, judiciales).
        </li>
        <li>
          El <strong>interés legítimo</strong> de JURIDICTAS en mejorar el
          servicio y prevenir fraudes.
        </li>
      </ul>

      <h2>5. Conservación de los Datos</h2>
      <p>
        Los datos se conservan mientras el usuario mantenga su cuenta activa. Una
        vez solicitada la baja:
      </p>
      <ul>
        <li>
          El usuario dispone de <strong>30 días</strong> para descargar todos sus
          archivos.
        </li>
        <li>
          Al cabo de dicho plazo, los datos son eliminados de forma{" "}
          <strong>permanente e irreversible</strong> de los servidores.
        </li>
        <li>
          Cierta información (facturación, comprobantes fiscales) puede
          conservarse por plazos legales obligatorios (10 años, según normativa
          fiscal argentina).
        </li>
      </ul>

      <h2>6. Seguridad de los Datos</h2>
      <p>
        JURIDICTAS implementa las siguientes medidas de seguridad técnicas y
        organizativas para proteger los datos personales:
      </p>
      <ul>
        <li>
          <strong>Cifrado en tránsito:</strong> todas las comunicaciones se
          realizan bajo HTTPS/TLS.
        </li>
        <li>
          <strong>Cifrado en reposo:</strong> documentos sensibles cifrados con
          AES-256-GCM.
        </li>
        <li>
          <strong>Contraseñas hasheadas</strong> con bcrypt (factor 12).
        </li>
        <li>
          <strong>Aislamiento multi-tenant:</strong> los datos de cada estudio se
          almacenan en schemas de base de datos separados.
        </li>
        <li>
          <strong>Backups automáticos</strong> diarios con cifrado.
        </li>
        <li>
          <strong>Registro de auditoría</strong> de accesos y operaciones
          críticas.
        </li>
        <li>
          <strong>Control de accesos</strong> basado en roles y permisos.
        </li>
      </ul>

      <h2>7. Compartición de Datos con Terceros</h2>
      <p>
        JURIDICTAS <strong>NO vende ni alquila</strong> datos personales a
        terceros. Los datos pueden compartirse únicamente con:
      </p>
      <ul>
        <li>
          <strong>Procesadores de pago:</strong> Mercado Pago u otros, para
          procesar cobros.
        </li>
        <li>
          <strong>Proveedores de IA:</strong> si el usuario configura una API key
          (DeepSeek, OpenAI, etc.), los textos enviados se rigen por las políticas
          del proveedor elegido.
        </li>
        <li>
          <strong>Proveedores de infraestructura:</strong> hosting, backups,
          monitoreo, siempre bajo acuerdos de confidencialidad.
        </li>
        <li>
          <strong>Autoridades competentes:</strong> cuando exista orden judicial o
          requerimiento legal debidamente fundado.
        </li>
      </ul>

      <h2>8. Transferencias Internacionales</h2>
      <p>
        Algunos proveedores de servicios (IA, hosting) pueden estar ubicados fuera
        de la Argentina. En dichos casos, JURIDICTAS adopta las garantías
        necesarias para asegurar un nivel de protección adecuado, conforme a los
        estándares del artículo 12 de la Ley 25.326 y las resoluciones de la AAIP.
      </p>

      <h2>9. Derechos del Titular de los Datos</h2>
      <p>
        Conforme a la Ley 25.326, el usuario tiene derecho a:
      </p>
      <ul>
        <li>
          <strong>Acceso:</strong> conocer qué datos personales suyos están siendo
          tratados.
        </li>
        <li>
          <strong>Rectificación:</strong> solicitar la corrección de datos
          inexactos o incompletos.
        </li>
        <li>
          <strong>Actualización:</strong> mantener actualizada su información.
        </li>
        <li>
          <strong>Supresión:</strong> solicitar la eliminación de sus datos cuando
          ya no sean necesarios.
        </li>
        <li>
          <strong>Confidencialidad:</strong> oponerse al tratamiento para fines
          publicitarios.
        </li>
        <li>
          <strong>Portabilidad:</strong> descargar sus datos en formatos abiertos
          (JSON, PDF).
        </li>
      </ul>
      <p>
        Para ejercer estos derechos, el usuario puede escribir a{" "}
        <a href="mailto:privacidad@juridictas.ar">privacidad@juridictas.ar</a>.
        Responderemos en un plazo máximo de 10 días hábiles.
      </p>

      <h2>10. Cookies y Tecnologías Similares</h2>
      <p>Utilizamos las siguientes cookies:</p>
      <ul>
        <li>
          <strong>Cookies esenciales:</strong> necesarias para el funcionamiento
          del login y la sesión.
        </li>
        <li>
          <strong>Cookies de preferencia:</strong> para recordar configuraciones
          como el tema (claro/oscuro).
        </li>
        <li>
          <strong>Cookies analíticas:</strong> para métricas agregadas de uso
          (anonimizadas).
        </li>
      </ul>
      <p>
        El usuario puede gestionar o eliminar las cookies desde la configuración de
        su navegador. La desactivación de cookies esenciales puede impedir el uso
        de la Plataforma.
      </p>

      <h2>11. Menores de Edad</h2>
      <p>
        La Plataforma está destinada exclusivamente a profesionales del derecho
        mayores de 18 años. No recopilamos intencionalmente datos de menores. Si
        detectamos que un menor se ha registrado, procederemos a eliminar su cuenta
        y datos asociados.
      </p>

      <h2>12. Incidentes de Seguridad</h2>
      <p>
        En caso de detectar una brecha de seguridad que afecte datos personales,
        JURIDICTAS notificará a los usuarios afectados y a la AAIP en un plazo
        máximo de 72 horas, conforme a las mejores prácticas internacionales (RGPD
        europeo) y la normativa argentina vigente.
      </p>

      <h2>13. Autoridad de Control</h2>
      <p>
        La autoridad de aplicación de la Ley 25.326 es la{" "}
        <strong>Agencia de Acceso a la Información Pública (AAIP)</strong>. El
        usuario puede presentar reclamos ante dicho organismo:
      </p>
      <ul>
        <li>
          Sitio web:{" "}
          <a href="https://www.argentina.gob.ar/aaip" target="_blank" rel="noreferrer">
            www.argentina.gob.ar/aaip
          </a>
        </li>
        <li>Dirección: Av. Pte. Roque Sáenz Peña 511, CABA, Argentina</li>
      </ul>

      <h2>14. Modificaciones a esta Política</h2>
      <p>
        Nos reservamos el derecho de modificar esta Política de Privacidad. Las
        modificaciones sustanciales serán notificadas al usuario con al menos 30
        días de anticipación. El uso continuado del servicio tras la entrada en
        vigor implica la aceptación de los cambios.
      </p>

      <h2>15. Contacto</h2>
      <p>Para cualquier consulta o ejercicio de derechos:</p>
      <ul>
        <li>
          Email de privacidad:{" "}
          <a href="mailto:privacidad@juridictas.ar">privacidad@juridictas.ar</a>
        </li>
        <li>
          Email general: <a href="mailto:contacto@juridictas.ar">contacto@juridictas.ar</a>
        </li>
        <li>
          Sitio web: <a href="https://juridictas.ar">https://juridictas.ar</a>
        </li>
      </ul>

      <hr />

      <p className="text-sm text-slate-500">
        Al utilizar JURIDICTAS, el usuario declara haber leído y comprendido esta
        Política de Privacidad y presta su consentimiento libre, expreso e
        informado para el tratamiento de sus datos personales conforme a los
        términos aquí expuestos.
      </p>
    </>
  );
}
