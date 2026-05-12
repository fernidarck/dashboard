import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Wifi, 
  Cpu, 
  Plus, 
  CheckCircle2, 
  Loader2, 
  Smartphone, 
  Signal, 
  Copy,
  Trash2,
  Settings,
  ChevronRight,
  LogOut,
  Lock,
  Zap,
  History,
  ShieldCheck
} from 'lucide-react';

const MobileGate = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard'); // dashboard | provisioning | success
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState('Copiar');
  
  // Estado del asistente de registro
  const [step, setStep] = useState(1);
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPass, setWifiPass] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [isTransmitting, setIsTransmitting] = useState(false);

  // 1. Manejo de Autenticación con Supabase
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
        } else {
          // Intentar login anónimo si está habilitado en Supabase
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) console.error("Error auth:", error.message);
          else setUser(data.user);
        }
      } catch (error) {
        console.error("Error de autenticación:", error);
      } finally {
        setLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Escuchar Dispositivos (Supabase Realtime)
  useEffect(() => {
    if (!user) return;

    const fetchDevices = async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('owner_id', user.id);
      
      if (!error) setDevices(data);
    };

    fetchDevices();

    // Suscripción en tiempo real
    const channel = supabase
      .channel('devices_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'devices',
        filter: `owner_id=eq.${user.id}` 
      }, (payload) => {
        fetchDevices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const copyToClipboard = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.id).then(() => {
      setCopyStatus('¡Copiado!');
      setTimeout(() => setCopyStatus('Copiar'), 2000);
    });
  };

  const handleFinishRegistration = async () => {
    setIsTransmitting(true);
    
    // Simulación de envío de datos al ESP32 (3 segundos)
    setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('devices')
          .insert([{
            name: deviceName,
            wifi_ssid: wifiSsid,
            owner_id: user.id,
            status: 'online',
          }]);
        
        if (error) throw error;
        
        setIsTransmitting(false);
        setView('success');
      } catch (error) {
        setIsTransmitting(false);
        alert("Error al guardar: " + error.message);
      }
    }, 3000);
  };

  const handleOpenGate = async (device) => {
    // Aquí iría la lógica para enviar el comando al ESP32 vía Supabase o API
    alert(`Enviando señal de apertura a: ${device.name}`);
    
    // Registrar en el historial técnico (device_logs)
    await supabase.from('device_logs').insert([{
      device_id: device.id,
      user_id: user.id,
      action: 'test_open'
    }]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 text-orange-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Iniciando sistema OneControl...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pb-20 animate-in fade-in duration-500">
        
        {/* VISTA: DASHBOARD */}
        {view === 'dashboard' && (
          <div className="space-y-6">
            {/* Header Visual */}
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="relative z-10">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-[0.2em] mb-2">Bienvenido de nuevo</p>
                    <h2 className="text-3xl font-black italic tracking-tight">Acceso Total</h2>
                    <div className="mt-6 flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                        <div className="bg-orange-500 p-2 rounded-xl">
                            <ShieldCheck className="text-white w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider">Mi ID de Usuario</p>
                            <p className="font-mono text-sm font-bold truncate text-orange-100">{user?.id}</p>
                        </div>
                        <button onClick={copyToClipboard} className="ml-auto bg-white/20 p-2 rounded-xl hover:bg-white/30 transition-colors">
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <Zap className="absolute -right-10 -bottom-10 text-white/5 w-60 h-60" />
            </div>

            {/* Lista de Dispositivos */}
            <div>
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="font-black text-slate-800 text-xl tracking-tight italic">Mis Puertas</h3>
                <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                  {devices.length} Activas
                </span>
              </div>

              {devices.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center shadow-sm">
                  <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Signal className="text-slate-300 w-10 h-10" />
                  </div>
                  <h4 className="font-black text-slate-800 text-lg">Sin equipos vinculados</h4>
                  <p className="text-slate-500 text-sm mt-2 max-w-[200px] mx-auto leading-relaxed">Configura tu ESP32 para empezar a controlar tus portones.</p>
                  <button 
                    onClick={() => setView('provisioning')}
                    className="mt-6 bg-orange-600 text-white font-black px-6 py-3 rounded-2xl shadow-lg shadow-orange-100 hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest"
                  >
                    Vincular ahora
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {devices.map((device) => (
                    <div key={device.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col gap-6 group hover:shadow-xl hover:shadow-orange-100/30 transition-all duration-300">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-orange-50 p-4 rounded-2xl text-orange-600">
                                <Cpu className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="font-black text-slate-800 text-xl tracking-tight">{device.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">WiFi: {device.wifi_ssid}</p>
                                </div>
                            </div>
                        </div>
                        <button className="p-3 bg-slate-50 rounded-2xl text-slate-300 group-hover:text-orange-500 group-hover:bg-orange-50 transition-all">
                            <Settings className="w-5 h-5" />
                        </button>
                      </div>

                      <button 
                        onClick={() => handleOpenGate(device)}
                        className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-transform group/btn overflow-hidden relative"
                      >
                        <span className="relative z-10 uppercase tracking-[0.2em] text-sm">Abrir Portón</span>
                        <Zap className="w-5 h-5 relative z-10 text-orange-400" />
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-400 opacity-0 group-active/btn:opacity-100 transition-opacity" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setView('provisioning')} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center gap-3 hover:border-orange-200 transition-colors">
                    <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><Plus className="w-6 h-6" /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Nuevo Equipo</span>
                </button>
                <button className="bg-white p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center gap-3 hover:border-orange-200 transition-colors">
                    <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><History className="w-6 h-6" /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Historial</span>
                </button>
            </div>
          </div>
        )}

        {/* VISTA: PROVISIONAMIENTO */}
        {view === 'provisioning' && (
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="p-8">
              <div className="flex justify-between items-center mb-10">
                <button onClick={() => setView('dashboard')} className="bg-slate-50 text-slate-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
                <div className="flex gap-1.5">
                  {[1, 2, 3].map(s => (
                    <div key={s} className={`h-2 w-8 rounded-full transition-all duration-500 ${step >= s ? 'bg-orange-500 shadow-lg shadow-orange-100' : 'bg-slate-100'}`} />
                  ))}
                </div>
              </div>

              {step === 1 && (
                <div className="space-y-8">
                  <div className="text-center">
                    <div className="bg-orange-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 rotate-3 shadow-lg shadow-orange-50">
                      <Smartphone className="text-orange-600 w-12 h-12" />
                    </div>
                    <h3 className="text-3xl font-black tracking-tight italic">Nombra tu Equipo</h3>
                    <p className="text-slate-400 mt-2 text-sm">Ej: "Portón Calle Principal" o "Entrada Garage".</p>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Escribe el nombre aquí..."
                    className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-orange-500 focus:bg-white outline-none transition-all text-xl font-bold tracking-tight text-slate-800"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                  <button 
                    disabled={!deviceName}
                    onClick={() => setStep(2)}
                    className="w-full bg-slate-900 disabled:opacity-30 text-white font-black py-5 rounded-[1.5rem] shadow-xl text-sm uppercase tracking-[0.2em] transition-all"
                  >
                    Siguiente Paso
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="text-center">
                    <div className="bg-indigo-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 -rotate-3 shadow-lg shadow-indigo-50">
                      <Wifi className="text-indigo-600 w-12 h-12" />
                    </div>
                    <h3 className="text-3xl font-black tracking-tight italic">Conexión WiFi</h3>
                    <p className="text-slate-400 mt-2 text-sm">El ESP32 necesita internet para recibir órdenes.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="relative">
                      <Wifi className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
                      <input 
                        type="text" 
                        placeholder="Nombre de Red (SSID)"
                        className="w-full pl-16 p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-orange-500 focus:bg-white outline-none font-bold"
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6" />
                      <input 
                        type="password" 
                        placeholder="Contraseña del WiFi"
                        className="w-full pl-16 p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] focus:border-orange-500 focus:bg-white outline-none font-bold"
                        value={wifiPass}
                        onChange={(e) => setWifiPass(e.target.value)}
                      />
                    </div>
                  </div>
                  <button 
                    disabled={!wifiSsid || !wifiPass}
                    onClick={() => setStep(3)}
                    className="w-full bg-slate-900 disabled:opacity-30 text-white font-black py-5 rounded-[1.5rem] shadow-xl text-sm uppercase tracking-[0.2em]"
                  >
                    Ver Resumen
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <div className="text-center">
                    <h3 className="text-3xl font-black tracking-tight italic">Confirmación</h3>
                    <p className="text-slate-400 mt-2 text-sm">Verifica los datos antes de la sincronización.</p>
                  </div>
                  
                  <div className="bg-slate-900 p-8 rounded-[2rem] space-y-4 text-white shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Equipo</span>
                      <span className="font-black text-orange-400 italic">{deviceName}</span>
                    </div>
                    <div className="flex justify-between items-center relative z-10">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Red WiFi</span>
                      <span className="font-bold">{wifiSsid}</span>
                    </div>
                    <div className="pt-4 border-t border-white/10 flex flex-col gap-2 relative z-10">
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center">Tu Firma Digital (Owner ID)</span>
                      <span className="font-mono text-[10px] bg-white/5 py-3 px-4 rounded-xl text-orange-200 truncate border border-white/5">{user?.id}</span>
                    </div>
                    <Zap className="absolute -left-10 -bottom-10 text-white/5 w-40 h-40" />
                  </div>

                  <button 
                    disabled={isTransmitting}
                    onClick={handleFinishRegistration}
                    className="w-full bg-orange-600 text-white font-black py-6 rounded-[1.5rem] shadow-xl shadow-orange-100 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isTransmitting ? (
                      <>
                        <Loader2 className="animate-spin w-6 h-6" /> 
                        <span className="uppercase tracking-[0.2em] text-sm">Sincronizando...</span>
                      </>
                    ) : (
                      <>
                        <span className="uppercase tracking-[0.2em] text-sm">Vincular Equipo</span>
                        <CheckCircle2 className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA: ÉXITO */}
        {view === 'success' && (
          <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-100 text-center animate-in zoom-in-90 duration-500">
            <div className="bg-emerald-100 w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-50">
              <CheckCircle2 className="text-emerald-600 w-16 h-16" />
            </div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tight italic">¡Vínculo Exitoso!</h2>
            <p className="text-slate-500 mt-4 mb-10 text-lg leading-relaxed">Tu ESP32 ahora es parte de la red OneControl. Puedes abrir tu portón desde cualquier lugar.</p>
            <button 
              onClick={() => setView('dashboard')}
              className="w-full bg-slate-900 text-white font-black py-6 rounded-[1.5rem] shadow-xl text-sm uppercase tracking-[0.2em] hover:scale-105 transition-all"
            >
              Ir al Panel de Control
            </button>
          </div>
        )}
    </div>
  );
};

export default MobileGate;
