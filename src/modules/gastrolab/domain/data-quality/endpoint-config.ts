export interface AuditableEndpoint {
  path: string
  label: string
  gastrolabMapping?: string
  /** Campo que identifica unívocamente cada registro */
  idField: string
}

/** Endpoints de GStock cuyos datos mapean a modelos de GastroLab y requieren auditoría */
export const AUDITABLE_ENDPOINTS: AuditableEndpoint[] = [
  {
    path: "v1/product/purchases",
    label: "Productos de Compra",
    gastrolabMapping: "Ingredient",
    idField: "id",
  },
  {
    path: "v1/product/purchases/categories",
    label: "Categorías de Productos",
    gastrolabMapping: "Category",
    idField: "id",
  },
  {
    path: "v1/product/purchases/families",
    label: "Familias de Productos",
    idField: "id",
  },
  {
    path: "v1/product/purchases/types",
    label: "Tipos de Productos",
    idField: "id",
  },
  {
    path: "v1/product/purchases/subtypes",
    label: "Subtipos de Productos",
    idField: "id",
  },
  {
    path: "v1/product/purchases/units/measure",
    label: "Unidades de Medida",
    gastrolabMapping: "MeasureUnit",
    idField: "id",
  },
  {
    path: "v1/suppliers",
    label: "Proveedores",
    gastrolabMapping: "Supplier",
    idField: "id",
  },
  {
    path: "v1/recipes",
    label: "Recetas v1",
    gastrolabMapping: "Recipe",
    idField: "id",
  },
  {
    path: "v2/recipes",
    label: "Recetas v2",
    gastrolabMapping: "Recipe",
    idField: "id",
  },
  {
    path: "v1/recipes/categories",
    label: "Categorías de Recetas",
    gastrolabMapping: "RecipeCategory",
    idField: "id",
  },
  {
    path: "v1/recipes/families",
    label: "Familias de Recetas",
    gastrolabMapping: "RecipeFamily",
    idField: "id",
  },
  {
    path: "v1/shrinkages/causes",
    label: "Causas de Merma",
    gastrolabMapping: "WasteReason",
    idField: "id",
  },
]
