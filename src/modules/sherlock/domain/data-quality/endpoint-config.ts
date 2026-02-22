export interface AuditableEndpoint {
  path: string
  label: string
  sherlockMapping?: string
  /** Campo que identifica unívocamente cada registro */
  idField: string
}

/** Endpoints de GStock cuyos datos mapean a modelos de Sherlock y requieren auditoría */
export const AUDITABLE_ENDPOINTS: AuditableEndpoint[] = [
  {
    path: "v1/product/purchases",
    label: "Productos de Compra",
    sherlockMapping: "Ingredient",
    idField: "id",
  },
  {
    path: "v1/product/purchases/categories",
    label: "Categorías de Productos",
    sherlockMapping: "Category",
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
    sherlockMapping: "MeasureUnit",
    idField: "id",
  },
  {
    path: "v1/suppliers",
    label: "Proveedores",
    sherlockMapping: "Supplier",
    idField: "id",
  },
  {
    path: "v1/recipes",
    label: "Recetas v1",
    sherlockMapping: "Recipe",
    idField: "id",
  },
  {
    path: "v2/recipes",
    label: "Recetas v2",
    sherlockMapping: "Recipe",
    idField: "id",
  },
  {
    path: "v1/recipes/categories",
    label: "Categorías de Recetas",
    sherlockMapping: "RecipeCategory",
    idField: "id",
  },
  {
    path: "v1/recipes/families",
    label: "Familias de Recetas",
    sherlockMapping: "RecipeFamily",
    idField: "id",
  },
  {
    path: "v1/shrinkages/causes",
    label: "Causas de Merma",
    sherlockMapping: "WasteReason",
    idField: "id",
  },
]
