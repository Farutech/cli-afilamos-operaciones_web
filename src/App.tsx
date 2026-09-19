import { useState, useEffect } from 'react'
import { LoginForm } from './features/auth/LoginForm'
import { Card } from './components/ui/Card'
import { Badge } from './components/ui/Badge'
import { Button } from './components/ui/Button'
import { ColaTaller } from './features/taller/ColaTaller'
import { SolicitudCapturaMixta } from './features/solicitudes/SolicitudCapturaMixta'
import { ModuloEntregas } from './features/entregas/ModuloEntregas'
import { ModuloCaja } from './features/caja/ModuloCaja'
import { catalogosApi } from './services/catalogosApi'
import type { UsuarioSesion } from './types/auth'
import type { CanalOrigen, TipoDocumentoIdentidad, Cliente, MedioPagoInstrumento } from './types/catalogos'

export function App() {
  const [sesion, setSesion] = useState<UsuarioSesion | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'caja' | 'solicitudes' | 'taller' | 'entregas'>('caja')

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
        <nav style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
          <Button
            variant={activeTab === 'caja' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('caja')}
          >
            💰 Caja & Turnos
          </Button>
          <Button
            variant={activeTab === 'entregas' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('entregas')}
          >
            📦 Entregas & Despacho
          </Button>
          <Button
            variant={activeTab === 'taller' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('taller')}
          >
            🛠️ Cola de Taller (OT)
          </Button>
          <Button
            variant={activeTab === 'solicitudes' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('solicitudes')}
          >
            📝 Nueva Solicitud (POS)
          </Button>
          <Button
            variant={activeTab === 'dashboard' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Panel General
          </Button>
        </nav>
      )}

      <main>
        {!sesion ? (
          <LoginForm onLoginSuccess={(s) => setSesion(s)} />
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
        ) : activeTab === 'solicitudes' ? (
          <SolicitudCapturaMixta
            canales={canales}
            tiposDocumento={tiposDoc}
            clientes={clientes}
            onAsentarSolicitud={async () => {
              setActiveTab('taller')
            }}
          />
        ) : (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Panel Operativo de Control</h2>
              <Badge variant="success">Fases A, B, B2, C, D y E Operativas</Badge>
            </div>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
              Bienvenido, {sesion.nombreCompleto}. Ha ingresado con el rol <strong>{sesion.rol}</strong>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <Card style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>Módulo de Catálogos & Maestros</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                  Ítems, Unidades, Medios de pago en árbol, Cajas y Subtipos documentales con UUID y borrado lógico.
                </p>
                <Badge variant="success">Completado</Badge>
              </Card>
              <Card style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>Motor Documental</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                  Borrador, Asentado con folio atómico por subtipo, Dependencias y Anulación.
                </p>
                <Badge variant="success">Completado</Badge>
              </Card>
              <Card style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>Solicitudes & Anticipos</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                  Captura mixta, Invariantes #1 (100% inventario) y #2 (anticipo servicios), VoBo con Anti-Autoautorización.
                </p>
                <Badge variant="success">Completado</Badge>
              </Card>
              <Card style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>Taller & Órdenes de Trabajo</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                  OT satélite automática, Cola de taller, Recepción rápida, Actividades y Cierre automático (Invariante #5).
                </p>
                <Badge variant="success">Completado</Badge>
              </Card>
              <Card style={{ padding: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>Entregas & Despacho</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                  1 Solicitud por Remisión (RF-5.1), Invariante #3 (bloqueo si saldo {'>'} 0), Registro de Receptor y Despacho.
                </p>
                <Badge variant="success">Completado</Badge>
              </Card>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}

export default App

