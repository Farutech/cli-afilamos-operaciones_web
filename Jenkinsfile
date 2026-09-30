// ==============================================================================
// Pipeline CI/CD - FaruTech / Afilamos Hermanos (Web)
// Invoca la Shared Library estandarizada de FaruTech
// ==============================================================================
@Library('farutech') _

farutechPipeline(
  lang: 'node',
  image: 'cli-afilamos-operaciones-web',
  app: 'web',
  tenant: 'afilamoshermanos',
  port: 80,
  tier: 'public',
  health: '/health',
  hosts: [
    dev:  'ops.dev.afilamoshermanos.com',
    qa:   'ops.qa.afilamoshermanos.com',
    prod: 'ops.afilamoshermanos.com'
  ]
)
