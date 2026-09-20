import { useState, useEffect } from 'react'
import { DesignSystemProvider } from '@farutech/design-system'
import { LoginForm } from './features/auth/LoginForm'
import { Badge } from './components/ui/Badge'
import { Button } from './components/ui/Button'
import { ColaTaller } from './features/taller/ColaTaller'
import { SolicitudCapturaMixta } from './features/solicitudes/SolicitudCapturaMixta'
import { ModuloEntregas } from './features/entregas/ModuloEntregas'
import { ModuloCaja } from './features/caja/ModuloCaja'
import { FichaCliente } from './features/clientes/FichaCliente'
import { DashboardOperativo } from './features/dashboard/DashboardOperativo'
import { ModuloReportes } from './features/reportes/ModuloReportes'
import { ModuloAdmin } from './features/admin/ModuloAdmin'
import { useBarcodeScanner } from './hooks/useBarcodeScanner'
import { catalogosApi } from './services/catalogosApi'
import type { UsuarioSesion } from './types/auth'
import type { CanalOrigen, TipoDocumentoIdentidad, Cliente, MedioPagoInstrumento } from './types/catalogos'

type TabId = 'dashboard' | 'caja' | 'solicitudes' | 'taller' | 'entregas' | 'clientes' | 'reportes' | 'admin'

const NAV_ITEMS: { id: TabId; label: string; icon: string; adminOnly?: boolean }[] = [
  { id: 'dashboard',   label: 'Dashboard',             icon: '📊' },
  { id: 'solicitudes', label: 'Nueva Solicitud (POS)', icon: '📝' },
  { id: 'taller',      label: 'Cola de Taller (OT)',   icon: '🛠️' },
  { id: 'entregas',    label: 'Entregas & Despacho',   icon: '📦' },
  { id: 'caja',        label: 'Caja & Turnos',         icon: '💰' },
  { id: 'clientes',    label: 'Clientes',              icon: '👥' },
  { id: 'reportes',    label: 'Reportes',              icon: '📈' },
  { id: 'admin',       label: 'Administración',        icon: '⚙️', adminOnly: true },
]

export function App() {
  const [sesion, setSesion] = useState<UsuarioSesion | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')

  // Lector de código de barras USB/HID (RF-11.2)
  useBarcodeScanner((code) => {
    if (code.startsWith('SOL-') || code.startsWith('OT-') || code.startsWith('REM-')) {
      setActiveTab('entregas')
    }
  })

  // Catálogos para captura de solicitudes y entregas
  const [canales, setCanales] = useState<CanalOrigen[]>([])
  const [tiposDoc, setTiposDoc] = useState<TipoDocumentoIdentidad[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [instrumentos, setInstrumentos] = useState<MedioPagoInstrumento[]>([])

  useEffect(() => {
    if (!sesion) return
    let isMounted = true
    const fetchCatalogos = async () => {
      try {
        const [cRes, tdRes, clRes, inRes] = await Promise.all([
          catalogosApi.getCanalesOrigen().catch(() => ({ canales: [] })),
          catalogosApi.getTiposDocumentoIdentidad().catch(() => ({ tipos: [] })),
          catalogosApi.getClientes().catch(() => ({ clientes: [], total: 0 })),
          catalogosApi.getMediosPagoInstrumentos().catch(() => ({ instrumentos: [] })),
        ])
        if (isMounted) {
          setCanales(cRes.canales)
          setTiposDoc(tdRes.tipos)
          setClientes(clRes.clientes)
          setInstrumentos(inRes.instrumentos)
        }
      } catch {
        // Ignorar fallback
      }
    }
    fetchCatalogos()
    return () => { isMounted = false }
  }, [sesion])

  const handleLogout = () => {
    localStorage.removeItem('ordeon_token')
    setSesion(null)
  }

  const esAdmin = sesion?.rol?.toLowerCase().includes('admin') ?? false
  const visibleNav = NAV_ITEMS.filter(n => !n.adminOnly || esAdmin)

  if (!sesion) {
    return (
      <DesignSystemProvider colorMode="dark">
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
          <LoginForm onLoginSuccess={(s) => setSesion(s)} />
        </div>
      </DesignSystemProvider>
    )
  }

  return (
    <DesignSystemProvider colorMode="dark">
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>

      {/* ─── SIDEBAR IZQUIERDO ─────────────────────────────────────── */}
      <aside style={{
        width: '220px',
        minWidth: '220px',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
      }}>
        {/* Logo / Marca */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text)', margin: 0, lineHeight: 1.2 }}>
            Ordeon POS &amp; Taller
          </h1>
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: '4px 0 0 0', lineHeight: 1.3 }}>
            Afilamos Operaciones
          </p>
        </div>

        {/* Menú de navegación */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {visibleNav.map(item => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  textAlign: 'left',
                  width: '100%',
                  background: isActive ? 'var(--color-primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--color-text)',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-hover)' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer de sesión */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sesion.nombreCompleto}
            </div>
            <div className="mt-1">
              <Badge variant="info" size="sm">{sesion.rol}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} fullWidth>
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* ─── CONTENIDO PRINCIPAL ───────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>
        {/* Barra superior */}
        <header style={{
          padding: '14px 24px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--color-text)' }}>
            {NAV_ITEMS.find(n => n.id === activeTab)?.icon}{' '}
            {NAV_ITEMS.find(n => n.id === activeTab)?.label}
          </h2>
        </header>

        {/* Vista activa */}
        <div style={{ padding: '24px', flex: 1 }}>
          {activeTab === 'dashboard' ? (
            <DashboardOperativo
              token={sesion.token}
              onNavigateTab={(t) => setActiveTab(t as TabId)}
            />
          ) : activeTab === 'clientes' ? (
            <FichaCliente onIniciarSolicitud={() => setActiveTab('solicitudes')} />
          ) : activeTab === 'reportes' ? (
            <ModuloReportes token={sesion.token} />
          ) : activeTab === 'admin' ? (
            <ModuloAdmin token={sesion.token} />
          ) : activeTab === 'caja' ? (
            <ModuloCaja userRole={sesion.rol} token={sesion.token} />
          ) : activeTab === 'entregas' ? (
            <ModuloEntregas
              token={sesion.token}
              instrumentosPago={instrumentos}
              usuarioActual={{ publicId: sesion.publicId, codigo: sesion.codigo, rol: sesion.rol }}
            />
          ) : activeTab === 'taller' ? (
            <ColaTaller
              token={sesion.token}
              usuarioActual={{ publicId: sesion.publicId, codigo: sesion.codigo, rol: sesion.rol }}
            />
          ) : (
            <SolicitudCapturaMixta
              canales={canales}
              tiposDocumento={tiposDoc}
              clientes={clientes}
              onAsentarSolicitud={async () => { setActiveTab('taller') }}
            />
          )}
        </div>
      </main>
    </div>
    </DesignSystemProvider>
  )
}

export default App