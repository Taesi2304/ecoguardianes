import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertCircle, CalendarClock, Edit, Eye, EyeOff, ImagePlus, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImagenAmpliable } from '@/components/VisorImagenes';
import { useUrlLocal } from '@/lib/useUrlLocal';
import { borrarArchivos, subirArchivo } from '@/lib/storage';
import { formatearFecha, formatearHora } from '@/lib/utils';
import { BUCKET_IMAGENES, CAMPOS_PARTICIPANTE, ordenarHorarios } from '@/components/Cartelera/cartelera';
import type { Catalogo, Participante } from '@/components/Cartelera/cartelera';

interface HorarioFormulario {
  clave: string;
  sede: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
}

interface FormularioParticipante {
  nombre: string;
  subtitulo: string;
  descripcion: string;
  tipo_id: string;
  grupo_ids: string[];
  procedencia: string;
  enlace_url: string;
  imagenes: string[];
  nuevasImagenes: File[];
  horarios: HorarioFormulario[];
}

const MAX_IMAGENES = 6;
const claseInput = 'mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-green-500 focus:outline-none';
const claseAyuda = 'mt-1 block text-xs font-normal text-gray-500';

const horarioVacio = (sede = '', fecha = ''): HorarioFormulario => ({ clave: crypto.randomUUID(), sede, fecha, hora_inicio: '', hora_fin: '' });

const formularioInicial = (): FormularioParticipante => ({
  nombre: '',
  subtitulo: '',
  descripcion: '',
  tipo_id: '',
  grupo_ids: [],
  procedencia: '',
  enlace_url: '',
  imagenes: [],
  nuevasImagenes: [],
  horarios: [horarioVacio()],
});

interface Props {
  tipos: Catalogo[];
  grupos: Catalogo[];
  edicionId: string | null; // null si aún no se corre 18_ediciones_festival.sql
}

// Las fotos se comparten entre ediciones al copiar participantes:
// solo se borran del Storage las que ya no usa ningún otro participante
async function borrarImagenesSinUso(urls: string[], participanteId: string | null) {
  if (urls.length === 0) return;
  let consulta = supabase.from('cartelera_participantes').select('imagenes').overlaps('imagenes', urls);
  if (participanteId) consulta = consulta.neq('id', participanteId);
  const { data, error } = await consulta;
  if (error) return; // Ante la duda no se borra nada
  const enUso = new Set((data || []).flatMap((fila) => fila.imagenes as string[]));
  await borrarArchivos(BUCKET_IMAGENES, urls.filter((url) => !enUso.has(url)));
}

// Miniatura de una foto aún no subida: URL local temporal que se libera al quitarla
function VistaPreviaArchivo({ archivo }: { archivo: File }) {
  const url = useUrlLocal(archivo);
  return url
    ? <ImagenAmpliable src={url} alt={archivo.name} className="h-24 w-24 rounded-lg border-2 border-dashed border-green-400" />
    : <div className="h-24 w-24 rounded-lg bg-green-50" />;
}

export function ParticipantesCartelera({ tipos, grupos, edicionId }: Props) {
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState(''); // '' = todos, 'sin' = sin tipo, o el id del tipo
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarParticipantes();
  }, [edicionId]);

  async function cargarParticipantes() {
    setCargando(true);
    let consulta = supabase
      .from('cartelera_participantes')
      .select(CAMPOS_PARTICIPANTE)
      .order('nombre', { ascending: true });
    if (edicionId) consulta = consulta.eq('edicion_id', edicionId);
    const { data, error: errorConsulta } = await consulta;

    if (errorConsulta) {
      setError('No se pudieron cargar los participantes.');
      console.error(errorConsulta);
    } else {
      setError(null);
      setParticipantes((data || []) as Participante[]);
    }
    setCargando(false);
  }

  const nombreCatalogo = (lista: Catalogo[], id: string | null) => lista.find((item) => item.id === id);

  function cerrarFormulario() {
    setEditandoId(null);
    setFormulario(formularioInicial());
    setFormularioAbierto(false);
  }

  function abrirNuevo() {
    setEditandoId(null);
    // Reutiliza la última sede y fecha capturadas para agilizar la carga de muchos participantes
    const ultimo = participantes.flatMap((participante) => participante.cartelera_horarios).at(-1);
    setFormulario({ ...formularioInicial(), horarios: [horarioVacio(ultimo?.sede, ultimo?.fecha)] });
    setFormularioAbierto(true);
  }

  function abrirEdicion(participante: Participante) {
    setEditandoId(participante.id);
    setFormulario({
      nombre: participante.nombre,
      subtitulo: participante.subtitulo || '',
      descripcion: participante.descripcion || '',
      tipo_id: participante.tipo_id || '',
      grupo_ids: participante.grupo_ids,
      procedencia: participante.procedencia || '',
      enlace_url: participante.enlace_url || '',
      imagenes: participante.imagenes,
      nuevasImagenes: [],
      horarios: participante.cartelera_horarios.length > 0
        ? ordenarHorarios(participante.cartelera_horarios).map((horario) => ({
            clave: horario.id,
            sede: horario.sede,
            fecha: horario.fecha,
            hora_inicio: horario.hora_inicio.slice(0, 5),
            hora_fin: horario.hora_fin?.slice(0, 5) || '',
          }))
        : [horarioVacio()],
    });
    setFormularioAbierto(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function manejarCambio(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
  }

  function alternarGrupo(id: string) {
    setFormulario((actual) => ({
      ...actual,
      grupo_ids: actual.grupo_ids.includes(id) ? actual.grupo_ids.filter((item) => item !== id) : [...actual.grupo_ids, id],
    }));
  }

  function cambiarHorario(clave: string, campo: keyof Omit<HorarioFormulario, 'clave'>, valor: string) {
    setFormulario((actual) => ({
      ...actual,
      horarios: actual.horarios.map((horario) => horario.clave === clave ? { ...horario, [campo]: valor } : horario),
    }));
  }

  function agregarHorario() {
    setFormulario((actual) => {
      const ultimo = actual.horarios.at(-1);
      return { ...actual, horarios: [...actual.horarios, horarioVacio(ultimo?.sede, ultimo?.fecha)] };
    });
  }

  function quitarHorario(clave: string) {
    setFormulario((actual) => ({ ...actual, horarios: actual.horarios.filter((horario) => horario.clave !== clave) }));
  }

  function agregarImagenes(e: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(e.target.files || []);
    e.target.value = '';
    setFormulario((actual) => {
      const espacio = MAX_IMAGENES - actual.imagenes.length - actual.nuevasImagenes.length;
      if (archivos.length > espacio) toast.error(`Máximo ${MAX_IMAGENES} fotos por participante.`);
      return { ...actual, nuevasImagenes: [...actual.nuevasImagenes, ...archivos.slice(0, Math.max(espacio, 0))] };
    });
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const horarios = formulario.horarios.filter((horario) => horario.sede.trim() || horario.fecha || horario.hora_inicio);
    if (horarios.some((horario) => !horario.sede.trim() || !horario.fecha || !horario.hora_inicio)) {
      toast.error('Cada horario necesita sede, fecha y hora de inicio.');
      return;
    }

    setGuardando(true);
    const subidas: string[] = [];

    try {
      for (const archivo of formulario.nuevasImagenes) {
        subidas.push((await subirArchivo(BUCKET_IMAGENES, 'participantes', archivo)).url);
      }

      const datos = {
        nombre: formulario.nombre.trim(),
        subtitulo: formulario.subtitulo.trim() || null,
        descripcion: formulario.descripcion.trim() || null,
        tipo_id: formulario.tipo_id || null,
        grupo_ids: formulario.grupo_ids,
        procedencia: formulario.procedencia.trim() || null,
        enlace_url: formulario.enlace_url.trim() || null,
        imagenes: [...formulario.imagenes, ...subidas],
      };

      let participanteId = editandoId;
      if (editandoId) {
        const { error: errorActualizacion } = await supabase.from('cartelera_participantes').update(datos).eq('id', editandoId);
        if (errorActualizacion) throw errorActualizacion;
      } else {
        const { data, error: errorInsercion } = await supabase
          .from('cartelera_participantes')
          .insert({ ...datos, activo: true, ...(edicionId ? { edicion_id: edicionId } : {}) })
          .select('id')
          .single();
        if (errorInsercion) throw errorInsercion;
        participanteId = data.id;
      }

      // Los horarios se reemplazan completos: es más simple que calcular altas/bajas/cambios
      const { error: errorBorrado } = await supabase.from('cartelera_horarios').delete().eq('participante_id', participanteId);
      if (errorBorrado) throw errorBorrado;
      if (horarios.length > 0) {
        const { error: errorHorarios } = await supabase.from('cartelera_horarios').insert(horarios.map((horario) => ({
          participante_id: participanteId,
          sede: horario.sede.trim(),
          fecha: horario.fecha,
          hora_inicio: horario.hora_inicio,
          hora_fin: horario.hora_fin || null,
        })));
        if (errorHorarios) throw errorHorarios;
      }

      const anterior = participantes.find((participante) => participante.id === editandoId);
      if (anterior) {
        await borrarImagenesSinUso(anterior.imagenes.filter((url) => !formulario.imagenes.includes(url)), anterior.id);
      }

      toast.success(editandoId ? 'Participante actualizado.' : 'Participante agregado.');
      cerrarFormulario();
      await cargarParticipantes();
    } catch (err) {
      await borrarArchivos(BUCKET_IMAGENES, subidas);
      console.error(err);
      toast.error('No se pudo guardar el participante.');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarEstado(participante: Participante) {
    const { error: errorActualizacion } = await supabase
      .from('cartelera_participantes')
      .update({ activo: !participante.activo })
      .eq('id', participante.id);

    if (errorActualizacion) {
      toast.error('No se pudo cambiar el estado.');
      return;
    }
    setParticipantes((actuales) => actuales.map((item) => item.id === participante.id ? { ...item, activo: !item.activo } : item));
  }

  async function eliminar(participante: Participante) {
    if (!window.confirm(`¿Eliminar a "${participante.nombre}" y sus horarios? Esta acción no se puede deshacer.`)) return;

    const { error: errorEliminacion } = await supabase.from('cartelera_participantes').delete().eq('id', participante.id);
    if (errorEliminacion) {
      toast.error('No se pudo eliminar el participante.');
      return;
    }
    await borrarImagenesSinUso(participante.imagenes, participante.id);
    setParticipantes((actuales) => actuales.filter((item) => item.id !== participante.id));
    toast.success('Participante eliminado.');
  }

  const termino = busqueda.trim().toLowerCase();
  const filtrados = participantes.filter((participante) => {
    if (tipoFiltro === 'sin' ? participante.tipo_id : tipoFiltro && participante.tipo_id !== tipoFiltro) return false;
    return !termino || `${participante.nombre} ${participante.subtitulo || ''}`.toLowerCase().includes(termino);
  });
  const hayFiltros = termino !== '' || tipoFiltro !== '';
  const totalImagenes = formulario.imagenes.length + formulario.nuevasImagenes.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar participante..." className="w-full rounded-xl border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none sm:w-64" />
          <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} aria-label="Filtrar por tipo de actividad" className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 focus:border-green-500 focus:outline-none sm:w-52">
            <option value="">Todos los tipos</option>
            {tipos.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
            <option value="sin">Sin tipo</option>
          </select>
        </div>
        <button onClick={abrirNuevo} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-700">
          <Plus className="h-5 w-5" /> Nuevo participante
        </button>
      </div>

      {error && <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700"><AlertCircle className="h-5 w-5" />{error}</div>}

      {formularioAbierto && (
        <Card className="border-transparent bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 px-6 py-4">
            <CardTitle className="text-lg text-gray-800">{editandoId ? 'Editar participante' : 'Nuevo participante'}</CardTitle>
            <button onClick={cerrarFormulario} className="rounded-lg p-2 text-gray-500 hover:bg-gray-200" title="Cerrar formulario"><X className="h-5 w-5" /></button>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={guardar} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-5">
                  <label className="block text-sm font-semibold text-gray-700">Nombre del participante
                    <input name="nombre" value={formulario.nombre} onChange={manejarCambio} maxLength={150} placeholder="Colectivo Semillas Vivas" className={claseInput} required />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">Actividad u obra (subtítulo)
                    <input name="subtitulo" value={formulario.subtitulo} onChange={manejarCambio} maxLength={200} placeholder="Taller de bombas de semillas" className={claseInput} />
                  </label>
                  <div className="grid items-start gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-gray-700">Tipo de actividad
                      <select name="tipo_id" value={formulario.tipo_id} onChange={manejarCambio} className={`${claseInput} bg-white`}>
                        <option value="">Sin tipo</option>
                        {tipos.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>)}
                      </select>
                      <span className={claseAyuda}>Qué hace: Taller, Ponencia, Música… Se usa en el filtro «Actividad» y en la etiqueta de color.</span>
                    </label>
                    <fieldset className="text-sm font-semibold text-gray-700">
                      <legend>Grupos</legend>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-gray-300 px-3 py-2">
                        {grupos.length === 0 && <span className="font-normal text-gray-500">Aún no hay grupos.</span>}
                        {grupos.map((grupo) => (
                          <label key={grupo.id} className="flex cursor-pointer items-center gap-2 font-normal">
                            <input type="checkbox" checked={formulario.grupo_ids.includes(grupo.id)} onChange={() => alternarGrupo(grupo.id)} className="h-4 w-4 accent-green-600" />
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: grupo.color }} />
                            {grupo.nombre}
                          </label>
                        ))}
                      </div>
                      <span className={claseAyuda}>Puede estar en varios: Talleristas, Colectivos… Se usa en el filtro «Grupo» de la cartelera. Los días salen solos de los horarios.</span>
                    </fieldset>
                  </div>
                  <label className="block text-sm font-semibold text-gray-700">Procedencia
                    <input name="procedencia" value={formulario.procedencia} onChange={manejarCambio} maxLength={100} placeholder="Tampico" className={claseInput} />
                    <span className={claseAyuda}>De dónde viene: ciudad, escuela u organización. Se ve arriba a la derecha del detalle.</span>
                  </label>
                </div>
                <div className="space-y-5">
                  <label className="block text-sm font-semibold text-gray-700">Descripción (Opcional)
                    <textarea name="descripcion" value={formulario.descripcion} onChange={manejarCambio} maxLength={500} rows={4} className={`${claseInput} resize-none`} />
                  </label>
                  <label className="block text-sm font-semibold text-gray-700">Instagram / Facebook / sitio (Opcional)
                    <input name="enlace_url" type="url" value={formulario.enlace_url} onChange={manejarCambio} placeholder="https://www.instagram.com/..." className={claseInput} />
                  </label>
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-gray-700">Fotos ({totalImagenes}/{MAX_IMAGENES}) — la primera es la portada</legend>
                <div className="flex flex-wrap gap-3">
                  {formulario.imagenes.map((url) => (
                    <div key={url} className="relative">
                      <ImagenAmpliable src={url} alt="Foto del participante" className="h-24 w-24 rounded-lg" />
                      <button type="button" onClick={() => setFormulario((actual) => ({ ...actual, imagenes: actual.imagenes.filter((item) => item !== url) }))} className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-red-600 shadow" title="Quitar foto"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {formulario.nuevasImagenes.map((archivo, indice) => (
                    <div key={`${archivo.name}-${indice}`} className="relative">
                      <VistaPreviaArchivo archivo={archivo} />
                      <button type="button" onClick={() => setFormulario((actual) => ({ ...actual, nuevasImagenes: actual.nuevasImagenes.filter((_, i) => i !== indice) }))} className="absolute -right-2 -top-2 rounded-full bg-white p-1 text-red-600 shadow" title="Quitar foto"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {totalImagenes < MAX_IMAGENES && (
                    <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-green-400 hover:text-green-700">
                      <ImagePlus className="h-6 w-6" /> Agregar
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={agregarImagenes} className="hidden" />
                    </label>
                  )}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700"><CalendarClock className="h-4 w-4" /> Horarios</legend>
                <div className="space-y-2">
                  {formulario.horarios.map((horario) => (
                    <div key={horario.clave} className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-2 sm:grid-cols-[2fr_1.2fr_1fr_1fr_auto]">
                      <input value={horario.sede} onChange={(e) => cambiarHorario(horario.clave, 'sede', e.target.value)} placeholder="Sede (Parque El Laguito)" maxLength={150} aria-label="Sede" className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none sm:col-span-1" />
                      <input type="date" value={horario.fecha} onChange={(e) => cambiarHorario(horario.clave, 'fecha', e.target.value)} aria-label="Fecha" className="col-span-2 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none sm:col-span-1" />
                      <input type="time" value={horario.hora_inicio} onChange={(e) => cambiarHorario(horario.clave, 'hora_inicio', e.target.value)} aria-label="Hora de inicio" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
                      <input type="time" value={horario.hora_fin} onChange={(e) => cambiarHorario(horario.clave, 'hora_fin', e.target.value)} aria-label="Hora de término" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
                      <button type="button" onClick={() => quitarHorario(horario.clave)} className="col-span-2 rounded-lg p-2 text-gray-400 hover:bg-white hover:text-red-600 sm:col-span-1" title="Quitar horario"><Trash2 className="mx-auto h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={agregarHorario} className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline"><Plus className="h-4 w-4" /> Agregar horario</button>
              </fieldset>

              <button type="submit" disabled={guardando} className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
                {guardando ? <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</> : <><Save className="h-5 w-5" /> Guardar participante</>}
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-transparent bg-white shadow-sm">
        <CardHeader className="border-b bg-gray-50/50 px-6 py-4"><CardTitle className="text-lg text-gray-800">Participantes ({hayFiltros ? `${filtrados.length} de ${participantes.length}` : participantes.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {cargando ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
          ) : filtrados.length === 0 ? (
            <p className="p-8 text-center text-gray-600">{participantes.length === 0 ? 'Aún no hay participantes en la cartelera.' : 'Sin resultados.'}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filtrados.map((participante) => {
                const tipo = nombreCatalogo(tipos, participante.tipo_id);
                const gruposDelParticipante = grupos.filter((grupo) => participante.grupo_ids.includes(grupo.id));
                const primerHorario = ordenarHorarios(participante.cartelera_horarios)[0];
                return (
                  <li key={participante.id} className={`flex items-center gap-4 px-6 py-3 ${participante.activo ? '' : 'opacity-50'}`}>
                    {participante.imagenes[0]
                      ? <ImagenAmpliable src={participante.imagenes[0]} alt={participante.nombre} className="h-14 w-14 rounded-lg" />
                      : <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900">{participante.nombre}</p>
                      {participante.subtitulo && <p className="truncate text-sm text-gray-500">{participante.subtitulo}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        {tipo && <span className="rounded-full px-2 py-0.5 font-semibold text-white" style={{ backgroundColor: tipo.color }}>{tipo.nombre}</span>}
                        {gruposDelParticipante.map((grupo) => (
                          <span key={grupo.id} className="flex items-center gap-1 text-gray-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: grupo.color }} />{grupo.nombre}</span>
                        ))}
                        <span className="text-gray-500">
                          {participante.cartelera_horarios.length === 0
                            ? 'Sin horarios'
                            : `${formatearFecha(primerHorario.fecha)} ${formatearHora(primerHorario.hora_inicio)}${participante.cartelera_horarios.length > 1 ? ` (+${participante.cartelera_horarios.length - 1})` : ''}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => abrirEdicion(participante)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title="Editar"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => alternarEstado(participante)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-green-600" title={participante.activo ? 'Ocultar' : 'Mostrar'}>{participante.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      <button onClick={() => eliminar(participante)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-red-600" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
