import React from 'react';
import { Smartphone, ExternalLink } from 'lucide-react';

/**
 * MobileGate — Placeholder para el Dashboard de OneControl.
 * La app completa de configuración de portones vive en:
 * https://onecontrol-mobile.vercel.app
 */
const MobileGate = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] space-y-6 p-10">
      <div className="h-20 w-20 rounded-[28px] bg-slate-900 flex items-center justify-center shadow-xl">
        <Smartphone size={36} className="text-[#FF6B00]" />
      </div>
      <div className="text-center max-w-sm">
        <h2 className="text-2xl font-black text-slate-900 tracking-tighter italic">OneControl Mobile</h2>
        <p className="text-sm font-medium text-slate-400 mt-2 leading-relaxed">
          La herramienta de configuración de portones ESP32 está disponible como una app independiente.
        </p>
      </div>
      <a
        href="https://onecontrol-mobile.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center space-x-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-[#FF6B00] transition-all duration-300 shadow-lg"
      >
        <ExternalLink size={16} />
        <span>Abrir OneControl Mobile</span>
      </a>
    </div>
  );
};

export default MobileGate;
