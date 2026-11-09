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

export const TerminosCondiciones = () => {
  return (
    <div className="landing-page py-12 px-4 max-w-4xl mx-auto text-[#4A2E18]">
      <h1 className="text-3xl font-black mb-2">Términos y Condiciones</h1>
      <p className="text-sm opacity-80 mb-6">Última actualización: {FECHA_ACTUALIZACION}</p>

      <div className="space-y-6 text-sm leading-relaxed bg-white/75 p-6 rounded-2xl border border-[#4A2E18]/10">
        <Seccion titulo="1. Quiénes somos y aceptación">
          <p>
            Este sitio lo opera <strong>{RESPONSABLE}</strong> ({RESPONSABLE_CORTO}), con domicilio en {DOMICILIO}, e incluye el
            proyecto de composta comunitaria <strong>Eco Guardianes</strong>. Al navegar el sitio, inscribirte a un taller o crear una
            cuenta, aceptas estos términos y nuestro{' '}
            <Link to="/aviso-privacidad" className="font-semibold text-[#2D7A3E] underline">Aviso de Privacidad</Link>.
            Si no estás de acuerdo, por favor no uses el sitio.
          </p>
        </Seccion>

        <Seccion titulo="2. Qué ofrece el sitio">
          <p>
            Información del Festival del Medio Ambiente (cartelera, calendario, convocatorias y publicaciones), inscripción a talleres y
            la plataforma Eco Guardianes para registrar el cuidado de los composteros comunitarios. El uso del sitio es gratuito.
          </p>
        </Seccion>

        <Seccion titulo="3. Cuentas de Eco Guardianes">
          <ul className="list-disc space-y-1 pl-5">
            <li>Para crear una cuenta necesitas el código de acceso de tu colonia, que entrega la administración del proyecto.</li>
            <li>Los datos de tu registro deben ser verdaderos y estar actualizados. Cada cuenta es personal: no la compartas.</li>
            <li>Cuidas la confidencialidad de tu contraseña y respondes por lo que se haga con tu cuenta. Si crees que alguien más entró, avísanos de inmediato.</li>
            <li>La administración puede suspender o dar de baja cuentas que incumplan estos términos o que dejen de participar en el proyecto.</li>
          </ul>
        </Seccion>

        <Seccion titulo="4. Uso permitido">
          <p>Al usar el sitio te comprometes a no:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Registrar información falsa o a nombre de otra persona.</li>
            <li>Intentar entrar a secciones, cuentas o datos que no te corresponden, ni probar o vulnerar la seguridad del sitio.</li>
            <li>Enviar spam, inscripciones falsas o cargas masivas automatizadas.</li>
            <li>Publicar contenido ofensivo, discriminatorio, ilegal o ajeno al proyecto.</li>
          </ul>
        </Seccion>

        <Seccion titulo="5. Bitácoras y fotografías que subes">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Las fotografías deben mostrar solo el compostero: estado de los residuos, temperatura, humedad y fauna. Está prohibido subir
              fotos de rostros de menores de edad o de personas que no hayan dado su permiso, así como fotos de interiores de casas o datos
              personales visibles (placas, documentos, etc.).
            </li>
            <li>
              Sigues siendo titular de tus fotos y registros. Al subirlos autorizas a {RESPONSABLE_CORTO} a usarlos, sin fines de lucro,
              en el seguimiento, los reportes y la difusión del proyecto ambiental, sin mostrar tus datos personales.
            </li>
            <li>La administración puede ocultar o eliminar registros o fotos que no cumplan estas reglas.</li>
          </ul>
        </Seccion>

        <Seccion titulo="6. Talleres, recorridos y eventos">
          <ul className="list-disc space-y-1 pl-5">
            <li>La entrada a las actividades es libre, salvo que la actividad indique una cuota; en ese caso la cuota la cobra y administra quien imparte la actividad.</li>
            <li>Los talleres con cupo se asignan por orden de inscripción. Si ya no puedes asistir, avísanos para liberar tu lugar.</li>
            <li>Fechas, horarios, sedes y participantes pueden cambiar por clima, seguridad u otras causas. Avisaremos en este sitio y en nuestras redes.</li>
            <li>
              En recorridos (a pie o en bicicleta) y actividades al aire libre participas bajo tu propia responsabilidad: sigue las
              indicaciones del equipo, usa el equipo de seguridad necesario y cuida tu salud. Las niñas, niños y adolescentes deben ir
              acompañados por una persona adulta responsable.
            </li>
            <li>En los eventos se pueden tomar fotos y videos generales para difundir el festival. Si no quieres aparecer, avísale al equipo en el lugar.</li>
          </ul>
        </Seccion>

        <Seccion titulo="7. Contenido de terceros">
          <p>
            El sitio muestra publicaciones de redes sociales, convocatorias de aliados y enlaces a otros sitios. Cada organización es
            responsable de su propio contenido, bases y procesos de registro; {RESPONSABLE_CORTO} solo los difunde.
          </p>
        </Seccion>

        <Seccion titulo="8. Propiedad intelectual">
          <p>
            Los logotipos, textos, diseño y materiales de {RESPONSABLE_CORTO} y Eco Guardianes nos pertenecen o los usamos con permiso.
            Puedes compartirlos para difundir el festival o el proyecto citando la fuente, pero no modificarlos ni usarlos con fines
            comerciales sin autorización. Los carteles y logos de aliados y participantes pertenecen a sus autores.
          </p>
        </Seccion>

        <Seccion titulo="9. Disponibilidad y responsabilidad">
          <p>
            Hacemos nuestro mejor esfuerzo para que el sitio funcione y la información sea correcta, pero puede haber interrupciones o
            errores. El sitio se ofrece sin costo y tal como está; {RESPONSABLE_CORTO} no responde por daños derivados de su uso, salvo
            lo que la ley establezca.
          </p>
        </Seccion>

        <Seccion titulo="10. Cambios, ley aplicable y contacto">
          <p>
            Podemos actualizar estos términos; la versión vigente es la publicada en esta página con su fecha. Estos términos se rigen por
            las leyes de los Estados Unidos Mexicanos; cualquier controversia se atenderá ante los tribunales competentes de Matamoros,
            Tamaulipas.
          </p>
          <p>Dudas o reportes: <ContactoLegal />.</p>
        </Seccion>
      </div>
    </div>
  );
};
export default TerminosCondiciones;
