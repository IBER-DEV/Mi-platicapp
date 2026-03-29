import React, { useState, useEffect, useCallback } from 'react';
import { 
  PlusCircle, 
  MinusCircle, 
  Settings, 
  LogOut, 
  FileSpreadsheet, 
  ChevronRight, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'motion/react';
import useSWR from 'swr';

interface Spreadsheet {
  id: string;
  name: string;
}

const CATEGORIES = {
  Ingreso: [
    'Salarios',
    'Aux de transporte',
    'Prestación de servicios',
    'Otros ingresos'
  ],
  Gasto: {
    'Alojamiento': [
      'Hipoteca', 'Teléfono', 'Electricidad', 'Gas', 'Agua', 
      'Televisión por cable', 'Aseo', 'Mantenimiento/reparac.', 'Suministros'
    ],
    'Transporte': [
      'Gastos de taxi o bus', 'Combustible', 'Mantenimiento'
    ],
    'Comida': [
      'Alimentos', 'Restaurantes'
    ],
    'Otros': [
      'Pólizas de seguros', 'Gastos mascotas', 'Cuidado personal/Higiene', 
      'Impuestos', 'Préstamos', 'Tarjetas de crédito', 'Entretenimiento', 'Otros gastos'
    ]
  }
};

// [async-parallel] Fetcher hoisted outside component for stable reference
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
});

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // [rerender-lazy-state-init] Lazy initializer — localStorage read runs only once
  const [selectedSheetId, setSelectedSheetId] = useState<string>(() =>
    localStorage.getItem('selectedSheetId') || ''
  );
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'Ingreso' | 'Gasto'>('Gasto');
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Quick Entry state
  const [quickEntry, setQuickEntry] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  // [client-swr-dedup] SWR: automatic dedup, caching, revalidation & parallel fetching
  const { data: spreadsheets = [] } = useSWR<Spreadsheet[]>(
    isAuthenticated ? '/api/sheets/list' : null,
    fetcher
  );

  const { data: recentRecords = [], mutate: mutateRecent } = useSWR<any[]>(
    isAuthenticated && selectedSheetId
      ? `/api/sheets/recent?spreadsheetId=${selectedSheetId}`
      : null,
    fetcher
  );

  // [async-parallel] checkAuth simplified — SWR handles parallel data fetching automatically
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setIsAuthenticated(data.isAuthenticated);
    } catch (err) {
      console.error('Auth check failed', err);
    }
  }, []);

  useEffect(() => {
    checkAuth();
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkAuth();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkAuth]);

  const handleAiEntry = async () => {
    if (!quickEntry) return;
    setIsAiProcessing(true);
    setStatus(null);

    try {
      const res = await fetch('/api/ai/parse-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quickEntry })
      });

      if (!res.ok) {
        throw new Error('AI request failed');
      }

      const data = await res.json();
      setType(data.type);
      setAmount(data.amount.toString());
      setCategory(data.category);
      setDescription(data.description);
      setQuickEntry('');
      setStatus({ type: 'success', message: '¡IA entendió tu gasto! Revisa los campos abajo.' });
    } catch (err) {
      console.error('AI Processing failed', err);
      setStatus({ type: 'error', message: 'No pude entender el gasto. Intenta escribirlo más claro.' });
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const { url } = await res.json();
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch (err) {
      console.error('Failed to get auth URL', err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSheetId) {
      setStatus({ type: 'error', message: 'Por favor selecciona un Excel primero' });
      return;
    }
    if (!category) {
      setStatus({ type: 'error', message: 'Por favor selecciona una categoría' });
      return;
    }

    setLoading(true);
    setStatus(null);

    const now = new Date();
    const date = now.toLocaleDateString('es-ES');
    const month = now.toLocaleString('es-ES', { month: 'short' }).toUpperCase().replace('.', '');
    
    const values = [date, month, type, category, description, parseFloat(amount)];

    try {
      const res = await fetch('/api/sheets/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: selectedSheetId,
          range: 'Registros!A1', 
          values
        })
      });

      if (res.ok) {
        setStatus({ type: 'success', message: '¡Registro guardado con éxito!' });
        setAmount('');
        setDescription('');
        setCategory('');
        mutateRecent(); // [client-swr-dedup] revalidate via SWR instead of manual refetch
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Error al guardar. Verifica la hoja "Registros".' });
    } finally {
      setLoading(false);
    }
  };

  const saveSheetId = (id: string) => {
    setSelectedSheetId(id);
    localStorage.setItem('selectedSheetId', id);
  };

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      // [bundle-dynamic-imports] LazyMotion loads animation features on demand
      <LazyMotion features={domAnimation}>
        <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
          <m.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-stone-100"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-stone-900 mb-4">Mi Platica</h1>
            <p className="text-stone-600 mb-8 leading-relaxed">
              Conecta tu cuenta de Google para registrar tus gastos e ingresos directamente en tus hojas de cálculo de forma rápida y sencilla.
            </p>
            <button
              onClick={handleLogin}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-200"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              Conectar con Google
            </button>
          </m.div>
        </div>
      </LazyMotion>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-stone-50 pb-20">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 px-6 py-4 sticky top-0 z-10">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Wallet className="w-6 h-6 text-emerald-600" />
              <span className="font-bold text-stone-900">Mi Platicapp</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-stone-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="max-w-md mx-auto p-6 space-y-6">
          {/* Sheet Selection */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
            <div className="flex items-center gap-3 mb-4">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h2 className="font-semibold text-stone-800">Archivo de Destino</h2>
            </div>
            
            <select 
              value={selectedSheetId}
              onChange={(e) => saveSheetId(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            >
              <option value="">Selecciona tu Excel de Presupuesto...</option>
              {spreadsheets.map(sheet => (
                <option key={sheet.id} value={sheet.id}>{sheet.name}</option>
              ))}
            </select>
          </section>

          {/* Quick Entry AI */}
          <section className="bg-emerald-900 rounded-3xl p-6 shadow-xl text-white">
            <div className="flex items-center gap-2 mb-4">
              <m.div
                animate={{ rotate: isAiProcessing ? 360 : 0 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              >
                <PlusCircle className="w-5 h-5 text-emerald-400" />
              </m.div>
              <h2 className="font-bold">Entrada Rápida con IA</h2>
            </div>
            <div className="relative">
              <input 
                type="text" 
                value={quickEntry}
                onChange={(e) => setQuickEntry(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiEntry()}
                placeholder="Ej: Ayer gaste 50 mil en gasolina"
                className="w-full bg-emerald-800/50 border border-emerald-700 rounded-2xl px-4 py-4 text-white placeholder:text-emerald-300/50 focus:ring-2 focus:ring-emerald-400 outline-none transition-all pr-12"
              />
              <button 
                onClick={handleAiEntry}
                disabled={isAiProcessing || !quickEntry}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-400 text-emerald-900 rounded-xl hover:bg-emerald-300 disabled:opacity-50"
              >
                {isAiProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-3 text-[10px] text-emerald-300/70 uppercase tracking-widest font-bold">Escribe como hablas y la IA llenará el formulario</p>
          </section>

          {/* Entry Form */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
            <div className="flex gap-2 mb-6 p-1 bg-stone-100 rounded-2xl">
              <button 
                onClick={() => { setType('Gasto'); setCategory(''); }}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  type === 'Gasto' ? 'bg-white text-red-600 shadow-sm' : 'text-stone-500'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" /> Gasto
              </button>
              <button 
                onClick={() => { setType('Ingreso'); setCategory(''); }}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                  type === 'Ingreso' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-500'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" /> Ingreso
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1 ml-1">Monto</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-8 pr-4 py-4 text-2xl font-bold text-stone-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1 ml-1">Categoría (Según tu Excel)</label>
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-left text-stone-700 flex justify-between items-center hover:bg-stone-100 transition-all"
                >
                  <span className={category ? 'text-stone-900 font-medium' : 'text-stone-400'}>
                    {category || 'Selecciona una categoría...'}
                  </span>
                  <ChevronRight className="w-5 h-5 text-stone-300" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1 ml-1">Nota adicional</label>
                <input 
                  type="text" 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej: Almuerzo con clientes"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>

              {/* [rendering-conditional-render] Ternary instead of && */}
              <AnimatePresence mode="wait">
                {status ? (
                  <m.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex items-center gap-2 p-4 rounded-xl text-sm ${
                      status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
                    {status.message}
                  </m.div>
                ) : null}
              </AnimatePresence>

              <button 
                type="submit"
                disabled={loading || !selectedSheetId || !category}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg flex items-center justify-center gap-2 ${
                  type === 'Gasto' 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-100' 
                    : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    {type === 'Gasto' ? <MinusCircle className="w-6 h-6" /> : <PlusCircle className="w-6 h-6" />}
                    Registrar {type}
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Recent Activity */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5 text-stone-400" />
                </div>
                <h2 className="font-bold text-stone-800">Últimos Movimientos</h2>
              </div>
              <button onClick={() => mutateRecent()} className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Actualizar</button>
            </div>

            <div className="space-y-4">
              {recentRecords.length === 0 ? (
                <p className="text-center py-8 text-stone-400 text-sm">No hay registros recientes en la hoja "Registros".</p>
              ) : (
                recentRecords.map((rec, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        rec[2] === 'Ingreso' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {rec[2] === 'Ingreso' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-stone-800 text-sm">{rec[3]}</p>
                        <p className="text-[10px] text-stone-400 uppercase font-bold">{rec[0]} • {rec[4] || 'Sin nota'}</p>
                      </div>
                    </div>
                    <p className={`font-black ${
                      rec[2] === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {rec[2] === 'Ingreso' ? '+' : '-'}${parseFloat(rec[5]).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="text-center p-4">
            <p className="text-[10px] text-stone-400 leading-relaxed uppercase tracking-widest font-bold">
              Automatización para Presupuesto Mensual
            </p>
          </div>
        </main>

        {/* Category Selection Modal */}
        <AnimatePresence>
          {showCategoryModal && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
              <m.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowCategoryModal(false)}
                className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
              />
              <m.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10">
                  <h3 className="text-xl font-bold text-stone-900">Seleccionar Categoría</h3>
                  <button onClick={() => setShowCategoryModal(false)} className="text-stone-400 hover:text-stone-600 font-bold">Cerrar</button>
                </div>
                
                <div className="overflow-y-auto p-6 space-y-6">
                  {type === 'Ingreso' ? (
                    <div className="grid grid-cols-1 gap-2">
                      {(CATEGORIES.Ingreso as string[]).map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setCategory(cat); setShowCategoryModal(false); }}
                          className="w-full text-left p-4 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 transition-all border border-stone-100 font-medium"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  ) : (
                    Object.entries(CATEGORIES.Gasto).map(([group, cats]) => (
                      <div key={group} className="space-y-2">
                        <h4 className="text-xs font-black text-stone-300 uppercase tracking-[0.2em] mb-3">{group}</h4>
                        <div className="grid grid-cols-1 gap-2">
                          {cats.map(cat => (
                            <button
                              key={cat}
                              onClick={() => { setCategory(cat); setShowCategoryModal(false); }}
                              className="w-full text-left p-4 rounded-xl hover:bg-red-50 hover:text-red-700 transition-all border border-stone-100 font-medium"
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </m.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
}
