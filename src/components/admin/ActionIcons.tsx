/**
 * ActionIcons
 * ------------------------------------------------------------------
 * Conjunto estandarizado de iconos Lucide para las acciones comunes de
 * los CRUDs del módulo de Administración / Configuración / Catálogos.
 *
 * Reemplaza el uso inconsistente de emojis (✏️, 🗑️, 🚫, etc.) en
 * las tablas, modales y barras de acciones.
 *
 * Cada icono acepta `className` para que el consumidor pueda ajustar
 * tamaño y color al contexto (botón, item de menú, tooltip, etc.).
 */

import {
  Eye,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Plus,
  RefreshCw,
  Search,
  Save,
  X as Cancel,
  Settings,
  Layers,
  FolderTree,
  Link2,
  Unlink,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  ListChecks,
  Filter,
  Download,
  Upload,
  Copy,
  Check,
  AlertTriangle,
  Info,
  HelpCircle,
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Briefcase,
  Building2,
  CreditCard,
  Wallet,
  Banknote,
  Coins,
  Receipt,
  Calculator,
  GitBranch,
  GitMerge,
  Workflow,
  FileText,
  Folder,
  Tag,
  Tags,
  Hash,
  ToggleLeft,
  ToggleRight,
  MoreVertical,
  ArrowLeft,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { type ComponentType, type SVGProps } from 'react'

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

interface IconProps {
  className?: string
  size?: number
}

/* ----------------------------- Acciones CRUD ----------------------------- */
export const IconView = ({ className, size = 16 }: IconProps) => (
  <Eye className={className} size={size} aria-hidden />
)
export const IconEdit = ({ className, size = 16 }: IconProps) => (
  <Pencil className={className} size={size} aria-hidden />
)
export const IconDelete = ({ className, size = 16 }: IconProps) => (
  <Trash2 className={className} size={size} aria-hidden />
)
export const IconEnable = ({ className, size = 16 }: IconProps) => (
  <Power className={className} size={size} aria-hidden />
)
export const IconDisable = ({ className, size = 16 }: IconProps) => (
  <PowerOff className={className} size={size} aria-hidden />
)
export const IconCreate = ({ className, size = 16 }: IconProps) => (
  <Plus className={className} size={size} aria-hidden />
)
export const IconRefresh = ({ className, size = 16 }: IconProps) => (
  <RefreshCw className={className} size={size} aria-hidden />
)
export const IconSearch = ({ className, size = 16 }: IconProps) => (
  <Search className={className} size={size} aria-hidden />
)
export const IconSave = ({ className, size = 16 }: IconProps) => (
  <Save className={className} size={size} aria-hidden />
)
export const IconCancel = ({ className, size = 16 }: IconProps) => (
  <Cancel className={className} size={size} aria-hidden />
)
export const IconSettings = ({ className, size = 16 }: IconProps) => (
  <Settings className={className} size={size} aria-hidden />
)
export const IconMore = ({ className, size = 16 }: IconProps) => (
  <MoreVertical className={className} size={size} aria-hidden />
)

/* ------------------------- Datos y agrupadores ---------------------------- */
export const IconLayers = ({ className, size = 16 }: IconProps) => (
  <Layers className={className} size={size} aria-hidden />
)
export const IconFolderTree = ({ className, size = 16 }: IconProps) => (
  <FolderTree className={className} size={size} aria-hidden />
)
export const IconLink = ({ className, size = 16 }: IconProps) => (
  <Link2 className={className} size={size} aria-hidden />
)
export const IconUnlink = ({ className, size = 16 }: IconProps) => (
  <Unlink className={className} size={size} aria-hidden />
)
export const IconMoveUp = ({ className, size = 16 }: IconProps) => (
  <ChevronUp className={className} size={size} aria-hidden />
)
export const IconMoveDown = ({ className, size = 16 }: IconProps) => (
  <ChevronDown className={className} size={size} aria-hidden />
)
export const IconMoveTop = ({ className, size = 16 }: IconProps) => (
  <ChevronsUp className={className} size={size} aria-hidden />
)
export const IconMoveBottom = ({ className, size = 16 }: IconProps) => (
  <ChevronsDown className={className} size={size} aria-hidden />
)
export const IconChecklist = ({ className, size = 16 }: IconProps) => (
  <ListChecks className={className} size={size} aria-hidden />
)
export const IconFilter = ({ className, size = 16 }: IconProps) => (
  <Filter className={className} size={size} aria-hidden />
)
export const IconDownload = ({ className, size = 16 }: IconProps) => (
  <Download className={className} size={size} aria-hidden />
)
export const IconUpload = ({ className, size = 16 }: IconProps) => (
  <Upload className={className} size={size} aria-hidden />
)
export const IconCopy = ({ className, size = 16 }: IconProps) => (
  <Copy className={className} size={size} aria-hidden />
)
export const IconCheck = ({ className, size = 16 }: IconProps) => (
  <Check className={className} size={size} aria-hidden />
)

/* ---------------------------- Feedback ------------------------------------ */
export const IconWarning = ({ className, size = 16 }: IconProps) => (
  <AlertTriangle className={className} size={size} aria-hidden />
)
export const IconInfo = ({ className, size = 16 }: IconProps) => (
  <Info className={className} size={size} aria-hidden />
)
export const IconHelp = ({ className, size = 16 }: IconProps) => (
  <HelpCircle className={className} size={size} aria-hidden />
)

/* -------------------------- Roles y personas ----------------------------- */
export const IconUsers = ({ className, size = 16 }: IconProps) => (
  <Users className={className} size={size} aria-hidden />
)
export const IconUserPlus = ({ className, size = 16 }: IconProps) => (
  <UserPlus className={className} size={size} aria-hidden />
)
export const IconShield = ({ className, size = 16 }: IconProps) => (
  <Shield className={className} size={size} aria-hidden />
)
export const IconShieldCheck = ({ className, size = 16 }: IconProps) => (
  <ShieldCheck className={className} size={size} aria-hidden />
)

/* ----------------------- Negocio / Tesorería ----------------------------- */
export const IconBriefcase = ({ className, size = 16 }: IconProps) => (
  <Briefcase className={className} size={size} aria-hidden />
)
export const IconBuilding = ({ className, size = 16 }: IconProps) => (
  <Building2 className={className} size={size} aria-hidden />
)
export const IconCreditCard = ({ className, size = 16 }: IconProps) => (
  <CreditCard className={className} size={size} aria-hidden />
)
export const IconWallet = ({ className, size = 16 }: IconProps) => (
  <Wallet className={className} size={size} aria-hidden />
)
export const IconCash = ({ className, size = 16 }: IconProps) => (
  <Banknote className={className} size={size} aria-hidden />
)
export const IconCoins = ({ className, size = 16 }: IconProps) => (
  <Coins className={className} size={size} aria-hidden />
)
export const IconReceipt = ({ className, size = 16 }: IconProps) => (
  <Receipt className={className} size={size} aria-hidden />
)
export const IconCalculator = ({ className, size = 16 }: IconProps) => (
  <Calculator className={className} size={size} aria-hidden />
)

/* -------------------------- Workflows / Procesos ------------------------- */
export const IconBranch = ({ className, size = 16 }: IconProps) => (
  <GitBranch className={className} size={size} aria-hidden />
)
export const IconMerge = ({ className, size = 16 }: IconProps) => (
  <GitMerge className={className} size={size} aria-hidden />
)
export const IconWorkflow = ({ className, size = 16 }: IconProps) => (
  <Workflow className={className} size={size} aria-hidden />
)

/* ------------------------- Documentos / Catálogo ------------------------- */
export const IconDocument = ({ className, size = 16 }: IconProps) => (
  <FileText className={className} size={size} aria-hidden />
)
export const IconFolder = ({ className, size = 16 }: IconProps) => (
  <Folder className={className} size={size} aria-hidden />
)
export const IconTag = ({ className, size = 16 }: IconProps) => (
  <Tag className={className} size={size} aria-hidden />
)
export const IconTags = ({ className, size = 16 }: IconProps) => (
  <Tags className={className} size={size} aria-hidden />
)
export const IconHash = ({ className, size = 16 }: IconProps) => (
  <Hash className={className} size={size} aria-hidden />
)

/* ----------------------------- Toggles ----------------------------------- */
export const IconToggleOn = ({ className, size = 16 }: IconProps) => (
  <ToggleRight className={className} size={size} aria-hidden />
)
export const IconToggleOff = ({ className, size = 16 }: IconProps) => (
  <ToggleLeft className={className} size={size} aria-hidden />
)

/* --------------------------- Navegación ---------------------------------- */
export const IconArrowLeft = ({ className, size = 16 }: IconProps) => (
  <ArrowLeft className={className} size={size} aria-hidden />
)
export const IconArrowRight = ({ className, size = 16 }: IconProps) => (
  <ArrowRight className={className} size={size} aria-hidden />
)

/* ----------------------------------------------------------------------- */
/* Catálogo accesible como `{ [key]: Icon }` para mapeos dinámicos.        */
/* ----------------------------------------------------------------------- */
export const ActionIcons = {
  view: Eye as IconComponent,
  edit: Pencil as IconComponent,
  delete: Trash2 as IconComponent,
  enable: Power as IconComponent,
  disable: PowerOff as IconComponent,
  create: Plus as IconComponent,
  refresh: RefreshCw as IconComponent,
  search: Search as IconComponent,
  save: Save as IconComponent,
  cancel: Cancel as IconComponent,
  settings: Settings as IconComponent,
  more: MoreVertical as IconComponent,
  layers: Layers as IconComponent,
  folderTree: FolderTree as IconComponent,
  link: Link2 as IconComponent,
  unlink: Unlink as IconComponent,
  moveUp: ChevronUp as IconComponent,
  moveDown: ChevronDown as IconComponent,
  moveTop: ChevronsUp as IconComponent,
  moveBottom: ChevronsDown as IconComponent,
  checklist: ListChecks as IconComponent,
  filter: Filter as IconComponent,
  download: Download as IconComponent,
  upload: Upload as IconComponent,
  copy: Copy as IconComponent,
  check: Check as IconComponent,
  warning: AlertTriangle as IconComponent,
  info: Info as IconComponent,
  help: HelpCircle as IconComponent,
  users: Users as IconComponent,
  userPlus: UserPlus as IconComponent,
  shield: Shield as IconComponent,
  shieldCheck: ShieldCheck as IconComponent,
  briefcase: Briefcase as IconComponent,
  building: Building2 as IconComponent,
  creditCard: CreditCard as IconComponent,
  wallet: Wallet as IconComponent,
  cash: Banknote as IconComponent,
  coins: Coins as IconComponent,
  receipt: Receipt as IconComponent,
  calculator: Calculator as IconComponent,
  branch: GitBranch as IconComponent,
  merge: GitMerge as IconComponent,
  workflow: Workflow as IconComponent,
  document: FileText as IconComponent,
  folder: Folder as IconComponent,
  tag: Tag as IconComponent,
  tags: Tags as IconComponent,
  hash: Hash as IconComponent,
  toggleOn: ToggleRight as IconComponent,
  toggleOff: ToggleLeft as IconComponent,
  arrowLeft: ArrowLeft as IconComponent,
  arrowRight: ArrowRight as IconComponent,
} as const satisfies Record<string, LucideIcon | IconComponent>

export type ActionIconKey = keyof typeof ActionIcons