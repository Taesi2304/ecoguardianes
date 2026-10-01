import React, { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Camera, Check, UploadCloud, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  OPCIONES_FAUNA,
  OPCIONES_HUMEDAD,
  OPCIONES_OLOR,
  OPCIONES_RESIDUO,
  OPCIONES_TEMPERATURA,
  comprimirImagen,
  diagnosticar,
  formatearCantidad,
  type Opcion,
} from '@/lib/bitacora';
import DiagnosticoCompostero from './DiagnosticoCompostero';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BUCKET_FOTOS = 'fotografias';
const CANTIDADES_RAPIDAS = [0.5, 1, 2, 5];

const bitacoraSchema = z.object({
  compostero_id: z.string().min(1, "Selecciona un compostero"),
  cantidad_material: z.coerce.number({ message: "Escribe la cantidad" }).positive("La cantidad debe ser mayor a 0"),
  unidad_medida: z.enum(["kg", "litros"]),
  tipos_residuo: z.array(z.string()),
  residuo_otro: z.string().trim().optional(),
  temperatura: z.enum(["fria", "tibia", "caliente"], { message: "Elige la temperatura" }),
  humedad: z.enum(["seco", "optimo", "excesivo"], { message: "Elige el nivel de humedad" }),
  olor: z.enum(["bosque", "amoniaco", "sin_olor"], { message: "Elige el olor" }),
  fauna: z.array(z.string()),
  observaciones: z.string().trim().optional(),
  propuesta_mejora: z.string().trim().optional(),
  plagas: z.boolean(),
  lixiviados: z.boolean(),
}).refine((datos) => datos.tipos_residuo.length > 0 || !!datos.residuo_otro, {
  path: ['tipos_residuo'],
  message: "Elige al menos un tipo de residuo o descríbelo en «Otro»",
});

type BitacoraFormValues = z.infer<typeof bitacoraSchema>;

const valoresIniciales = {
  compostero_id: "",
  cantidad_material: "",
  unidad_medida: "kg",
  tipos_residuo: [],
  residuo_otro: "",
  temperatura: undefined,
  humedad: undefined,
  olor: undefined,
  fauna: [],
  observaciones: "",
  propuesta_mejora: "",
  plagas: false,
  lixiviados: false,
};

interface ComposteroOpcion {
  id: string;
  nombre: string;
  codigo: string;
  colonias: { nombre: string } | { nombre: string }[] | null;
}

interface RegistroGuardado {
  cantidad: string;
  compostero: string;
  diagnostico: ReturnType<typeof diagnosticar>;
}

const nombreColonia = (comp: ComposteroOpcion) => {
  const colonia = Array.isArray(comp.colonias) ? comp.colonias[0] : comp.colonias;
  return colonia?.nombre || 'Sin colonia';
};

// Tarjetas grandes para respuestas únicas (más fáciles de tocar en celular que un radio)
function SelectorUnico({ opciones, valor, onChange, nombre }: {
  opciones: Opcion[];
  valor?: string;
  onChange: (valor: string) => void;
  nombre: string;
}) {
  return (
    <div role="radiogroup" aria-label={nombre} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {opciones.map((opcion) => {
        const activa = valor === opcion.valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => onChange(opcion.valor)}
            className={`flex items-start gap-3 rounded-xl border-2 px-3 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ${
              activa ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300'
            }`}
          >
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${activa ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300'}`}>
              {activa && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900">{opcion.etiqueta}</span>
              {opcion.detalle && <span className="block text-xs text-gray-500">{opcion.detalle}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Chips para respuestas múltiples
function SelectorMultiple({ opciones, valores, onChange }: {
  opciones: Opcion[];
  valores: string[];
  onChange: (valores: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map((opcion) => {
        const activa = valores.includes(opcion.valor);
        return (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={activa}
            onClick={() => onChange(activa ? valores.filter((v) => v !== opcion.valor) : [...valores, opcion.valor])}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 ${
              activa ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-green-400'
            }`}
          >
            {activa && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
            {opcion.etiqueta}
          </button>
        );
      })}
    </div>
  );
}

function TituloSeccion({ icono, children }: { icono: string; children: React.ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-3 text-lg">
      <img src={icono} alt="" aria-hidden="true" className="h-9 w-9 shrink-0 object-contain" />
      {children}
    </CardTitle>
  );
}

export default function NuevaBitacora() {
  const [imagenes, setImagenes] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const previewUrlsRef = useRef<string[]>([]);
  const [errorFotos, setErrorFotos] = useState(false);
  const [isGuardando, setIsGuardando] = useState(false);
  const [listaComposteros, setListaComposteros] = useState<ComposteroOpcion[]>([]);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);
  const [esAdmin, setEsAdmin] = useState(false);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [registroGuardado, setRegistroGuardado] = useState<RegistroGuardado | null>(null);

  const form = useForm({
    resolver: zodResolver(bitacoraSchema) as any,
    defaultValues: valoresIniciales as any,
  }) as any;

  useEffect(() => {
    const cargarComposterosPermitidos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id, colonia_id, roles(nombre)')
        .eq('auth_user_id', user.id)
        .single();

      if (!usuario) return;
      setUsuarioId(usuario.id);

      const rolNombre = Array.isArray(usuario.roles)
        ? usuario.roles[0]?.nombre
        : (usuario.roles as any)?.nombre;

      const superAdmin = String(rolNombre || '').toLowerCase() === 'super admin';
      setEsSuperAdmin(superAdmin);
      setEsAdmin(superAdmin || rolNombre === 'Administrador');

      let query = supabase
        .from('composteros')
        .select('id, nombre, codigo, colonias(nombre)')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (!superAdmin && usuario.colonia_id) {
        query = query.eq('colonia_id', usuario.colonia_id);
      }

      const { data: composteros, error } = await query;
      if (!error && composteros) {
        setListaComposteros(composteros as ComposteroOpcion[]);
        // Si solo hay uno, no hace falta que lo elija
        if (composteros.length === 1) {
          form.setValue('compostero_id', composteros[0].id);
        }
      }
    };

    void cargarComposterosPermitidos();
  }, [form]);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const [temperatura, humedad, olor, plagas, lixiviados] = useWatch({
    control: form.control,
    name: ['temperatura', 'humedad', 'olor', 'plagas', 'lixiviados'],
  });
  const diagnostico = diagnosticar({ temperatura, humedad, olor, plagas, lixiviados });

  const limpiarFotos = () => {
    setImagenes([]);
    setPreviewUrls((current) => {
      current.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
  };

  const onSubmit = async (data: BitacoraFormValues) => {
    if (imagenes.length === 0) {
      setErrorFotos(true);
      toast.error("Agrega al menos una fotografía de evidencia.");
      document.getElementById('seccion-fotos')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!usuarioId) {
      toast.error("No pudimos cargar tu perfil. Cierra sesión y vuelve a entrar.");
      return;
    }

    setIsGuardando(true);
    const rutasSubidas: string[] = [];

    try {
      // 1. Primero las fotos: si falla la red, no queda una visita a medias
      const comprimidas = await Promise.all(imagenes.map((archivo) => comprimirImagen(archivo)));
      const subidas = await Promise.all(comprimidas.map(async (archivo) => {
        const extension = archivo.name.split('.').pop()?.toLowerCase() || 'jpg';
        const ruta = `${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, archivo, { contentType: archivo.type });
        if (error) throw error;
        rutasSubidas.push(ruta);
        const { data: publica } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta);
        return { archivo, ruta, url: publica.publicUrl };
      }));

      // 2. La visita, con cada dato en su propia columna
      const { data: visitaInsertada, error: errorVisita } = await supabase
        .from('visitas')
        .insert({
          compostero_id: data.compostero_id,
          usuario_id: usuarioId,
          cantidad_material: data.cantidad_material,
          unidad_medida: data.unidad_medida,
          tipos_residuo: data.tipos_residuo,
          residuo_otro: data.residuo_otro || null,
          temperatura_nivel: data.temperatura,
          humedad_nivel: data.humedad,
          olor_nivel: data.olor,
          fauna: data.fauna,
          plagas: data.plagas,
          lixiviados: data.lixiviados,
          observaciones: data.observaciones || null,
          propuesta_mejora: data.propuesta_mejora || null,
          estado_visita: 'Finalizada'
        })
        .select('id')
        .single();

      if (errorVisita) throw errorVisita;

      // 3. Las evidencias, en una sola inserción
      const { error: errorEvidencias } = await supabase.from('evidencias').insert(
        subidas.map(({ archivo, ruta, url }) => ({
          visita_id: visitaInsertada.id,
          usuario_id: usuarioId,
          tipo_evidencia: 'foto',
          ruta_storage: ruta,
          url_publica: url,
          nombre_archivo: archivo.name,
          tipo_mime: archivo.type,
          tamano_bytes: archivo.size,
        }))
      );

      if (errorEvidencias) {
        // Sin fotos la visita no es válida: se archiva para que no aparezca en historial ni reportes
        await supabase.from('visitas').update({ deleted_at: new Date().toISOString(), activo: false }).eq('id', visitaInsertada.id);
        throw errorEvidencias;
      }

      const compostero = listaComposteros.find((c) => c.id === data.compostero_id);
      setRegistroGuardado({
        cantidad: formatearCantidad(data.cantidad_material, data.unidad_medida),
        compostero: compostero?.nombre || '',
        diagnostico: diagnosticar(data),
      });

      form.reset({ ...valoresIniciales, compostero_id: listaComposteros.length === 1 ? data.compostero_id : '' });
      limpiarFotos();
      setErrorFotos(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error("Error al guardar la bitácora:", error);
      if (rutasSubidas.length > 0) {
        await supabase.storage.from(BUCKET_FOTOS).remove(rutasSubidas);
      }
      toast.error("No se pudo guardar la bitácora. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setIsGuardando(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const nextFiles = Array.from(e.target.files);
      const nextPreviews = nextFiles.map((file) => URL.createObjectURL(file));

      setImagenes((current) => [...current, ...nextFiles]);
      setPreviewUrls((current) => [...current, ...nextPreviews]);
      setErrorFotos(false);

      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImagenes((current) => current.filter((_, i) => i !== index));
    setPreviewUrls((current) => {
      const urlToRemove = current[index];
      if (urlToRemove) URL.revokeObjectURL(urlToRemove);
      return current.filter((_, i) => i !== index);
    });
  };

  const handleInvalidSubmit = (errores: Record<string, unknown>) => {
    if (imagenes.length === 0) setErrorFotos(true);
    toast.error("Faltan algunos datos. Revisa los mensajes en rojo.");

    const primerCampo = Object.keys(errores)[0];
    document.querySelector(`[data-campo="${primerCampo}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Enter en un campo de una línea pasa al siguiente en lugar de enviar (en textareas hace salto de línea)
  const manejarEnter = (event: React.KeyboardEvent<HTMLFormElement>) => {
    const actual = event.target;
    if (event.key !== 'Enter' || !(actual instanceof HTMLInputElement) || actual.type === 'file') return;

    event.preventDefault();
    const controles = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('input:not([type="file"]), select, textarea'))
      .filter((control) => !(control as HTMLInputElement).disabled && control.getClientRects().length > 0);
    const siguiente = controles[controles.indexOf(actual) + 1];
    if (siguiente) {
      siguiente.focus({ preventScroll: true });
      siguiente.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      actual.blur();
    }
  };

  const rutaHistorial = esAdmin ? '/admin/historial' : '/dashboard/mi-historial';

  const coloniasAgrupadas = esSuperAdmin
    ? Array.from(listaComposteros.reduce((grupos, comp) => {
        const colonia = nombreColonia(comp);
        grupos.set(colonia, [...(grupos.get(colonia) || []), comp]);
        return grupos;
      }, new Map<string, ComposteroOpcion[]>()))
    : [];

  if (registroGuardado) {
    return (
      <div className="max-w-xl mx-auto py-6 sm:py-10">
        <Card className="overflow-hidden">
          <CardContent className="flex flex-col items-center px-6 py-10 text-center">
            <img src="/planta-tierra.svg" alt="" aria-hidden="true" className="mb-4 h-20 w-20 object-contain" />
            <h1 className="text-2xl font-bold text-gray-900">¡Bitácora registrada!</h1>
            <p className="mt-2 text-gray-600">
              Aportaste <strong className="text-green-700">{registroGuardado.cantidad}</strong>
              {registroGuardado.compostero && <> al compostero <strong>{registroGuardado.compostero}</strong></>}.
              Gracias por cuidar la tierra de tu comunidad.
            </p>

            {registroGuardado.diagnostico && (
              <div className="mt-6 w-full text-left">
                <DiagnosticoCompostero diagnostico={registroGuardado.diagnostico} />
              </div>
            )}

            <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
              <Link to={rutaHistorial} className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white no-underline transition hover:bg-green-700 hover:no-underline">
                Ver historial
              </Link>
              <button
                type="button"
                onClick={() => setRegistroGuardado(null)}
                className="flex-1 rounded-lg border-2 border-green-600 px-4 py-3 text-sm font-bold text-green-700 transition hover:bg-green-50"
              >
                Registrar otra visita
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-2 sm:py-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="shrink-0 bg-green-100 p-3 rounded-full">
          <img src="/bitacora.svg" alt="" aria-hidden="true" className="h-10 w-10 sm:h-12 sm:w-12" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Actualizar Bitácora del Compostero</h1>
          <p className="text-gray-500">Registro de visita para monitoreo del compostero</p>
        </div>
      </div>

      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit, handleInvalidSubmit)}
          onKeyDown={manejarEnter}
          className="space-y-6"
        >

          {/* COMPOSTERO */}
          <Card>
            <CardHeader>
              <TituloSeccion icono="/compostero.svg">Compostero a monitorear</TituloSeccion>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="compostero_id"
                render={({ field }) => (
                  <FormItem data-campo="compostero_id">
                    <FormControl>
                      <select
                        {...field}
                        value={field.value ?? ""}
                        aria-label="Compostero"
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                      >
                        <option value="">Selecciona una opción...</option>
                        {esSuperAdmin
                          ? coloniasAgrupadas.map(([colonia, composteros]) => (
                              <optgroup key={colonia} label={colonia}>
                                {composteros.map((comp) => (
                                  <option key={comp.id} value={comp.id}>{comp.nombre} ({comp.codigo})</option>
                                ))}
                              </optgroup>
                            ))
                          : listaComposteros.map((comp) => (
                              <option key={comp.id} value={comp.id}>{comp.nombre} ({comp.codigo})</option>
                            ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 1. APORTE */}
          <Card>
            <CardHeader>
              <TituloSeccion icono="/carretilla.svg">1. Lo que aportaste hoy</TituloSeccion>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
                <FormField
                  control={form.control}
                  name="cantidad_material"
                  render={({ field }) => (
                    <FormItem data-campo="cantidad_material">
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl>
                        <Input type="number" inputMode="decimal" step="0.1" min="0" placeholder="Ej. 2.5" enterKeyHint="next" className="h-11" {...field} />
                      </FormControl>
                      <div className="flex flex-wrap gap-2">
                        {CANTIDADES_RAPIDAS.map((cantidad) => (
                          <button
                            key={cantidad}
                            type="button"
                            onClick={() => form.setValue('cantidad_material', cantidad, { shouldValidate: true })}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                              Number(field.value) === cantidad ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 text-gray-600 hover:border-green-400'
                            }`}
                          >
                            {cantidad}
                          </button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unidad_medida"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unidad</FormLabel>
                      <div role="radiogroup" aria-label="Unidad" className="inline-flex h-11 rounded-lg border border-gray-300 bg-gray-50 p-1">
                        {[{ valor: 'kg', etiqueta: 'Kilos (kg)' }, { valor: 'litros', etiqueta: 'Litros (L)' }].map((unidad) => (
                          <button
                            key={unidad.valor}
                            type="button"
                            role="radio"
                            aria-checked={field.value === unidad.valor}
                            onClick={() => field.onChange(unidad.valor)}
                            className={`rounded-md px-4 text-sm font-semibold transition ${
                              field.value === unidad.valor ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                            }`}
                          >
                            {unidad.etiqueta}
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tipos_residuo"
                render={({ field }) => (
                  <FormItem data-campo="tipos_residuo">
                    <FormLabel>¿Qué tipo de residuos?</FormLabel>
                    <SelectorMultiple opciones={OPCIONES_RESIDUO} valores={field.value || []} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="residuo_otro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-600">Otro (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Pasto cortado, aserrín..." enterKeyHint="next" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 2. ESTADO FÍSICO */}
          <Card>
            <CardHeader>
              <TituloSeccion icono="/planta-tierra.svg">2. ¿Cómo está la composta?</TituloSeccion>
              <p className="text-sm text-gray-500">Mete la mano (con guante) en el centro de la mezcla.</p>
            </CardHeader>
            <CardContent className="space-y-7">
              <FormField
                control={form.control}
                name="temperatura"
                render={({ field }) => (
                  <FormItem data-campo="temperatura">
                    <FormLabel className="flex items-center gap-2 font-semibold">
                      <img src="/sol.svg" alt="" aria-hidden="true" className="h-6 w-6" /> Temperatura
                    </FormLabel>
                    <SelectorUnico nombre="Temperatura" opciones={OPCIONES_TEMPERATURA} valor={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="humedad"
                render={({ field }) => (
                  <FormItem data-campo="humedad">
                    <FormLabel className="flex items-center gap-2 font-semibold">
                      <img src="/gota-agua.svg" alt="" aria-hidden="true" className="h-6 w-6" /> Humedad
                    </FormLabel>
                    <SelectorUnico nombre="Humedad" opciones={OPCIONES_HUMEDAD} valor={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="olor"
                render={({ field }) => (
                  <FormItem data-campo="olor">
                    <FormLabel className="flex items-center gap-2 font-semibold">
                      <img src="/hoja.svg" alt="" aria-hidden="true" className="h-6 w-6" /> Olor
                    </FormLabel>
                    <SelectorUnico nombre="Olor" opciones={OPCIONES_OLOR} valor={field.value} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 3. VIDA */}
          <Card>
            <CardHeader>
              <TituloSeccion icono="/gusano.svg">3. Vida en el compostero</TituloSeccion>
              <p className="text-sm text-gray-500">Marca lo que viste. Son señales de que la composta está trabajando.</p>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="fauna"
                render={({ field }) => (
                  <FormItem>
                    <SelectorMultiple opciones={OPCIONES_FAUNA} valores={field.value || []} onChange={field.onChange} />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* 4. ALERTAS */}
          <Card>
            <CardHeader>
              <TituloSeccion icono="/aviso.svg">4. ¿Algún problema?</TituloSeccion>
              <p className="text-sm text-gray-500">Márcalo solo si lo viste. Avisa al equipo para darle mantenimiento.</p>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {([
                { nombre: 'plagas', titulo: 'Plagas', detalle: 'Muchas moscas, cucarachas o roedores' },
                { nombre: 'lixiviados', titulo: 'Lixiviados', detalle: 'Escurre líquido oscuro o maloliente' },
              ] as const).map((alerta) => (
                <FormField
                  key={alerta.nombre}
                  control={form.control}
                  name={alerta.nombre}
                  render={({ field }) => (
                    <button
                      type="button"
                      aria-pressed={field.value}
                      onClick={() => field.onChange(!field.value)}
                      className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 ${
                        field.value ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-red-200'
                      }`}
                    >
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${field.value ? 'border-red-600 bg-red-600 text-white' : 'border-gray-300'}`}>
                        {field.value && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">{alerta.titulo}</span>
                        <span className="block text-xs text-gray-500">{alerta.detalle}</span>
                      </span>
                    </button>
                  )}
                />
              ))}
            </CardContent>
          </Card>

          {/* DIAGNÓSTICO EN VIVO */}
          {diagnostico && (
            <div aria-live="polite">
              <DiagnosticoCompostero diagnostico={diagnostico} />
            </div>
          )}

          {/* 5. APRENDIZAJES Y EVIDENCIAS */}
          <Card>
            <CardHeader>
              <TituloSeccion icono="/foto-camara.svg">5. Aprendizajes y evidencias</TituloSeccion>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="observaciones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cambios, avances o retos que notaste <span className="font-normal text-gray-400">(opcional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ej. El material está perdiendo su forma, hay presencia de moscas..."
                        className="resize-none h-24"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="propuesta_mejora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propuesta de mejora para el proyecto <span className="font-normal text-gray-400">(opcional)</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ej. Agregar más estructurante seco, ajustar frecuencia de volteo..."
                        className="resize-none h-20"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div id="seccion-fotos" className="space-y-3">
                <p className={`text-sm font-semibold ${errorFotos ? 'text-red-600' : 'text-[#4A2E18]'}`}>
                  Fotografías de evidencia <span className="text-red-600">*</span>
                </p>
                <div className={`rounded-xl border-2 border-dashed p-5 ${errorFotos ? 'border-red-400 bg-red-50/40' : 'border-gray-300 bg-white'}`}>
                  <p className="mb-4 text-center text-sm text-gray-600">Toma o adjunta al menos una foto del compostero.</p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <label className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-green-700 focus-within:ring-2 focus-within:ring-green-600 focus-within:ring-offset-2">
                      <Camera className="h-5 w-5" aria-hidden="true" />
                      Tomar foto
                      <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="sr-only" />
                    </label>
                    <label className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-green-600 px-4 py-3 text-center text-sm font-bold text-green-700 transition hover:bg-green-50 focus-within:ring-2 focus-within:ring-green-600 focus-within:ring-offset-2">
                      <UploadCloud className="h-5 w-5" aria-hidden="true" />
                      Elegir de galería
                      <input type="file" multiple accept="image/*" onChange={handleImageChange} className="sr-only" />
                    </label>
                  </div>
                </div>
                {errorFotos && <p className="text-sm font-medium text-red-500">Agrega al menos una fotografía.</p>}

                {imagenes.length > 0 && (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-green-700">
                        {imagenes.length} {imagenes.length === 1 ? 'foto lista' : 'fotos listas'}
                      </p>
                      <button type="button" onClick={limpiarFotos} className="text-xs font-semibold text-red-600 underline underline-offset-2">
                        Quitar todas
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {previewUrls.map((url, index) => (
                        <div key={url} className="relative">
                          <img
                            src={url}
                            alt={`Vista previa ${index + 1}`}
                            className="h-20 w-20 rounded-lg border border-gray-200 object-cover shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md"
                            aria-label={`Quitar foto ${index + 1}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={isGuardando}
            className={`w-full py-6 text-lg text-white ${isGuardando ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {isGuardando ? "Guardando y subiendo fotos..." : "Guardar bitácora"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
