import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Camera, UploadCloud } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // <-- Agrega esta línea en tus imports
import toast from 'react-hot-toast';

// Componentes de shadcn/ui
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Lista de fauna para los checkboxes
const faunaOptions = [
  { id: "lombrices", label: "Lombrices" },
  { id: "cochinillas", label: "Cochinillas / Bichos bola" },
  { id: "escarabajos", label: "Escarabajos / Larvas" },
  { id: "hormigas", label: "Hormigas" },
  { id: "hongos", label: "Hongos o micelio blanco" },
] as const;

const bitacoraSchema = z.object({
  compostero_id: z.string().min(1, "Selecciona un compostero"),
  cantidad_material: z.coerce.number().min(0.1, "La cantidad debe ser mayor a 0"),
  unidad_medida: z.enum(["kg", "litros"]).default("kg"),
  tipo_residuo: z.string().min(2, "Describe el tipo de residuo"),
  temperatura: z.enum(["fria", "tibia", "caliente"]),
  humedad: z.enum(["seco", "optimo", "excesivo"]),
  olor: z.enum(["bosque", "amoniaco", "sin_olor"]),
  fauna: z.array(z.string()).default([]),
  observaciones: z.string().optional(),
  propuesta_mejora: z.string().optional(),
  plagas: z.boolean().default(false),
  lixiviados: z.boolean().default(false),
});

type BitacoraFormValues = z.infer<typeof bitacoraSchema>;

export default function NuevaBitacora() {
  const [imagenes, setImagenes] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const previewUrlsRef = useRef<string[]>([]);
  const [isGuardando, setIsGuardando] = useState(false);
  const [listaComposteros, setListaComposteros] = useState<{ id: string; nombre: string; codigo: string }[]>([]);

  useEffect(() => {
    const cargarComposterosPermitidos = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('colonia_id, roles(nombre)')
        .eq('auth_user_id', user.id)
        .single();

      const rolNombre = Array.isArray(usuario?.roles)
        ? usuario.roles[0]?.nombre
        : (usuario?.roles as any)?.nombre;

      const esSuperAdmin = String(rolNombre || '').toLowerCase() === 'super admin';

      let query = supabase
        .from('composteros')
        .select('id, nombre, codigo, colonia_id')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (!esSuperAdmin && usuario?.colonia_id) {
        query = query.eq('colonia_id', usuario.colonia_id);
      }

      const { data: composteros, error } = await query;
      if (!error) {
        setListaComposteros(composteros || []);
      }
    };

    void cargarComposterosPermitidos();

  }, []);

  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  // Inicializar formulario
  const form = useForm({
    resolver: zodResolver(bitacoraSchema) as any,
    defaultValues: {
      compostero_id: "",
      cantidad_material: 0,
      unidad_medida: "kg",
      tipo_residuo: "",
      temperatura: "fria",
      humedad: "seco",
      olor: "bosque",
      fauna: [],
      observaciones: "",
      propuesta_mejora: "",
      plagas: false,
      lixiviados: false,
    } as any,
  }) as any;

  const onSubmit = async (data: BitacoraFormValues) => {
    setIsGuardando(true);
    try {
      // 1. Obtener quién es el usuario que tiene la sesión abierta
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Debes iniciar sesión para registrar una bitácora.");
        return;
      }

      // 2. Buscar al usuario para obtener su ID interno y usar el compostero que eligió desde el selector
      const { data: usuarioData, error: errorUsuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (errorUsuario || !usuarioData) {
        toast.error("Error al cargar tu perfil. Verifica que tu usuario esté bien configurado en la base de datos.");
        return;
      }

      const composteroIdFinal = data.compostero_id;

      if (!composteroIdFinal) {
        toast.error("Debes seleccionar un compostero para registrar la bitácora.");
        return;
      }

      // === NUEVO CANDADO: IMÁGENES OBLIGATORIAS ===
      if (imagenes.length === 0) {
        toast.error("Es obligatorio adjuntar al menos una fotografía de evidencia.");
        setIsGuardando(false); // Apaga el botón de carga
        return; // Detiene el envío
      }
    

      // 4. PLAN DE EMERGENCIA MVP:
      // Tu BD usa catálogos y números, pero el form envía textos. 
      // Juntaremos todo en 'observaciones' para salvar tu entrega.
      const resumenMonitoreo = `
        Tipo de residuo: ${data.tipo_residuo}
        Temperatura: ${data.temperatura}
        Humedad: ${data.humedad}
        Olor: ${data.olor}
        Fauna observada: ${data.fauna.length > 0 ? data.fauna.join(', ') : 'Ninguna'}
        Observaciones extra: ${data.observaciones || 'N/A'}
      `.trim();

      // Insertar en la tabla VISITAS
      const { data: visitaInsertada, error: errorVisita } = await supabase
        .from('visitas')
        .insert({
          compostero_id: composteroIdFinal,
          usuario_id: usuarioData.id,
          cantidad_material: data.cantidad_material,
          unidad_medida: data.unidad_medida,
          plagas: data.plagas,
          lixiviados: data.lixiviados,
          observaciones: resumenMonitoreo,
          observaciones_admin: data.propuesta_mejora || 'Sin propuestas',
          estado_visita: 'Finalizada'
        })
        .select()
        .single();

      if (errorVisita) throw errorVisita;

      // 5. Subir las imágenes y guardarlas en EVIDENCIAS
      if (imagenes.length > 0 && visitaInsertada) {
        for (const file of imagenes) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          
          // Subimos el archivo al bucket "fotografias"
          const { error: uploadError } = await supabase.storage
            .from('fotografias')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('fotografias')
            .getPublicUrl(fileName);

          const { error: errorEvidencia } = await supabase.from('evidencias').insert({
            visita_id: visitaInsertada.id,
            usuario_id: usuarioData.id,
            tipo_evidencia: 'foto',
            ruta_storage: fileName,
            url_publica: publicUrlData.publicUrl,
            nombre_archivo: file.name,
            tipo_mime: file.type,
            tamano_bytes: file.size
          });

          if (errorEvidencia) throw errorEvidencia;
        }
      }

      toast.success("¡Bitácora registrada exitosamente!");
      
      // Limpiamos la pantalla y subimos  al inicio 
      form.reset();
      setImagenes([]);
      setPreviewUrls((current) => {
        current.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
      window.scrollTo({ top: 0, behavior: 'smooth' }); // <-- Animación para subir

    } catch (error: any) {
      console.error("Error al guardar:", error);
      toast.error("Hubo un problema al guardar. Revisa la consola: " + error.message);
    } finally {
      setIsGuardando(false); // <-- Apagamos el bloqueo pase lo que pase
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const nextFiles = Array.from(e.target.files);
      const nextPreviews = nextFiles.map((file) => URL.createObjectURL(file));

      setImagenes((current) => [...current, ...nextFiles]);
      setPreviewUrls((current) => [...current, ...nextPreviews]);

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

  const handleInvalidSubmit = (erroresZod: unknown) => {
    console.log("Errores bloqueando el formulario:", erroresZod);
    toast.error("El formulario está incompleto o tiene errores. Revisa los mensajes en rojo debajo de cada campo.");
  };

  const avanzarAlSiguienteControl = (formulario: HTMLFormElement, actual: HTMLElement) => {
    const selectorControles = 'input:not([type="file"]):not([type="hidden"]), select, textarea, [data-slot="checkbox"], [data-slot="radio-group-item"]';
    const controles = Array.from(formulario.querySelectorAll<HTMLElement>(selectorControles))
      .filter((control) => {
        const deshabilitado = control instanceof HTMLInputElement
          || control instanceof HTMLSelectElement
          || control instanceof HTMLTextAreaElement
          || control instanceof HTMLButtonElement
            ? control.disabled
            : control.getAttribute('aria-disabled') === 'true';

        return !deshabilitado && control.getClientRects().length > 0;
      });
    const siguienteControl = controles[controles.indexOf(actual) + 1];

    if (actual.matches('[data-slot="checkbox"], [data-slot="radio-group-item"]')) {
      actual.click();
    }

    if (siguienteControl) {
      siguienteControl.focus({ preventScroll: true });
      siguienteControl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-2 sm:py-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="shrink-0 bg-green-100 p-3 rounded-full">
          {/* <Leaf className="text-green-600 h-6 w-6" /> */}
          <img src="/bitacora.svg" alt="bitacora" className="h-10 w-10 sm:h-12 sm:w-12" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Actualizar Bitácora del Compostero</h1>
          <p className="text-gray-500">Registro de visita para monitoreo del compostero</p>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, handleInvalidSubmit)}
          onSubmitCapture={(event) => {
            const actual = document.activeElement;
            const esInput = actual instanceof HTMLInputElement
              && !['file', 'hidden', 'submit', 'button'].includes(actual.type);

            if (esInput && event.nativeEvent.submitter === null) {
              event.preventDefault();
              event.stopPropagation();
              avanzarAlSiguienteControl(event.currentTarget, actual);
            }
          }}
          onKeyDown={(event) => {
            const elemento = event.target;
            if (!(elemento instanceof HTMLElement)) return;

            const selectorControles = 'input:not([type="file"]):not([type="hidden"]), select, textarea, [data-slot="checkbox"], [data-slot="radio-group-item"]';
            const target = elemento.closest<HTMLElement>(selectorControles);
            const esControlSecuencial = target instanceof HTMLInputElement
              || target instanceof HTMLSelectElement
              || target?.matches('textarea, [data-slot="checkbox"], [data-slot="radio-group-item"]');

            if (event.key === 'Enter' && esControlSecuencial) {
              event.preventDefault();
              event.stopPropagation();

              if (target) {
                avanzarAlSiguienteControl(event.currentTarget, target);
                if (target instanceof HTMLInputElement && target.type === 'text') {
                  requestAnimationFrame(() => avanzarAlSiguienteControl(event.currentTarget, target));
                }
              }
            }
          }}
          className="space-y-6"
        >
          
          <Card>
            <CardHeader>
              <CardTitle>Selecciona el compostero a monitorear</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="compostero_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compostero</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        value={field.value ?? ""}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Selecciona una opción...</option>
                        {listaComposteros.map((comp) => (
                          <option key={comp.id} value={comp.id}>
                            {comp.nombre} ({comp.codigo})
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* SECCIÓN 1: APORTES */}
          <Card>
            <CardHeader>
              <CardTitle>1. Registro de Aportes</CardTitle>
            </CardHeader>
      
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cantidad_material"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="Ej. 2.5" {...field} />
                      </FormControl>
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
                      <FormControl>
                        <select {...field} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                          <option value="kg">Kilos (kg)</option>
                          <option value="litros">Litros (L)</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tipo_residuo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Residuos</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Restos de fruta, café..." enterKeyHint="next" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-6 md:col-span-2">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-red-600">
                  <AlertTriangle className="h-4 w-4" /> Alertas de Mantenimiento Urgente
                </h4>
                <div className="grid grid-cols-1 gap-4 rounded-xl border border-red-100 bg-red-50/50 p-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="plagas"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-semibold text-gray-900">Plagas severas</FormLabel>
                          <p className="text-xs text-gray-500">Exceso de moscas, cucarachas o roedores.</p>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lixiviados"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="font-semibold text-gray-900">Lixiviados (Líquidos)</FormLabel>
                          <p className="text-xs text-gray-500">Escurrimiento de líquidos oscuros o malolientes.</p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SECCIÓN 2: ESTADO FÍSICO */}
          <Card>
            <CardHeader>
              <CardTitle>2. Estado Físico de la Composta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <FormField
                control={form.control}
                name="temperatura"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Temperatura aproximada</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1 sm:flex-row sm:space-x-6 sm:space-y-0"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="fria" /></FormControl>
                          <FormLabel className="font-normal">Fría (sin actividad)</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="tibia" /></FormControl>
                          <FormLabel className="font-normal">Tibia / Caliente</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="caliente" /></FormControl>
                          <FormLabel className="font-normal">Muy caliente</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="humedad"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Nivel de humedad</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1 sm:flex-row sm:space-x-6 sm:space-y-0"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="seco" /></FormControl>
                          <FormLabel className="font-normal">Seco</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="optimo" /></FormControl>
                          <FormLabel className="font-normal">Óptimo (esponja)</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="excesivo" /></FormControl>
                          <FormLabel className="font-normal">Excesivo (goteo)</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="olor"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Olor detectado</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1 sm:flex-row sm:space-x-6 sm:space-y-0"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="bosque" /></FormControl>
                          <FormLabel className="font-normal">Tierra / Bosque</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="amoniaco" /></FormControl>
                          <FormLabel className="font-normal">Amoniaco / Podrido</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl><RadioGroupItem value="sin_olor" /></FormControl>
                          <FormLabel className="font-normal">Sin olor particular</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* SECCIÓN 3: FAUNA BENÉFICA */}
          <Card>
            <CardHeader>
              <CardTitle>3. Vida en el Compostero</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="fauna"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {faunaOptions.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="fauna"
                          render={({ field }) => {
                            // Corrección de tipado para evitar undefined
                            const checkedValues = field.value || [];
                            return (
                              <FormItem
                                key={item.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={checkedValues.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...checkedValues, item.id])
                                        : field.onChange(
                                            checkedValues.filter(
                                              (value: string) => value !== item.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item.label}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* SECCIÓN 4: OBSERVACIONES Y FOTOGRAFÍAS */}
          <Card>
            <CardHeader>
              <CardTitle>4. Aprendizajes y Evidencias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="observaciones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cambios o avances / Retos detectados</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ej. El material está perdiendo su forma, hay presencia de moscas..." 
                        className="resize-none h-24" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="propuesta_mejora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Propuesta de mejora para el proyecto</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ej. Agregar más estructurante seco, ajustar frecuencia de volteo..." 
                        className="resize-none h-20" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


                  {/* Subida de Imágenes */}
              <div className="space-y-3">
                <FormLabel className="font-bold text-[#4A2E18]">Fotografías de Evidencia <span className="text-red-600">(Obligatorio)*</span></FormLabel>
                    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-5">
                      <div className="pointer-events-none mb-4 flex flex-col items-center justify-center text-center">
                        <UploadCloud className="mb-2 h-9 w-9 text-gray-400" />
                        <p className="text-sm text-gray-600">Agrega una o más fotografías de evidencia.</p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <label className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-green-700">
                          <Camera className="h-5 w-5" aria-hidden="true" />
                          Capturar foto
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImageChange}
                            className="sr-only"
                          />
                        </label>
                        <label className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-green-600 px-4 py-3 text-center text-sm font-bold text-green-700 transition hover:bg-green-50">
                          <UploadCloud className="h-5 w-5" aria-hidden="true" />
                          Adjuntar foto
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageChange}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </div>

                {imagenes.length > 0 && (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-green-600">
                        {imagenes.length} archivo(s) seleccionado(s)
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setImagenes([]);
                          setPreviewUrls((current) => {
                            current.forEach((url) => URL.revokeObjectURL(url));
                            return [];
                          });
                        }}
                        className="text-xs font-semibold text-red-600 underline underline-offset-2"
                      >
                        Eliminar todo
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {previewUrls.map((url, index) => (
                        <div key={`${url}-${index}`} className="relative">
                          <img
                            src={url}
                            alt={`Vista previa ${index + 1}`}
                            className="h-20 w-20 rounded-lg object-cover border border-gray-200 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white shadow-md"
                            aria-label={`Eliminar imagen ${index + 1}`}
                          >
                            ×
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
          className={`w-full py-6 text-lg text-white ${isGuardando ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>
            {isGuardando ? "Guardando datos y subiendo fotos..." : "Guardar y Registrar Bitácora"}
          </Button>
        </form>
      </Form>
    </div>
  );
}