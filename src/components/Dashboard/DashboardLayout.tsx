import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const DashboardLayout = () => {
  // Estado para controlar si el menú móvil está abierto o cerrado
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh w-full bg-[#F9F7F1] font-sans text-[#4A2E18]">

      {/* Fondo oscuro transparente (solo celular/tablet con el menú abierto) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Menú lateral: deslizable en celular/tablet, fijo a la izquierda desde pantallas grandes.
          Se monta una sola vez para no volver a consultar el rol cada vez que se abre. */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] shrink-0 shadow-2xl transition-[transform,visibility] duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:max-w-none lg:translate-x-0 lg:shadow-none lg:visible ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full invisible'
        }`}
      >
        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Contenedor Principal Central */}
      <main className="flex min-w-0 flex-1 flex-col overflow-x-clip">

        {/* Barra superior móvil */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#4A2E18]/10 bg-[#FFF8DF] px-4 py-3 shadow-sm lg:hidden">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="w-6 h-6 object-contain" />
            <span className="font-bold text-lg text-[#4A2E18]">Eco-Guardianes</span>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={isMobileMenuOpen}
            className="p-2 text-[#4A2E18] focus:outline-none hover:bg-[#4A2E18]/5 rounded-lg"
          >
            <img src="/menu.svg" alt="" className="w-6 h-6 object-contain" />
          </button>
        </header>

        {/* Área donde cargan las páginas (con padding más amigable para celular) */}
        <div className="w-full min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>

      </main>
    </div>
  );
};
