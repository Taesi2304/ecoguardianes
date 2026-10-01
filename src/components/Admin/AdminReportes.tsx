import React, { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Sprout, AlertTriangle, FileDown, Calendar, Filter, FileSpreadsheet, Warehouse } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  OPCIONES_HUMEDAD,
  OPCIONES_OLOR,
  OPCIONES_TEMPERATURA,
  abreviarUnidad,
  etiquetaDe,
  faunaDe,
  formatearCantidad,
  residuosDe,
  sumarPorUnidad,
} from '@/lib/bitacora';

interface VisitaReporte {
  id: string;
  fecha: string;
  cantidad_material: number | null;
  unidad_medida: string | null;
  plagas: boolean;
  lixiviados: boolean;
  observaciones: string | null;
  propuesta_mejora: string | null;
  tipos_residuo: string[] | null;
  residuo_otro: string | null;
  temperatura_nivel: string | null;
  humedad_nivel: string | null;
  olor_nivel: string | null;
  fauna: string[] | null;
  evidencias: {
    url_publica: string | null;
  }[] | null;
  composteros: {
    id: string;
    nombre: string;
    codigo: string;
    colonias: { nombre: string } | null;
  };
  usuarios: {
    nombre: string;
    apellido_paterno: string | null;
  } | null;
}

const nombreAutor = (v: VisitaReporte) =>
  v.usuarios ? `${v.usuarios.nombre} ${v.usuarios.apellido_paterno || ''}`.trim() : 'Usuario eliminado';

const fechaCorta = (fecha: string) => new Date(fecha).toLocaleDateString('es-MX');

// Reporte_EcoGuardianes_2026-09-30_14-35.pdf — Windows no permite ":" en nombres de archivo
const nombreArchivo = (extension: 'xlsx' | 'pdf') =>
  `Reporte_EcoGuardianes_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.${extension}`;

// Descarga una foto y la reduce (máx. 800 px) para que el PDF se genere rápido y pese poco.
// null si no se pudo cargar: en el PDF sale "Imagen no disponible".
const LADO_MAXIMO_FOTO = 800;
function cargarFotoParaPdf(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const escala = Math.min(1, LADO_MAXIMO_FOTO / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

interface ComposteroFiltro {
  id: string;
  nombre: string;
  codigo: string;
}

export default function AdminReportes() {
  const [cargando, setCargando] = useState(true);
  const [esSuperAdmin, setEsSuperAdmin] = useState(false);
  const [visitasCrudas, setVisitasCrudas] = useState<VisitaReporte[]>([]);
  const [listaComposteros, setListaComposteros] = useState<ComposteroFiltro[]>([]);
  
  // Filtros
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroComposteroId, setFiltroComposteroId] = useState('todos');
  // Evita descargas repetidas: el PDF tarda unos segundos si hay muchas fotos
  const [exportando, setExportando] = useState<'excel' | 'pdf' | null>(null);

  useEffect(() => {
    cargarDatosReporte();
  }, []);

  const cargarDatosReporte = async () => {
    setCargando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('colonia_id, roles(nombre)')
        .eq('auth_user_id', user.id)
        .single();
        
      const rolNombre = Array.isArray(usuario?.roles) ? usuario.roles[0]?.nombre : (usuario?.roles as any)?.nombre;
      const superAdmin = rolNombre === 'Super Admin';
      setEsSuperAdmin(superAdmin);

      // Cargar visitas con relaciones y evidencias reales
      let queryVisitas = supabase
        .from('visitas')
        .select(`
          id,
          fecha,
          cantidad_material,
          unidad_medida,
          plagas,
          lixiviados,
          observaciones,
          propuesta_mejora,
          tipos_residuo,
          residuo_otro,
          temperatura_nivel,
          humedad_nivel,
          olor_nivel,
          fauna,
          composteros!inner(id, nombre, codigo, colonia_id, colonias(nombre)),
          usuarios(nombre, apellido_paterno),
          evidencias(url_publica)
        `)
        .is('deleted_at', null)
        .order('fecha', { ascending: true });

      // Cargar composteros para el selector de filtro
      let queryComposteros = supabase
        .from('composteros')
        .select('id, nombre, codigo, colonia_id')
        .eq('activo', true);

      if (!superAdmin && usuario?.colonia_id) {
        queryVisitas = queryVisitas.eq('composteros.colonia_id', usuario.colonia_id);
        queryComposteros = queryComposteros.eq('colonia_id', usuario.colonia_id);
      }

      const [{ data: dataVisitas, error: errVisitas }, { data: dataComposteros }] = await Promise.all([
        queryVisitas,
        queryComposteros
      ]);

      if (errVisitas) throw errVisitas;

      setVisitasCrudas((dataVisitas as unknown as VisitaReporte[]) || []);
      setListaComposteros(dataComposteros || []);
    } catch (error) {
      console.error('Error al cargar datos para reportes:', error);
      toast.error('No se pudieron cargar los datos estadísticos.');
    } finally {
      setCargando(false);
    }
  };

  // Aplicar filtros de fecha y compostero
  const visitasFiltradas = visitasCrudas.filter(v => {
    // Fecha local: con split('T') las visitas de la noche caían en el día siguiente (UTC)
    const fechaVisita = format(new Date(v.fecha), 'yyyy-MM-dd');
    if (filtroFechaInicio && fechaVisita < filtroFechaInicio) return false;
    if (filtroFechaFin && fechaVisita > filtroFechaFin) return false;
    if (filtroComposteroId !== 'todos' && v.composteros.id !== filtroComposteroId) return false;
    return true;
  });

  // Kilos y litros nunca se suman entre sí
  const { kg: totalKg, litros: totalLitros } = sumarPorUnidad(visitasFiltradas);
  const visitasEnLitros = visitasFiltradas.filter(v => v.unidad_medida === 'litros').length;
  const visitasEnKg = visitasFiltradas.length - visitasEnLitros;

  const totalVisitas = visitasFiltradas.length;
  const totalPlagas = visitasFiltradas.filter(v => v.plagas).length;
  const totalLixiviados = visitasFiltradas.filter(v => v.lixiviados).length;
  const promedioKg = visitasEnKg > 0 ? totalKg / visitasEnKg : 0;
  const promedioLitros = visitasEnLitros > 0 ? totalLitros / visitasEnLitros : 0;

  // Gráfica de barras: una serie por unidad
  const datosPorFechaMap = new Map<string, { fecha: string; kg: number; litros: number }>();
  visitasFiltradas.forEach(v => {
    const fechaStr = new Date(v.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    const dia = datosPorFechaMap.get(fechaStr) || { fecha: fechaStr, kg: 0, litros: 0 };
    if (v.unidad_medida === 'litros') dia.litros += Number(v.cantidad_material) || 0;
    else dia.kg += Number(v.cantidad_material) || 0;
    datosPorFechaMap.set(fechaStr, dia);
  });
  const datosGraficaBarras = Array.from(datosPorFechaMap.values());

  // Gráfica de pastel: una visita con plagas y lixiviados no se resta dos veces
  const sinAlertas = visitasFiltradas.filter(v => !v.plagas && !v.lixiviados).length;
  const datosGraficaPastel = [
    { name: 'Sin Alertas', value: sinAlertas },
    { name: 'Plagas', value: totalPlagas },
    { name: 'Lixiviados', value: totalLixiviados },
  ];
  const COLORES_PASTEL = ['#16a34a', '#dc2626', '#f97316'];

  const hayDatosParaExportar = () => {
    if (visitasFiltradas.length > 0) return true;
    toast.error('No hay bitácoras con los filtros seleccionados.');
    return false;
  };

  // Exportar a Excel
  const exportarExcel = async () => {
    if (exportando || !hayDatosParaExportar()) return;
    setExportando('excel');
    // Deja que el botón se pinte como "Generando…" antes de armar el archivo
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      generarExcel();
    } catch (error) {
      console.error(error);
      toast.error('No se pudo generar el Excel.');
    } finally {
      setExportando(null);
    }
  };

  const generarExcel = () => {
    const datosExcel = visitasFiltradas.map(v => ({
      Fecha: new Date(v.fecha).toLocaleString('es-MX'),
      Compostero: `${v.composteros.nombre} (${v.composteros.codigo})`,
      Colonia: v.composteros.colonias?.nombre || 'Global',
      'Eco Guardiana': nombreAutor(v),
      Cantidad: Number(v.cantidad_material) || 0,
      Unidad: abreviarUnidad(v.unidad_medida),
      Residuos: residuosDe(v).join(', '),
      Temperatura: etiquetaDe(OPCIONES_TEMPERATURA, v.temperatura_nivel),
      Humedad: etiquetaDe(OPCIONES_HUMEDAD, v.humedad_nivel),
      Olor: etiquetaDe(OPCIONES_OLOR, v.olor_nivel),
      'Vida observada': faunaDe(v).join(', '),
      Plagas: v.plagas ? 'Sí' : 'No',
      Lixiviados: v.lixiviados ? 'Sí' : 'No',
      Observaciones: v.observaciones || '',
      'Propuesta de mejora': v.propuesta_mejora || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Visitas");
    XLSX.writeFile(workbook, nombreArchivo('xlsx'));
    toast.success("Archivo Excel descargado con éxito.");
  };

  // Exportar a PDF Ejecutivo con Desglose y Evidencias Fotográficas Reales
  const exportarPDF = async () => {
    if (exportando || !hayDatosParaExportar()) return;
    setExportando('pdf');
    const aviso = toast.loading('Generando PDF… puede tardar unos segundos si hay muchas fotos.');
    try {
      await generarPDF();
      toast.success('PDF con desglose e imágenes generado con éxito.', { id: aviso });
    } catch (error) {
      console.error(error);
      toast.error('No se pudo generar el PDF.', { id: aviso });
    } finally {
      setExportando(null);
    }
  };

  const generarPDF = async () => {
    const doc = new jsPDF();
    
    // Encabezado institucional
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(22, 163, 74); 
    doc.text("ECO-GUARDIANES", 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Reporte de Rendimiento y Bitácoras", 14, 27);

    doc.setFontSize(10);
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-MX')}`, 14, 34);

    // Caja de Resumen Ejecutivo (KPIs)
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 247, 245);
    doc.roundedRect(14, 38, 182, 20, 3, 3, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text("RESUMEN GENERAL:", 18, 46);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`• Total Kilos: ${totalKg.toFixed(1)} kg`, 18, 53);
    doc.text(`• Total Litros: ${totalLitros.toFixed(1)} L`, 65, 53);
    doc.text(`• Total Bitácoras: ${totalVisitas}`, 120, 53);

    // Tabla 1: Resumen General de Aportes
    const tablaColumnas = ["Fecha", "Compostero", "Eco Guardiana", "Aporte", "Plagas", "Lixiviados"];
    const tablaFilas = visitasFiltradas.map(v => [
      fechaCorta(v.fecha),
      `${v.composteros.nombre} (${v.composteros.codigo})`,
      nombreAutor(v),
      `+${formatearCantidad(v.cantidad_material, v.unidad_medida)}`,
      v.plagas ? 'Sí' : 'No',
      v.lixiviados ? 'Sí' : 'No'
    ]);

    autoTable(doc, {
      startY: 62,
      head: [tablaColumnas],
      body: tablaFilas,
      theme: 'grid',
      headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    // Tabla 2: Desglose técnico de parámetros físicos y observaciones reales
    let ultimaPosicionY = (doc as any).lastAutoTable.finalY + 10;
    
    if (ultimaPosicionY > 220) {
      doc.addPage();
      ultimaPosicionY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(22, 163, 74);
    doc.text("DESGLOSE TÉCNICO DE MONITOREO Y OBSERVACIONES", 14, ultimaPosicionY);

    const tablaDetallesColumnas = ["Fecha", "Compostero", "Monitoreo (temperatura, humedad, olor, residuos, vida, notas y propuesta)"];

    const tablaDetallesFilas = visitasFiltradas.map(v => {
      const detalles = [
        v.temperatura_nivel && `Temperatura: ${etiquetaDe(OPCIONES_TEMPERATURA, v.temperatura_nivel)}`,
        v.humedad_nivel && `Humedad: ${etiquetaDe(OPCIONES_HUMEDAD, v.humedad_nivel)}`,
        v.olor_nivel && `Olor: ${etiquetaDe(OPCIONES_OLOR, v.olor_nivel)}`,
        residuosDe(v).length > 0 && `Residuos: ${residuosDe(v).join(', ')}`,
        faunaDe(v).length > 0 && `Vida: ${faunaDe(v).join(', ')}`,
        v.observaciones && `Notas: ${v.observaciones.replace(/\s+/g, ' ').trim()}`,
        v.propuesta_mejora && `Propuesta: ${v.propuesta_mejora.replace(/\s+/g, ' ').trim()}`,
      ].filter(Boolean).join('\n');

      return [
        fechaCorta(v.fecha),
        v.composteros.nombre,
        detalles || "Sin datos de monitoreo en esta visita."
      ];
    });

    autoTable(doc, {
      startY: ultimaPosicionY + 4,
      head: [tablaDetallesColumnas],
      body: tablaDetallesFilas,
      theme: 'grid',
      headStyles: { fillColor: [50, 50, 50], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 7.5, cellPadding: 3 },
      columnStyles: { 2: { cellWidth: 95 } },
      alternateRowStyles: { fillColor: [250, 250, 250] }
    });

    // Recolectar todas las evidencias fotográficas únicas filtradas
    const urlsEvidencias = Array.from(
      new Set(
        visitasFiltradas.flatMap(v =>
          Array.isArray(v.evidencias)
            ? v.evidencias
                .map(e => e?.url_publica)
                .filter((url): url is string => Boolean(url))
            : []
        )
      )
    );

    // Sección 3: Evidencias Fotográficas en el PDF
    if (urlsEvidencias.length > 0) {
      doc.addPage(); 
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(22, 163, 74);
      doc.text("REGISTRO FOTOGRÁFICO DE EVIDENCIAS", 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Galería de imágenes asociadas a las visitas y monitoreos filtrados.", 14, 26);

      let posY = 35;
      let posX = 14;
      const anchoImg = 55;
      const altoImg = 45;
      const margenX = 12;
      const margenY = 15;
      let contadorColumna = 0;

      // Todas las fotos se descargan a la vez (antes era una por una)
      const fotos = await Promise.all(urlsEvidencias.map(cargarFotoParaPdf));

      for (let i = 0; i < fotos.length; i++) {
        const foto = fotos[i];

        if (posY + altoImg > 270) {
          doc.addPage();
          posY = 20;
          contadorColumna = 0;
          posX = 14;
        }

        if (foto) {
          doc.setDrawColor(220, 220, 220);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(posX, posY, anchoImg, altoImg, 2, 2, 'FD');
          doc.addImage(foto, 'JPEG', posX + 2, posY + 2, anchoImg - 4, altoImg - 4);
        } else {
          console.error('No se pudo incrustar la imagen en el PDF:', urlsEvidencias[i]);
          doc.setDrawColor(200, 200, 200);
          doc.setFillColor(245, 245, 245);
          doc.roundedRect(posX, posY, anchoImg, altoImg, 2, 2, 'FD');
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text("Imagen no", posX + 15, posY + 22);
          doc.text("disponible", posX + 15, posY + 27);
        }

        contadorColumna++;
        if (contadorColumna < 3) {
          posX += anchoImg + margenX;
        } else {
          contadorColumna = 0;
          posX = 14;
          posY += altoImg + margenY;
        }
      }
    }

    doc.save(nombreArchivo('pdf'));
  };

  if (cargando) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-green-600" /></div>;
  }

  return (
    <div className="mx-auto max-w-7xl py-2 sm:py-4 animate-in fade-in duration-500">
      
      {/* Cabecera y Botones */}
      <div className="mb-8 border-b border-[#4A2E18]/10 pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">Reportes y Estadísticas</h1>
          <p className="mt-1 font-medium text-green-700">
            {esSuperAdmin ? 'Rendimiento global del sistema y zonas operativas' : 'Rendimiento de tu zona operativa'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={exportarExcel}
            disabled={exportando !== null}
            className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-sm font-semibold text-green-700 shadow-sm transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportando === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            {exportando === 'excel' ? 'Generando…' : 'Excel'}
          </button>
          <button
            onClick={exportarPDF}
            disabled={exportando !== null}
            className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exportando === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {exportando === 'pdf' ? 'Generando…' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Barra de Filtros Avanzada (Fecha y Compostero) */}
      <Card className="mb-8 border-transparent bg-white shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Filter className="h-4 w-4 text-green-600" /> Filtros:
          </div>
          
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className="w-20 shrink-0 text-xs text-gray-500 sm:w-auto">Compostero:</span>
            <select
              value={filtroComposteroId}
              onChange={e => setFiltroComposteroId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg sm:max-w-xs sm:flex-none border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none"
            >
              <option value="todos">-- Todos los composteros --</option>
              {listaComposteros.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.codigo})</option>
              ))}
            </select>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className="w-20 shrink-0 text-xs text-gray-500 sm:w-auto">Desde:</span>
            <input 
              type="date" 
              value={filtroFechaInicio} 
              onChange={e => setFiltroFechaInicio(e.target.value)}
              className="min-w-0 flex-1 rounded-lg sm:flex-none border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            <span className="w-20 shrink-0 text-xs text-gray-500 sm:w-auto">Hasta:</span>
            <input 
              type="date" 
              value={filtroFechaFin} 
              onChange={e => setFiltroFechaFin(e.target.value)}
              className="min-w-0 flex-1 rounded-lg sm:flex-none border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>

          {(filtroFechaInicio || filtroFechaFin || filtroComposteroId !== 'todos') && (
            <button 
              onClick={() => { setFiltroFechaInicio(''); setFiltroFechaFin(''); setFiltroComposteroId('todos'); }}
              className="text-xs font-semibold text-red-600 hover:underline ml-auto"
            >
              Limpiar filtros
            </button>
          )}
        </CardContent>
      </Card>

      {/* Tarjetas de Información Concreta */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        
        {/* NUEVA TARJETA: MATERIA ORGÁNICA */}
        <Card className="border-transparent bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Materia Orgánica</p>
                <div className="mt-2 flex flex-col gap-1">
                  <p className="text-2xl font-bold text-green-700">
                    {totalKg.toFixed(1)} <span className="text-sm font-semibold text-gray-500">kg</span>
                  </p>
                  <p className="text-xl font-bold text-blue-600">
                    {totalLitros.toFixed(1)} <span className="text-sm font-semibold text-gray-500">L</span>
                  </p>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-xl"><Sprout className="h-6 w-6 text-green-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-transparent bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bitácoras Totales</p>
                <p className="mt-2 text-3xl font-bold text-blue-700">{totalVisitas}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl"><TrendingUp className="h-6 w-6 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-transparent bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Promedio por Aporte</p>
                <div className="mt-2 flex flex-col gap-1">
                  <p className="text-2xl font-bold text-purple-700">
                    {promedioKg.toFixed(1)} <span className="text-sm font-semibold text-gray-500">kg</span>
                  </p>
                  {visitasEnLitros > 0 && (
                    <p className="text-xl font-bold text-purple-500">
                      {promedioLitros.toFixed(1)} <span className="text-sm font-semibold text-gray-500">L</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl"><Calendar className="h-6 w-6 text-purple-600" /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-transparent bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Plagas / Lixiviados</p>
                <p className="mt-2 text-3xl font-bold text-red-700">{totalPlagas + totalLixiviados}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas Dinámicas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Gráfica de Barras con Scroll Horizontal */}
        <Card className="border-transparent bg-white shadow-sm">
          <CardHeader className="border-b bg-gray-50/50 px-6 py-4">
            <CardTitle className="text-lg text-gray-800">Aporte de Materia Orgánica por Fecha</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-72 w-full overflow-x-auto">
              <div style={{ width: `${Math.max(datosGraficaBarras.length * 60, 400)}px`, height: '100%' }}>
                {datosGraficaBarras.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={datosGraficaBarras}>
                      <XAxis dataKey="fecha" stroke="#888888" fontSize={12} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="kg" name="Kilos (kg)" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={24} />
                      {totalLitros > 0 && <Bar dataKey="litros" name="Litros (L)" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={24} />}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-400">Sin datos para mostrar en este periodo</div>
                )}
              </div>
            </div>
            {datosGraficaBarras.length > 6 && (
              <p className="text-center text-xs text-gray-400 mt-2">← Desliza horizontalmente para ver más fechas →</p>
            )}
          </CardContent>
        </Card>

        {/* Gráfica de Pastel (Incidencias) */}
        <Card className="border-transparent bg-white shadow-sm">
          <CardHeader className="border-b bg-gray-50/50 px-6 py-4">
            <CardTitle className="text-lg text-gray-800">Proporción de Alertas e Incidencias</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-72 w-full flex items-center justify-center">
              {totalVisitas > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datosGraficaPastel}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label
                    >
                      {datosGraficaPastel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORES_PASTEL[index % COLORES_PASTEL.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400">Sin datos de incidencias</div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

