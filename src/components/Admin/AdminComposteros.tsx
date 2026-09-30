import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Edit, MapPin, EyeOff, Eye, AlertCircle, Lock, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Colonia {
  id: string;
  nombre: string;
}

interface Compostero {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string | null;
  activo: boolean;
  colonia_id: string | null;
  created_at: string;
  colonias: { nombre: string } | null;
}

export default function AdminComposteros() {
  const [composteros, setComposteros] = useState<Compostero[]>([]);
  const [colonias, setColonias] = useState<Colonia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);
  const [adminColoniaId, setAdminColoniaId] = useState<string | null>(null);
  const [filtroColonia, setFiltroColonia] = useState<string>('todos');
  const [error, setError] = useState<string | null>(null);

  // Estados del Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  
  // Estado del Formulario
  const [formulario, setFormulario] = useState({
    codigo: '',
    nombre: '',
    direccion: '',
    colonia_id: '',
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      let superAdmin = false;
      let colId: string | null = null;

      // 0. Detectar rol y colonia del usuario logueado
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: usuario } = await supabase
          .from('usuarios')
          .select('colonia_id, roles(nombre)') // Se agregó colonia_id aquí
          .eq('auth_user_id', user.id)
          .single();
          
        const rolNombre = Array.isArray(usuario?.roles) ? usuario.roles[0]?.nombre : (usuario?.roles as any)?.nombre;
        superAdmin = rolNombre === 'Super Admin';
        colId = usuario?.colonia_id || null;
        
        setEsSuperAdmin(superAdmin);
        setAdminColoniaId(colId);
      }

      // 1. Cargar Composteros con filtro de seguridad
      let queryComposteros = supabase
        .from('composteros')
        .select('id, codigo, nombre, direccion, activo, colonia_id, created_at, colonias(nombre)')
        .order('created_at', { ascending: false });

      // Si NO es Super Admin, filtramos estrictamente por su colonia
      if (!superAdmin && colId) {
        queryComposteros = queryComposteros.eq('colonia_id', colId);
      }

      const { data: dataComposteros, error: errComposteros } = await queryComposteros;
      if (errComposteros) throw errComposteros;

      // 2. Cargar Colonias para el Select (solo activas)
      const { data: dataColonias, error: errColonias } = await supabase
        .from('colonias')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');

      if (errColonias) throw errColonias;

      setComposteros(dataComposteros as unknown as Compostero[]);
      setColonias(dataColonias || []);
    } catch (err: any) {
      setError('Ocurrió un error al cargar los datos.');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const composterosFiltrados = filtroColonia === 'todos'
    ? composteros
    : composteros.filter(c => c.colonia_id === filtroColonia);

  const abrirModalNuevo = () => {
    setEditandoId(null);

    // Lógica para autogenerar código secuencial
    let siguienteNumero = 1;
    if (composteros.length > 0) {
      const numeros = composteros
        .map(c => {
          const match = c.codigo.match(/\d+$/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter(n => !isNaN(n));
      
      if (numeros.length > 0) {
        siguienteNumero = Math.max(...numeros) + 1;
      }
    }
    const nuevoCodigo = `CMP-${siguienteNumero.toString().padStart(3, '0')}`;

    setFormulario({ 
      codigo: nuevoCodigo, 
      nombre: '', 
      direccion: '', 
      // Asignar automáticamente su colonia si es un Admin normal
      colonia_id: esSuperAdmin ? '' : (adminColoniaId || '') 
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (compostero: Compostero) => {
    setEditandoId(compostero.id);
    setFormulario({
      codigo: compostero.codigo,
      nombre: compostero.nombre,
      direccion: compostero.direccion || '',
      colonia_id: compostero.colonia_id || '',
    });
    setModalAbierto(true);
  };

  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const guardarCompostero = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    
    try {
      const datosGuardar = {
        codigo: formulario.codigo,
        nombre: formulario.nombre,
        direccion: formulario.direccion,
        colonia_id: formulario.colonia_id || null, 
      };

      if (editandoId) {
        const { error } = await supabase.from('composteros').update(datosGuardar).eq('id', editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('composteros').insert([datosGuardar]);
        if (error) throw error;
      }
      
      setModalAbierto(false);
      await cargarDatos(); 
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar: Revisa que el código no esté duplicado.');
    } finally {
      setCargando(false);
    }
  };

  const alternarEstado = async (id: string, estadoActual: boolean) => {
    try {
      const { error } = await supabase.from('composteros').update({ activo: !estadoActual }).eq('id', id);
      if (error) throw error;
      
      setComposteros(composteros.map(c => c.id === id ? { ...c, activo: !estadoActual } : c));
    } catch (err) {
      console.error(err);
      alert('No se pudo cambiar el estado.');
    }
  };

  const eliminarCompostero = async (id: string) => {
    if (!window.confirm('¿Estás segura de que deseas eliminar este compostero permanentemente? Esta acción no se puede deshacer.')) return;

    try {
      const { error } = await supabase.from('composteros').delete().eq('id', id);
      if (error) throw error;

      setComposteros(composteros.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      alert('No se puede eliminar. Es probable que este compostero ya tenga visitas o bitácoras registradas (Integridad Referencial).');
    }
  };

  if (cargando && composteros.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl py-2 sm:py-4 animate-in fade-in duration-500">
      
      {/* Cabecera */}
      <div className="mb-8 flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">Gestión de Composteros</h1>
          <p className="mt-1 font-medium text-green-700">Administra los puntos de recolección</p>
        </div>
        <button
          onClick={abrirModalNuevo}
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          <Plus className="h-5 w-5" />
          Nuevo Compostero
        </button>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <Card className="mb-6 border-transparent bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <MapPin className="h-4 w-4 text-green-600" /> Filtrar por colonia
            </div>
            <select
              value={filtroColonia}
              onChange={(e) => setFiltroColonia(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:outline-none sm:w-64"
            >
              <option value="todos">Todas las colonias</option>
              {colonias.map((colonia) => (
                <option key={colonia.id} value={colonia.id}>{colonia.nombre}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla CRUD */}
      <Card className="overflow-hidden shadow-sm border-transparent bg-white">
        <CardHeader className="border-b bg-gray-50/50 px-6 py-4">
          <CardTitle className="text-lg text-gray-800">Directorio General</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-white text-xs uppercase tracking-wider text-gray-500 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Código</th>
                  <th className="px-6 py-4 font-semibold">Compostero</th>
                  <th className="px-6 py-4 font-semibold">Colonia</th>
                  <th className="px-6 py-4 font-semibold">Dirección</th>
                  <th className="px-6 py-4 font-semibold">Registro</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {composterosFiltrados.map((compostero) => (
                  <tr key={compostero.id} className={`transition-colors hover:bg-green-50/30 ${!compostero.activo ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4 font-bold text-green-700">{compostero.codigo}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{compostero.nombre}</td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        {compostero.colonias?.nombre || 'Sin colonia'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{compostero.direccion || 'No especificada'}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(compostero.created_at).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        compostero.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {compostero.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => abrirModalEditar(compostero)} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-green-600" title="Editar">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => alternarEstado(compostero.id, compostero.activo)} className={`rounded-lg p-2 transition-colors hover:bg-gray-100 ${compostero.activo ? 'text-gray-400 hover:text-red-600' : 'text-gray-400 hover:text-green-600'}`} title={compostero.activo ? "Desactivar" : "Activar"}>
                          {compostero.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        {esSuperAdmin && (
                          <button onClick={() => eliminarCompostero(compostero.id)} className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600" title="Eliminar permanentemente">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {composterosFiltrados.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No hay composteros para la colonia seleccionada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal / Overlay */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="border-b px-6 py-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editandoId ? 'Editar Compostero' : 'Nuevo Compostero'}
              </h2>
            </div>
            
            <form onSubmit={guardarCompostero} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Código</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="codigo"
                      required
                      disabled={!esSuperAdmin}
                      value={formulario.codigo}
                      onChange={manejarCambioInput}
                      placeholder="Ej. CMP-001"
                      className={`w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 ${
                        !esSuperAdmin
                          ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed font-semibold tracking-wide'
                          : 'bg-white border-gray-300 focus:border-green-500'
                      }`}
                    />
                    {!esSuperAdmin && (
                      <Lock className="absolute right-3 top-3 h-4 w-4 text-gray-400"/>
                    )}
                  </div>
                  {!esSuperAdmin && !editandoId && (
                    <p className="mt-1 text-xs text-gray-500">Código generado automáticamente.</p>
                  )}
                </div>
                
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    value={formulario.nombre}
                    onChange={manejarCambioInput}
                    placeholder="Ej. Cajón Comunitario Principal"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Colonia</label>
                  <select
                    name="colonia_id"
                    value={formulario.colonia_id}
                    onChange={manejarCambioInput}
                    disabled={!esSuperAdmin}
                    className={`w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 ${
                      !esSuperAdmin
                        ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                        : 'bg-white border-gray-300 focus:border-green-500'
                    }`}
                  >
                    <option value="">-- Selecciona una colonia --</option>
                    {colonias.map((colonia) => (
                      <option key={colonia.id} value={colonia.id}>
                        {colonia.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Dirección Exacta</label>
                  <input
                    type="text"
                    name="direccion"
                    value={formulario.direccion}
                    onChange={manejarCambioInput}
                    placeholder="Ej. Área verde central"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="flex items-center justify-center rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-70"
                >
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