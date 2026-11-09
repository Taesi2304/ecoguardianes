import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { DOMICILIO, FECHA_ACTUALIZACION, RESPONSABLE, RESPONSABLE_CORTO } from '@/lib/legal';
import { ContactoLegal } from './ContactoLegal';

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-bold">{titulo}</h2>
      {children}
    </section>
  );
}

export const AvisoPrivacidad = () => {
  return (
    <div className="landing-page py-12 px-4 max-w-4xl mx-auto text-[#4A2E18]">
      <h1 className="text-3xl font-black mb-2">Aviso de Privacidad Integral</h1>
      <p className="text-sm opacity-80 mb-6">Última actualización: {FECHA_ACTUALIZACION}</p>

      <div className="space-y-6 text-sm leading-relaxed bg-white/75 p-6 rounded-2xl border border-[#4A2E18]/10">
        <Seccion titulo="1. Responsable">
          <p>
            <strong>{RESPONSABLE}</strong> ({RESPONSABLE_CORTO}), que incluye su proyecto de composta comunitaria <strong>Eco Guardianes</strong>,
            con domicilio en {DOMICILIO}, es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección
            de Datos Personales en Posesión de los Particulares y demás normativa aplicable.
          </p>
          <p>Para cualquier tema de privacidad puedes contactarnos por <ContactoLegal />.</p>
        </Seccion>

        <Seccion titulo="2. Datos personales que recabamos">
          <p>Solo pedimos los datos necesarios para cada servicio:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Cuenta de Eco Guardianes:</strong> nombre y apellidos, correo electrónico, teléfono, colonia y contraseña
              (la contraseña se guarda cifrada; nadie del equipo puede verla).
            </li>
            <li>
              <strong>Bitácoras de compostaje:</strong> compostero visitado, fecha, observaciones sobre el estado de la composta y
              fotografías de evidencia, vinculadas a tu nombre.
            </li>
            <li><strong>Inscripción a talleres:</strong> nombre, número de WhatsApp y, si lo das, correo electrónico.</li>
            <li>
              <strong>Mensajes y voluntariado</strong> (cuando estos formularios estén disponibles): nombre, correo, teléfono y lo que
              nos escribas.
            </li>
          </ul>
          <p>
            <strong>No solicitamos datos personales sensibles</strong> (salud, religión, origen étnico, opiniones políticas, etc.).
            Te pedimos no incluirlos en observaciones ni fotografías, y no subir fotos donde se reconozca a otras personas,
            especialmente a menores de edad.
          </p>
        </Seccion>

        <Seccion titulo="3. Para qué usamos tus datos">
          <p><strong>Finalidades necesarias</strong> (sin ellas no podemos darte el servicio):</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Crear y administrar tu cuenta de Eco Guardianes y asignarte a tu colonia.</li>
            <li>Registrar las bitácoras de los composteros y generar el seguimiento y los reportes del proyecto.</li>
            <li>Inscribirte a talleres, controlar el cupo, darte acceso al grupo de WhatsApp del taller y avisarte de cambios.</li>
            <li>Responder tus mensajes y solicitudes.</li>
          </ul>
          <p><strong>Finalidades adicionales</strong> (puedes negarte sin perder el servicio):</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Elaborar estadísticas del proyecto <em>sin identificarte</em> (por ejemplo, kilos compostados por colonia) para informes a aliados y difusión ambiental.</li>
            <li>Invitarte a futuras ediciones del festival, talleres o actividades.</li>
          </ul>
          <p>Si no quieres que usemos tus datos para las finalidades adicionales, avísanos por <ContactoLegal />.</p>
        </Seccion>

        <Seccion titulo="4. Quién puede ver tus datos">
          <ul className="list-disc space-y-1 pl-5">
            <li>El equipo administrador de {RESPONSABLE_CORTO}, según su función.</li>
            <li>Las demás personas registradas en Eco Guardianes pueden ver las bitácoras (incluido el nombre de quien las registró) para coordinar el cuidado de los composteros.</li>
            <li>
              Las fotografías de evidencia se guardan con un enlace difícil de adivinar; cualquier persona que tenga ese enlace
              puede verlas. Los datos de inscripción a talleres solo los ve la administración.
            </li>
          </ul>
          <p><strong>No vendemos ni rentamos tus datos.</strong></p>
        </Seccion>

        <Seccion titulo="5. Proveedores que nos ayudan a operar">
          <p>Para que la página funcione usamos proveedores que tratan los datos únicamente por nuestra cuenta y siguiendo nuestras instrucciones:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Supabase:</strong> base de datos, cuentas y almacenamiento de fotografías. Los servidores están en <strong>Canadá</strong>.</li>
            <li><strong>Vercel y Cloudflare:</strong> publicación de la página web.</li>
            <li><strong>Resend:</strong> envío de correos de aviso a la administración (por ejemplo, cuando alguien se inscribe a un taller).</li>
            <li><strong>Meta (Facebook e Instagram):</strong> solo para mostrar en la página las publicaciones públicas de {RESPONSABLE_CORTO}.</li>
          </ul>
          <p>Solo compartiremos tus datos con autoridades cuando una ley o una orden competente nos lo exija.</p>
        </Seccion>

        <Seccion titulo="6. Cuánto tiempo los conservamos">
          <p>
            Conservamos tus datos mientras tengas una cuenta activa o mientras sean necesarios para la finalidad por la que los diste
            (por ejemplo, la organización de un taller). Después los eliminamos o los dejamos anónimos, salvo que la ley nos pida
            conservarlos por más tiempo.
          </p>
        </Seccion>

        <Seccion titulo="7. Tus derechos ARCO y cómo retirar tu consentimiento">
          <p>
            Puedes <strong>Acceder</strong> a tus datos, <strong>Rectificarlos</strong> si están mal, <strong>Cancelarlos</strong> (pedir
            que los borremos) u <strong>Oponerte</strong> a algún uso. También puedes retirar tu consentimiento o limitar el uso de tus datos.
          </p>
          <p>Escríbenos por <ContactoLegal /> indicando:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Tu nombre y un medio para responderte.</li>
            <li>Qué derecho quieres ejercer y sobre qué datos.</li>
            <li>Algo que nos permita confirmar que eres tú (por ejemplo, escribir desde el correo o teléfono registrado).</li>
          </ul>
          <p>Te responderemos en un plazo máximo de 20 días hábiles. Tu nombre y teléfono también puedes corregirlos por tu cuenta desde <strong>Mi perfil</strong>.</p>
        </Seccion>

        <Seccion titulo="8. Cookies y almacenamiento en tu navegador">
          <p>
            No usamos cookies de publicidad ni herramientas de rastreo o analítica. Tu navegador solo guarda lo indispensable:
            tu sesión iniciada y preferencias de la página (como qué secciones del menú dejaste abiertas).
          </p>
        </Seccion>

        <Seccion titulo="9. Menores de edad">
          <p>
            Muchas actividades del festival son familiares. Si eres menor de 18 años, regístrate o inscríbete solo con el permiso de
            tu madre, padre o tutor. Si detectamos datos de un menor sin ese permiso, los eliminaremos.
          </p>
        </Seccion>

        <Seccion titulo="10. Seguridad">
          <p>
            Protegemos tus datos con conexiones cifradas, contraseñas cifradas y permisos por rol: cada persona solo puede modificar
            lo que le corresponde. Ningún sistema es 100% infalible; si ocurriera un incidente que afecte tus datos, te lo
            informaremos.
          </p>
        </Seccion>

        <Seccion titulo="11. Cambios a este aviso">
          <p>
            Si cambiamos este aviso, publicaremos la nueva versión en esta misma página con su fecha de actualización. Si el cambio es
            importante, también lo avisaremos en la página de inicio.
          </p>
          <p>
            Si consideras que tus derechos no fueron atendidos, puedes acudir ante la autoridad competente en materia de protección de
            datos personales. Consulta también nuestros <Link to="/terminos-condiciones" className="font-semibold text-[#2D7A3E] underline">Términos y Condiciones</Link>.
          </p>
        </Seccion>
      </div>
    </div>
  );
};
export default AvisoPrivacidad;
