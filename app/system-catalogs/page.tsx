"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog" // Import Dialog component
import {
  Users,
  Settings,
  Globe,
  Bell,
  Filter,
  Plus,
  Download,
  Edit,
  GitBranch,
  Shield,
  RefreshCw,
  Lock,
  AlertCircle,
  Clock,
  X,
  ChevronRight,
  ChevronLeft,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================================
// STACK & ARCHITECTURE OVERVIEW
// ============================================================================
/**
 * STACK: MERN + PostgreSQL
 *
 * This application uses React with TypeScript on the frontend, connecting to a
 * backend built with Node.js + Express (MERN stack).
 *
 * DATABASE ARCHITECTURE:
 *
 * 1. MongoDB - Used for operational/transactional data:
 *    - Catalog usage references in orders, services, incidents
 *    - Operational logs and activity tracking
 *    - Cache/replica of frequently accessed catalog data for performance
 *
 * 2. PostgreSQL - Source of truth for master catalogs and configurations:
 *    - Master catalog definitions (CatalogSummary)
 *    - Field definitions (CatalogFieldDefinition)
 *    - Security configurations (CatalogSecurityConfig)
 *    - Synchronization configurations (CatalogSyncConfig)
 *    - Dependencies and relationships between catalogs
 *    - BI/Finance integration data
 *
 * CONSISTENCY STRATEGY:
 * - PostgreSQL maintains the authoritative catalog definitions
 * - Critical catalog data is replicated to MongoDB for fast transactional access
 * - Synchronization processes ensure consistency between both databases
 * - Changes to catalog definitions in Postgres trigger updates to MongoDB replicas
 */

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

type Locale = "es-MX" | "en-US" | "pt-BR" | "fr-CA"
type FieldType = "string" | "number" | "boolean" | "enum" | "date" | "datetime" | "fk" | "array" | "reference" | "json"
type CatalogStatus = "ACTIVE" | "INACTIVE" | "PENDING"
type AlertSeverity = "CRITICAL" | "URGENT" | "MEDIUM"

type SegmentType = "FIELD" | "STATIC" | "SEQUENCE"
type FormatType = "UPPER" | "LOWER" | "NONE"

interface Subcatalog {
  id: string
  catalogId: string
  name: string
  key: string
  description?: string
  status: "ACTIVE" | "INACTIVE"
  fieldsCount: number
  recordsCount: number
}

interface SubcatalogField {
  id: string
  subcatalogId: string
  nombreVisibleKey: string
  claveTecnica: string
  tipoDato: "string" | "number" | "boolean" | "date" | "datetime" | "enum" | "fk" | "array"
  requerido: boolean
  longitudMaxima?: number
  valorPorDefecto?: string
  orden: number
  participaEnNomenclatura: boolean
  valoresEnum?: string[]
  catalogoReferenciaKey?: string
}

interface CodeSegment {
  id: string
  subcatalogId: string
  tipoSegmento: SegmentType
  fieldId?: string
  valorFijo?: string
  nombreSecuencia?: string
  longitud?: number
  inicio?: number
  incremento?: number
  formato?: FormatType
  truncar?: boolean
  orden: number
}

interface CatalogSummary {
  id: string
  moduleKey: string
  typeKey: string
  name: string
  description?: string
  status: CatalogStatus
  isCritical: boolean
  isItControlled: boolean
  lastUpdatedAt: string
  recordsCount: number
  fieldsCount: number
}

interface CatalogFilter {
  moduleKey?: string
  typeKey?: string
  status?: CatalogStatus
  itOwnerId?: string
  updatedFrom?: string
  updatedTo?: string
}

interface Alert {
  id: string
  catalogId: string
  catalogTypeKey: string
  severity: AlertSeverity
  message: string
  createdAt: string
  timeAgo: string
}

interface CatalogFieldDefinition {
  name: string
  labelKey: string
  type: FieldType
  required: boolean
  descriptionKey?: string
  enumValues?: string[]
  referencedCatalogType?: string
  referenceTo?: string // Added for 'reference' field type
}

interface CatalogSecurityConfig {
  catalogId: string
  itOwnerId: string
  itOwnerName: string
  functionalOwners: Array<{ id: string; name: string; module: string }>
  allowFunctionalWrite: boolean
  readOnlyForOthers: boolean
}

interface CatalogSyncConfig {
  catalogId: string
  syncWithErp: boolean
  syncWithExternalSources: boolean
  lastSyncAt?: string
  lastSyncStatus?: "OK" | "ERROR" | "PENDING"
}

interface CatalogDependency {
  catalogId: string
  catalogName: string
  relationshipType: "dependsOn" | "usedBy"
}

// ============================================================================
// i18n TRANSLATIONS
// ============================================================================

// Helper type for translations
type Language = "es" | "en" | "pt" | "fr"
type TranslationKey =
  | `module.${string}`
  | `catalog.${string}`
  | `status.${string}`
  | `badge.${string}`
  | `kpi.${string}`
  | `list.${string}`
  | `filters.${string}`
  | `actions.${string}`
  | `dep.${string}`
  | `sec.${string}`
  | `sync.${string}`
  | `alerts.${string}`
  | `tab.${string}`
  | `btn.${string}`
  | `label.${string}`
  | `errors.${string}`
  | `confirm.${string}`
  | `success.${string}`
  | `msg.${string}`
  | `title.${string}`
  | `subtitle.${string}`
  | `fields.${string}`
  | `subcatalogs.${string}`
  | `subfields.${string}`
  | `code.${string}`
  | `preview.${string}`
  | `action.${string}` // Added for actions like add/cancel in dialogs
  | `dep.addDependsOn` // Added for dependency dialog title
  | `dep.addUsedBy` // Added for dependency dialog title

interface FieldsTranslation {
  common: string
  specific: string
  name: string
  label: string
  type: string
  required: string
  requiredField: string
  enumValues: string
  referencedCatalog: string
  addCommon: string
  addSpecific: string
  refCatalog: string // Added translation for 'refCatalog'
}

interface ActionsTranslation {
  addField: string
  remove: string
  saveChanges: string
  cancel: string
  add: string
  edit: string
  title: string
}

interface ErrorsTranslation {
  fieldNameRequired: string
}

interface ConfirmTranslation {
  removeField: string
}

interface SuccessTranslation {
  fieldsSaved: string
}

// </CHANGE>
// Merged dependency and action translations into a single structure
interface Translation {
  title: {
    welcome: string
    systemConfig: string
  }
  subtitle: {
    systemConfig: string
  }
  label: {
    area: string
    moduleSelector: string
    filters: string
    module: string
    catalogType: string
    status: string
    responsible: string
    updateDate: string
    dependsOn: string
    usedBy: string
    itResponsible: string
    businessResponsible: string
    accessLevel: string
    itOnly: string
    allUsers: string
    notAssigned: string
  }
  btn: {
    applyFilters: string
    reset: string
    addCatalog: string
    exportExcel: string
    edit: string
    dependencies: string
    security: string
    sync: string
    forceSyncNow: string
    cancel: string // Added for Dialog cancel button
    add: string // Added for Dialog add button
  }
  kpi: {
    configuredCatalogs: string
    pendingValidation: string
    lastSync: string
    activeAlerts: string
    today: string
    configured: string
    pending: string
    alerts: string
  }
  status: {
    active: string
    inactive: string
    pending: string
  }
  list: {
    catalogsTitle: string
    lastUpdate: string
    records: string
    fields: string
    title: string
    add: string
    export: string
  }
  alerts: {
    title: string
    critical: string
    urgent: string
    medium: string
  }
  tab: {
    fields: string
    dependencies: string
    security: string
    sync: string
    // Adding subcatalogs tab
    subcatalogs: string
  }
  fields: FieldsTranslation
  dep: {
    dependsOn: string
    usedBy: string
    addDependsOn: string // Added for dependency dialog title
    addUsedBy: string // Added for dependency dialog title
  }
  sec: {
    itOwner: string
    functionalOwners: string
    itOnlyFields: string
    functionalWrite: string
    readOnlyOthers: string
  }
  sync: {
    withErp: string
    withExternal: string
    lastSync: string
    status: string
  }
  badge: {
    critical: string
    itOnly: string
  }
  module: {
    maintenance: string
    commercial: string
    purchases: string
    logistics: string
    finance: string
    bi: string
    general: string
  }
  catalog: {
    assets: string
    providers: string
    prices: string
    ata: string
    locations: string
    costCenters: string
    responsibles: string
    serviceTypes: string
    parts: string
  }
  filters: {
    title: string
    all: string
    module: string
    type: string
    status: string
    responsible: string
    updateDate: string
    apply: string
    reset: string
    today: string
    thisWeek: string
    master: string
    transactional: string
    responsibleIT: string
    functionalModule: string // Added for new select
  }
  actions: ActionsTranslation
  errors: ErrorsTranslation
  confirm: ConfirmTranslation
  success: SuccessTranslation
  msg: {
    syncStarted: string
  }
  // Adding subcatalog translations
  subcatalogs: {
    title: string
    add: string
    exportDef: string
    name: string
    key: string
    description: string
    status: string
    fieldsCount: string
    recordsCount: string
    configure: string
    duplicate: string
    delete: string
    confirmDelete: string
  }
  subfields: {
    title: string
    add: string
    visibleName: string
    technicalKey: string
    dataType: string
    required: string
    maxLength: string
    defaultValue: string
    order: string
    inCode: string
    enumValues: string
    refCatalog: string
  }
  code: {
    title: string
    addSegment: string
    segmentType: string
    field: string
    static: string
    sequence: string
    selectField: string
    fixedValue: string
    sequenceName: string
    length: string
    start: string
    increment: string
    format: string
    uppercase: string
    lowercase: string
    none: string
    truncate: string
    preview: string
    example: string
  }
  preview: {
    title: string
    generatedCode: string
    sampleRecords: string
  }
  // Added translations for dependency dialog
  "dep.addDependsOn": string
  "dep.addUsedBy": string
  "action.add": string // Common action for dialogs
  // Added form translation
  form: {
    description: string
  }
  // Added validation translation
  validation: {
    required: string
  }
}

const translations: Record<Locale, Translation> = {
  "es-MX": {
    title: {
      welcome: "Bienvenido, Turbofin Admin",
      systemConfig: "Configuración General del Sistema",
    },
    subtitle: {
      systemConfig: "Configuración General del Sistema – Catálogos Maestros",
    },
    label: {
      area: "Área responsable: IT / Sistemas",
      moduleSelector: "Módulo de configuración",
      filters: "Filtros de Catálogos",
      module: "Módulo Funcional",
      catalogType: "Tipo de Catálogo",
      status: "Estado",
      responsible: "Responsable IT",
      updateDate: "Fecha de Actualización",
      dependsOn: "Depende de",
      usedBy: "Usado por",
      itResponsible: "Responsable IT",
      businessResponsible: "Responsable Funcional",
      accessLevel: "Nivel de Acceso",
      itOnly: "Solo IT",
      allUsers: "Todos los Usuarios",
      notAssigned: "No asignado",
    },
    btn: {
      applyFilters: "Aplicar Filtros",
      reset: "Reiniciar",
      addCatalog: "Agregar Catálogo",
      exportExcel: "Exportar a Excel",
      edit: "Editar",
      dependencies: "Dependencias",
      security: "Seguridad",
      sync: "Sincronizar",
      forceSyncNow: "Forzar sincronización ahora",
      cancel: "Cancelar",
      add: "Agregar",
    },
    kpi: {
      configuredCatalogs: "Catálogos Configurados",
      pendingValidation: "Pendientes de Validar",
      lastSync: "Última Sincronización",
      activeAlerts: "Alertas Activas",
      today: "Hoy",
      configured: "Configurados",
      pending: "Pendientes",
      alerts: "Alertas",
    },
    status: {
      active: "Activo",
      inactive: "Inactivo",
      pending: "Pendiente",
    },
    list: {
      catalogsTitle: "Lista de Catálogos Maestros",
      lastUpdate: "Última actualización",
      records: "registros",
      fields: "campos",
      title: "Catálogos Maestros",
      add: "Agregar Catálogo",
      export: "Exportar",
    },
    alerts: {
      title: "Alertas Activas",
      critical: "Crítico",
      urgent: "Urgente",
      medium: "Medio",
    },
    tab: {
      fields: "Campos",
      dependencies: "Dependencias",
      security: "Seguridad",
      sync: "Sincronización",
      subcatalogs: "Sub-catálogos",
    },
    fields: {
      common: "Campos Comunes (todos los catálogos)",
      specific: "Campos Específicos",
      name: "Nombre",
      label: "Etiqueta",
      type: "Tipo",
      required: "Obligatorio",
      requiredField: "Campo Requerido",
      enumValues: "Valores Enum (separados por coma)",
      referencedCatalog: "Catálogo Referenciado",
      addCommon: "Agregar Campo Común",
      addSpecific: "Agregar Campo Específico",
      refCatalog: "Catálogo de Referencia",
    },
    dep: {
      dependsOn: "Depende de",
      usedBy: "Usado por",
      addDependsOn: "Agregar Dependencia", // Updated
      addUsedBy: "Agregar Uso", // Updated
    },
    sec: {
      itOwner: "Responsable IT Principal",
      functionalOwners: "Responsables Funcionales",
      itOnlyFields: "Solo IT puede cambiar definición de campos",
      functionalWrite: "Áreas funcionales pueden dar de alta/baja registros",
      readOnlyOthers: "Solo lectura para otras áreas",
    },
    sync: {
      withErp: "Sincronizar con ERP/Contabilidad",
      withExternal: "Sincronizar con fuentes externas",
      lastSync: "Última sincronización",
      status: "Status",
    },
    badge: {
      critical: "Crítico para operación",
      itOnly: "Solo IT estructura",
    },
    module: {
      maintenance: "Mantenimiento & Talleres",
      commercial: "Comercial / CRM",
      purchases: "Compras",
      logistics: "Logística",
      finance: "Finanzas",
      bi: "Business Intelligence",
      general: "Geral / Transversales",
    },
    catalog: {
      assets: "Activos",
      providers: "Proveedores",
      prices: "Precios y Servicios",
      ata: "Códigos ATA",
      locations: "Ubicaciones",
      costCenters: "Centros de Costo",
      responsibles: "Responsables",
      serviceTypes: "Tipos de Servicio",
      parts: "Refacciones",
    },
    filters: {
      title: "Filtros",
      all: "Todos",
      module: "Módulo",
      type: "Tipo",
      status: "Estado",
      responsible: "Responsable",
      updateDate: "Fecha de Actualización",
      apply: "Aplicar",
      reset: "Reiniciar",
      today: "Hoy",
      thisWeek: "Esta Semana",
      master: "Maestro",
      transactional: "Transaccional",
      responsibleIT: "Responsable IT",
      functionalModule: "Módulo Funcional",
    },
    actions: {
      addField: "Agregar Campo",
      remove: "Eliminar",
      saveChanges: "Guardar Cambios",
      cancel: "Cancelar",
      add: "Agregar",
      edit: "Editar",
      title: "Acciones",
    },
    errors: {
      fieldNameRequired: "El nombre y la etiqueta del campo son obligatorios.",
    },
    confirm: {
      removeField: "¿Está seguro de que desea eliminar este campo?",
    },
    success: {
      fieldsSaved: "Los cambios en los campos se han guardado correctamente.",
    },
    msg: {
      syncStarted: "Sincronización iniciada",
    },
    // Adding subcatalog translations
    subcatalogs: {
      title: "Sub-catálogos",
      add: "Agregar sub-catálogo",
      exportDef: "Exportar definición",
      name: "Nombre",
      key: "Clave técnica",
      description: "Descripción",
      status: "Estado",
      fieldsCount: "Campos definidos",
      recordsCount: "Registros",
      configure: "Configurar campos y nomenclatura",
      duplicate: "Duplicar sub-catálogo",
      delete: "Eliminar",
      confirmDelete: "¿Está seguro de eliminar este sub-catálogo?",
    },
    subfields: {
      title: "Campos del Sub-catálogo",
      add: "Agregar campo",
      visibleName: "Nombre visible",
      technicalKey: "Clave técnica",
      dataType: "Tipo de dato",
      required: "Requerido",
      maxLength: "Longitud máx.",
      defaultValue: "Valor por defecto",
      order: "Orden",
      inCode: "En nomenclatura",
      enumValues: "Valores enum",
      refCatalog: "Catálogo referencia",
    },
    code: {
      title: "Nomenclatura (Código)",
      addSegment: "Agregar segmento",
      segmentType: "Tipo de segmento",
      field: "Campo",
      static: "Texto fijo",
      sequence: "Autonumérico",
      selectField: "Seleccionar campo",
      fixedValue: "Valor fijo",
      sequenceName: "Nombre secuencia",
      length: "Longitud",
      start: "Inicio",
      increment: "Incremento",
      format: "Formato",
      uppercase: "MAYÚSCULAS",
      lowercase: "minúsculas",
      none: "Sin formato",
      truncate: "Truncar",
      preview: "Vista previa",
      example: "Ejemplo de código",
    },
    preview: {
      title: "Vista previa / Ejemplos",
      generatedCode: "Código generado",
      sampleRecords: "Registros de ejemplo",
    },
    // Dependency dialog translations (updated)
    "dep.addDependsOn": "Agregar Dependencia",
    "dep.addUsedBy": "Agregar Uso",
    "action.add": "Agregar",
    // Form translations
    form: {
      description: "Descripción",
    },
    // Validation translations
    validation: {
      required: "Este campo es requerido.",
    },
  },
  "en-US": {
    title: {
      welcome: "Welcome, Turbofin Admin",
      systemConfig: "System General Configuration",
    },
    subtitle: {
      systemConfig: "System General Configuration – Master Catalogs",
    },
    label: {
      area: "Responsible area: IT / Systems",
      moduleSelector: "Configuration module",
      filters: "Catalog Filters",
      module: "Functional Module",
      catalogType: "Catalog Type",
      status: "Status",
      responsible: "IT Responsible",
      updateDate: "Update Date",
      dependsOn: "Depends on",
      usedBy: "Used by",
      itResponsible: "IT Responsible",
      businessResponsible: "Functional Responsible",
      accessLevel: "Access Level",
      itOnly: "IT Only",
      allUsers: "All Users",
      notAssigned: "Not Assigned",
    },
    btn: {
      applyFilters: "Apply Filters",
      reset: "Reset",
      addCatalog: "Add Catalog",
      exportExcel: "Export to Excel",
      edit: "Edit",
      dependencies: "Dependencies",
      security: "Security",
      sync: "Sync",
      forceSyncNow: "Force sync now",
      cancel: "Cancel",
      add: "Add",
    },
    kpi: {
      configuredCatalogs: "Configured Catalogs",
      pendingValidation: "Pending Validation",
      lastSync: "Last Synchronization",
      activeAlerts: "Active Alerts",
      today: "Today",
      configured: "Configured",
      pending: "Pending",
      alerts: "Alerts",
    },
    status: {
      active: "Active",
      inactive: "Inactive",
      pending: "Pending",
    },
    list: {
      catalogsTitle: "Master Catalogs List",
      lastUpdate: "Last update",
      records: "records",
      fields: "fields",
      title: "Master Catalogs",
      add: "Add Catalog",
      export: "Export",
    },
    alerts: {
      title: "Active Alerts",
      critical: "Critical",
      urgent: "Urgent",
      medium: "Medium",
    },
    tab: {
      fields: "Fields",
      dependencies: "Dependencies",
      security: "Security",
      sync: "Sync",
      subcatalogs: "Sub-catalogs",
    },
    fields: {
      common: "Common Fields (all catalogs)",
      specific: "Specific Fields",
      name: "Name",
      label: "Label",
      type: "Type",
      required: "Required",
      requiredField: "Required Field",
      enumValues: "Enum Values (comma-separated)",
      referencedCatalog: "Referenced Catalog",
      addCommon: "Add Common Field",
      addSpecific: "Add Specific Field",
      refCatalog: "Reference Catalog",
    },
    dep: {
      dependsOn: "Depends on",
      usedBy: "Used by",
      addDependsOn: "Add Dependency", // Updated
      addUsedBy: "Add Usage", // Updated
    },
    sec: {
      itOwner: "Main IT Responsible",
      functionalOwners: "Functional Responsibles",
      itOnlyFields: "Only IT can change field definitions",
      functionalWrite: "Functional areas can create/delete records",
      readOnlyOthers: "Read-only for other areas",
    },
    sync: {
      withErp: "Sync with ERP/Accounting",
      withExternal: "Sync with external sources",
      lastSync: "Last sync",
      status: "Status",
    },
    badge: {
      critical: "Critical for operation",
      itOnly: "IT structure only",
    },
    module: {
      maintenance: "Maintenance & Workshops",
      commercial: "Commercial / CRM",
      purchases: "Purchases",
      logistics: "Logistics",
      finance: "Finance",
      bi: "Business Intelligence",
      general: "General / Cross-functional",
    },
    catalog: {
      assets: "Assets",
      providers: "Providers",
      prices: "Prices and Services",
      ata: "ATA Codes",
      locations: "Locations",
      costCenters: "Cost Centers",
      responsibles: "Responsibles",
      serviceTypes: "Service Types",
      parts: "Parts",
    },
    filters: {
      title: "Filters",
      all: "All",
      module: "Module",
      type: "Type",
      status: "Status",
      responsible: "Responsible",
      updateDate: "Update Date",
      apply: "Apply",
      reset: "Reset",
      today: "Today",
      thisWeek: "This Week",
      master: "Master",
      transactional: "Transactional",
      responsibleIT: "IT Responsible",
      functionalModule: "Functional Module",
    },
    actions: {
      addField: "Add Field",
      remove: "Remove",
      saveChanges: "Save Changes",
      cancel: "Cancel",
      add: "Add",
      edit: "Edit",
      title: "Actions",
    },
    errors: {
      fieldNameRequired: "Field name and label are required.",
    },
    confirm: {
      removeField: "Are you sure you want to remove this field?",
    },
    success: {
      fieldsSaved: "Field changes saved successfully.",
    },
    msg: {
      syncStarted: "Sync started",
    },
    // Adding subcatalog translations
    subcatalogs: {
      title: "Sub-catalogs",
      add: "Add sub-catalog",
      exportDef: "Export definition",
      name: "Name",
      key: "Technical key",
      description: "Description",
      status: "Status",
      fieldsCount: "Fields defined",
      recordsCount: "Records",
      configure: "Configure fields and nomenclature",
      duplicate: "Duplicate sub-catalog",
      delete: "Delete",
      confirmDelete: "Are you sure you want to delete this sub-catalog?",
    },
    subfields: {
      title: "Sub-catalog Fields",
      add: "Add field",
      visibleName: "Visible name",
      technicalKey: "Technical key",
      dataType: "Data type",
      required: "Required",
      maxLength: "Max length",
      defaultValue: "Default value",
      order: "Order",
      inCode: "In nomenclature",
      enumValues: "Enum values",
      refCatalog: "Reference catalog",
    },
    code: {
      title: "Nomenclature (Code)",
      addSegment: "Add segment",
      segmentType: "Segment type",
      field: "Field",
      static: "Fixed text",
      sequence: "Auto-increment",
      selectField: "Select field",
      fixedValue: "Fixed value",
      sequenceName: "Sequence name",
      length: "Length",
      start: "Start",
      increment: "Increment",
      format: "Format",
      uppercase: "UPPERCASE",
      lowercase: "lowercase",
      none: "No format",
      truncate: "Truncate",
      preview: "Preview",
      example: "Code example",
    },
    preview: {
      title: "Preview / Examples",
      generatedCode: "Generated code",
      sampleRecords: "Sample records",
    },
    // Dependency dialog translations (updated)
    "dep.addDependsOn": "Add Dependency",
    "dep.addUsedBy": "Add Usage",
    "action.add": "Add",
    // Form translations
    form: {
      description: "Description",
    },
    // Validation translations
    validation: {
      required: "This field is required.",
    },
  },
  "pt-BR": {
    title: {
      welcome: "Bem-vindo, Turbofin Admin",
      systemConfig: "Configuração Geral do Sistema",
    },
    subtitle: {
      systemConfig: "Configuração Geral do Sistema – Catálogos Mestres",
    },
    label: {
      area: "Área responsável: TI / Sistemas",
      moduleSelector: "Módulo de configuração",
      filters: "Filtros de Catálogos",
      module: "Módulo Funcional",
      catalogType: "Tipo de Catálogo",
      status: "Status",
      responsible: "Responsável TI",
      updateDate: "Data de Atualização",
      dependsOn: "Depende de",
      usedBy: "Usado por",
      itResponsible: "Responsable TI",
      businessResponsible: "Responsable Funcional",
      accessLevel: "Nível de Acesso",
      itOnly: "Apenas TI",
      allUsers: "Todos os Usuários",
      notAssigned: "Não atribuído",
    },
    btn: {
      applyFilters: "Aplicar Filtros",
      reset: "Redefinir",
      addCatalog: "Adicionar Catálogo",
      exportExcel: "Exportar para Excel",
      edit: "Editar",
      dependencies: "Dependências",
      security: "Segurança",
      sync: "Sincronizar",
      forceSyncNow: "Forçar sincronização agora",
      cancel: "Cancelar",
      add: "Adicionar",
    },
    kpi: {
      configuredCatalogs: "Catálogos Configurados",
      pendingValidation: "Pendentes de Validação",
      lastSync: "Última Sincronização",
      activeAlerts: "Alertas Ativos",
      today: "Hoje",
      configured: "Configurados",
      pending: "Pendentes",
      alerts: "Alertas",
    },
    status: {
      active: "Ativo",
      inactive: "Inativo",
      pending: "Pendente",
    },
    list: {
      catalogsTitle: "Lista de Catálogos Mestres",
      lastUpdate: "Última atualização",
      records: "registros",
      fields: "campos",
      title: "Catálogos Mestres",
      add: "Adicionar Catálogo",
      export: "Exportar",
    },
    alerts: {
      title: "Alertas Ativos",
      critical: "Crítico",
      urgent: "Urgente",
      medium: "Médio",
    },
    tab: {
      fields: "Campos",
      dependencies: "Dependências",
      security: "Segurança",
      sync: "Sincronização",
      subcatalogs: "Sub-catálogos",
    },
    fields: {
      common: "Campos Comunes (todos os catálogos)",
      specific: "Campos Específicos",
      name: "Nome",
      label: "Etiqueta",
      type: "Tipo",
      required: "Obrigatório",
      requiredField: "Campo Obrigatório",
      enumValues: "Valores Enum (separados por vírgula)",
      referencedCatalog: "Catálogo Referenciado",
      addCommon: "Adicionar Campo Comum",
      addSpecific: "Adicionar Campo Específico",
      refCatalog: "Catálogo de Referência",
    },
    dep: {
      dependsOn: "Depende de",
      usedBy: "Usado por",
      addDependsOn: "Adicionar Dependência", // Updated
      addUsedBy: "Adicionar Uso", // Updated
    },
    sec: {
      itOwner: "Responsável TI Principal",
      functionalOwners: "Responsáveis Funcionais",
      itOnlyFields: "Apenas TI pode alterar definições de campos",
      functionalWrite: "Áreas funcionais podem criar/excluir registros",
      readOnlyOthers: "Somente leitura para outras áreas",
    },
    sync: {
      withErp: "Sincronizar com ERP/Contabilidade",
      withExternal: "Sincronizar com fontes externas",
      lastSync: "Última sincronização",
      status: "Status",
    },
    badge: {
      critical: "Crítico para operação",
      itOnly: "Apenas TI estrutura",
    },
    module: {
      maintenance: "Manutenção & Oficinas",
      commercial: "Comercial / CRM",
      purchases: "Compras",
      logistics: "Logística",
      finance: "Finanças",
      bi: "Business Intelligence",
      general: "Geral / Transversais",
    },
    catalog: {
      assets: "Ativos",
      providers: "Fornecedores",
      prices: "Preços e Serviços",
      ata: "Códigos ATA",
      locations: "Localizações",
      costCenters: "Centros de Custo",
      responsibles: "Responsáveis",
      serviceTypes: "Tipos de Serviço",
      parts: "Peças",
    },
    filters: {
      title: "Filtros",
      all: "Todos",
      module: "Módulo",
      type: "Tipo",
      status: "Status",
      responsible: "Responsável",
      updateDate: "Data de Atualização",
      apply: "Aplicar",
      reset: "Redefinir",
      today: "Hoje",
      thisWeek: "Esta Semana",
      master: "Mestre",
      transactional: "Transaccional",
      responsibleIT: "Responsable TI",
      functionalModule: "Módulo Funcional",
    },
    actions: {
      addField: "Adicionar Campo",
      remove: "Remover",
      saveChanges: "Salvar Alterações",
      cancel: "Cancelar",
      add: "Adicionar",
      edit: "Editar",
      title: "Ações",
    },
    errors: {
      fieldNameRequired: "O nome e a etiqueta do campo são obrigatórios.",
    },
    confirm: {
      removeField: "Tem certeza que deseja remover este campo?",
    },
    success: {
      fieldsSaved: "As alterações nos campos foram salvas com sucesso.",
    },
    msg: {
      syncStarted: "Sincronização iniciada",
    },
    // Adding subcatalog translations
    subcatalogs: {
      title: "Sub-catálogos",
      add: "Adicionar sub-catálogo",
      exportDef: "Exportar definição",
      name: "Nome",
      key: "Chave técnica",
      description: "Descrição",
      status: "Status",
      fieldsCount: "Campos definidos",
      recordsCount: "Registros",
      configure: "Configurar campos e nomenclatura",
      duplicate: "Duplicar sub-catálogo",
      delete: "Excluir",
      confirmDelete: "Tem certeza de que deseja excluir este sub-catálogo?",
    },
    subfields: {
      title: "Campos do Sub-catálogo",
      add: "Adicionar campo",
      visibleName: "Nome visível",
      technicalKey: "Chave técnica",
      dataType: "Tipo de dados",
      required: "Obrigatório",
      maxLength: "Comprimento máx.",
      defaultValue: "Valor padrão",
      order: "Ordem",
      inCode: "Na nomenclatura",
      enumValues: "Valores enum",
      refCatalog: "Catálogo de referência",
    },
    code: {
      title: "Nomenclatura (Código)",
      addSegment: "Adicionar segmento",
      segmentType: "Tipo de segmento",
      field: "Campo",
      static: "Texto fixo",
      sequence: "Auto-incremento",
      selectField: "Selecionar campo",
      fixedValue: "Valor fixo",
      sequenceName: "Nome da sequência",
      length: "Comprimento",
      start: "Início",
      increment: "Incremento",
      format: "Formato",
      uppercase: "MAIÚSCULAS",
      lowercase: "minúsculas",
      none: "Sem formato",
      truncate: "Truncar",
      preview: "Visualização",
      example: "Exemplo de código",
    },
    preview: {
      title: "Visualização / Exemplos",
      generatedCode: "Código gerado",
      sampleRecords: "Registros de exemplo",
    },
    // Dependency dialog translations (updated)
    "dep.addDependsOn": "Adicionar Dependência",
    "dep.addUsedBy": "Adicionar Uso",
    "action.add": "Adicionar",
    // Form translations
    form: {
      description: "Descrição",
    },
    // Validation translations
    validation: {
      required: "Este campo é obrigatório.",
    },
  },
  "fr-CA": {
    title: {
      welcome: "Bienvenue, Turbofin Admin",
      systemConfig: "Configuration Générale du Système",
    },
    subtitle: {
      systemConfig: "Configuration Générale du Système – Catalogues Maîtres",
    },
    label: {
      area: "Zone responsable: TI / Systèmes",
      moduleSelector: "Module de configuration",
      filters: "Filtres de Catalogues",
      module: "Module Fonctionnel",
      catalogType: "Type de Catalogue",
      status: "Statut",
      responsible: "Responsable TI",
      updateDate: "Date de Mise à Jour",
      dependsOn: "Dépend de",
      usedBy: "Utilisé par",
      itResponsible: "Responsable TI",
      businessResponsible: "Responsable Fonctionnel",
      accessLevel: "Niveau d'Accès",
      itOnly: "TI Uniquement",
      allUsers: "Tous les Utilisateurs",
      notAssigned: "Non attribué",
    },
    btn: {
      applyFilters: "Appliquer les Filtres",
      reset: "Réinitialiser",
      addCatalog: "Ajouter un Catalogue",
      exportExcel: "Exporter vers Excel",
      edit: "Modifier",
      dependencies: "Dépendances",
      security: "Sécurité",
      sync: "Synchroniser",
      forceSyncNow: "Forcer la synchronisation maintenant",
      cancel: "Annuler",
      add: "Ajouter",
    },
    kpi: {
      configuredCatalogs: "Catalogues Configurés",
      pendingValidation: "En Attente de Validation",
      lastSync: "Dernière Synchronisation",
      activeAlerts: "Alertes Actives",
      today: "Aujourd'hui",
      configured: "Configurés",
      pending: "En Attente",
      alerts: "Alertes",
    },
    status: {
      active: "Actif",
      inactive: "Inactif",
      pending: "En attente",
    },
    list: {
      catalogsTitle: "Liste des Catalogues Maîtres",
      lastUpdate: "Dernière mise à jour",
      records: "enregistrements",
      fields: "champs",
      title: "Catalogues Maîtres",
      add: "Ajouter Catalogue",
      export: "Exporter",
    },
    alerts: {
      title: "Alertas Activas",
      critical: "Critique",
      urgent: "Urgent",
      medium: "Moyen",
    },
    tab: {
      fields: "Champs",
      dependencies: "Dépendances",
      security: "Sécurité",
      sync: "Synchronisation",
      subcatalogs: "Sous-catalogues",
    },
    fields: {
      common: "Champs Communs (tous les catalogues)",
      specific: "Champs Spécifiques",
      name: "Nom",
      label: "Étiquette",
      type: "Type",
      required: "Obligatoire",
      requiredField: "Champ Requis",
      enumValues: "Valeurs Enum (séparées par des virgules)",
      referencedCatalog: "Catalogue Référencé",
      addCommon: "Ajouter un Champ Commun",
      addSpecific: "Ajouter un Champ Spécifique",
      refCatalog: "Catalogue de Référence",
    },
    dep: {
      dependsOn: "Dépend de",
      usedBy: "Utilisé par",
      addDependsOn: "Ajouter Dépendance", // Updated
      addUsedBy: "Ajouter Utilisation", // Updated
    },
    sec: {
      itOwner: "Responsable TI Principal",
      functionalOwners: "Responsables Fonctionnels",
      itOnlyFields: "Seul TI peut modifier les définitions de champs",
      functionalWrite: "Les zones fonctionnelles peuvent créer/supprimer des enregistrements",
      readOnlyOthers: "Lecture seule pour les autres zones",
    },
    sync: {
      withErp: "Synchroniser avec ERP/Comptabilité",
      withExternal: "Synchroniser avec des sources externes",
      lastSync: "Dernière synchronisation",
      status: "Statut",
    },
    badge: {
      critical: "Critique pour opération",
      itOnly: "Structure TI uniquement",
    },
    module: {
      maintenance: "Maintenance & Ateliers",
      commercial: "Commercial / CRM",
      purchases: "Achats",
      logistics: "Logistique",
      finance: "Finance",
      bi: "Business Intelligence",
      general: "Général / Transversaux",
    },
    catalog: {
      assets: "Actifs",
      providers: "Fournisseurs",
      prices: "Prix et Services",
      ata: "Codes ATA",
      locations: "Emplacements",
      costCenters: "Centres de Coûts",
      responsibles: "Responsables",
      serviceTypes: "Types de Service",
      parts: "Pièces",
    },
    filters: {
      title: "Filtres",
      all: "Tous",
      module: "Module",
      type: "Type",
      status: "Statut",
      responsible: "Responsable",
      updateDate: "Date de Mise à Jour",
      apply: "Appliquer",
      reset: "Réinitialiser",
      today: "Aujourd'hui",
      thisWeek: "Cette Semaine",
      master: "Maître",
      transactional: "Transactionnel",
      responsibleIT: "Responsable TI",
      functionalModule: "Module Fonctionnel",
    },
    actions: {
      addField: "Ajouter un Champ",
      remove: "Supprimer",
      saveChanges: "Enregistrer les Modifications",
      cancel: "Annuler",
      add: "Ajouter",
      edit: "Modifier",
      title: "Actions",
    },
    errors: {
      fieldNameRequired: "Le nom et le libellé du champ sont obligatoires.",
    },
    confirm: {
      removeField: "Êtes-vous sûr de vouloir supprimer ce champ ?",
    },
    success: {
      fieldsSaved: "Les modifications des champs ont été enregistrées avec succès.",
    },
    msg: {
      syncStarted: "Synchronisation démarrée",
    },
    // Adding subcatalog translations
    subcatalogs: {
      title: "Sous-catalogues",
      add: "Ajouter sous-catalogue",
      exportDef: "Exporter la définition",
      name: "Nom",
      key: "Clé technique",
      description: "Description",
      status: "Statut",
      fieldsCount: "Champs définis",
      recordsCount: "Enregistrements",
      configure: "Configurer champs et nomenclature",
      duplicate: "Dupliquer sous-catalogue",
      delete: "Supprimer",
      confirmDelete: "Êtes-vous sûr de vouloir supprimer ce sous-catalogue?",
    },
    subfields: {
      title: "Champs du Sous-catalogue",
      add: "Ajouter champ",
      visibleName: "Nom visible",
      technicalKey: "Clé technique",
      dataType: "Type de données",
      required: "Obligatoire",
      maxLength: "Longueur max.",
      defaultValue: "Valeur par défaut",
      order: "Ordre",
      inCode: "Dans nomenclature",
      enumValues: "Valeurs enum",
      refCatalog: "Catalogue de référence",
    },
    code: {
      title: "Nomenclature (Code)",
      addSegment: "Ajouter segment",
      segmentType: "Type de segment",
      field: "Champ",
      static: "Texte fixe",
      sequence: "Auto-incrément",
      selectField: "Sélectionner champ",
      fixedValue: "Valeur fixe",
      sequenceName: "Nom de séquence",
      length: "Longueur",
      start: "Début",
      increment: "Incrément",
      format: "Format",
      uppercase: "MAJUSCULES",
      lowercase: "minuscules",
      none: "Sans format",
      truncate: "Tronquer",
      preview: "Aperçu",
      example: "Exemple de code",
    },
    preview: {
      title: "Aperçu / Exemples",
      generatedCode: "Code généré",
      sampleRecords: "Enregistrements d'exemple",
    },
    // Dependency dialog translations (updated)
    "dep.addDependsOn": "Ajouter Dépendance",
    "dep.addUsedBy": "Ajouter Utilisation",
    "action.add": "Ajouter",
    // Form translations
    form: {
      description: "Description",
    },
    // Validation translations
    validation: {
      required: "Ce champ est requis.",
    },
  },
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockCatalogsData: Record<Locale, CatalogSummary[]> = {
  "es-MX": [
    {
      id: "cat-001",
      moduleKey: "maintenance",
      typeKey: "assets",
      name: "Catálogo de Activos",
      description: "Vehículos, maquinaria, herramientas, GPS y equipo especial",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-10T09:30:00Z",
      recordsCount: 65,
      fieldsCount: 18,
    },
    {
      id: "cat-002",
      moduleKey: "maintenance",
      typeKey: "providers",
      name: "Catálogo de Proveedores",
      description: "Proveedores de servicios de mantenimiento y talleres",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-08T14:20:00Z",
      recordsCount: 42,
      fieldsCount: 15,
    },
    {
      id: "cat-003",
      moduleKey: "maintenance",
      typeKey: "ata",
      name: "Catálogo de Códigos ATA",
      description: "Códigos de identificación de sistemas y componentes",
      status: "PENDING",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-07T11:15:00Z",
      recordsCount: 156,
      fieldsCount: 8,
    },
    {
      id: "cat-004",
      moduleKey: "maintenance",
      typeKey: "costCenters",
      name: "Catálogo de Centros de Costo",
      description: "Centros de costo para contabilización",
      status: "ACTIVE",
      isCritical: false,
      isItControlled: true,
      lastUpdatedAt: "2025-11-09T16:45:00Z",
      recordsCount: 28,
      fieldsCount: 10,
    },
    {
      id: "cat-005",
      moduleKey: "maintenance",
      typeKey: "parts",
      name: "Catálogo de Refacciones",
      description: "Inventario de refacciones y partes",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-11T08:00:00Z",
      recordsCount: 892,
      fieldsCount: 14,
    },
    {
      id: "cat-006",
      moduleKey: "commercial",
      typeKey: "customers",
      name: "Catálogo de Clientes",
      description: "Base de datos de clientes y prospectos",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: false,
      lastUpdatedAt: "2025-11-12T10:30:00Z",
      recordsCount: 234,
      fieldsCount: 22,
    },
    {
      id: "cat-007",
      moduleKey: "finance",
      typeKey: "taxes",
      name: "Catálogo de Impuestos",
      description: "Tasas impositivas y configuración fiscal",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-05T13:20:00Z",
      recordsCount: 12,
      fieldsCount: 9,
    },
    {
      id: "cat-008",
      moduleKey: "logistics",
      typeKey: "locations",
      name: "Catálogo de Ubicaciones",
      description: "Sucursales, almacenes y puntos de operación",
      status: "ACTIVE",
      isCritical: false,
      isItControlled: false,
      lastUpdatedAt: "2025-11-10T15:10:00Z",
      recordsCount: 18,
      fieldsCount: 12,
    },
    {
      id: "cat-009",
      moduleKey: "general",
      typeKey: "users",
      name: "Catálogo de Usuarios",
      description: "Usuarios del sistema y roles",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-13T09:00:00Z",
      recordsCount: 87,
      fieldsCount: 16,
    },
  ],
  "en-US": [
    {
      id: "cat-001",
      moduleKey: "maintenance",
      typeKey: "assets",
      name: "Assets Catalog",
      description: "Vehicles, machinery, tools, GPS and special equipment",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-10T09:30:00Z",
      recordsCount: 65,
      fieldsCount: 18,
    },
    {
      id: "cat-002",
      moduleKey: "maintenance",
      typeKey: "providers",
      name: "Providers Catalog",
      description: "Maintenance service providers and workshops",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-08T14:20:00Z",
      recordsCount: 42,
      fieldsCount: 15,
    },
    {
      id: "cat-003",
      moduleKey: "maintenance",
      typeKey: "ata",
      name: "ATA Codes Catalog",
      description: "System and component identification codes",
      status: "PENDING",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-07T11:15:00Z",
      recordsCount: 156,
      fieldsCount: 8,
    },
    {
      id: "cat-004",
      moduleKey: "maintenance",
      typeKey: "costCenters",
      name: "Cost Centers Catalog",
      description: "Cost centers for accounting",
      status: "ACTIVE",
      isCritical: false,
      isItControlled: true,
      lastUpdatedAt: "2025-11-09T16:45:00Z",
      recordsCount: 28,
      fieldsCount: 10,
    },
    {
      id: "cat-005",
      moduleKey: "maintenance",
      typeKey: "parts",
      name: "Parts Catalog",
      description: "Spare parts and components inventory",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-11T08:00:00Z",
      recordsCount: 892,
      fieldsCount: 14,
    },
    {
      id: "cat-006",
      moduleKey: "commercial",
      typeKey: "customers",
      name: "Customers Catalog",
      description: "Customer and prospect database",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: false,
      lastUpdatedAt: "2025-11-12T10:30:00Z",
      recordsCount: 234,
      fieldsCount: 22,
    },
    {
      id: "cat-007",
      moduleKey: "finance",
      typeKey: "taxes",
      name: "Taxes Catalog",
      description: "Tax rates and fiscal configuration",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-05T13:20:00Z",
      recordsCount: 12,
      fieldsCount: 9,
    },
    {
      id: "cat-008",
      moduleKey: "logistics",
      typeKey: "locations",
      name: "Locations Catalog",
      description: "Branches, warehouses and operation points",
      status: "ACTIVE",
      isCritical: false,
      isItControlled: false,
      lastUpdatedAt: "2025-11-10T15:10:00Z",
      recordsCount: 18,
      fieldsCount: 12,
    },
    {
      id: "cat-009",
      moduleKey: "general",
      typeKey: "users",
      name: "Users Catalog",
      description: "System users and roles",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-13T09:00:00Z",
      recordsCount: 87,
      fieldsCount: 16,
    },
  ],
  "pt-BR": [
    {
      id: "cat-001",
      moduleKey: "maintenance",
      typeKey: "assets",
      name: "Catálogo de Ativos",
      description: "Veículos, maquinário, ferramentas, GPS e equipamento especial",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-10T09:30:00Z",
      recordsCount: 65,
      fieldsCount: 18,
    },
    {
      id: "cat-002",
      moduleKey: "maintenance",
      typeKey: "providers",
      name: "Catálogo de Fornecedores",
      description: "Fornecedores de serviços de manutenção e oficinas",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-08T14:20:00Z",
      recordsCount: 42,
      fieldsCount: 15,
    },
    {
      id: "cat-003",
      moduleKey: "maintenance",
      typeKey: "ata",
      name: "Catálogo de Códigos ATA",
      description: "Códigos de identificação de sistemas e componentes",
      status: "PENDING",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-07T11:15:00Z",
      recordsCount: 156,
      fieldsCount: 8,
    },
    {
      id: "cat-004",
      moduleKey: "maintenance",
      typeKey: "costCenters",
      name: "Catálogo de Centros de Custo",
      description: "Centros de custo para contabilização",
      status: "ACTIVE",
      isCritical: false,
      isItControlled: true,
      lastUpdatedAt: "2025-11-09T16:45:00Z",
      recordsCount: 28,
      fieldsCount: 10,
    },
    {
      id: "cat-005",
      moduleKey: "maintenance",
      typeKey: "parts",
      name: "Catálogo de Peças",
      description: "Inventário de peças e componentes",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-11T08:00:00Z",
      recordsCount: 892,
      fieldsCount: 14,
    },
    {
      id: "cat-006",
      moduleKey: "commercial",
      typeKey: "customers",
      name: "Catálogo de Clientes",
      description: "Base de dados de clientes e prospectos",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: false,
      lastUpdatedAt: "2025-11-12T10:30:00Z",
      recordsCount: 234,
      fieldsCount: 22,
    },
    {
      id: "cat-007",
      moduleKey: "finance",
      typeKey: "taxes",
      name: "Catálogo de Impostos",
      description: "Taxas de impostos e configuração fiscal",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-05T13:20:00Z",
      recordsCount: 12,
      fieldsCount: 9,
    },
    {
      id: "cat-008",
      moduleKey: "logistics",
      typeKey: "locations",
      name: "Catálogo de Localizações",
      description: "Filiais, armazéns e pontos de operação",
      status: "ACTIVE",
      isCritical: false,
      isItControlled: false,
      lastUpdatedAt: "2025-11-10T15:10:00Z",
      recordsCount: 18,
      fieldsCount: 12,
    },
    {
      id: "cat-009",
      moduleKey: "general",
      typeKey: "users",
      name: "Catálogo de Usuários",
      description: "Usuários do sistema e funções",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-13T09:00:00Z",
      recordsCount: 87,
      fieldsCount: 16,
    },
  ],
  "fr-CA": [
    {
      id: "cat-001",
      moduleKey: "maintenance",
      typeKey: "assets",
      name: "Catalogue d'Actifs",
      description: "Véhicules, machines, outils, GPS et équipement spécial",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-10T09:30:00Z",
      recordsCount: 65,
      fieldsCount: 18,
    },
    {
      id: "cat-002",
      moduleKey: "maintenance",
      typeKey: "providers",
      name: "Catalogue de Fournisseurs",
      description: "Fournisseurs de services de maintenance et ateliers",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-08T14:20:00Z",
      recordsCount: 42,
      fieldsCount: 15,
    },
    {
      id: "cat-003",
      moduleKey: "maintenance",
      typeKey: "ata",
      name: "Catalogue de Codes ATA",
      description: "Codes d'identification des systèmes et composants",
      status: "PENDING",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-07T11:15:00Z",
      recordsCount: 156,
      fieldsCount: 8,
    },
    {
      id: "cat-004",
      moduleKey: "maintenance",
      typeKey: "costCenters",
      name: "Catalogue de Centres de Coûts",
      description: "Centres de coûts pour la comptabilisation",
      status: "ACTIVE",
      isCritical: false,
      isItControlled: true,
      lastUpdatedAt: "2025-11-09T16:45:00Z",
      recordsCount: 28,
      fieldsCount: 10,
    },
    {
      id: "cat-005",
      moduleKey: "maintenance",
      typeKey: "parts",
      name: "Catalogue de Pièces",
      description: "Inventaire de pièces et composants",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-11T08:00:00Z",
      recordsCount: 892,
      fieldsCount: 14,
    },
    {
      id: "cat-006",
      moduleKey: "commercial",
      typeKey: "customers",
      name: "Catalogue de Clients",
      description: "Base de données de clients et prospects",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: false,
      lastUpdatedAt: "2025-11-12T10:30:00Z",
      recordsCount: 234,
      fieldsCount: 22,
    },
    {
      id: "cat-007",
      moduleKey: "finance",
      typeKey: "taxes",
      name: "Catalogue d'Impôts",
      description: "Taux d'imposition et configuration fiscale",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-05T13:20:00Z",
      recordsCount: 12,
      fieldsCount: 9,
    },
    {
      id: "cat-008",
      moduleKey: "logistics",
      typeKey: "locations",
      name: "Catalogue d'Emplacements",
      description: "Succursales, entrepôts et points d'opération",
      status: "ACTIVE",
      isCritical: false,
      isItControlled: false,
      lastUpdatedAt: "2025-11-10T15:10:00Z",
      recordsCount: 18,
      fieldsCount: 12,
    },
    {
      id: "cat-009",
      moduleKey: "general",
      typeKey: "users",
      name: "Catalogue d'Utilisateurs",
      description: "Utilisateurs du système et rôles",
      status: "ACTIVE",
      isCritical: true,
      isItControlled: true,
      lastUpdatedAt: "2025-11-13T09:00:00Z",
      recordsCount: 87,
      fieldsCount: 16,
    },
  ],
}

const mockAlertsData: Record<Locale, Alert[]> = {
  "es-MX": [
    {
      id: "alert-001",
      catalogId: "cat-003",
      catalogTypeKey: "ata",
      severity: "CRITICAL",
      message: "Pendiente sincronización con módulo de mantenimiento",
      createdAt: "2025-11-17T08:30:00Z",
      timeAgo: "2h",
    },
    {
      id: "alert-002",
      catalogId: "cat-004",
      catalogTypeKey: "costCenters",
      severity: "URGENT",
      message: "Falta asignar responsable",
      createdAt: "2025-11-17T06:00:00Z",
      timeAgo: "4h",
    },
    {
      id: "alert-003",
      catalogId: "cat-006",
      catalogTypeKey: "customers",
      severity: "MEDIUM",
      message: "Actualización programada pendiente",
      createdAt: "2025-11-16T10:00:00Z",
      timeAgo: "1d",
    },
    {
      id: "alert-004",
      catalogId: "cat-007",
      catalogTypeKey: "taxes",
      severity: "URGENT",
      message: "Cambios fiscales requieren validación",
      createdAt: "2025-11-17T07:15:00Z",
      timeAgo: "3h",
    },
  ],
  "en-US": [
    {
      id: "alert-001",
      catalogId: "cat-003",
      catalogTypeKey: "ata",
      severity: "CRITICAL",
      message: "Pending synchronization with maintenance module",
      createdAt: "2025-11-17T08:30:00Z",
      timeAgo: "2h",
    },
    {
      id: "alert-002",
      catalogId: "cat-004",
      catalogTypeKey: "costCenters",
      severity: "URGENT",
      message: "Missing responsible assignment",
      createdAt: "2025-11-17T06:00:00Z",
      timeAgo: "4h",
    },
    {
      id: "alert-003",
      catalogId: "cat-006",
      catalogTypeKey: "customers",
      severity: "MEDIUM",
      message: "Scheduled update pending",
      createdAt: "2025-11-16T10:00:00Z",
      timeAgo: "1d",
    },
    {
      id: "alert-004",
      catalogId: "cat-007",
      catalogTypeKey: "taxes",
      severity: "URGENT",
      message: "Tax changes require validation",
      createdAt: "2025-11-17T07:15:00Z",
      timeAgo: "3h",
    },
  ],
  "pt-BR": [
    {
      id: "alert-001",
      catalogId: "cat-003",
      catalogTypeKey: "ata",
      severity: "CRITICAL",
      message: "Sincronização pendente com módulo de manutenção",
      createdAt: "2025-11-17T08:30:00Z",
      timeAgo: "2h",
    },
    {
      id: "alert-002",
      catalogId: "cat-004",
      catalogTypeKey: "costCenters",
      severity: "URGENT",
      message: "Falta atribuir responsável",
      createdAt: "2025-11-17T06:00:00Z",
      timeAgo: "4h",
    },
    {
      id: "alert-003",
      catalogId: "cat-006",
      catalogTypeKey: "customers",
      severity: "MEDIUM",
      message: "Atualização programada pendente",
      createdAt: "2025-11-16T10:00:00Z",
      timeAgo: "1d",
    },
    {
      id: "alert-004",
      catalogId: "cat-007",
      catalogTypeKey: "taxes",
      severity: "URGENT",
      message: "Mudanças fiscais requerem validação",
      createdAt: "2025-11-17T07:15:00Z",
      timeAgo: "3h",
    },
  ],
  "fr-CA": [
    {
      id: "alert-001",
      catalogId: "cat-003",
      catalogTypeKey: "ata",
      severity: "CRITICAL",
      message: "Synchronisation en attente avec module de maintenance",
      createdAt: "2025-11-17T08:30:00Z",
      timeAgo: "2h",
    },
    {
      id: "alert-002",
      catalogId: "cat-004",
      catalogTypeKey: "costCenters",
      severity: "URGENT",
      message: "Affectation de responsable manquante",
      createdAt: "2025-11-17T06:00:00Z",
      timeAgo: "4h",
    },
    {
      id: "alert-003",
      catalogId: "cat-006",
      catalogTypeKey: "customers",
      severity: "MEDIUM",
      message: "Mise à jour programmée en attente",
      createdAt: "2025-11-16T10:00:00Z",
      timeAgo: "1d",
    },
    {
      id: "alert-004",
      catalogId: "cat-007",
      catalogTypeKey: "taxes",
      severity: "URGENT",
      message: "Changements fiscaux nécessitent validation",
      createdAt: "2025-11-17T07:15:00Z",
      timeAgo: "3h",
    },
  ],
}

// Mock current alerts for demonstration purposes
const currentAlerts: Alert[] = mockAlertsData["es-MX"]

const commonFields: CatalogFieldDefinition[] = [
  { name: "id", labelKey: "ID", type: "string", required: true },
  { name: "organization_id", labelKey: "Organization ID", type: "string", required: true },
  { name: "codigo", labelKey: "Código", type: "string", required: true },
  { name: "nombre", labelKey: "Nombre", type: "string", required: true },
  { name: "descripcion", labelKey: "Descripción", type: "string", required: false },
  { name: "estado", labelKey: "Estado", type: "enum", required: true, enumValues: ["ACTIVE", "INACTIVE"] },
  { name: "created_at", labelKey: "Fecha Creación", type: "datetime", required: true },
  { name: "updated_at", labelKey: "Fecha Actualización", type: "datetime", required: true },
  { name: "created_by", labelKey: "Creado Por", type: "fk", required: true, referencedCatalogType: "users" },
  { name: "updated_by", labelKey: "Actualizado Por", type: "fk", required: true, referencedCatalogType: "users" },
]

const catalogSpecificFields: Record<string, CatalogFieldDefinition[]> = {
  assets: [
    {
      name: "tipo_activo",
      labelKey: "Tipo de Activo",
      type: "enum",
      required: true,
      enumValues: ["VEHICULO", "MAQUINARIA", "HERRAMIENTA", "GPS"],
    },
    { name: "subtipo_activo", labelKey: "Subtipo", type: "string", required: false },
    { name: "marca", labelKey: "Marca", type: "string", required: true },
    { name: "modelo", labelKey: "Modelo", type: "string", required: true },
    { name: "anio_modelo", labelKey: "Año Modelo", type: "number", required: true },
    { name: "vin", labelKey: "VIN", type: "string", required: false },
    { name: "numero_serie", labelKey: "Número de Serie", type: "string", required: false },
    { name: "placas", labelKey: "Placas", type: "string", required: false },
    {
      name: "id_proveedor_principal",
      labelKey: "Proveedor Principal",
      type: "fk",
      required: false,
      referencedCatalogType: "providers",
    },
    {
      name: "id_centro_costo",
      labelKey: "Centro de Costo",
      type: "fk",
      required: true,
      referencedCatalogType: "costCenters",
    },
    {
      name: "id_ubicacion_actual",
      labelKey: "Ubicación Actual",
      type: "fk",
      required: false,
      referencedCatalogType: "locations",
    },
    { name: "fecha_alta", labelKey: "Fecha de Alta", type: "date", required: true },
    { name: "valor_adquisicion", labelKey: "Valor Adquisición", type: "number", required: false },
    { name: "moneda_valor", labelKey: "Moneda", type: "enum", required: false, enumValues: ["MXN", "USD", "CAD"] },
  ],
  providers: [
    { name: "rfc", labelKey: "RFC", type: "string", required: true },
    { name: "razon_social", labelKey: "Razón Social", type: "string", required: true },
    { name: "nombre_comercial", labelKey: "Nombre Comercial", type: "string", required: false },
    {
      name: "tipo_proveedor",
      labelKey: "Tipo",
      type: "enum",
      required: true,
      enumValues: ["TALLER", "REFACCIONES", "SERVICIOS", "MIXTO"],
    },
    { name: "servicios_autorizados", labelKey: "Servicios Autorizados", type: "array", required: false },
    { name: "telefono", labelKey: "Teléfono", type: "string", required: false },
    { name: "email", labelKey: "Email", type: "string", required: false },
    { name: "pais", labelKey: "País", type: "string", required: true },
    { name: "ciudad", labelKey: "Ciudad", type: "string", required: true },
    { name: "terminos_pago", labelKey: "Términos de Pago", type: "string", required: false },
    { name: "rating", labelKey: "Calificación", type: "number", required: false },
  ],
  ata: [
    { name: "capitulo_ata", labelKey: "Capítulo ATA", type: "string", required: true },
    { name: "subcapitulo_ata", labelKey: "Subcapítulo", type: "string", required: false },
    { name: "codigo_ata", labelKey: "Código ATA Completo", type: "string", required: true },
    { name: "descripcion_corta", labelKey: "Descripción Corta", type: "string", required: true },
    {
      name: "tipo_afectacion",
      labelKey: "Tipo de Afectación",
      type: "enum",
      required: false,
      enumValues: ["PREVENTIVO", "CORRECTIVO", "PREDICTIVO"],
    },
    { name: "criticidad", labelKey: "Criticidad", type: "enum", required: true, enumValues: ["ALTA", "MEDIA", "BAJA"] },
  ],
  parts: [
    { name: "numero_parte_interno", labelKey: "Número Parte Interno", type: "string", required: true },
    { name: "numero_parte_oem", labelKey: "Número Parte OEM", type: "string", required: false },
    { name: "descripcion", labelKey: "Descripción", type: "string", required: true },
    { name: "marca", labelKey: "Marca", type: "string", required: false },
    { name: "categoria_refaccion", labelKey: "Categoría", type: "string", required: true },
    { name: "unidad_medida", labelKey: "Unidad de Medida", type: "string", required: true },
    {
      name: "id_proveedor_principal",
      labelKey: "Proveedor Principal",
      type: "fk",
      required: false,
      referencedCatalogType: "providers",
    },
    { name: "costo_ultima_compra", labelKey: "Costo Última Compra", type: "number", required: false },
    { name: "stock_minimo", labelKey: "Stock Mínimo", type: "number", required: false },
    { name: "punto_reorden", labelKey: "Punto de Reorden", type: "number", required: false },
  ],
}

const mockDependencies: Record<string, CatalogDependency[]> = {
  "cat-001": [
    { catalogId: "cat-002", catalogName: "Proveedores", relationshipType: "dependsOn" },
    { catalogId: "cat-004", catalogName: "Centros de Costo", relationshipType: "dependsOn" },
    { catalogId: "cat-008", catalogName: "Ubicaciones", relationshipType: "dependsOn" },
    { catalogId: "cat-003", catalogName: "Catálogo de Códigos ATA", relationshipType: "usedBy" }, // Added for testing
  ],
  "cat-002": [
    { catalogId: "cat-001", catalogName: "Activos", relationshipType: "usedBy" },
    { catalogId: "cat-005", catalogName: "Refacciones", relationshipType: "usedBy" },
  ],
  "cat-004": [
    { catalogId: "cat-001", catalogName: "Activos", relationshipType: "usedBy" },
    { catalogId: "cat-007", catalogName: "Finanzas", relationshipType: "usedBy" },
  ],
}

const mockSecurityConfig: CatalogSecurityConfig = {
  catalogId: "cat-001",
  itOwnerId: "user-it-001",
  itOwnerName: "Carlos Martínez",
  functionalOwners: [
    { id: "user-maint-001", name: "Ana Rodríguez", module: "Mantenimiento" },
    { id: "user-fin-001", name: "Luis García", module: "Finanzas" },
  ],
  allowFunctionalWrite: true,
  readOnlyForOthers: true,
}

const mockSyncConfig: CatalogSyncConfig = {
  catalogId: "cat-001",
  syncWithErp: true,
  syncWithExternalSources: false,
  lastSyncAt: "2025-11-17T10:30:00Z",
  lastSyncStatus: "OK",
}

// ============================================================================
// API CLIENT / SERVICES
// ============================================================================

/**
 * These API client functions connect to REST endpoints implemented in Node.js + Express.
 *
 * The backend must:
 * - Use MongoDB for operational data (usage of catalogs in orders, services, incidents)
 * - Use PostgreSQL as the source of truth for:
 *   - Master catalog definitions
 *   - Field definitions (CatalogFieldDefinition)
 *   - Security configurations (CatalogSecurityConfig)
 *   - Synchronization configurations (CatalogSyncConfig)
 * - Maintain consistency between both databases through sync processes
 * - Optionally cache/replicate some catalogs to MongoDB for transactional performance
 */

/**
 * BACKEND (MERN + PostgreSQL):
 * GET /api/system/catalogs
 *
 * Implementation:
 * - Implemented in Node.js + Express
 * - Reads master catalogs from PostgreSQL (source of truth)
 * - May optionally cache/replicate some catalogs to MongoDB for transactional use
 * - Returns paginated, filtered list of catalog summaries
 *
 * Database: PostgreSQL (primary read)
 *
 * Query params:
 *  - moduleKey?: string (filter by functional module)
 *  - typeKey?: string (filter by catalog type)
 *  - status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' (filter by status)
 *  - itOwnerId?: string (filter by IT owner)
 *  - updatedFrom?: ISO string (filter by update date range start)
 *  - updatedTo?: ISO string (filter by update date range end)
 *
 * Response: CatalogSummary[]
 */
async function fetchCatalogs(filters: CatalogFilter, currentLocale: Locale): Promise<CatalogSummary[]> {
  // TODO: Replace with actual API call
  // const query = new URLSearchParams(filters as any);
  // const res = await fetch(`/api/system/catalogs?${query.toString()}`);
  // return res.json();

  await new Promise((resolve) => setTimeout(resolve, 300))

  // Using mockCatalogsData based on current locale
  let filtered = [...mockCatalogsData[currentLocale]] // Assuming getLocaleForFetch() retrieves current locale

  if (filters.moduleKey) {
    filtered = filtered.filter((c) => c.moduleKey === filters.moduleKey)
  }
  if (filters.typeKey) {
    filtered = filtered.filter((c) => c.typeKey === filters.typeKey)
  }
  if (filters.status) {
    filtered = filtered.filter((c) => c.status === filters.status)
  }

  return filtered
}

/**
 * BACKEND (MERN + PostgreSQL):
 * GET /api/system/catalogs/:id/definition
 *
 * Implementation:
 * - Implemented in Node.js + Express
 * - Reads field definitions from PostgreSQL
 * - Returns both common fields and catalog-specific fields
 *
 * Database: PostgreSQL (catalog field definitions stored here)
 *
 * Path params:
 *  - id: string (catalog ID)
 *
 * Response: CatalogFieldDefinition[]
 */
async function fetchCatalogDefinition(catalogId: string, currentLocale: Locale): Promise<CatalogFieldDefinition[]> {
  // TODO: Replace with actual API call
  await new Promise((resolve) => setTimeout(resolve, 200))

  const catalog = mockCatalogsData[currentLocale]?.find((c) => c.id === catalogId)
  const specificFields = catalog ? catalogSpecificFields[catalog.typeKey] || [] : []

  return [...commonFields, ...specificFields]
}

/**
 * BACKEND (MERN + PostgreSQL):
 * GET /api/system/catalogs/:id/dependencies
 *
 * Implementation:
 * - Implemented in Node.js + Express
 * - Reads catalog relationships from PostgreSQL
 * - Returns dependency graph for the specified catalog
 *
 * Database: PostgreSQL (catalog relationships stored here)
 *
 * Path params:
 *  - id: string (catalog ID)
 *
 * Response: CatalogDependency[]
 */
async function fetchCatalogDependencies(catalogId: string): Promise<CatalogDependency[]> {
  // TODO: Replace with actual API call
  await new Promise((resolve) => setTimeout(resolve, 200))
  return mockDependencies[catalogId] || []
}

/**
 * BACKEND (MERN + PostgreSQL):
 * GET /api/system/catalogs/:id/security
 *
 * Implementation:
 * - Implemented in Node.js + Express
 * - Reads security policies from PostgreSQL
 * - Returns IT owner, functional owners, and access control settings
 *
 * Database: PostgreSQL (security policies stored here)
 *
 * Path params:
 *  - id: string (catalog ID)
 *
 * Response: CatalogSecurityConfig
 */
async function fetchCatalogSecurity(catalogId: string): Promise<CatalogSecurityConfig> {
  // TODO: Replace with actual API call
  await new Promise((resolve) => setTimeout(resolve, 200))
  return mockSecurityConfig
}

/**
 * BACKEND (MERN + PostgreSQL):
 * PUT /api/system/catalogs/:id/security
 *
 * Implementation:
 * - Implemented in Node.js + Express
 * - Updates security policies in PostgreSQL
 * - Validates user permissions before allowing changes
 * - Logs security configuration changes for audit
 *
 * Database: PostgreSQL (security policies updated here)
 *
 * Path params:
 *  - id: string (catalog ID)
 *
 * Body: CatalogSecurityConfig
 *
 * Response: void (204 No Content on success)
 */
async function updateCatalogSecurity(catalogId: string, payload: CatalogSecurityConfig): Promise<void> {
  // TODO: Replace with actual API call
  console.log("Update security for catalog:", catalogId, payload)
  await new Promise((resolve) => setTimeout(resolve, 200))
}

/**
 * BACKEND (MERN + PostgreSQL):
 * GET /api/system/catalogs/:id/sync-config
 *
 * Implementation:
 * - Implemented in Node.js + Express
 * - Reads sync configuration from PostgreSQL
 * - Returns ERP sync settings, scraping configs, last sync status
 *
 * Database: PostgreSQL (sync configuration stored here)
 *
 * Path params:
 *  - id: string (catalog ID)
 *
 * Response: CatalogSyncConfig
 */
async function fetchCatalogSyncConfig(catalogId: string): Promise<CatalogSyncConfig> {
  // TODO: Replace with actual API call
  await new Promise((resolve) => setTimeout(resolve, 200))
  return mockSyncConfig
}

/**
 * BACKEND (MERN + PostgreSQL):
 * PUT /api/system/catalogs/:id/sync-config
 *
 * Implementation:
 * - Implemented in Node.js + Express
 * - Updates sync configuration in PostgreSQL
 * - Configures ERP integration, external sources, sync schedules
 * - Triggers sync jobs if configuration changes require it
 *
 * Database: PostgreSQL (sync configuration updated here)
 *
 * Path params:
 *  - id: string (catalog ID)
 *
 * Body: CatalogSyncConfig
 *
 * Response: void (204 No Content on success)
 */
async function updateCatalogSyncConfig(catalogId: string, payload: CatalogSyncConfig): Promise<void> {
  // TODO: Replace with actual API call
  console.log("Update sync config for catalog:", catalogId, payload)
  await new Promise((resolve) => setTimeout(resolve, 200))
}

/**
 * BACKEND (MERN + PostgreSQL):
 * POST /api/system/catalogs/:id/sync
 *
 * Implementation:
 * - Implemented in Node.js + Express
 * - Triggers immediate synchronization job
 * - Syncs data from PostgreSQL to MongoDB (if needed)
 * - Syncs with external ERP systems (if configured)
 * - Updates sync status and logs in PostgreSQL
 *
 * Database: PostgreSQL (source) → MongoDB (replica/cache)
 * External: May sync with ERP systems
 *
 * Path params:
 *  - id: string (catalog ID)
 *
 * Response: void (202 Accepted - sync job started)
 */
async function triggerCatalogSync(catalogId: string): Promise<void> {
  // TODO: Replace with actual API call
  console.log("Trigger sync for catalog:", catalogId)
  await new Promise((resolve) => setTimeout(resolve, 500))
}

/**
 * BACKEND (MERN + PostgreSQL):
 * GET /api/system/catalogs/alerts
 *
 * Implementation:
 * - Implemented in Node.js + Express
 * - Reads active alerts from PostgreSQL
 * - Generates alerts based on catalog validation rules
 * - Returns critical, urgent, and medium priority alerts
 *
 * Database: PostgreSQL (alerts stored here)
 *
 * Query params:
 *  - severity?: 'CRITICAL' | 'URGENT' | 'MEDIUM' (filter by severity)
 *  - catalogId?: string (filter by specific catalog)
 *
 * Response: Alert[]
 */
async function fetchAlerts(currentLocale: Locale): Promise<Alert[]> {
  // TODO: Replace with actual API call
  await new Promise((resolve) => setTimeout(resolve, 200))
  // Using mockAlertsData based on current locale
  return mockAlertsData[currentLocale] // Assuming getLocaleForFetch() retrieves current locale
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SystemCatalogsPage() {
  const [locale, setLocale] = useState<Locale>("es-MX")
  const [catalogs, setCatalogs] = useState<CatalogSummary[]>(mockCatalogsData[locale])
  const [alerts, setAlerts] = useState<Alert[]>(mockAlertsData[locale])

  const [selectedCatalog, setSelectedCatalog] = useState<CatalogSummary | null>(null)
  const [activeTab, setActiveTab] = useState("fields")
  const [isDependenciesOpen, setIsDependenciesOpen] = useState(false)
  const [isSecurityOpen, setIsSecurityOpen] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)

  // Filters state
  const [filters, setFilters] = useState({
    module: "all",
    type: "all",
    status: "all",
    responsible: "all",
    date: "all",
  })

  // Subcatalog and Code Builder states
  const [subcatalogs, setSubcatalogs] = useState<Subcatalog[]>([])
  const [selectedSubcatalog, setSelectedSubcatalog] = useState<Subcatalog | null>(null)
  const [subcatalogFields, setSubcatalogFields] = useState<SubcatalogField[]>([])
  const [codeSegments, setCodeSegments] = useState<CodeSegment[]>([])
  const [subcatalogTab, setSubcatalogTab] = useState<"fields" | "code" | "preview">("fields")
  const [showSubcatalogDialog, setShowSubcatalogDialog] = useState(false)
  const [showFieldDialog, setShowFieldDialog] = useState(false)
  const [showSegmentDialog, setShowSegmentDialog] = useState(false)
  const [editingField, setEditingField] = useState<SubcatalogField | null>(null)
  const [editingSegment, setEditingSegment] = useState<CodeSegment | null>(null)
  // Fix: Declare newSubcatalog and setNewSubcatalog here
  const [newSubcatalog, setNewSubcatalog] = useState<{ name: string; key: string; description?: string }>({
    name: "",
    key: "",
    description: "",
  })

  const [showAddDependencyDialog, setShowAddDependencyDialog] = useState(false)
  const [dependencyType, setDependencyType] = useState<"dependsOn" | "usedBy">("dependsOn")
  const [selectedDependencyCatalog, setSelectedDependencyCatalog] = useState<string>("")
  const [catalogDependencies, setCatalogDependencies] = useState<CatalogDependency[]>([])
  const allCatalogs = useMemo(() => Object.values(mockCatalogsData).flat(), []) // For dependency dialog

  // FIX: Declare showAddFieldDialog and isAddingCommonField
  const [showAddFieldDialog, setShowAddFieldDialog] = useState(false)
  const [isAddingCommonField, setIsAddingCommonField] = useState(true)

  const handleExportAllCatalogs = () => {
    console.log("[v0] Exporting all master catalogs")
    const exportData = {
      exportDate: new Date().toISOString(),
      totalCatalogs: catalogs.length,
      catalogs: catalogs.map((catalog) => ({
        id: catalog.id,
        typeKey: catalog.typeKey,
        name: catalog.name,
        moduleKey: catalog.moduleKey,
        description: catalog.description,
        status: catalog.status,
        isCritical: catalog.isCritical,
        isItControlled: catalog.isItControlled,
        lastUpdatedAt: catalog.lastUpdatedAt,
        recordsCount: catalog.recordsCount,
        fieldsCount: catalog.fieldsCount,
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `master_catalogs_${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportDefinition = () => {
    console.log("[v0] Exporting catalog definition for:", selectedCatalog?.id)
    if (!selectedCatalog) return

    const definition = {
      catalog: selectedCatalog,
      subcatalogs: subcatalogs, // Use current state
      fields: subcatalogFields, // Use current state
      codeSegments: codeSegments, // Use current state
    }

    const blob = new Blob([JSON.stringify(definition, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${selectedCatalog.typeKey}_definition.json` // Use typeKey for download name
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleAddSubcatalog = () => {
    console.log("[v0] Adding new subcatalog:", newSubcatalog)
    if (!newSubcatalog.name || !newSubcatalog.key) {
      alert(t("validation.required"))
      return
    }

    const maxId = subcatalogs.reduce((max, sub) => Math.max(max, Number.parseInt(sub.id.split("-").pop() || "0")), 0)

    const newSub: Subcatalog = {
      id: `sub-${maxId + 1}`, // Simple ID generation
      catalogId: selectedCatalog!.id,
      name: newSubcatalog.name,
      key: newSubcatalog.key,
      description: newSubcatalog.description,
      status: "ACTIVE",
      fieldsCount: 0,
      recordsCount: 0,
    }

    setSubcatalogs([...subcatalogs, newSub])

    // Here would be API call to backend
    // POST /api/system/catalogs/:catalogId/subcatalogs

    setShowSubcatalogDialog(false)
    setNewSubcatalog({ name: "", key: "", description: "" })
  }

  const handleDependencies = async (catalog: CatalogSummary) => {
    setIsDependenciesOpen(true) // Open dependencies drawer
    setIsSecurityOpen(false) // Ensure security drawer is closed
    setSelectedCatalog(catalog) // Set the catalog for context

    // Load dependencies for this catalog
    const deps = await fetchCatalogDependencies(catalog.id)
    setCatalogDependencies(deps)
  }

  const handleAddDependency = () => {
    if (!selectedCatalog || !selectedDependencyCatalog) return

    const targetCatalog = allCatalogs.find((c) => c.id === selectedDependencyCatalog)
    if (!targetCatalog) return

    const newDependency: CatalogDependency = {
      catalogId: targetCatalog.id,
      catalogName: targetCatalog.name,
      relationshipType: dependencyType,
    }

    setCatalogDependencies([...catalogDependencies, newDependency])
    setShowAddDependencyDialog(false)
    setSelectedDependencyCatalog("")
    console.log("[v0] Added dependency:", newDependency)

    // TODO: Call backend API to persist
    // await fetch(`/api/system/catalogs/${selectedCatalog.id}/dependencies`, {
    //   method: 'POST',
    //   body: JSON.stringify(newDependency)
    // })
  }

  const handleRemoveDependency = (catalogId: string, relType: "dependsOn" | "usedBy") => {
    setCatalogDependencies(
      catalogDependencies.filter((dep) => !(dep.catalogId === catalogId && dep.relationshipType === relType)),
    )
    console.log("[v0] Removed dependency:", catalogId, relType)

    // TODO: Call backend API to delete
    // await fetch(`/api/system/catalogs/${selectedCatalog.id}/dependencies/${catalogId}`, {
    //   method: 'DELETE'
    // })
  }

  useEffect(() => {
    if (selectedCatalog) {
      // Mock fetching field definitions for the selected catalog
      // In a real app, this would come from an API call
      const allFields = [...commonFields, ...(catalogSpecificFields[selectedCatalog.typeKey] || [])]
      setEditingFields(allFields)
    }
  }, [selectedCatalog])

  const handleAddField = () => {
    if (!newField.name || !newField.labelKey) {
      alert(t("errors.fieldNameRequired"))
      return
    }

    const fieldToAdd: CatalogFieldDefinition = {
      name: newField.name || "",
      labelKey: newField.labelKey || "",
      type: newField.type || "string",
      required: newField.required || false,
      // Conditionally add optional properties
      ...(newField.enumValues && { enumValues: newField.enumValues.filter((v) => v.length > 0) }), // Filter out empty strings
      ...(newField.referencedCatalogType && { referencedCatalogType: newField.referencedCatalogType }),
      ...(newField.referenceTo && { referenceTo: newField.referenceTo }), // Add referenceTo
    }

    setEditingFields([...editingFields, fieldToAdd])
    setShowAddFieldDialog(false)
    setNewField({
      name: "",
      labelKey: "",
      type: "string",
      required: false,
    })
  }

  const handleRemoveField = (fieldName: string) => {
    if (confirm(t("confirm.removeField"))) {
      setEditingFields(editingFields.filter((f) => f.name !== fieldName))
    }
  }

  const handleToggleRequired = (fieldName: string) => {
    setEditingFields(editingFields.map((f) => (f.name === fieldName ? { ...f, required: !f.required } : f)))
  }

  const mockSubcatalogs: Subcatalog[] = [
    {
      id: "sub-001",
      catalogId: "cat-001",
      name: "Vehículos Terrestres",
      key: "VEHICULOS_TERRESTRES",
      description: "Camiones, camionetas y autos de la flota",
      status: "ACTIVE",
      fieldsCount: 12,
      recordsCount: 45,
    },
    {
      id: "sub-002",
      catalogId: "cat-001",
      name: "Maquinaria Pesada",
      key: "MAQUINARIA_PESADA",
      description: "Equipos de construcción y maquinaria especializada",
      status: "ACTIVE",
      fieldsCount: 15,
      recordsCount: 28,
    },
  ]

  const mockSubcatalogFields: SubcatalogField[] = [
    {
      id: "field-001",
      subcatalogId: "sub-001",
      nombreVisibleKey: "Marca",
      claveTecnica: "marca",
      tipoDato: "string",
      requerido: true,
      longitudMaxima: 50,
      orden: 1,
      participaEnNomenclatura: true,
    },
    {
      id: "field-002",
      subcatalogId: "sub-001",
      nombreVisibleKey: "Modelo",
      claveTecnica: "modelo",
      tipoDato: "string",
      requerido: true,
      longitudMaxima: 50,
      orden: 2,
      participaEnNomenclatura: true,
    },
    {
      id: "field-003",
      subcatalogId: "sub-001",
      nombreVisibleKey: "Año",
      claveTecnica: "anio",
      tipoDato: "number",
      requerido: true,
      orden: 3,
      participaEnNomenclatura: true,
    },
    {
      id: "field-004",
      subcatalogId: "sub-001",
      nombreVisibleKey: "Placas",
      claveTecnica: "placas",
      tipoDato: "string",
      requerido: false,
      longitudMaxima: 10,
      orden: 4,
      participaEnNomenclatura: false,
    },
    {
      id: "field-005",
      subcatalogId: "sub-001",
      nombreVisibleKey: "Estado",
      claveTecnica: "estado",
      tipoDato: "enum",
      requerido: true,
      orden: 5,
      participaEnNomenclatura: false,
      valoresEnum: ["ACTIVO", "MANTENIMIENTO", "BAJA"],
    },
  ]

  const mockCodeSegments: CodeSegment[] = [
    {
      id: "seg-001",
      subcatalogId: "sub-001",
      tipoSegmento: "STATIC",
      valorFijo: "VEH",
      orden: 1,
      formato: "UPPER",
    },
    {
      id: "seg-002",
      subcatalogId: "sub-001",
      tipoSegmento: "STATIC",
      valorFijo: "-",
      orden: 2,
    },
    {
      id: "seg-003",
      subcatalogId: "sub-001",
      tipoSegmento: "FIELD",
      fieldId: "field-001",
      orden: 3,
      formato: "UPPER",
      longitud: 3,
      truncar: true,
    },
    {
      id: "seg-004",
      subcatalogId: "sub-001",
      tipoSegmento: "STATIC",
      valorFijo: "-",
      orden: 4,
    },
    {
      id: "seg-005",
      subcatalogId: "sub-001",
      tipoSegmento: "SEQUENCE",
      nombreSecuencia: "vehiculos_seq",
      longitud: 4,
      inicio: 1,
      incremento: 1,
      orden: 5,
    },
  ]

  const loadSubcatalogs = async (catalogId: string) => {
    /**
     * BACKEND (Node/Express, Postgres):
     * GET /api/system/catalogs/:catalogId/subcatalogs
     */
    // Mock implementation
    setSubcatalogs(mockSubcatalogs.filter((s) => s.catalogId === catalogId))
  }

  const configureSubcatalog = async (subcatalog: Subcatalog) => {
    setSelectedSubcatalog(subcatalog)

    // Load fields and code segments
    /**
     * BACKEND:
     * GET /api/system/subcatalogs/:subcatalogId/fields
     * GET /api/system/subcatalogs/:subcatalogId/code-definition
     */
    setSubcatalogFields(mockSubcatalogFields.filter((f) => f.subcatalogId === subcatalog.id))
    setCodeSegments(mockCodeSegments.filter((s) => s.subcatalogId === subcatalog.id))
    setSubcatalogTab("fields")
  }

  const saveSubcatalogField = (field: SubcatalogField) => {
    if (editingField) {
      setSubcatalogFields((prev) => prev.map((f) => (f.id === field.id ? field : f)))
    } else {
      setSubcatalogFields((prev) => [...prev, { ...field, id: `field-${Date.now()}` }])
    }
    setShowFieldDialog(false)
    setEditingField(null)
  }

  const deleteSubcatalogField = (fieldId: string) => {
    if (confirm(t("subcatalogs.confirmDelete"))) {
      setSubcatalogFields((prev) => prev.filter((f) => f.id !== fieldId))
    }
  }

  const saveCodeSegment = (segment: CodeSegment) => {
    if (editingSegment) {
      setCodeSegments((prev) => prev.map((s) => (s.id === segment.id ? segment : s)))
    } else {
      const maxOrden = Math.max(0, ...codeSegments.map((s) => s.orden))
      setCodeSegments((prev) => [...prev, { ...segment, id: `seg-${Date.now()}`, orden: maxOrden + 1 }])
    }
    setShowSegmentDialog(false)
    setEditingSegment(null)
  }

  const generateCodePreview = () => {
    const sortedSegments = [...codeSegments].sort((a, b) => a.orden - b.orden)
    let code = ""

    for (const segment of sortedSegments) {
      if (segment.tipoSegmento === "STATIC") {
        code += segment.valorFijo || ""
      } else if (segment.tipoSegmento === "FIELD") {
        const field = subcatalogFields.find((f) => f.id === segment.fieldId)
        if (field) {
          let value = field.claveTecnica.substring(0, 3).toUpperCase() // Placeholder for actual value
          if (segment.formato === "UPPER") value = value.toUpperCase()
          else if (segment.formato === "LOWER") value = value.toLowerCase()
          if (segment.longitud && segment.truncar) {
            value = value.substring(0, segment.longitud)
          }
          if (segment.longitud) {
            value = value.padEnd(segment.longitud, "0")
          }
          code += value
        }
      } else if (segment.tipoSegmento === "SEQUENCE") {
        const seqLength = segment.longitud || 4
        const seqValue = String(segment.inicio || 1).padStart(seqLength, "0")
        code += seqValue
      }
    }

    return code
  }

  // New state for editing fields in the catalog drawer
  const [editingFields, setEditingFields] = useState<CatalogFieldDefinition[]>([])
  // FIX: These variables were declared inside the component scope in the original code,
  // but the error message suggests they were not declared at all.
  // They are now declared at the top level of the component.
  const [newField, setNewField] = useState<Partial<CatalogFieldDefinition>>({
    name: "",
    labelKey: "",
    type: "string",
    required: false,
  })

  const t = (key: string): string => {
    // Adjust key lookup based on the original structure
    // The original code had a flatter structure like 'filters.title'
    // The updates introduced nested structures like 'fields.name'
    // We need to ensure compatibility or adapt the lookup.

    // If a key is not found, try to map it to the simpler structure first,
    // or return the key itself if no translation is found.

    const keys = key.split(".")
    let tempLevel: any = translations[locale] // Start with the locale's translations
    let foundKey = key // Default to the original key if no translation is found

    // Traverse the nested structure
    for (const k of keys) {
      if (tempLevel && typeof tempLevel === "object" && k in tempLevel) {
        tempLevel = tempLevel[k]
      } else {
        tempLevel = null // Path broken, translation not found in this structure
        break
      }
    }

    // If a full path translation was found and it's a string, use it
    if (tempLevel !== null && typeof tempLevel === "string") {
      foundKey = tempLevel
    } else {
      // Fallback: try to find the key directly in the locale's translation object
      if (translations[locale] && translations[locale][key]) {
        foundKey = translations[locale][key]
      }
    }

    // Return the found key or the original key if no translation is found
    return foundKey
  }

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale)
    setCatalogs(mockCatalogsData[newLocale])
    setAlerts(mockAlertsData[newLocale])
  }

  const applyFilters = async () => {
    const apiFilters: CatalogFilter = {
      moduleKey: filters.module === "all" ? undefined : (filters.module as any),
      typeKey: filters.type === "all" ? undefined : (filters.type as any),
      status: filters.status === "all" ? undefined : (filters.status.toUpperCase() as CatalogStatus),
      // Add other filters as needed
    }

    const results = await fetchCatalogs(apiFilters, locale)
    setCatalogs(results)
  }

  const resetFilters = () => {
    setFilters({
      module: "all",
      type: "all",
      status: "all",
      responsible: "all",
      date: "all",
    })
    // Reset catalogs to data for the current locale
    setCatalogs(mockCatalogsData[locale])
  }

  const handleEditCatalog = async (catalog: CatalogSummary) => {
    setIsDependenciesOpen(false)
    setIsSecurityOpen(false)
    setSelectedCatalog(catalog)
    setActiveTab("fields")

    console.log("[v0] Opening catalog for edit:", catalog.id)

    try {
      // Fetch all details before opening the drawer
      await fetchCatalogDefinition(catalog.id, locale)
      await fetchCatalogDependencies(catalog.id)
      await fetchCatalogSecurity(catalog.id)
      await fetchCatalogSyncConfig(catalog.id)
      // Load subcatalogs when opening a catalog
      await loadSubcatalogs(catalog.id)
    } catch (error) {
      console.error("Failed to fetch catalog details:", error)
    }
  }

  const handleAlertClick = (alert: Alert) => {
    const catalog = catalogs.find((c) => c.id === alert.catalogId)
    if (catalog) {
      setSelectedCatalog(catalog)
      setActiveTab("fields")
      setShowAlerts(false) // Close alerts panel when a catalog is selected
      handleEditCatalog(catalog)
    }
  }

  const kpiData = useMemo(
    () => ({
      configured: catalogs.filter((c) => c.status === "ACTIVE").length,
      pending: catalogs.filter((c) => c.status === "PENDING").length,
      alerts: alerts.length,
      lastSync: "10:30 AM", // This should ideally be fetched or derived from data
    }),
    [catalogs, alerts],
  )

  const formatDate = (isoString: string) => {
    if (!isoString) return ""
    const date = new Date(isoString)
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getCurrentDate = () => {
    const date = new Date()
    return date.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const moduleOptions: Record<string, string[]> = {
    maintenance: [
      "assets",
      "providers",
      "prices",
      "ata",
      "locations",
      "costCenters",
      "responsibles",
      "serviceTypes",
      "parts",
    ],
    commercial: ["customers", "leads", "contracts"],
    finance: ["taxes", "accounts", "budgets"],
    logistics: ["locations", "routes", "vehicles"],
    general: ["users", "roles", "permissions"],
  }

  // Mapping for filter values to actual keys
  const moduleKeyMap: Record<string, string> = {
    finanzas: "finance",
    mantenimiento: "maintenance",
    // Add other mappings as needed
  }

  const filterModuleOptions = [
    { value: "all", label: t("filters.all") },
    { value: "finance", label: t("module.finance") },
    { value: "maintenance", label: t("module.maintenance") },
    { value: "logistics", label: t("module.logistics") },
    { value: "commercial", label: t("module.commercial") },
    { value: "general", label: t("module.general") },
    // Add other modules as needed
  ]

  const filterTypeOptions = [
    { value: "all", label: t("filters.all") },
    { value: "master", label: t("filters.master") },
    { value: "transactional", label: t("filters.transactional") },
  ]

  const filterStatusOptions = [
    { value: "all", label: t("filters.all") },
    { value: "active", label: t("status.active") },
    { value: "pending", label: t("status.pending") },
    { value: "inactive", label: t("status.inactive") },
  ]

  const filterResponsibleOptions = [
    { value: "all", label: t("filters.all") },
    { value: "it", label: t("filters.responsibleIT") },
  ]

  const filterDateOptions = [
    { value: "all", label: t("filters.all") },
    { value: "today", label: t("filters.today") },
    { value: "week", label: t("filters.thisWeek") },
  ]

  const handleSecurity = (catalog: CatalogSummary) => {
    setIsDependenciesOpen(false)
    setIsSecurityOpen(true)
    setSelectedCatalog(catalog) // Ensure selectedCatalog is set for security drawer
  }

  const handleSync = async (catalog: CatalogSummary) => {
    console.log("[v0] Syncing catalog:", catalog.id)
    alert(`${t("msg.syncStarted")}: ${catalog.name}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-16 bg-[#b91c1c] text-white flex flex-col items-center py-4 gap-6 z-50">
        <Button variant="ghost" size="icon" className="text-white hover:bg-red-700 bg-red-800">
          <Settings className="h-5 w-5" />
        </Button>
      </aside>
      {/* Main Content Area - Responsive layout that adapts to screen size */}
      <div className="ml-16 flex flex-col lg:flex-row">
        {" "}
        {/* Added flex-col for mobile, flex-row for desktop */}
        {/* Content Section - Flexible width that adjusts based on alerts panel */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {" "}
            {/* Made header responsive with flex-col on mobile */}
            <div className="w-full sm:w-auto">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">{t("title.welcome")}</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">{t("subtitle.systemConfig")}</p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className="text-xs">
                  {t("label.area")}
                </Badge>
                <span className="text-xs text-gray-500">{getCurrentDate()}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-wrap">
              {" "}
              {/* Made header actions responsive with flex-wrap */}
              <Select value="catalogs">
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder={t("label.moduleSelector")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="catalogs">{t("subtitle.systemConfig")}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={locale} onValueChange={handleLocaleChange}>
                <SelectTrigger className="w-[100px]">
                  <Globe className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es-MX">ES</SelectItem>
                  <SelectItem value="en-US">EN</SelectItem>
                  <SelectItem value="pt-BR">PT</SelectItem>
                  <SelectItem value="fr-CA">FR</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <div className="hidden sm:flex items-center gap-2 bg-red-50 px-2 py-1 rounded-lg">
                {" "}
                {/* Hide user badge on small screens */}
                <div className="w-6 h-6 rounded-full bg-[#b91c1c] text-white flex items-center justify-center font-semibold text-xs">
                  T
                </div>
                <div className="text-xs">
                  <div className="font-semibold">Turbofin Admin</div>
                  <div className="text-gray-500">IT / Sistemas</div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-3 sm:p-6">
            {" "}
            {/* Reduced padding on mobile */}
            {/* KPI Cards - Responsive grid: 4 cols on large screens, 2 cols on medium, 1 col on small */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Configured Catalogs */}
              <div className="bg-gradient-to-br from-red-700 to-red-800 text-white p-5 rounded-lg shadow-lg">
                <p className="text-sm font-medium mb-2">{t("kpi.configured")}</p>
                <p className="text-4xl font-bold">{kpiData.configured}</p>
              </div>
              {/* Pending Validation */}
              <div className="bg-gradient-to-br from-red-600 to-red-700 text-white p-5 rounded-lg shadow-lg">
                <p className="text-sm font-medium mb-2">{t("kpi.pending")}</p>
                <p className="text-4xl font-bold">{kpiData.pending}</p>
              </div>
              {/* Last Sync */}
              <div className="bg-gradient-to-br from-red-700 to-red-800 text-white p-5 rounded-lg shadow-lg">
                <p className="text-sm font-medium mb-2">{t("kpi.lastSync")}</p>
                <p className="text-4xl font-bold">{kpiData.lastSync}</p>
                <p className="text-xs mt-1">{t("kpi.today")}</p>
              </div>
              {/* Active Alerts - Made clickable to toggle alerts panel */}
              <div
                className="bg-gradient-to-br from-red-400 to-red-500 text-white p-5 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-all hover:scale-105"
                onClick={() => setShowAlerts(!showAlerts)}
              >
                <p className="text-sm font-medium mb-2 flex items-center justify-between">
                  {t("kpi.alerts")}
                  {showAlerts ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
                </p>
                <p className="text-4xl font-bold">{kpiData.alerts}</p>
              </div>
            </div>
            {/* Filters Section */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
              {" "}
              {/* Reduced padding on mobile */}
              <div className="flex items-center gap-3 mb-4">
                <Filter className="h-5 w-5 text-gray-600" />
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t("filters.title")}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                {" "}
                {/* Updated grid to be more responsive */}
                <Select value={filters.module} onValueChange={(v) => setFilters({ ...filters, module: v })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={t("filters.functionalModule")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filterModuleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={t("filters.type")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filterTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={t("filters.status")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filterStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.responsible} onValueChange={(v) => setFilters({ ...filters, responsible: v })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={t("filters.responsible")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filterResponsibleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.date} onValueChange={(v) => setFilters({ ...filters, date: v })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder={t("filters.updateDate")} />
                  </SelectTrigger>
                  <SelectContent>
                    {filterDateOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                {" "}
                {/* Stack buttons on mobile */}
                <Button
                  onClick={applyFilters}
                  className="bg-[#b91c1c] hover:bg-red-800 text-white text-sm w-full sm:w-auto"
                >
                  {t("filters.apply")}
                </Button>
                <Button variant="outline" onClick={resetFilters} className="text-sm bg-transparent w-full sm:w-auto">
                  {t("filters.reset")}
                </Button>
              </div>
            </div>
            {/* Catalogs List */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              {" "}
              {/* Reduced padding on mobile */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                {" "}
                {/* Stack header on mobile */}
                <h2 className="text-base sm:text-lg font-semibold">{t("list.title")}</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    className="bg-[#b91c1c] hover:bg-red-800 text-white text-sm flex-1 sm:flex-none"
                    onClick={() => {
                      setSelectedCatalog({
                        id: "",
                        moduleKey: "",
                        typeKey: "",
                        name: "",
                        description: "",
                        status: "ACTIVE",
                        isCritical: false,
                        isItControlled: false,
                        lastUpdatedAt: "",
                        recordsCount: 0,
                        fieldsCount: 0,
                      })
                      setActiveTab("fields")
                      setShowAddFieldDialog(false)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("list.add")}
                  </Button>
                  <Button
                    variant="outline"
                    className="text-sm bg-transparent flex-1 sm:flex-none"
                    onClick={handleExportAllCatalogs}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {t("list.export")}
                  </Button>
                </div>
              </div>
              {/* Catalog Items */}
              <div className="space-y-3">
                {catalogs.map((catalog) => (
                  <div
                    key={catalog.id}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3" /* Made catalog cards responsive */
                  >
                    <div className="w-full lg:w-auto">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {" "}
                        {/* Added flex-wrap for badges */}
                        <h3 className="text-sm sm:text-base font-semibold text-gray-900">{catalog.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {t(`module.${catalog.moduleKey}`)}
                        </Badge>
                        {catalog.isCritical && (
                          <Badge variant="destructive" className="text-xs bg-red-100 text-red-700 border-red-200">
                            {t("badge.critical")}
                          </Badge>
                        )}
                        {catalog.isItControlled && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            {t("badge.itOnly")}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            catalog.status === "ACTIVE" && "bg-green-50 text-green-700 border-green-200",
                            catalog.status === "PENDING" && "bg-yellow-50 text-yellow-700 border-yellow-200",
                            catalog.status === "INACTIVE" && "bg-gray-50 text-gray-700 border-gray-200",
                          )}
                        >
                          {t(`status.${catalog.status.toLowerCase()}`)}
                        </Badge>
                      </div>

                      <p className="text-xs sm:text-sm text-gray-600 mb-3">{catalog.description}</p>

                      <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-500 flex-wrap">
                        {" "}
                        {/* Added flex-wrap */}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t("list.lastUpdate")}: {formatDate(catalog.lastUpdatedAt)}
                        </span>
                        <span>
                          • {catalog.recordsCount} {t("list.records")}
                        </span>
                        <span>
                          • {catalog.fieldsCount} {t("list.fields")}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full lg:w-auto flex-wrap">
                      {" "}
                      {/* Made action buttons responsive */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCatalog(catalog)}
                        className="flex-1 lg:flex-none text-xs"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">{t("btn.edit")}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDependencies(catalog)}
                        className="flex-1 lg:flex-none text-xs"
                      >
                        <GitBranch className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">{t("btn.dependencies")}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSecurity(catalog)}
                        className="flex-1 lg:flex-none text-xs"
                      >
                        <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">{t("btn.security")}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSync(catalog)}
                        className="flex-1 lg:flex-none text-xs"
                      >
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">{t("btn.sync")}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
        {/* Alerts Panel */}
        {showAlerts && (
          <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 bg-white overflow-y-auto max-h-screen lg:max-h-none">
            {" "}
            {/* Made alerts panel responsive */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <h2 className="font-semibold">
                  {t("alerts.title")} ({currentAlerts.length})
                </h2>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAlerts(false)} className="hover:bg-gray-100">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {currentAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {alert.catalogTypeKey}
                    </span>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        alert.severity === "CRITICAL"
                          ? "bg-red-100 text-red-700"
                          : alert.severity === "URGENT"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {alert.severity === "CRITICAL"
                        ? t("alerts.critical")
                        : alert.severity === "URGENT"
                          ? t("alerts.urgent")
                          : t("alerts.medium")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2 leading-relaxed">{alert.message}</p>
                  <p className="text-xs text-gray-500">{alert.timeAgo}</p>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Edit Catalog Sheet */}
      <Sheet
        open={selectedCatalog !== null && !isDependenciesOpen && !isSecurityOpen && (showAddFieldDialog ? false : true)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCatalog(null)
            setActiveTab("fields")
          }
        }}
        modal={!showAddFieldDialog}
      >
        <SheetContent className="w-full sm:w-[600px] lg:w-[750px] sm:max-w-[90vw] overflow-y-auto p-0">
          {selectedCatalog && (
            <div className="h-full flex flex-col">
              <SheetHeader className="px-4 sm:px-6 py-4 border-b bg-white sticky top-0 z-20">
                <SheetTitle className="text-lg sm:text-xl">{selectedCatalog.name}</SheetTitle>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">{selectedCatalog.description}</p>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                  <div className="px-3 sm:px-6 pt-4 pb-2 bg-white sticky top-0 z-10 border-b shadow-sm">
                    <div className="overflow-x-auto -mx-3 sm:-mx-6 px-3 sm:px-6">
                      <TabsList className="inline-flex min-w-max h-11 gap-1 bg-gray-100 p-1 rounded-lg">
                        <TabsTrigger value="fields" className="px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                          {t("tab.fields")}
                        </TabsTrigger>
                        <TabsTrigger value="subcatalogs" className="px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                          {t("tab.subcatalogs")}
                        </TabsTrigger>
                        <TabsTrigger value="dependencies" className="px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                          {t("tab.dependencies")}
                        </TabsTrigger>
                        <TabsTrigger value="security" className="px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                          {t("tab.security")}
                        </TabsTrigger>
                        <TabsTrigger value="sync" className="px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">
                          {t("tab.sync")}
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  </div>

                  <div className="px-3 sm:px-6 py-6">
                    {" "}
                    {/* Reduced padding on mobile */}
                    <TabsContent value="fields" className="space-y-6 mt-0">
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-sm">{t("fields.common")}</h3>
                          <button
                            onClick={() => {
                              setIsAddingCommonField(true)
                              setShowAddFieldDialog(true)
                              setNewField({
                                // Reset newField state when opening dialog
                                name: "",
                                labelKey: "",
                                type: "string",
                                required: false,
                              })
                            }}
                            className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                          >
                            <span>+</span>
                            {t("actions.addField")}
                          </button>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium">{t("fields.name")}</th>
                                <th className="px-4 py-3 text-left font-medium">{t("fields.type")}</th>
                                <th className="px-4 py-3 text-left font-medium">{t("fields.required")}</th>
                                <th className="px-4 py-3 text-left font-medium">{t("actions.title")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {editingFields
                                .filter((f) => commonFields.some((cf) => cf.name === f.name))
                                .map((field) => (
                                  <tr key={field.name} className="border-t hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-xs">{field.name}</td>
                                    <td className="px-4 py-3">
                                      <Badge variant="outline" className="text-xs">
                                        {field.type}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3">
                                      <button
                                        onClick={() => handleToggleRequired(field.name)}
                                        className="hover:opacity-70"
                                      >
                                        {field.required ? "✓" : "-"}
                                      </button>
                                    </td>
                                    <td className="px-4 py-3">
                                      <button
                                        onClick={() => handleRemoveField(field.name)}
                                        className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                                      >
                                        {t("actions.remove")}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-sm">{t("fields.specific")}</h3>
                          <button
                            onClick={() => {
                              setIsAddingCommonField(false)
                              setShowAddFieldDialog(true)
                              setNewField({
                                // Reset newField state when opening dialog
                                name: "",
                                labelKey: "",
                                type: "string",
                                required: false,
                              })
                            }}
                            className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                          >
                            <span>+</span>
                            {t("actions.addField")}
                          </button>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left font-medium">{t("fields.name")}</th>
                                <th className="px-4 py-3 text-left font-medium">{t("fields.type")}</th>
                                <th className="px-4 py-3 text-left font-medium">{t("fields.required")}</th>
                                <th className="px-4 py-3 text-left font-medium">{t("actions.title")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {editingFields
                                .filter((f) => !commonFields.some((cf) => cf.name === f.name))
                                .map((field) => (
                                  <tr key={field.name} className="border-t hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono text-xs">{field.name}</td>
                                    <td className="px-4 py-3">
                                      <Badge variant="outline" className="text-xs">
                                        {field.type}
                                      </Badge>
                                      {field.type === "fk" && field.referencedCatalogType && (
                                        <span className="text-xs text-gray-500 ml-2">
                                          → {field.referencedCatalogType}
                                        </span>
                                      )}
                                      {field.type === "reference" && field.referenceTo && (
                                        <span className="text-xs text-gray-500 ml-2">→ {field.referenceTo}</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      <button
                                        onClick={() => handleToggleRequired(field.name)}
                                        className="hover:opacity-70"
                                      >
                                        {field.required ? "✓" : "-"}
                                      </button>
                                    </td>
                                    <td className="px-4 py-3">
                                      <button
                                        onClick={() => handleRemoveField(field.name)}
                                        className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                                      >
                                        {t("actions.remove")}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <button
                          onClick={() => setSelectedCatalog(null)}
                          className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
                        >
                          {t("actions.cancel")}
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Implement save to API
                            alert(t("success.fieldsSaved"))
                            setSelectedCatalog(null) // Close drawer after saving
                          }}
                          className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          {t("actions.saveChanges")}
                        </button>
                      </div>
                    </TabsContent>
                    <TabsContent value="subcatalogs" className="space-y-4 mt-0">
                      {!selectedSubcatalog ? (
                        <>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                            <h3 className="font-semibold text-base sm:text-lg">{t("subcatalogs.title")}</h3>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                onClick={() => setShowSubcatalogDialog(true)}
                                className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2 text-xs sm:text-sm flex-1 sm:flex-none justify-center"
                              >
                                <span>+</span>
                                {t("subcatalogs.add")}
                              </button>
                              <button
                                onClick={handleExportDefinition}
                                className="px-3 sm:px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm flex-1 sm:flex-none"
                              >
                                {t("subcatalogs.exportDef")}
                              </button>
                            </div>
                          </div>

                          <div className="border rounded-lg overflow-x-auto">
                            <table className="w-full text-sm min-w-[800px]">
                              <thead className="bg-gray-50 border-b">
                                <tr>
                                  <th className="px-3 sm:px-4 py-3 text-left font-medium text-xs sm:text-sm">
                                    {t("subcatalogs.name")}
                                  </th>
                                  <th className="px-3 sm:px-4 py-3 text-left font-medium text-xs sm:text-sm">
                                    {t("subcatalogs.key")}
                                  </th>
                                  <th className="px-3 sm:px-4 py-3 text-left font-medium text-xs sm:text-sm">
                                    {t("subcatalogs.status")}
                                  </th>
                                  <th className="px-3 sm:px-4 py-3 text-left font-medium text-xs sm:text-sm">
                                    {t("subcatalogs.fieldsCount")}
                                  </th>
                                  <th className="px-3 sm:px-4 py-3 text-left font-medium text-xs sm:text-sm">
                                    {t("subcatalogs.recordsCount")}
                                  </th>
                                  <th className="px-3 sm:px-4 py-3 text-left font-medium text-xs sm:text-sm whitespace-nowrap">
                                    {t("actions.title")}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {subcatalogs.map((sub) => (
                                  <tr key={sub.id} className="border-t hover:bg-gray-50">
                                    <td className="px-3 sm:px-4 py-3 font-medium text-xs sm:text-sm">{sub.name}</td>
                                    <td className="px-3 sm:px-4 py-3 font-mono text-xs">{sub.key}</td>
                                    <td className="px-3 sm:px-4 py-3">
                                      <Badge
                                        variant={sub.status === "ACTIVE" ? "default" : "secondary"}
                                        className="text-xs"
                                      >
                                        {t(`status.${sub.status.toLowerCase()}`)}
                                      </Badge>
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm">
                                      {sub.fieldsCount}
                                    </td>
                                    <td className="px-3 sm:px-4 py-3 text-center text-xs sm:text-sm">
                                      {sub.recordsCount}
                                    </td>
                                    <td className="px-3 sm:px-4 py-3">
                                      <div className="flex gap-1 flex-nowrap">
                                        <button
                                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                                          onClick={() => configureSubcatalog(sub)}
                                        >
                                          {t("subcatalogs.configure")}
                                        </button>
                                        <button
                                          className="px-2 py-1 text-xs border rounded hover:bg-gray-50 whitespace-nowrap"
                                          onClick={() => {
                                            console.log("[v0] Duplicating subcatalog:", sub.id)
                                          }}
                                        >
                                          {t("subcatalogs.duplicate")}
                                        </button>
                                        <button
                                          className="px-2 py-1 text-xs text-red-600 hover:text-red-800 border border-red-200 rounded hover:bg-red-50 whitespace-nowrap"
                                          onClick={() => {
                                            console.log("[v0] Deleting subcatalog:", sub.id)
                                          }}
                                        >
                                          {t("subcatalogs.delete")}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Subcatalog Field and Code Builder */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <button
                                  onClick={() => setSelectedSubcatalog(null)}
                                  className="text-sm text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-1"
                                >
                                  ← {t("btn.cancel")}
                                </button>
                                <h3 className="font-semibold text-lg">
                                  {t("subcatalogs.title")}: {selectedSubcatalog.name}
                                </h3>
                              </div>
                            </div>

                            <Tabs value={subcatalogTab} onValueChange={setSubcatalogTab as any}>
                              <TabsList className="w-full">
                                <TabsTrigger value="fields" className="flex-1">
                                  {t("tab.fields")}
                                </TabsTrigger>
                                <TabsTrigger value="code" className="flex-1">
                                  {t("code.title")}
                                </TabsTrigger>
                                <TabsTrigger value="preview" className="flex-1">
                                  {t("preview.title")}
                                </TabsTrigger>
                              </TabsList>

                              {/* Fields Tab */}
                              <TabsContent value="fields" className="space-y-4 mt-4">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-medium">{t("subfields.title")}</h4>
                                  <button
                                    onClick={() => {
                                      setEditingField(null)
                                      setShowFieldDialog(true)
                                    }}
                                    className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center gap-1"
                                  >
                                    <span>+</span>
                                    {t("subfields.add")}
                                  </button>
                                </div>

                                <div className="border rounded-lg overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-2 py-2 text-left font-medium">
                                          {t("subfields.visibleName")}
                                        </th>
                                        <th className="px-2 py-2 text-left font-medium">
                                          {t("subfields.technicalKey")}
                                        </th>
                                        <th className="px-2 py-2 text-left font-medium">{t("subfields.dataType")}</th>
                                        <th className="px-2 py-2 text-center font-medium">{t("subfields.required")}</th>
                                        <th className="px-2 py-2 text-center font-medium">
                                          {t("subfields.maxLength")}
                                        </th>
                                        <th className="px-2 py-2 text-center font-medium">{t("subfields.order")}</th>
                                        <th className="px-2 py-2 text-center font-medium">{t("subfields.inCode")}</th>
                                        <th className="px-2 py-2 text-center font-medium">{t("actions.title")}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {subcatalogFields
                                        .sort((a, b) => a.orden - b.orden)
                                        .map((field) => (
                                          <tr key={field.id} className="border-t hover:bg-gray-50">
                                            <td className="px-2 py-2">{field.nombreVisibleKey}</td>
                                            <td className="px-2 py-2 font-mono">{field.claveTecnica}</td>
                                            <td className="px-2 py-2">
                                              <Badge variant="outline">{field.tipoDato}</Badge>
                                            </td>
                                            <td className="px-2 py-2 text-center">{field.requerido ? "✓" : "-"}</td>
                                            <td className="px-2 py-2 text-center">{field.longitudMaxima || "-"}</td>
                                            <td className="px-2 py-2 text-center">{field.orden}</td>
                                            <td className="px-2 py-2 text-center">
                                              {field.participaEnNomenclatura ? "✓" : "-"}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                              <div className="flex gap-1 justify-center">
                                                <button
                                                  onClick={() => {
                                                    setEditingField(field)
                                                    setShowFieldDialog(true)
                                                  }}
                                                  className="text-blue-600 hover:text-blue-800"
                                                >
                                                  {t("btn.edit")}
                                                </button>
                                                <button
                                                  onClick={() => deleteSubcatalogField(field.id)}
                                                  className="text-red-600 hover:text-red-800"
                                                >
                                                  {t("actions.remove")}
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                    </tbody>
                                  </table>
                                </div>
                              </TabsContent>

                              {/* Code/Nomenclature Tab */}
                              <TabsContent value="code" className="space-y-4 mt-4">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-medium">{t("code.title")}</h4>
                                  <button
                                    onClick={() => {
                                      setEditingSegment(null)
                                      setShowSegmentDialog(true)
                                    }}
                                    className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center gap-1"
                                  >
                                    <span>+</span>
                                    {t("code.addSegment")}
                                  </button>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <div className="text-sm font-medium text-blue-900 mb-2">{t("code.example")}:</div>
                                  <div className="font-mono text-lg font-bold text-blue-700">
                                    {generateCodePreview()}
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {codeSegments
                                    .sort((a, b) => a.orden - b.orden)
                                    .map((segment, index) => (
                                      <div
                                        key={segment.id}
                                        className="border rounded-lg p-3 bg-white flex items-center justify-between"
                                      >
                                        <div className="flex-1">
                                          <div className="flex items-center gap-3">
                                            <span className="bg-gray-100 rounded px-2 py-1 text-xs font-medium">
                                              {index + 1}
                                            </span>
                                            <Badge variant="outline">{segment.tipoSegmento}</Badge>
                                            <span className="text-sm">
                                              {segment.tipoSegmento === "STATIC" && segment.valorFijo}
                                              {segment.tipoSegmento === "FIELD" &&
                                                subcatalogFields.find((f) => f.id === segment.fieldId)
                                                  ?.nombreVisibleKey}
                                              {segment.tipoSegmento === "SEQUENCE" && segment.nombreSecuencia}
                                            </span>
                                            {segment.formato && <Badge variant="secondary">{segment.formato}</Badge>}
                                          </div>
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => {
                                              setEditingSegment(segment)
                                              setShowSegmentDialog(true)
                                            }}
                                            className="text-sm text-blue-600 hover:text-blue-800"
                                          >
                                            {t("btn.edit")}
                                          </button>
                                          <button
                                            onClick={() => {
                                              if (confirm(t("subcatalogs.confirmDelete"))) {
                                                setCodeSegments((prev) => prev.filter((s) => s.id !== segment.id))
                                              }
                                            }}
                                            className="text-sm text-red-600 hover:text-red-800"
                                          >
                                            {t("actions.remove")}
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </TabsContent>

                              {/* Preview Tab */}
                              <TabsContent value="preview" className="space-y-4 mt-4">
                                <h4 className="font-medium">{t("preview.sampleRecords")}</h4>

                                <div className="border rounded-lg overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-medium">
                                          {t("preview.generatedCode")}
                                        </th>
                                        {subcatalogFields
                                          .sort((a, b) => a.orden - b.orden)
                                          .slice(0, 5)
                                          .map((field) => (
                                            <th key={field.id} className="px-3 py-2 text-left font-medium">
                                              {field.nombreVisibleKey}
                                            </th>
                                          ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {[1, 2, 3].map((i) => (
                                        <tr key={i} className="border-t hover:bg-gray-50">
                                          <td className="px-3 py-2 font-mono font-bold text-blue-600">
                                            {generateCodePreview().replace(/\d+$/, String(i).padStart(4, "0"))}
                                          </td>
                                          {subcatalogFields
                                            .sort((a, b) => a.orden - b.orden)
                                            .slice(0, 5)
                                            .map((field) => (
                                              <td key={field.id} className="px-3 py-2">
                                                {field.tipoDato === "enum" && field.valoresEnum
                                                  ? field.valoresEnum[i % field.valoresEnum.length]
                                                  : `Valor ${i}`}
                                              </td>
                                            ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </TabsContent>
                            </Tabs>
                          </div>
                        </>
                      )}
                    </TabsContent>
                    <TabsContent value="dependencies" className="space-y-6 mt-0">
                      {/* Depende de (depends on) */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">{t("dep.dependsOn")}</h3>
                          <Button
                            size="sm"
                            onClick={() => {
                              setDependencyType("dependsOn")
                              setShowAddDependencyDialog(true)
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {t("action.add")}
                          </Button>
                        </div>
                        {catalogDependencies.filter((dep) => dep.relationshipType === "dependsOn").length > 0 ? (
                          <ul className="space-y-2">
                            {catalogDependencies
                              .filter((dep) => dep.relationshipType === "dependsOn")
                              .map((dep) => (
                                <li
                                  key={dep.catalogId}
                                  className="flex items-center justify-between gap-2 p-3 border rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <GitBranch className="h-4 w-4" />
                                    <span>{dep.catalogName}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveDependency(dep.catalogId, "dependsOn")}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </li>
                              ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">{t("label.notAssigned")}</p>
                        )}
                      </div>

                      {/* Usado por (used by) */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">{t("dep.usedBy")}</h3>
                          <Button
                            size="sm"
                            onClick={() => {
                              setDependencyType("usedBy")
                              setShowAddDependencyDialog(true)
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {t("action.add")}
                          </Button>
                        </div>
                        {catalogDependencies.filter((dep) => dep.relationshipType === "usedBy").length > 0 ? (
                          <ul className="space-y-2">
                            {catalogDependencies
                              .filter((dep) => dep.relationshipType === "usedBy")
                              .map((dep) => (
                                <li
                                  key={dep.catalogId}
                                  className="flex items-center justify-between gap-2 p-3 border rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <GitBranch className="h-4 w-4" />
                                    <span>{dep.catalogName}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveDependency(dep.catalogId, "usedBy")}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </li>
                              ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">{t("label.notAssigned")}</p>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="security" className="space-y-6 mt-0">
                      <div>
                        <Label className="text-sm font-semibold">{t("sec.itOwner")}</Label>
                        <Select defaultValue={mockSecurityConfig.itOwnerId}>
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user-it-001">Carlos Martínez</SelectItem>
                            <SelectItem value="user-it-002">María López</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-semibold">{t("sec.functionalOwners")}</Label>
                        <div className="mt-2 space-y-2">
                          {mockSecurityConfig.functionalOwners.map((owner) => (
                            <div
                              key={owner.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                            >
                              <div>
                                <div className="text-sm font-medium">{owner.name}</div>
                                <div className="text-xs text-gray-500">{owner.module}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-3">{t("sec.accessLevel")}</h3>
                        <div className="flex items-center gap-2 p-3 border rounded">
                          {selectedCatalog?.isItControlled ? (
                            <>
                              <Lock className="h-4 w-4" />
                              <span className="text-sm">{t("sec.itOnlyFields")}</span>
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4" />
                              <span className="text-sm">{t("sec.functionalWrite")}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="sync" className="space-y-6 mt-0">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">{t("sync.withErp")}</Label>
                          <Switch defaultChecked={mockSyncConfig.syncWithErp} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">{t("sync.withExternal")}</Label>
                          <Switch defaultChecked={mockSyncConfig.syncWithExternalSources} />
                        </div>
                      </div>

                      {mockSyncConfig.lastSyncAt && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <div className="text-sm font-semibold mb-2">{t("sync.lastSync")}</div>
                          <div className="text-sm text-gray-600">{formatDate(mockSyncConfig.lastSyncAt)}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs">{t("sync.status")}:</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                mockSyncConfig.lastSyncStatus === "OK" && "bg-green-50 text-green-700",
                                mockSyncConfig.lastSyncStatus === "ERROR" && "bg-red-50 text-red-700",
                              )}
                            >
                              {mockSyncConfig.lastSyncStatus}
                            </Badge>
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full bg-[#b91c1c] hover:bg-[#991b1b]"
                        onClick={() => triggerCatalogSync(selectedCatalog.id)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t("btn.forceSyncNow")}
                      </Button>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      {/* Dependencies Dialog */}
      <Sheet
        open={isDependenciesOpen}
        onOpenChange={(open) => {
          setIsDependenciesOpen(open)
          if (!open) {
            setSelectedCatalog(null)
            setCatalogDependencies([])
          }
        }}
      >
        <SheetContent className="w-[650px] sm:max-w-[650px] overflow-y-auto p-6">
          <SheetHeader>
            <SheetTitle>{t("tab.dependencies")}</SheetTitle>
            <p className="text-sm text-muted-foreground">{selectedCatalog?.name}</p>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Depende de (depends on) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{t("dep.dependsOn")}</h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setDependencyType("dependsOn")
                    setShowAddDependencyDialog(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("action.add")}
                </Button>
              </div>
              {catalogDependencies.filter((dep) => dep.relationshipType === "dependsOn").length > 0 ? (
                <ul className="space-y-2">
                  {catalogDependencies
                    .filter((dep) => dep.relationshipType === "dependsOn")
                    .map((dep) => (
                      <li key={dep.catalogId} className="flex items-center justify-between gap-2 p-3 border rounded">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          <span>{dep.catalogName}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDependency(dep.catalogId, "dependsOn")}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">{t("label.notAssigned")}</p>
              )}
            </div>

            {/* Usado por (used by) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{t("dep.usedBy")}</h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setDependencyType("usedBy")
                    setShowAddDependencyDialog(true)
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("action.add")}
                </Button>
              </div>
              {catalogDependencies.filter((dep) => dep.relationshipType === "usedBy").length > 0 ? (
                <ul className="space-y-2">
                  {catalogDependencies
                    .filter((dep) => dep.relationshipType === "usedBy")
                    .map((dep) => (
                      <li key={dep.catalogId} className="flex items-center justify-between gap-2 p-3 border rounded">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          <span>{dep.catalogName}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDependency(dep.catalogId, "usedBy")}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">{t("label.notAssigned")}</p>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      {/* Security drawer - close Edit drawer when opening */}
      <Sheet
        open={isSecurityOpen}
        onOpenChange={(open) => {
          setIsSecurityOpen(open)
          if (!open) {
            setSelectedCatalog(null) // Clear selected catalog when closing
          }
        }}
      >
        <SheetContent className="w-[650px] sm:max-w-[650px] overflow-y-auto p-6">
          <SheetHeader>
            <SheetTitle>{t("tab.security")}</SheetTitle>
            <p className="text-sm text-muted-foreground">{selectedCatalog?.name}</p>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-3">{t("sec.itOwner")}</h3>
              <p className="text-sm">
                {selectedCatalog?.itOwnerId ? mockSecurityConfig.itOwnerName : t("label.notAssigned")}
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">{t("sec.functionalOwners")}</h3>
              {selectedCatalog?.id && mockSecurityConfig.functionalOwners.length > 0 ? (
                <ul className="space-y-2">
                  {mockSecurityConfig.functionalOwners.map((owner) => (
                    <li key={owner.id} className="flex items-center gap-2 p-2 border rounded">
                      <Users className="h-4 w-4" />
                      <span>
                        {owner.name} ({owner.module})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">
                  {t("sec.functionalOwners")}: {t("label.notAssigned")}
                </p>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-3">{t("sec.accessLevel")}</h3>
              <div className="flex items-center gap-2 p-3 border rounded">
                {selectedCatalog?.isItControlled ? (
                  <>
                    <Lock className="h-4 w-4" />
                    <span className="text-sm">{t("sec.itOnlyFields")}</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    <span className="text-sm">{t("sec.functionalWrite")}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      {/* CHANGE: Add Dialog component for Add Field */}
      <Dialog
        open={showAddFieldDialog}
        onOpenChange={(open) => {
          setShowAddFieldDialog(open)
          if (!open) {
            // Reset form when dialog is closed
            setNewField({
              name: "",
              labelKey: "",
              type: "string",
              required: false,
            })
          }
        }}
      >
        <DialogContent className="sm:max-w-md z-[100]">
          <DialogHeader>
            <DialogTitle>{isAddingCommonField ? t("fields.addCommon") : t("fields.addSpecific")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{t("fields.name")} *</label>
              <input
                type="text"
                value={newField.name || ""}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="field_name"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t("fields.label")} *</label>
              <input
                type="text"
                value={newField.labelKey || ""}
                onChange={(e) => setNewField({ ...newField, labelKey: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Field Label"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">{t("fields.type")}</label>
              <select
                value={newField.type || "string"}
                onChange={(e) =>
                  setNewField({ ...newField, type: e.target.value as FieldType })
                } /* Explicitly cast to FieldType */
                className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="string">string</option>
                <option value="number">number</option>
                <option value="boolean">boolean</option>
                <option value="date">date</option>
                <option value="datetime">datetime</option>
                <option value="enum">enum</option>
                <option value="reference">reference</option> {/* Added reference option */}
                <option value="json">json</option> {/* Added json option */}
              </select>
            </div>

            {newField.type === "enum" && (
              <div>
                <label className="block text-sm font-medium mb-1.5">{t("fields.enumValues")}</label>
                <input
                  type="text"
                  value={newField.enumValues?.join(", ") || ""}
                  onChange={(e) =>
                    setNewField({
                      ...newField,
                      enumValues: e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter((v) => v.length > 0) /* Filter out empty strings */,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="valor1, valor2, valor3"
                />
              </div>
            )}

            {newField.type === "reference" && (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {t("fields.refCatalog")} {/* Use the new translation key */}
                </label>
                <input
                  type="text"
                  value={newField.referenceTo || ""}
                  onChange={(e) => setNewField({ ...newField, referenceTo: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="catalog_name"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={newField.required || false}
                onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <label htmlFor="required" className="text-sm font-medium">
                {t("fields.required")}
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddFieldDialog(false)
                setNewField({
                  // Reset form when dialog is closed
                  name: "",
                  labelKey: "",
                  type: "string",
                  required: false,
                })
              }}
            >
              {t("btn.cancel")}
            </Button>
            <Button
              onClick={handleAddField}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!newField.name || !newField.labelKey}
            >
              {t("btn.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showFieldDialog} onOpenChange={setShowFieldDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingField ? t("btn.edit") : t("subfields.add")} {t("tab.fields")}
            </DialogTitle>
          </DialogHeader>
          <SubcatalogFieldForm
            field={editingField}
            subcatalogId={selectedSubcatalog?.id || ""}
            catalogs={mockCatalogsData[locale]} /* Use locale-specific mock data */
            onSave={saveSubcatalogField}
            onCancel={() => {
              setShowFieldDialog(false)
              setEditingField(null)
            }}
            translations={t}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={showSegmentDialog} onOpenChange={setShowSegmentDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingSegment ? t("btn.edit") : t("code.addSegment")}</DialogTitle>
          </DialogHeader>
          <CodeSegmentForm
            segment={editingSegment}
            subcatalogId={selectedSubcatalog?.id || ""}
            fields={subcatalogFields.filter((f) => f.participaEnNomenclatura)}
            onSave={saveCodeSegment}
            onCancel={() => {
              setShowSegmentDialog(false)
              setEditingSegment(null)
            }}
            translations={t}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={showSubcatalogDialog} onOpenChange={setShowSubcatalogDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("subcatalogs.add")}</DialogTitle>
            <DialogDescription>Crea un nuevo sub-catálogo dentro de este catálogo maestro</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t("subcatalogs.name")} *</label>
              <input
                type="text"
                value={newSubcatalog.name}
                onChange={(e) => setNewSubcatalog({ ...newSubcatalog, name: e.target.value })}
                className="w-full p-2 border rounded-md"
                placeholder="Ej: Vehículos Terrestres"
                autoFocus
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t("subcatalogs.key")} *</label>
              <input
                type="text"
                value={newSubcatalog.key}
                onChange={(e) =>
                  setNewSubcatalog({ ...newSubcatalog, key: e.target.value.toUpperCase().replace(/\s/g, "_") })
                }
                className="w-full p-2 border rounded-md"
                placeholder="Ej: VEHICULOS_TERRESTRES"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">{t("form.description")}</label>
              <textarea
                value={newSubcatalog.description}
                onChange={(e) => setNewSubcatalog({ ...newSubcatalog, description: e.target.value })}
                className="w-full p-2 border rounded-md"
                rows={3}
                placeholder="Descripción opcional del sub-catálogo"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSubcatalogDialog(false)
                setNewSubcatalog({ name: "", key: "", description: "" })
              }}
            >
              {t("btn.cancel")}
            </Button>
            <Button
              onClick={handleAddSubcatalog}
              disabled={!newSubcatalog.name || !newSubcatalog.key}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t("btn.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showAddDependencyDialog} onOpenChange={setShowAddDependencyDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{dependencyType === "dependsOn" ? t("dep.addDependsOn") : t("dep.addUsedBy")}</DialogTitle>
            <DialogDescription>
              {dependencyType === "dependsOn"
                ? "Selecciona un catálogo del cual este depende"
                : "Selecciona un catálogo que usa este catálogo"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">{t("filters.module")}</label> {/* Re-using label */}
              <select
                value={selectedDependencyCatalog}
                onChange={(e) => setSelectedDependencyCatalog(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">{t("filters.all")}</option> {/* Re-using option */}
                {allCatalogs
                  .filter((cat) => cat.id !== selectedCatalog?.id)
                  .filter(
                    (cat) =>
                      !catalogDependencies.some(
                        (dep) => dep.catalogId === cat.id && dep.relationshipType === dependencyType,
                      ),
                  )
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDependencyDialog(false)}>
              {t("action.cancel")}
            </Button>
            <Button onClick={handleAddDependency} disabled={!selectedDependencyCatalog}>
              {t("action.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SubcatalogFieldForm({
  field,
  subcatalogId,
  catalogs,
  onSave,
  onCancel,
  translations: t,
}: {
  field: SubcatalogField | null
  subcatalogId: string
  catalogs: CatalogSummary[] /* Use CatalogSummary[] for type safety */
  onSave: (field: SubcatalogField) => void
  onCancel: () => void
  translations: (key: string) => string
}) {
  const [formData, setFormData] = useState<Partial<SubcatalogField>>(
    field || {
      subcatalogId,
      nombreVisibleKey: "",
      claveTecnica: "",
      tipoDato: "string",
      requerido: false,
      orden: 1,
      participaEnNomenclatura: false,
    },
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData as SubcatalogField)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t("subfields.visibleName")} *</label>
          <input
            type="text"
            value={formData.nombreVisibleKey || ""}
            onChange={(e) => setFormData({ ...formData, nombreVisibleKey: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("subfields.technicalKey")} *</label>
          <input
            type="text"
            value={formData.claveTecnica || ""}
            onChange={(e) => setFormData({ ...formData, claveTecnica: e.target.value })}
            className="w-full px-3 py-2 border rounded font-mono"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">{t("subfields.dataType")} *</label>
          <select
            value={formData.tipoDato}
            onChange={(e) => setFormData({ ...formData, tipoDato: e.target.value as SubcatalogField["tipoDato"] })}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
            <option value="datetime">Datetime</option>
            <option value="enum">Enum</option>
            <option value="fk">FK (Foreign Key)</option>
            <option value="array">Array</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("subfields.maxLength")}</label>
          <input
            type="number"
            value={formData.longitudMaxima === undefined ? "" : formData.longitudMaxima}
            onChange={(e) => setFormData({ ...formData, longitudMaxima: Number.parseInt(e.target.value) || undefined })}
            className="w-full px-3 py-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">{t("subfields.order")} *</label>
          <input
            type="number"
            value={formData.orden}
            onChange={(e) => setFormData({ ...formData, orden: Number.parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t("subfields.defaultValue")}</label>
        <input
          type="text"
          value={formData.valorPorDefecto || ""}
          onChange={(e) => setFormData({ ...formData, valorPorDefecto: e.target.value })}
          className="w-full px-3 py-2 border rounded"
        />
      </div>

      {formData.tipoDato === "enum" && (
        <div>
          <label className="block text-sm font-medium mb-1">{t("subfields.enumValues")}</label>
          <input
            type="text"
            placeholder="Valor1, Valor2, Valor3"
            value={formData.valoresEnum?.join(", ") || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                valoresEnum: e.target.value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
              })
            }
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      )}

      {formData.tipoDato === "fk" && (
        <div>
          <label className="block text-sm font-medium mb-1">{t("subfields.refCatalog")}</label>
          <select
            value={formData.catalogoReferenciaKey || ""}
            onChange={(e) => setFormData({ ...formData, catalogoReferenciaKey: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="">-- {t("code.selectField")} --</option>
            {catalogs.map((cat) => (
              <option key={cat.id} value={cat.typeKey}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.requerido || false}
            onChange={(e) => setFormData({ ...formData, requerido: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">{t("subfields.required")}</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.participaEnNomenclatura || false}
            onChange={(e) => setFormData({ ...formData, participaEnNomenclatura: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">{t("subfields.inCode")}</span>
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-50">
          {t("btn.cancel")}
        </button>
        <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          {t("actions.saveChanges")}
        </button>
      </div>
    </form>
  )
}

function CodeSegmentForm({
  segment,
  subcatalogId,
  fields,
  onSave,
  onCancel,
  translations: t,
}: {
  segment: CodeSegment | null
  subcatalogId: string
  fields: SubcatalogField[]
  onSave: (segment: CodeSegment) => void
  onCancel: () => void
  translations: (key: string) => string
}) {
  const [formData, setFormData] = useState<Partial<CodeSegment>>(
    segment || {
      subcatalogId,
      tipoSegmento: "STATIC",
      orden: 1,
    },
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData as CodeSegment)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">{t("code.segmentType")} *</label>
        <select
          value={formData.tipoSegmento}
          onChange={(e) =>
            setFormData({
              ...formData,
              tipoSegmento: e.target.value as SegmentType,
              // Reset type-specific fields
              fieldId: undefined,
              valorFijo: undefined,
              nombreSecuencia: undefined,
            })
          }
          className="w-full px-3 py-2 border rounded"
        >
          <option value="STATIC">{t("code.static")}</option>
          <option value="FIELD">{t("code.field")}</option>
          <option value="SEQUENCE">{t("code.sequence")}</option>
        </select>
      </div>

      {formData.tipoSegmento === "STATIC" && (
        <div>
          <label className="block text-sm font-medium mb-1">{t("code.fixedValue")} *</label>
          <input
            type="text"
            value={formData.valorFijo || ""}
            onChange={(e) => setFormData({ ...formData, valorFijo: e.target.value })}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>
      )}

      {formData.tipoSegmento === "FIELD" && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">{t("code.selectField")} *</label>
            <select
              value={formData.fieldId || ""}
              onChange={(e) => setFormData({ ...formData, fieldId: e.target.value })}
              className="w-full px-3 py-2 border rounded"
              required
            >
              <option value="">-- {t("code.selectField")} --</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.nombreVisibleKey}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("code.format")}</label>
              <select
                value={formData.formato || "NONE"}
                onChange={(e) => setFormData({ ...formData, formato: e.target.value as FormatType })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="NONE">{t("code.none")}</option>
                <option value="UPPER">{t("code.uppercase")}</option>
                <option value="LOWER">{t("code.lowercase")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("code.length")}</label>
              <input
                type="number"
                value={formData.longitud === undefined ? "" : formData.longitud}
                onChange={(e) => setFormData({ ...formData, longitud: Number.parseInt(e.target.value) || undefined })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.truncar || false}
              onChange={(e) => setFormData({ ...formData, truncar: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">{t("code.truncate")}</span>
          </label>
        </>
      )}

      {formData.tipoSegmento === "SEQUENCE" && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">{t("code.sequenceName")} *</label>
            <input
              type="text"
              value={formData.nombreSecuencia || ""}
              onChange={(e) => setFormData({ ...formData, nombreSecuencia: e.target.value })}
              className="w-full px-3 py-2 border rounded font-mono"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("code.length")}</label>
              <input
                type="number"
                value={formData.longitud === undefined ? 4 : formData.longitud}
                onChange={(e) => setFormData({ ...formData, longitud: Number.parseInt(e.target.value) || 4 })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("code.start")}</label>
              <input
                type="number"
                value={formData.inicio === undefined ? 1 : formData.inicio}
                onChange={(e) => setFormData({ ...formData, inicio: Number.parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("code.increment")}</label>
              <input
                type="number"
                value={formData.incremento === undefined ? 1 : formData.incremento}
                onChange={(e) => setFormData({ ...formData, incremento: Number.parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded hover:bg-gray-50">
          {t("btn.cancel")}
        </button>
        <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          {t("actions.saveChanges")}
        </button>
      </div>
    </form>
  )
}
