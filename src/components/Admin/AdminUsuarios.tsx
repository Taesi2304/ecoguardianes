import React, { useEffect, useState } from 'react';
import { Loader2, Plus, Edit, EyeOff, Eye, Search, AlertCircle, Shield, MapPin, Mail, Phone, Trash2, Warehouse } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Rol { id: string; nombre: string; }
interface Colonia { id: string; nombre: string; }
interface Compostero { id: string; nombre: string; codigo: string; colonia_id: string | null; }

interface Usuario {
  id: string;
  nombre: string;
  apellido_paterno: string | null;
  correo: string;
  telefono: string | null;
  activo: boolean;
  created_at: string;
  rol_id: string | null;
  colonia_id: string | null;
  compostero_id: string | null;
  roles: { nombre: string } | null;
  colonias: { nombre: string } | null;
  composteros: { nombre: string; codigo: string } | null;
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [colonias, setColonias] = useState<Colonia[]>([]);
  const [composterosDisponibles, setComposterosDisponibles] = useState<Compostero[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [rolesSeleccionados, setRolesSeleccionados] = useState<string[]>([]);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);
  const [adminColoniaId, setAdminColoniaId] = useState<string | null>(null);

  // Estados del Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [formulario, setFormulario] = useState({
    nombre: '', apellido_paterno: '', correo: '', telefono: '', password: '', rol_id: '', colonia_id: '', compostero_id: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión');

      // 1. Obtener perfil del admin actual
      const { data: adminActual } = await supabase
        .from('usuarios')
        .select('colonia_id, roles(nombre)')
        .eq('auth_user_id', user.id)
        .single();
        
      const rolNombre = Array.isArray(adminActual?.roles) ? adminActual?.roles[0]?.nombre : (adminActual?.roles as any)?.nombre;
      const superAdmin = rolNombre === 'Super Admin';
      setEsSuperAdmin(superAdmin);
      const colId = adminActual?.colonia_id || null;
      setAdminColoniaId(colId);

      // 2. Cargar Roles, Colonias y Composteros
      const [{ data: dataRoles }, { data: dataColonias }, { data: dataComposteros }] = await Promise.all([
        supabase.from('roles').select('id, nombre').order('nombre'),
        supabase.from('colonias').select('id, nombre').eq('activo', true).order('nombre'),
        supabase.from('composteros').select('id, nombre, codigo, colonia_id').eq('activo', true).order('codigo')
      ]);
      const rolesCargadas = dataRoles || [];
      const rolesPermitidas = superAdmin
        ? rolesCargadas
        : rolesCargadas.filter(r => ['Eco Guardian', 'Administrador'].includes(r.nombre));
      setRoles(rolesPermitidas);
      setRolesSeleccionados(rolesPermitidas.map(r => r.id));
      setColonias(dataColonias || []);
      setComposterosDisponibles(dataComposteros || []);

      // 3. Cargar Usuarios con la relación hacia composteros
      let query = supabase
        .from('usuarios')
        .select('id, nombre, apellido_paterno, correo, telefono, activo, created_at, rol_id, colonia_id, compostero_id, roles(nombre), colonias(nombre), composteros(nombre, codigo)')
        .order('created_at', { ascending: false });

      // Si no es Super Admin, solo ve a los usuarios de su colonia y nunca a Super Admin
      if (!superAdmin && colId) {
        query = query.eq('colonia_id', colId);
      }

      const { data: dataUsuarios, error: errUsuarios } = await query;
      if (errUsuarios) throw errUsuarios;

      const usuariosVisibles = (dataUsuarios || []).filter((usuario: any) => {
        if (superAdmin) return true;

        const nombreRol = Array.isArray(usuario.roles)
          ? usuario.roles[0]?.nombre
          : usuario.roles?.nombre;

        if (nombreRol === 'Super Admin') return false;
        if (!colId) return false;

        return usuario.colonia_id === colId;
      });

      setUsuarios(usuariosVisibles as unknown as Usuario[]);
    } catch (err: any) {
      setError('Error al cargar los datos.');
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const toggleRolSeleccionado = (rolId: string) => {
    setRolesSeleccionados(prev => {
      const yaEsta = prev.includes(rolId);
      if (yaEsta) {
        return prev.filter(id => id !== rolId);
      }
      return [...prev, rolId];
    });
  };

  const usuariosFiltrados = usuarios.filter(u => {
    const termino = busqueda.toLowerCase();
    const nombreCompleto = `${u.nombre} ${u.apellido_paterno || ''}`.toLowerCase();
    const coincideBusqueda = nombreCompleto.includes(termino) || u.correo.toLowerCase().includes(termino);
    const coincideRol = rolesSeleccionados.length === 0 || (u.rol_id ? rolesSeleccionados.includes(u.rol_id) : false);
    return coincideBusqueda && coincideRol;
  });

  const obtenerIdRolPorNombre = (...nombres: string[]) => {
    return roles.find(r => nombres.includes(r.nombre))?.id || '';
  };

  const abrirModalNuevo = () => {
    setEditandoId(null);
    const idRolGuardiana = obtenerIdRolPorNombre('Eco Guardiana', 'Eco Guardian');
    const rolPorDefecto = idRolGuardiana || roles[0]?.id || '';

    setFormulario({ 
      nombre: '', 
      apellido_paterno: '', 
      correo: '', 
      telefono: '', 
      password: '',
      rol_id: rolPorDefecto,
      colonia_id: esSuperAdmin ? '' : (adminColoniaId || ''),
      compostero_id: ''
    });
    setModalAbierto(true);
  };

  const abrirModalEditar = (u: Usuario) => {
    setEditandoId(u.id);
    setFormulario({
      nombre: u.nombre,
      apellido_paterno: u.apellido_paterno || '',
      correo: u.correo,
      telefono: u.telefono || '',
      password: '',
      rol_id: u.rol_id || '',
      colonia_id: u.colonia_id || '',
      compostero_id: u.compostero_id || ''
    });
    setModalAbierto(true);
  };

  const manejarCambio = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Si cambia la colonia y no es super admin, mantenemos su restricción; si cambia la colonia en el select, limpiamos el compostero para evitar inconsistencias
    setFormulario(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'colonia_id' ? { compostero_id: '' } : {})
    }));
  };

  const guardarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);

    try {
      if (!editandoId) {
        const idRolGuardiana = obtenerIdRolPorNombre('Eco Guardian');
        const rolDefinitivo = formulario.rol_id || idRolGuardiana;

        if (!rolDefinitivo) {
          throw new Error('Selecciona un rol para el usuario. Por defecto se usa Eco Guardian.');
        }

        const datosFormulario = {
          ...formulario,
          rol_id: rolDefinitivo,
        };

        const faltantes: string[] = [];

        if (!datosFormulario.nombre.trim()) faltantes.push('nombre');
        if (!datosFormulario.correo.trim()) faltantes.push('correo');
        if (!datosFormulario.rol_id) faltantes.push('rol');
        if (esSuperAdmin && !datosFormulario.colonia_id) faltantes.push('colonia');
        if (!datosFormulario.password.trim()) faltantes.push('contraseña');

        if (faltantes.length > 0) {
          throw new Error(`Falta información requerida: ${faltantes.join(', ')}.`);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(datosFormulario.correo.trim())) {
          throw new Error('El correo electrónico no tiene un formato válido.');
        }

        if (datosFormulario.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{6,}$/;
        if (!passwordRegex.test(datosFormulario.password)) {
          throw new Error('La contraseña debe incluir al menos una mayúscula y un número.');
        }

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: datosFormulario.correo.trim(),
          password: datosFormulario.password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('No se pudo crear la cuenta de acceso.');

        const datos = {
          id: authData.user.id,
          auth_user_id: authData.user.id,
          nombre: datosFormulario.nombre,
          apellido_paterno: datosFormulario.apellido_paterno || null,
          correo: datosFormulario.correo,
          telefono: datosFormulario.telefono || null,
          rol_id: datosFormulario.rol_id || null,
          colonia_id: esSuperAdmin ? (datosFormulario.colonia_id || null) : adminColoniaId,
          compostero_id: datosFormulario.compostero_id || null
        };

        const { error: insertError } = await supabase.from('usuarios').insert([datos]);
        if (insertError) throw insertError;
      } else {
        const datos = {
          nombre: formulario.nombre,
          apellido_paterno: formulario.apellido_paterno || null,
          correo: formulario.correo,
          telefono: formulario.telefono || null,
          rol_id: formulario.rol_id || null,
          colonia_id: esSuperAdmin ? (formulario.colonia_id || null) : adminColoniaId,
          compostero_id: formulario.compostero_id || null
        };

        const { error } = await supabase.from('usuarios').update(datos).eq('id', editandoId);
        if (error) throw error;
      }
      setModalAbierto(false);
      await cargarDatos();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al guardar el usuario. Verifica que el correo no esté duplicado.');
    } finally {
      setCargando(false);
    }
  };

  const alternarEstado = async (id: string, estadoActual: boolean) => {
    try {
      const { error } = await supabase.from('usuarios').update({ activo: !estadoActual }).eq('id', id);
      if (error) throw error;
      setUsuarios(usuarios.map(u => u.id === id ? { ...u, activo: !estadoActual } : u));
    } catch (err) {
      alert('Error al cambiar el estado.');
    }
  };

  const eliminarUsuario = async (id: string) => {
    if (!window.confirm('¿Estás segura de que deseas eliminar este usuario permanentemente? Esta acción no se puede deshacer.')) return;

    try {
      const { error } = await supabase.from('usuarios').delete().eq('id', id);
      if (error) throw error;

      setUsuarios(usuarios.filter(u => u.id !== id));
    } catch (err) {
      console.error(err);
      alert('No se puede eliminar. Es probable que este usuario tenga bitácoras o visitas vinculadas.');
    }
  };

  if (cargando && usuarios.length === 0) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-green-600" /></div>;
  }

  // Filtrar composteros basados en la colonia seleccionada en el formulario
  const coloniaSeleccionadaParaForm = esSuperAdmin ? formulario.colonia_id : adminColoniaId;
  const composterosFiltradosEnModal = composterosDisponibles.filter(
    comp => !coloniaSeleccionadaParaForm || comp.colonia_id === coloniaSeleccionadaParaForm
  );

  return (
    <div className="mx-auto max-w-6xl py-2 sm:py-4 animate-in fade-in duration-500">
      
      {/* Cabecera y Buscador */}
      <div className="mb-8 flex flex-col gap-4 border-b border-[#4A2E18]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">Directorio de Usuarios</h1>
          <p className="mt-1 font-medium text-green-700">Gestiona accesos, roles y asignación de composteros</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 sm:w-64"
            />
          </div>
          <button
            onClick={abrirModalNuevo}
            className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            <Plus className="h-5 w-5" /> Nuevo Usuario
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-5 w-5" /> <p className="font-medium">{error}</p>
        </div>
      )}

      <Card className="mb-6 border-transparent bg-white shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Shield className="h-4 w-4 text-green-600" /> Filtrar por rol
            </div>
            <div className="flex flex-wrap gap-2">
              {roles.map((rol) => {
                const checked = rolesSeleccionados.includes(rol.id);
                return (
                  <label
                    key={rol.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
                      checked ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRolSeleccionado(rol.id)}
                      className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    {rol.nombre}
                  </label>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla CRUD */}
      <Card className="overflow-hidden shadow-sm border-transparent bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Usuario</th>
                  <th className="px-6 py-4 font-semibold">Contacto</th>
                  <th className="px-6 py-4 font-semibold">Rol / Colonia / Compostero</th>
                  <th className="px-6 py-4 font-semibold">Registro</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {usuariosFiltrados.map((u) => (
                  <tr key={u.id} className={`transition-colors hover:bg-green-50/30 ${!u.activo ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{u.nombre} {u.apellido_paterno}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-gray-600">
                        <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-gray-400" /> {u.correo}</span>
                        {u.telefono && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-400" /> {u.telefono}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 font-semibold text-green-700">
                          <Shield className="h-3.5 w-3.5" /> {u.roles?.nombre || 'Sin Rol'}
                        </span>
                        <span className="flex items-center gap-1.5 text-gray-500 text-xs">
                          <MapPin className="h-3.5 w-3.5" /> {u.colonias?.nombre || 'Global'}
                        </span>
                        {u.composteros?.nombre && (
                          <span className="flex items-center gap-1.5 text-blue-600 text-xs font-medium">
                            <Warehouse className="h-3.5 w-3.5" /> {u.composteros.nombre} ({u.composteros.codigo})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-medium">
                      {new Date(u.created_at).toLocaleDateString('es-MX')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.activo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => abrirModalEditar(u)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-green-600" title="Editar">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => alternarEstado(u.id, u.activo)} className={`rounded-lg p-2 hover:bg-gray-100 ${u.activo ? 'text-gray-400 hover:text-red-600' : 'text-gray-400 hover:text-green-600'}`} title={u.activo ? "Desactivar" : "Activar"}>
                          {u.activo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        {esSuperAdmin && (
                          <button onClick={() => eliminarUsuario(u.id)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600" title="Eliminar permanentemente">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {usuariosFiltrados.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No se encontraron usuarios.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="border-b px-6 py-4"><h2 className="text-xl font-bold text-gray-800">{editandoId ? 'Editar Usuario' : 'Nuevo Usuario'}</h2></div>
            <form onSubmit={guardarUsuario} className="p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
                  <input type="text" name="nombre" required value={formulario.nombre} onChange={manejarCambio} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Apellido Paterno</label>
                  <input type="text" name="apellido_paterno" value={formulario.apellido_paterno} onChange={manejarCambio} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Correo Electrónico *</label>
                  <input type="email" name="correo" required value={formulario.correo} onChange={manejarCambio} disabled={!!editandoId} className={`w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 ${editandoId ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300 bg-white focus:border-green-500'}`} />
                  {editandoId && <p className="mt-1 text-xs text-gray-500">El correo no se puede modificar por seguridad.</p>}
                </div>

                {!editandoId && (
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña de acceso *</label>
                    <div className="relative">
                      <input
                        type={mostrarPassword ? 'text' : 'password'}
                        name="password"
                        required
                        value={formulario.password}
                        onChange={manejarCambio}
                        placeholder="Ej. Eco123"
                        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {mostrarPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Debe incluir al menos 6 caracteres, una mayúscula y un número.</p>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
                  <input type="text" name="telefono" value={formulario.telefono} onChange={manejarCambio} placeholder="10 dígitos" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Rol *</label>
                  <select
                    name="rol_id"
                    required
                    value={formulario.rol_id}
                    onChange={manejarCambio}
                    disabled={!esSuperAdmin}
                    className={`w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 ${
                      !esSuperAdmin
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                        : 'border-gray-300 bg-white focus:border-green-500'
                    }`}
                  >
                    <option value="">Seleccionar Rol</option>
                    {roles
                      .filter(r => esSuperAdmin || ['Eco Guardian', 'Administrador'].includes(r.nombre))
                      .map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Colonia</label>
                  <select name="colonia_id" value={formulario.colonia_id} onChange={manejarCambio} disabled={!esSuperAdmin} className={`w-full rounded-lg border px-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-green-500 ${!esSuperAdmin ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'border-gray-300 bg-white focus:border-green-500'}`}>
                    <option value="">-- Global / Sin Colonia --</option>
                    {colonias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                
                {/* Nuevo campo dinámico para asignar el Compostero específico */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Compostero Asignado en la Zona</label>
                  <select
                    name="compostero_id"
                    value={formulario.compostero_id || ''}
                    onChange={manejarCambio}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    <option value="">-- Selecciona un compostero específico --</option>
                    {composterosFiltradosEnModal.map(comp => (
                      <option key={comp.id} value={comp.id}>
                        {comp.nombre} ({comp.codigo})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Asigna este usuario a un cajón en específico si hay más de uno en la colonia.
                  </p>
                </div>

              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setModalAbierto(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">Cancelar</button>
                <button type="submit" disabled={cargando} className="flex items-center justify-center rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-70">
                  {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar Datos'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}