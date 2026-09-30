import React, { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Sprout, AlertTriangle, FileDown, Calendar, Filter, FileSpreadsheet, Warehouse } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

interface VisitaReporte {
  id: string;
  fecha: string;
  cantidad_material: number | null;
  unidad_medida: string | null;
  plagas: boolean;
  lixiviados: boolean;
  observaciones: string | null;
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
  };
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
          composteros!inner(id, nombre, codigo, colonia_id, colonias(nombre)),
          usuarios(nombre, apellido_paterno),
          evidencias(url_publica)
        `)
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
    const fechaVisita = v.fecha.split('T')[0];
    if (filtroFechaInicio && fechaVisita < filtroFechaInicio) return false;
    if (filtroFechaFin && fechaVisita > filtroFechaFin) return false;
    if (filtroComposteroId !== 'todos' && v.composteros.id !== filtroComposteroId) return false;
    return true;
  });

  // Calcular métricas dinámicas separadas
  const totalKg = visitasFiltradas
    .filter(v => v.unidad_medida === 'kg' || !v.unidad_medida)
    .reduce((acc, v) => acc + (Number(v.cantidad_material) || 0), 0);

  const totalLitros = visitasFiltradas
    .filter(v => v.unidad_medida === 'litros')
    .reduce((acc, v) => acc + (Number(v.cantidad_material) || 0), 0);

  const totalVisitas = visitasFiltradas.length;
  const totalPlagas = visitasFiltradas.filter(v => v.plagas).length;
  const totalLixiviados = visitasFiltradas.filter(v => v.lixiviados).length;
  const promedioAporte = totalVisitas > 0 ? ((totalKg + totalLitros) / totalVisitas).toFixed(2) : '0';

  // Datos Gráfica de Barras (Mantenemos la suma total para la gráfica)
  const datosPorFechaMap: { [key: string]: number } = {};
  visitasFiltradas.forEach(v => {
    const fechaStr = new Date(v.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
    datosPorFechaMap[fechaStr] = (datosPorFechaMap[fechaStr] || 0) + (Number(v.cantidad_material) || 0);
  });
  const datosGraficaBarras = Object.keys(datosPorFechaMap).map(fecha => ({
    fecha,
    kilos: datosPorFechaMap[fecha]
  }));

  // Datos Gráfica de Pastel
  const sinAlertas = totalVisitas - (totalPlagas + totalLixiviados);
  const datosGraficaPastel = [
    { name: 'Sin Alertas', value: sinAlertas > 0 ? sinAlertas : 0 },
    { name: 'Plagas', value: totalPlagas },
    { name: 'Lixiviados', value: totalLixiviados },
  ];
  const COLORES_PASTEL = ['#16a34a', '#dc2626', '#f97316'];

  // Exportar a Excel
  const exportarExcel = () => {
    const datosExcel = visitasFiltradas.map(v => ({
      Fecha: new Date(v.fecha).toLocaleString('es-MX'),
      Compostero: `${v.composteros.nombre} (${v.composteros.codigo})`,
      Colonia: v.composteros.colonias?.nombre || 'Global',
      'Eco Guardiana': `${v.usuarios.nombre} ${v.usuarios.apellido_paterno || ''}`,
      'Aporte': v.cantidad_material ? `${v.cantidad_material} ${v.unidad_medida === 'litros' ? 'L' : 'kg'}` : '0 kg',
      Plagas: v.plagas ? 'Sí' : 'No',
      Lixiviados: v.lixiviados ? 'Sí' : 'No'
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte Visitas");
    XLSX.writeFile(workbook, "Reporte_EcoGuardianes.xlsx");
    toast.success("Archivo Excel descargado con éxito.");
  };

  // Exportar a PDF Ejecutivo con Desglose y Evidencias Fotográficas Reales
  const exportarPDF = async () => {
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
      new Date(v.fecha.split('T')[0]).toLocaleDateString('es-MX'),
      `${v.composteros.nombre} (${v.composteros.codigo})`,
      `${v.usuarios.nombre} ${v.usuarios.apellido_paterno || ''}`,
      v.cantidad_material ? `+${v.cantidad_material} ${v.unidad_medida === 'litros' ? 'L' : 'kg'}` : '0 kg',
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

    const tablaDetallesColumnas = ["Fecha", "Compostero", "Detalles del Formulario (Temperatura, Humedad, Olor, Fauna y Notas)"];
    
    const tablaDetallesFilas = visitasFiltradas.map(v => {
      const textoObservacion = v.observaciones && v.observaciones.trim() !== "" 
        ? v.observaciones.replace(/\s+/g, ' ').trim() 
        : "Sin observaciones registradas en esta visita.";
      
      return [
        new Date(v.fecha.split('T')[0]).toLocaleDateString('es-MX'),
        v.composteros.nombre,
        textoObservacion
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

      for (let i = 0; i < urlsEvidencias.length; i++) {
        const url = urlsEvidencias[i];

        if (posY + altoImg > 270) {
          doc.addPage();
          posY = 20;
          contadorColumna = 0;
          posX = 14;
        }

        try {
          const imgData = await new Promise<{ dataUrl: string, format: string }>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('No se pudo crear el contexto del canvas'));
                return;
              }
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
              resolve({ dataUrl, format: 'JPEG' });
            };
            img.onerror = (err) => reject(err);
            img.src = url;
          });

          doc.setDrawColor(220, 220, 220);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(posX, posY, anchoImg, altoImg, 2, 2, 'FD');
          doc.addImage(imgData.dataUrl, imgData.format, posX + 2, posY + 2, anchoImg - 4, altoImg - 4);

        } catch (error) {
          console.error("No se pudo incrustar la imagen en el PDF:", error);
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

    doc.save("Reporte_EcoGuardianes.pdf");
    toast.success("PDF con desglose e imágenes generado con éxito.");
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
            className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-2.5 text-sm font-semibold text-green-700 shadow-sm transition-colors hover:bg-green-100"
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </button>
          <button 
            onClick={exportarPDF} 
            className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-colors hover:bg-red-100"
          >
            <FileDown className="h-4 w-4" /> PDF
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
                <p className="mt-2 text-3xl font-bold text-purple-700">{promedioAporte} <span className="text-lg font-semibold">KG/L</span></p>
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
                      <Bar dataKey="kilos" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={32} />
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

