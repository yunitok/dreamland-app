"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "@/i18n/navigation"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/modules/shared/ui/button"
import { Input } from "@/modules/shared/ui/input"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/modules/shared/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"
import { Checkbox } from "@/modules/shared/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Separator } from "@/modules/shared/ui/separator"

import { ingredientSchema, IngredientFormValues } from "@/modules/sherlock/schemas"
import { updateIngredient, createIngredient } from "@/modules/sherlock/actions/ingredients"
import { Category, MeasureUnit, Supplier, Ingredient } from "@prisma/client"

interface IngredientFormProps {
  categories: Category[]
  units: MeasureUnit[]
  suppliers: Supplier[]
  initialData?: Ingredient
}

export function IngredientForm({ categories, units, suppliers, initialData }: IngredientFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema) as any,
    defaultValues: (initialData ? {
      name: initialData.name,
      reference: initialData.reference || "",
      categoryId: initialData.categoryId,
      unitTypeId: initialData.unitTypeId,
      cost: initialData.cost,
      taxRate: initialData.taxRate,
      isBuyable: initialData.isBuyable,
      isSellable: initialData.isSellable,
      minStock: initialData.minStock ?? 0,
      maxStock: initialData.maxStock ?? 0,
      yield: initialData.yield ?? 100,
      supplierId: initialData.supplierId || undefined,
      shelfLife: initialData.shelfLife || undefined,
      storageTemp: initialData.storageTemp ?? undefined,
    } : {
      name: "",
      reference: "",
      cost: 0,
      taxRate: 0.10,
      isBuyable: true,
      isSellable: false,
      minStock: 0,
      maxStock: 0,
      yield: 100,
      categoryId: "",
      unitTypeId: "",
    }) as any,
  })

  async function onSubmit(data: IngredientFormValues) {
    setLoading(true)
    try {
      if (initialData) {
        await updateIngredient(initialData.id, data)
        toast.success("Ingrediente actualizado correctamente")
      } else {
        await createIngredient(data)
        toast.success("Ingrediente creado correctamente")
      }
      router.push("/sherlock/ingredients")
      router.refresh()
    } catch (error) {
      toast.error(initialData ? "Error al actualizar" : "Error al crear")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">
          {initialData ? "Editar Ingrediente" : "Nuevo Ingrediente"}
        </h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4 max-w-[600px]">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="pricing">Precios</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="properties">Propiedades</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Datos Básicos</CardTitle>
                  <CardDescription>Información principal del ingrediente.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej. Tomate Triturado" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Referencia Extern/ERP</FormLabel>
                          <FormControl>
                            <Input placeholder="REF-12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoría *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona una categoría" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="supplierId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proveedor Principal</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona proveedor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {suppliers.map((sup) => (
                                <SelectItem key={sup.id} value={sup.id}>
                                  {sup.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-4" />

                  <div className="flex flex-row gap-8">
                    <FormField
                      control={form.control}
                      name="isBuyable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Se compra</FormLabel>
                            <FormDescription>Es materia prima.</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isSellable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Se vende</FormLabel>
                            <FormDescription>Es un producto final.</FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Costes y Unidades</CardTitle>
                  <CardDescription>Define cómo se compra y cuánto cuesta.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="unitTypeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unidad de Base *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Unidad" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {units.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id}>
                                  {unit.name} ({unit.abbreviation})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Coste por Unidad (€)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="taxRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IVA (%)</FormLabel>
                          <Select
                            onValueChange={(val) => field.onChange(parseFloat(val))}
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="IVA" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0.04">4% (Superreducido)</SelectItem>
                              <SelectItem value="0.10">10% (Reducido)</SelectItem>
                              <SelectItem value="0.21">21% (General)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="yield"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rendimiento / Merma (%)</FormLabel>
                        <FormControl>
                          <Input type="number" max="100" {...field} />
                        </FormControl>
                        <FormDescription>Porcentaje aprovechable del producto (100% = sin merma).</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stock" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Niveles de Stock</CardTitle>
                  <CardDescription>Configura alertas de inventario.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="minStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Mínimo</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>Alerta si baja de esta cantidad.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Máximo</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormDescription>Para evitar sobrestock.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="properties" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Propiedades Adicionales</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="shelfLife"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vida Útil (Días)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="storageTemp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temp. Almacenamiento (ºC)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : (initialData ? "Actualizar Ingrediente" : "Crear Ingrediente")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
