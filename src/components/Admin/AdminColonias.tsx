import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Edit, EyeOff, Eye, Search, AlertCircle, Map, MapPin, Trash2, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface Colonia {
  id: string;
  nombre: string;
  municipio: string;
  estado: string;
  codigo_postal: string | null;
  codigo_acceso_colonia: string;
  whatsapp_url: string | null;
  activo: boolean;
  created_at: string;
}

export default function AdminColonias() {
  const navigate = useNavigate();
  const [colonias, setColonias] = useState<Colonia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Estados del Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formulario, setFormulario] = useState({
    nombre: '',
    municipio: 'Matamoros',
    estado: 'Tamaulipas',
    codigo_postal: '',
    codigo_acceso_colonia: '',
    whatsapp_url: ''
  });

  useEffect(() => {
    verificarAccesoYCargar();
  }, []);

  const verificarAccesoYCargar = async () => {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No autorizado');

      // Bloqueo de seguridad: Validar que sea Super Admin
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('roles(nombre)')
        .eq('auth_user_id', user.id)
        .single();
        
      const rolNombre = Array.isArray(usuario?.roles) ? usuario.roles[0]?.nombre : (usuario?.roles as any)?.nombre;
      
      if (rolNombre !== 'Super Admin') {
        navigate('/admin'); // Lo expulsa al dashboard general
        return;
      }

      // Cargar Colonias
      const { data: dataColonias, error: errColonias } = await supabase
        .from('colonias')
        .select('*')
        .order('nombre');

      if (errColonias) throw errColonias;
      setColonias(dataColonias as Colonia[]);

    } catch (err: any) {
      setError('Ocurrió un error al cargar las colonias.');
    } finally {
      setCargando(false);
    }
  };

  const coloniasFiltradas = colonias.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.codigo_postal && c.codigo_postal.includes(busqueda))
  );

  const generarCodigoAcceso = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const abrirModalNuevo = () => {
    setEditandoId(null);
    setFormulario({ 
      nombre: '', 
      municipio: 'Matamoros', 
      estado: 'Tamaulipas', 
      codigo_postal: '',
      codigo_acceso_colonia: generarCodigoAcceso(),
      whatsapp_url: ''
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (c: Colonia) => {
    setEditandoId(c.id);
    setFormulario({
      nombre: c.nombre,
      municipio: c.municipio || 'Matamoros',
      estado: c.estado || 'Tamaulipas',
      codigo_postal: c.codigo_postal || '',
      codigo_acceso_colonia: c.codigo_acceso_colonia || generarCodigoAcceso(),
      whatsapp_url: c.whatsapp_url || ''
    });
    setModalAbierto(true);
  };

  const manejarCambio = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const guardarColonia = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    // Un campo vacío se guarda como null: la colonia aún no tiene grupo
    const datos = { ...formulario, whatsapp_url: formulario.whatsapp_url.trim() || null };
    try {
      if (editandoId) {
        const { error } = await supabase.from('colonias').update(datos).eq('id', editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('colonias').insert([datos]);
        if (error) throw error;
      }
      setModalAbierto(false);
      await verificarAccesoYCargar();
    } catch (err: any) {
      alert('Error al guardar. Verifica que el código de acceso no esté repetido en otra colonia.');
    } finally {
      setCargando(false);
    }
  };

  const alternarEstado = async (id: string, estadoActual: boolean) => {
    try {
      await supabase.from('colonias').update({ activo: !estadoActual }).eq('id', id);
      setColonias(colonias.map(c => c.id === id ? { ...c, activo: !estadoActual } : c));
    } catch (err) {
      alert('Error al cambiar el estado.');
    }
  };

  const eliminarColonia = async (id: string) => {
    if (!window.confirm('¿Estás segura de que deseas eliminar esta zona operativa permanentemente? Esta acción no se puede deshacer.')) return;

    try {
      const { error } = await supabase.from('colonias').delete().eq('id', id);
      if (error) throw error;

      setColonias(colonias.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      alert('No se puede eliminar. Es probable que esta colonia ya tenga composteros o usuarios vinculados a ella. Desactívala o reasigna sus elementos primero.');
    }
  };

  if (cargando && colonias.length === 0) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-green-600" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl py-2 sm:py-4 animate-in fade-in duration-500">
      
      {/* Cabecera */}
      <div className="mb-8 flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">Zonas Operativas</h1>
          <p className="mt-1 font-medium text-green-700">Gestión global de colonias registradas</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar colonia o C.P..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:w-64"
            />
          </div>
          <button onClick={abrirModalNuevo} className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700">
            <Plus className="h-5 w-5" /> Nueva Colonia
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" /> <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Tabla CRUD */}
      <Card className="overflow-hidden shadow-sm border-transparent bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="tabla-tarjetas w-full min-w-[720px] text-left text-sm">
              <thead className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Colonia</th>
                  <th className="px-6 py-4 font-semibold">Ubicación</th>
                  <th className="px-6 py-4 font-semibold">Código Acceso</th>
                  <th className="px-6 py-4 font-semibold">Registro</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {coloniasFiltradas.map((c) => (
                  <tr key={c.id} className={`transition-colors hover:bg-green-50/30 ${!c.activo ? 'opacity-60' : ''}`}>
                    <td data-completa className="px-6 py-4">
                      <p className="font-bold text-gray-900 text-base">{c.nombre}</p>
                      {c.whatsapp_url ? (
                        <a href={c.whatsapp_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline">
                          <MessageCircle className="h-3.5 w-3.5" /> Grupo de WhatsApp
                        </a>
                      ) : (
                        <span className="mt-1 inline-flex items-center gap-1 text-xs text-gray-400">
                          <MessageCircle className="h-3.5 w-3.5" /> Sin grupo de WhatsApp
                        </span>
                      )}
                    </td>
                    <td data-label="Ubicación" className="px-6 py-4 text-gray-600">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gray-400" /> {c.municipio}, {c.estado}</span>
                        {c.codigo_postal && <span className="text-xs text-gray-400 ml-5">C.P. {c.codigo_postal}</span>}
                      </div>
                    </td>
                    <td data-label="Código de acceso" className="px-6 py-4">
                      <span className="inline-block font-mono text-sm font-bold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                        {c.codigo_acceso_colonia}
                      </span>
                    </td>
                    <td data-label="Registro" className="px-6 py-4 text-gray-500 font-medium">
                      {new Date(c.created_at).toLocaleDateString('es-MX')}
                    </td>
                    <td data-label="Estado" className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {c.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td data-acciones className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => abrirModalEditar(c)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-green-600" title="Editar">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => alternarEstado(c.id, c.activo)} className={`rounded-lg p-2 hover:bg-gray-100 ${c.activo ? 'text-gray-400 hover:text-red-600' : 'text-gray-400 hover:text-green-600'}`} title={c.activo ? "Desactivar" : "Activar"}>
                          {c.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button onClick={() => eliminarColonia(c.id)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="Eliminar permanentemente">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="border-b px-6 py-4"><h2 className="text-xl font-bold text-gray-800">{editandoId ? 'Editar Colonia' : 'Nueva Colonia'}</h2></div>
            <form onSubmit={guardarColonia} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre de la Colonia *</label>
                  <input type="text" name="nombre" required value={formulario.nombre} onChange={manejarCambio} placeholder="Ej. Valle de Casa Blanca" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Municipio</label>
                    <input type="text" name="municipio" value={formulario.municipio} onChange={manejarCambio} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 bg-gray-50 focus:border-green-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Código Postal</label>
                    <input type="text" name="codigo_postal" value={formulario.codigo_postal} onChange={manejarCambio} maxLength={5} placeholder="Ej. 87300" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Código de Acceso (Único) *</label>
                  <input type="text" name="codigo_acceso_colonia" required value={formulario.codigo_acceso_colonia} onChange={manejarCambio} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 font-mono text-green-700 font-bold focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                  <p className="mt-1 text-xs text-gray-500">Este código servirá para que los vecinos se vinculen a esta colonia en el futuro.</p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Grupo de WhatsApp (Opcional)</label>
                  <input type="url" name="whatsapp_url" value={formulario.whatsapp_url} onChange={manejarCambio} placeholder="https://chat.whatsapp.com/..." className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                  <p className="mt-1 text-xs text-gray-500">Si lo dejas vacío, los Eco Guardianes de esta colonia verán el aviso "Tu colonia aún no tiene grupo".</p>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setModalAbierto(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
                <button type="submit" disabled={cargando} className="flex items-center justify-center rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-70">
                  {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}