import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, Edit, ExternalLink, Eye, EyeOff, Image, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { borrarArchivos, subirArchivo } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagenAmpliable } from '@/components/VisorImagenes';
import { useUrlLocal } from '@/lib/useUrlLocal';
import { BUCKET_EQUIPO, CAMPOS_INTEGRANTE, crearSlug, NOMBRES_RED } from '@/components/Equipo/equipo';
import type { Integrante, RedIntegrante, TipoRed } from '@/components/Equipo/equipo';
import { FotoIntegrante } from '@/components/Equipo/EquipoUi';

interface FormularioIntegrante {
  nombre: string;
  cargo: string;
  area: string;
  resumen: string;
  trayectoria: string;
  emprendimiento: string;
  emprendimientoUrl: string;
  orden: string;
  redes: RedIntegrante[];
  foto: File | null;
  logo: File | null;
}

const formularioInicial: FormularioIntegrante = {
  nombre: '',
  cargo: '',
  area: '',
  resumen: '',
  trayectoria: '',
  emprendimiento: '',
  emprendimientoUrl: '',
  orden: '',
  redes: [],
  foto: null,
  logo: null,
};

const campo = 'mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal focus:border-green-500 focus:outline-none';

export default function AdminEquipo() {
  const [integrantes, setIntegrantes] = useState<Integrante[]>([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [fotoActual, setFotoActual] = useState('');
  const urlFotoNueva = useUrlLocal(formulario.foto);
  const [logoActual, setLogoActual] = useState('');
  const urlLogoNuevo = useUrlLocal(formulario.logo);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Para sugerir las áreas que ya existen y no terminar con "Logistica" y "Logística"
  const areas = useMemo(() => [...new Set(integrantes.map((i) => i.area))], [integrantes]);

  useEffect(() => {
    cargarIntegrantes();
  }, []);

  async function cargarIntegrantes() {
    setCargando(true);
    setError(null);

    const { data, error: errorConsulta } = await supabase
      .from('equipo')
      .select(CAMPOS_INTEGRANTE)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true });

    if (errorConsulta) {
      setError('No se pudo cargar el equipo. ¿Ya corriste database/33_equipo_fdma.sql y 34_equipo_emprendimiento.sql?');
      console.error(errorConsulta);
    } else {
      setIntegrantes((data || []) as Integrante[]);
    }
    setCargando(false);
  }

  function cerrarFormulario() {
    setEditandoId(null);
    setFotoActual('');
    setLogoActual('');
    setFormulario(formularioInicial);
    setFormularioAbierto(false);
  }

  function abrirNuevo() {
    setEditandoId(null);
    setFotoActual('');
    setLogoActual('');
    setFormulario({ ...formularioInicial, orden: String(integrantes.length + 1), redes: [{ tipo: 'instagram', url: '' }] });
    setFormularioAbierto(true);
  }

  function abrirEdicion(integrante: Integrante) {
    setEditandoId(integrante.id);
    setFotoActual(integrante.foto_url || '');
    setLogoActual(integrante.emprendimiento_logo_url || '');
    setFormulario({
      nombre: integrante.nombre,
      cargo: integrante.cargo,
      area: integrante.area,
      resumen: integrante.resumen || '',
      trayectoria: integrante.trayectoria || '',
      emprendimiento: integrante.emprendimiento || '',
      emprendimientoUrl: integrante.emprendimiento_url || '',
      orden: String(integrante.orden),
      redes: integrante.redes || [],
      foto: null,
      logo: null,
    });
    setFormularioAbierto(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function manejarCambio(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  }

  function cambiarRed(indice: number, cambios: Partial<RedIntegrante>) {
    setFormulario((actual) => ({
      ...actual,
      redes: actual.redes.map((red, i) => (i === indice ? { ...red, ...cambios } : red)),
    }));
  }

  // Slug único: si ya existe otra persona con el mismo, se agrega -2, -3...
  function slugDisponible(nombre: string) {
    const base = crearSlug(nombre);
    const ocupados = new Set(integrantes.filter((i) => i.id !== editandoId).map((i) => i.slug));
    let slug = base;
    for (let n = 2; ocupados.has(slug); n++) slug = `${base}-${n}`;
    return slug;
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!formulario.nombre.trim() || !formulario.cargo.trim() || !formulario.area.trim()) {
      toast.error('Completa el nombre, el cargo y el área.');
      return;
    }

    const redes = formulario.redes
      .map((red) => ({ ...red, url: red.url.trim() }))
      .filter((red) => red.url);
    if (redes.some((red) => !/^https?:\/\//i.test(red.url))) {
      toast.error('Los enlaces de redes deben empezar con https://');
      return;
    }

    const emprendimiento = formulario.emprendimiento.trim() || null;
    // Si se quitó la red que estaba escogida, el emprendimiento se queda sin enlace
    const emprendimientoUrl = emprendimiento && redes.some((red) => red.url === formulario.emprendimientoUrl)
      ? formulario.emprendimientoUrl
      : null;

    setGuardando(true);
    let fotoSubida: { ruta: string; url: string } | null = null;
    let logoSubido: { ruta: string; url: string } | null = null;

    try {
      const actual = integrantes.find((item) => item.id === editandoId);
      let fotoUrl = fotoActual || null;
      let logoUrl = emprendimiento ? logoActual || null : null;

      if (formulario.foto) {
        fotoSubida = await subirArchivo(BUCKET_EQUIPO, 'equipo', formulario.foto);
        fotoUrl = fotoSubida.url;
      }
      if (emprendimiento && formulario.logo) {
        logoSubido = await subirArchivo(BUCKET_EQUIPO, 'emprendimientos', formulario.logo);
        logoUrl = logoSubido.url;
      }

      const nombre = formulario.nombre.trim();
      const datos = {
        nombre,
        // El enlace del perfil solo cambia si cambia el nombre
        slug: actual && actual.nombre === nombre ? actual.slug : slugDisponible(nombre),
        cargo: formulario.cargo.trim(),
        area: formulario.area.trim(),
        resumen: formulario.resumen.trim() || null,
        trayectoria: formulario.trayectoria.trim() || null,
        emprendimiento,
        emprendimiento_logo_url: logoUrl,
        emprendimiento_url: emprendimientoUrl,
        orden: Number(formulario.orden) || 0,
        redes,
        foto_url: fotoUrl,
      };

      const respuesta = editandoId
        ? await supabase.from('equipo').update(datos).eq('id', editandoId)
        : await supabase.from('equipo').insert({ ...datos, activo: true });

      if (respuesta.error) throw respuesta.error;

      // La foto y el logo anteriores se borran si se reemplazaron o se quitaron
      await borrarArchivos(BUCKET_EQUIPO, [
        actual?.foto_url !== fotoUrl ? actual?.foto_url : null,
        actual?.emprendimiento_logo_url !== logoUrl ? actual?.emprendimiento_logo_url : null,
      ]);

      toast.success(editandoId ? 'Integrante actualizado.' : 'Integrante agregado.');
      cerrarFormulario();
      await cargarIntegrantes();
    } catch (err) {
      const subidas = [fotoSubida, logoSubido].filter((archivo) => archivo !== null).map((archivo) => archivo.ruta);
      if (subidas.length) await supabase.storage.from(BUCKET_EQUIPO).remove(subidas);
      console.error(err);
      toast.error('No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(integrante: Integrante) {
    const { error: errorActualizacion } = await supabase
      .from('equipo')
      .update({ activo: !integrante.activo })
      .eq('id', integrante.id);

    if (errorActualizacion) {
      toast.error('No se pudo cambiar el estado.');
      return;
    }
    setIntegrantes((actuales) => actuales.map((item) => item.id === integrante.id
      ? { ...item, activo: !item.activo }
      : item));
  }

  async function eliminar(integrante: Integrante) {
    if (!window.confirm(`¿Eliminar a "${integrante.nombre}" del equipo? Esta acción no se puede deshacer.`)) return;

    const { error: errorEliminacion } = await supabase.from('equipo').delete().eq('id', integrante.id);
    if (errorEliminacion) {
      toast.error('No se pudo eliminar.');
      return;
    }

    await borrarArchivos(BUCKET_EQUIPO, [integrante.foto_url, integrante.emprendimiento_logo_url]);
    setIntegrantes((actuales) => actuales.filter((item) => item.id !== integrante.id));
    toast.success('Integrante eliminado.');
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2 sm:py-4 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipo FDMA</h1>
          <p className="mt-1 font-medium text-green-700">
            Directorio público en <a href="/equipo" target="_blank" rel="noreferrer" className="underline hover:text-green-900">/equipo</a>, agrupado por área
          </p>
        </div>
        <button onClick={abrirNuevo} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
          <Plus className="h-5 w-5" /> Nuevo integrante
        </button>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700"><AlertCircle className="h-5 w-5" />{error}</div>}

      {formularioAbierto && (
        <Card className="border-transparent bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 px-6 py-4">
            <CardTitle className="text-lg text-gray-800">{editandoId ? 'Editar integrante' : 'Nuevo integrante'}</CardTitle>
            <button onClick={cerrarFormulario} className="rounded-lg p-2 text-gray-500 hover:bg-gray-200" title="Cerrar formulario"><X className="h-5 w-5" /></button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={guardar} className="grid gap-6 md:grid-cols-2">
              <div className="space-y-5">
                <label className="block text-sm font-semibold text-gray-700">Nombre completo *
                  <input name="nombre" value={formulario.nombre} onChange={manejarCambio} maxLength={120} className={campo} required />
                </label>
                <label className="block text-sm font-semibold text-gray-700">Cargo o rol *
                  <input name="cargo" placeholder="Coordinadora general" value={formulario.cargo} onChange={manejarCambio} maxLength={120} className={campo} required />
                </label>
                <label className="block text-sm font-semibold text-gray-700">Área del organigrama *
                  <input name="area" list="areas-equipo" placeholder="Coordinación, Logística, Difusión..." value={formulario.area} onChange={manejarCambio} maxLength={80} className={campo} required />
                  <datalist id="areas-equipo">{areas.map((a) => <option key={a} value={a} />)}</datalist>
                  <span className="mt-1 block text-xs font-normal text-gray-500">Las personas con la misma área salen juntas. Escríbela igual para todas.</span>
                </label>
                <label className="block text-sm font-semibold text-gray-700">Emprendimiento o proyecto
                  <input name="emprendimiento" placeholder="Vivero Monos Garden" value={formulario.emprendimiento} onChange={manejarCambio} maxLength={120} className={campo} />
                </label>
                {formulario.emprendimiento.trim() && (
                  <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                    <div className="text-sm font-semibold text-gray-700">Logo del emprendimiento
                      {!(urlLogoNuevo || logoActual) ? (
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFormulario((actual) => ({ ...actual, logo: e.target.files?.[0] || null }))} className="mt-2 block w-full rounded-lg border border-gray-300 bg-white p-2 text-sm font-normal" />
                      ) : (
                        <div className="mt-2 flex items-center gap-3">
                          <ImagenAmpliable src={urlLogoNuevo || logoActual} alt="Logo del emprendimiento" className="h-16 w-16 rounded-full border bg-white object-contain" onQuitar={() => (formulario.logo ? setFormulario((actual) => ({ ...actual, logo: null })) : setLogoActual(''))} />
                          <p className="text-xs font-normal text-gray-500">{formulario.logo ? `Nuevo: ${formulario.logo.name}` : 'Logo actual'} · ✕ para quitarlo</p>
                        </div>
                      )}
                      <span className="mt-1 block text-xs font-normal text-gray-500">Sale en círculo junto al nombre. Cuadrado y con fondo blanco o transparente se ve mejor.</span>
                    </div>
                    <label className="block text-sm font-semibold text-gray-700">Al dar clic en el emprendimiento, abrir
                      <select name="emprendimientoUrl" value={formulario.emprendimientoUrl} onChange={(e) => setFormulario((actual) => ({ ...actual, emprendimientoUrl: e.target.value }))} className={`${campo} bg-white`}>
                        <option value="">Nada (solo mostrar el nombre)</option>
                        {formulario.redes.filter((red) => /^https?:\/\//i.test(red.url.trim())).map((red, indice) => (
                          <option key={`${red.url}-${indice}`} value={red.url.trim()}>{NOMBRES_RED[red.tipo]} · {red.url.trim().replace(/^https?:\/\/(www\.)?/i, '')}</option>
                        ))}
                      </select>
                      <span className="mt-1 block text-xs font-normal text-gray-500">Sale de sus «Redes sociales». Si la del emprendimiento no aparece, agrégala ahí primero.</span>
                    </label>
                  </div>
                )}
                <label className="block text-sm font-semibold text-gray-700">Semblanza corta
                  <textarea name="resumen" rows={3} placeholder="Una o dos líneas: aparece en la tarjeta al pasar el cursor por la foto." value={formulario.resumen} onChange={manejarCambio} maxLength={300} className={campo} />
                  <span className="mt-1 block text-right text-xs font-normal text-gray-400">{formulario.resumen.length}/300</span>
                </label>
                <label className="block text-sm font-semibold text-gray-700">Orden
                  <input name="orden" type="number" min={0} value={formulario.orden} onChange={manejarCambio} className={`${campo} w-32`} />
                  <span className="mt-1 block text-xs font-normal text-gray-500">Las áreas salen en el orden de su primera persona; dentro de cada área, por este número.</span>
                </label>
              </div>

              <div className="space-y-5">
                <div className="text-sm font-semibold text-gray-700">Foto
                  {!(urlFotoNueva || fotoActual) ? (
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFormulario((actual) => ({ ...actual, foto: e.target.files?.[0] || null }))} className="mt-2 block w-full rounded-lg border border-gray-300 p-2 text-sm font-normal" />
                  ) : (
                    <div className="mt-2 flex items-center gap-3">
                      <ImagenAmpliable src={urlFotoNueva || fotoActual} alt="Foto del integrante" className="h-28 w-24 rounded-xl border object-cover" onQuitar={() => (formulario.foto ? setFormulario((actual) => ({ ...actual, foto: null })) : setFotoActual(''))} />
                      <p className="text-xs font-normal text-gray-500">{formulario.foto ? `Nueva: ${formulario.foto.name}` : 'Foto actual'} · clic para verla en grande, ✕ para quitarla</p>
                    </div>
                  )}
                  <span className="mt-1 block text-xs font-normal text-gray-500">Vertical de preferencia (se recorta 4:5). Sin foto se muestran sus iniciales.</span>
                </div>

                <div className="text-sm font-semibold text-gray-700">Redes sociales
                  <div className="mt-2 space-y-2">
                    {formulario.redes.map((red, indice) => (
                      <div key={indice} className="flex gap-2">
                        <select value={red.tipo} onChange={(e) => cambiarRed(indice, { tipo: e.target.value as TipoRed })} className="rounded-lg border border-gray-300 px-2 py-2 font-normal focus:border-green-500 focus:outline-none" aria-label="Red social">
                          {(Object.keys(NOMBRES_RED) as TipoRed[]).map((tipo) => <option key={tipo} value={tipo}>{NOMBRES_RED[tipo]}</option>)}
                        </select>
                        <input type="url" placeholder="https://..." value={red.url} onChange={(e) => cambiarRed(indice, { url: e.target.value })} className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 font-normal focus:border-green-500 focus:outline-none" aria-label="Enlace" />
                        <button type="button" onClick={() => setFormulario((actual) => ({ ...actual, redes: actual.redes.filter((_, i) => i !== indice) }))} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600" title="Quitar"><X className="h-4 w-4" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setFormulario((actual) => ({ ...actual, redes: [...actual.redes, { tipo: 'instagram', url: '' }] }))} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50">
                      <Plus className="h-4 w-4" /> Agregar red
                    </button>
                  </div>
                  <span className="mt-1 block text-xs font-normal text-gray-500">Personales o de su emprendimiento.</span>
                </div>

                <label className="block text-sm font-semibold text-gray-700">Trayectoria
                  <textarea name="trayectoria" rows={8} placeholder="Estudios, experiencia, proyectos... Deja una línea en blanco entre párrafos." value={formulario.trayectoria} onChange={manejarCambio} className={campo} />
                </label>

                <button type="submit" disabled={guardando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {guardando ? <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</> : <><Image className="h-5 w-5" /> Guardar integrante</>}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-transparent bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 px-6 py-4"><CardTitle className="text-lg text-gray-800">Integrantes</CardTitle></CardHeader>
        <CardContent className="p-0">
          {cargando ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
          ) : integrantes.length === 0 ? (
            <p className="p-8 text-center text-gray-600">Aún no hay integrantes. Agrega al primero con «Nuevo integrante».</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {integrantes.map((integrante) => (
                <li key={integrante.id} className={`flex items-center gap-4 px-6 py-3 ${integrante.activo ? '' : 'opacity-50'}`}>
                  <span className="w-6 text-center text-sm text-gray-400">{integrante.orden}</span>
                  <FotoIntegrante integrante={integrante} className="h-12 w-12 shrink-0 rounded-full border [&_span]:text-sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">{integrante.nombre}</p>
                    <p className="truncate text-xs text-gray-500">{integrante.cargo} · <span className="font-semibold text-green-700">{integrante.area}</span></p>
                  </div>
                  <div className="flex gap-1">
                    <a href={`/equipo/${integrante.slug}`} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title="Ver perfil"><ExternalLink className="h-4 w-4" /></a>
                    <button onClick={() => abrirEdicion(integrante)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title="Editar"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => alternarEstado(integrante)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title={integrante.activo ? 'Ocultar' : 'Mostrar'}>{integrante.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    <button onClick={() => eliminar(integrante)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
