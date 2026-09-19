import { useState, useEffect } from 'react'
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

export function App() {
  const [sesion, setSesion] = useState<UsuarioSesion | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'caja' | 'solicitudes' | 'taller' | 'entregas' | 'clientes' | 'reportes' | 'admin'>('dashboard')

  // Lector de código de barras USB/HID (RF-11.2)
  useBarcodeScanner((code) => {
    if (code.startsWith('SOL-') || code.startsWith('OT-') || code.startsWith('REM-')) {
      setActiveTab('entregas');
    }
  });

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
    return () => {
      isMounted = false
    }
  }, [sesion])

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)' }}>
            Ordeon POS & Taller
          </h1>
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Afilamos Operaciones · Motor Transaccional de Servicios, Taller y Entregas
          </span>
        </div>

        {sesion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div>
              <span style={{ fontWeight: 600 }}>{sesion.nombreCompleto}</span>{' '}
              <Badge variant="success">{sesion.rol}</Badge>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setSesion(null)}>
              Cerrar Sesión
            </Button>
          </div>
        )}
      </header>

      {sesion && (
        <nav style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', flexWrap: 'wrap' }}>
          <Button
            variant={activeTab === 'dashboard' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </Button>
          <Button
            variant={activeTab === 'solicitudes' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('solicitudes')}
          >
            📝 Nueva Solicitud (POS)
          </Button>
          <Button
            variant={activeTab === 'taller' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('taller')}
          >
            🛠️ Cola de Taller (OT)
          </Button>
          <Button
            variant={activeTab === 'entregas' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('entregas')}
          >
            📦 Entregas & Despacho
          </Button>
          <Button
            variant={activeTab === 'caja' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('caja')}
          >
            💰 Caja & Turnos
          </Button>
          <Button
            variant={activeTab === 'clientes' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('clientes')}
          >
            👥 Clientes
          </Button>
          <Button
            variant={activeTab === 'reportes' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('reportes')}
          >
            📈 Reportes
          </Button>
          {sesion.rol.toLowerCase().includes('admin') && (
            <Button
              variant={activeTab === 'admin' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('admin')}
            >
              ⚙️ Administración
            </Button>
          )}
        </nav>
      )}

      <main>
        {!sesion ? (
          <LoginForm onLoginSuccess={(s) => setSesion(s)} />
        ) : activeTab === 'dashboard' ? (
          <DashboardOperativo
            token={sesion.token}
            onNavigateTab={(t) => setActiveTab(t as 'dashboard' | 'caja' | 'solicitudes' | 'taller' | 'entregas' | 'clientes' | 'reportes' | 'admin')}
          />
        ) : activeTab === 'clientes' ? (
          <FichaCliente onIniciarSolicitud={() => setActiveTab('solicitudes')} />
        ) : activeTab === 'reportes' ? (
          <ModuloReportes token={sesion.token} />
        ) : activeTab === 'admin' ? (
          <ModuloAdmin token={sesion.token} />
        ) : activeTab === 'caja' ? (
          <ModuloCaja userRole={sesion.rol} />
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
            onAsentarSolicitud={async () => {
              setActiveTab('taller')
            }}
          />
        )}
      </main>
    </div>
  )
}

export default App


