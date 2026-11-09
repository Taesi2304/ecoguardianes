import React, { useEffect, useState } from 'react';
import { Loader2, Shield, MapPin, KeyRound, Save, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';

export default function Perfil() {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [actualizandoPassword, setActualizandoPassword] = useState(false);
  
  // Datos del perfil
  const [perfil, setPerfil] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    correo: '',
    telefono: '',
    rol: '',
    colonia: '',
  });

  // Estado para cambio de contraseña
  const [passwords, setPasswords] = useState({
    nueva: '',
    confirmar: '',
  });
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay una sesión activa');

      // Consultar la tabla usuarios haciendo join con roles y colonias
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select(`
          nombre,
          apellido_paterno,
          apellido_materno,
          correo,
          telefono,
          roles (nombre),
          colonias (nombre)
        `)
        .eq('auth_user_id', user.id)
        .single();

      if (error) throw error;

      const rolNombre = Array.isArray(usuario.roles) ? usuario.roles[0]?.nombre : (usuario.roles as any)?.nombre;
      const coloniaNombre = Array.isArray(usuario.colonias) ? usuario.colonias[0]?.nombre : (usuario.colonias as any)?.nombre;

      setPerfil({
        nombre: usuario.nombre || '',
        apellido_paterno: usuario.apellido_paterno || '',
        apellido_materno: usuario.apellido_materno || '',
        correo: usuario.correo || user.email || '',
        telefono: usuario.telefono || '',
        rol: rolNombre || 'Usuario',
        colonia: coloniaNombre || 'Global / Sin asignar',
      });
    } catch (err: any) {
      console.error(err);
      toast.error('No se pudo cargar la información del perfil.');
    } finally {
      setCargando(false);
    }
  };

  const manejarCambioPerfil = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPerfil({ ...perfil, [e.target.name]: e.target.value });
  };

  const guardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión');

      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre: perfil.nombre,
          apellido_paterno: perfil.apellido_paterno,
          apellido_materno: perfil.apellido_materno,
          telefono: perfil.telefono,
        })
        .eq('auth_user_id', user.id);

      if (error) throw error;
      toast.success('¡Perfil actualizado correctamente!');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al actualizar el perfil.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.nueva.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (passwords.nueva !== passwords.confirmar) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    setActualizandoPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.nueva
      });

      if (error) throw error;

      toast.success('Contraseña actualizada con éxito.');
      setPasswords({ nueva: '', confirmar: '' });
    } catch (err: any) {
      console.error(err);
      toast.error('Error al actualizar la contraseña: ' + err.message);
    } finally {
      setActualizandoPassword(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-2 sm:py-4 animate-in fade-in duration-500">
      
      {/* Cabecera */}
      <div className="mb-8 flex items-center gap-4 border-b border-[#4A2E18]/10 pb-5">
        <div className="rounded-full bg-[#CFE9D6] p-3 shadow-sm">
          <img src="/usuarios.svg" alt="Icono de usuario" className="h-8 w-8 object-contain" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">Mi Perfil</h1>
          <p className="mt-1 font-medium text-green-700">Administra tu información personal y credenciales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        
        {/* Resumen de cuenta (Columna Izquierda) */}
        <div className="space-y-6">
          <Card className="border-transparent bg-white shadow-sm overflow-hidden text-center p-6">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700 border-2 border-green-200">
               <img src="/planta-2.svg" alt="Icono de usuario" className="h-10 w-10 object-contain" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{perfil.nombre} {perfil.apellido_paterno}</h2>
            <p className="text-sm text-gray-500 mb-4">{perfil.correo}</p>
            
            <div className="flex flex-col gap-2 pt-4 border-t text-left">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Shield className="h-4 w-4 text-green-600 shrink-0" />
                <span className="font-semibold">Rol:</span> {perfil.rol}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <MapPin className="h-4 w-4 text-green-600 shrink-0" />
                <span className="font-semibold">Colonia:</span> {perfil.colonia}
              </div>
            </div>
          </Card>
        </div>

        {/* Formularios de Edición (Columna Derecha) */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Formulario de Datos Personales */}
          <Card className="border-transparent bg-white shadow-sm">
            <CardHeader className="border-b bg-gray-50/50 px-6 py-4">
              <CardTitle className="text-lg text-gray-800">Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={guardarPerfil} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Nombre</label>
                    <input
                      type="text"
                      name="nombre"
                      required
                      value={perfil.nombre}
                      onChange={manejarCambioPerfil}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Apellido Paterno</label>
                    <input
                      type="text"
                      name="apellido_paterno"
                      value={perfil.apellido_paterno}
                      onChange={manejarCambioPerfil}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Apellido Materno</label>
                    <input
                      type="text"
                      name="apellido_materno"
                      value={perfil.apellido_materno}
                      onChange={manejarCambioPerfil}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Teléfono</label>
                    <input
                      type="text"
                      name="telefono"
                      value={perfil.telefono}
                      onChange={manejarCambioPerfil}
                      placeholder="10 dígitos"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Correo Electrónico (No modificable)</label>
                  <input
                    type="email"
                    disabled
                    value={perfil.correo}
                    className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-gray-500 cursor-not-allowed"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={guardando}
                    className="flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-70"
                  >
                    {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Formulario de Contraseña */}
          <Card className="border-transparent bg-white shadow-sm">
            <CardHeader className="border-b bg-gray-50/50 px-6 py-4">
              <CardTitle className="text-lg text-gray-800">Seguridad y Contraseña</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={cambiarPassword} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={mostrarNueva ? 'text' : 'password'}
                      required
                      value={passwords.nueva}
                      onChange={(e) => setPasswords({ ...passwords, nueva: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarNueva((visible) => !visible)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-green-600"
                      aria-label={mostrarNueva ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                    >
                      {mostrarNueva ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Confirmar Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={mostrarConfirmar ? 'text' : 'password'}
                      required
                      value={passwords.confirmar}
                      onChange={(e) => setPasswords({ ...passwords, confirmar: e.target.value })}
                      placeholder="Repite la contraseña"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-11 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmar((visible) => !visible)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-green-600"
                      aria-label={mostrarConfirmar ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                    >
                      {mostrarConfirmar ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={actualizandoPassword}
                    className="flex items-center gap-2 rounded-xl bg-gray-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-900 disabled:opacity-70"
                  >
                    {actualizandoPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    Actualizar Contraseña
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}