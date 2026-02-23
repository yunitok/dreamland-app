"use client"

import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "@/i18n/navigation"
import { toast } from "sonner"
import { Plus, Trash2, GripVertical, ChefHat, Info, ListChecks, MessageSquare, Save } from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/modules/shared/ui/form"
import { Input } from "@/modules/shared/ui/input"
import { Textarea } from "@/modules/shared/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/modules/shared/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Separator } from "@/modules/shared/ui/separator"
import { Badge } from "@/modules/shared/ui/badge"
import { recipeSchema, RecipeFormValues } from "@/modules/sherlock/schemas"
import { createRecipe, updateRecipe } from "@/modules/sherlock/actions/recipes"
import { Ingredient, MeasureUnit, RecipeCategory, RecipeFamily } from "@prisma/client"

interface RecipeFormProps {
    initialData?: any
    categories: RecipeCategory[]
    families: RecipeFamily[]
    ingredients: Ingredient[]
    units: MeasureUnit[]
}

export function RecipeForm({
    initialData,
    categories,
    families,
    ingredients,
    units,
}: RecipeFormProps) {
    const router = useRouter()
    const mode = initialData ? "edit" : "create"

    const defaultValues = initialData ? {
        ...initialData,
        description: initialData.description ?? "",
        familyId: initialData.familyId ?? null,
        prepTime: initialData.prepTime ?? 0,
        cookTime: initialData.cookTime ?? 0,
        servings: initialData.servings ?? 1,
        protocoloDeSala: initialData.protocoloDeSala ?? "",
        steps: initialData.steps?.map((text: string) => ({ text })) || [],
        ingredients: initialData.ingredients?.map((ing: any) => ({
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
            unitId: ing.unitId,
            notes: ing.notes ?? "",
        })) || [{ ingredientId: "", quantity: 0, unitId: "", notes: "" }],
    } : {
        name: "",
        description: "",
        categoryId: "",
        familyId: null,
        prepTime: 0,
        cookTime: 0,
        servings: 1,
        steps: [],
        protocoloDeSala: "",
        status: "DRAFT",
        ingredients: [{ ingredientId: "", quantity: 0, unitId: "", notes: "" }],
    }

    const form = useForm<RecipeFormValues>({
        resolver: zodResolver(recipeSchema) as any,
        defaultValues: defaultValues as RecipeFormValues,
    })

    // Live Cost Calculation
    const watchedIngredients = form.watch("ingredients")
    const theoreticalCost = watchedIngredients.reduce((total, item) => {
        const ingredient = ingredients.find(i => i.id === item.ingredientId)
        if (!ingredient || !item.quantity) return total

        // Simple calculation for now: Quantity * (Cost / 1)
        // In a real scenario, we'd use conversion factors
        const yieldFactor = (ingredient.yield || 100) / 100
        const cost = item.quantity * (ingredient.cost / (yieldFactor || 1))
        return total + cost
    }, 0)

    const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
        control: form.control,
        name: "ingredients",
    })

    const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
        control: form.control,
        name: "steps",
    })

    // To handle string array with useFieldArray, we need a slight workaround or just manage it manually
    // But let's try to manage steps as objects internally if needed, or just manual inputs.
    // Actually, let's use a custom field for steps to keep it simple.

    async function onSubmit(data: RecipeFormValues) {
        try {
            if (mode === "create") {
                await createRecipe(data)
                toast.success("Receta creada correctamente")
            } else {
                await updateRecipe(initialData.id, data)
                toast.success("Receta actualizada correctamente")
            }
            router.push("/sherlock/recipes")
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar la receta")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight">
                            {mode === "create" ? "Nueva Receta" : `Editar: ${initialData.name}`}
                        </h2>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="text-sm">
                                Coste Teórico: {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(theoreticalCost)}
                            </Badge>
                            <Badge variant="outline" className="text-sm">
                                Por ración: {new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(theoreticalCost / (Number(form.watch("servings")) || 1))}
                            </Badge>
                        </div>
                    </div>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        <Save className="mr-2 h-4 w-4" />
                        {form.formState.isSubmitting ? "Guardando..." : "Guardar Receta"}
                    </Button>
                </div>

                <Tabs defaultValue="general" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                        <TabsTrigger value="general">
                            <Info className="mr-2 h-4 w-4" />
                            General
                        </TabsTrigger>
                        <TabsTrigger value="ingredients">
                            <Plus className="mr-2 h-4 w-4" />
                            Ingredientes
                        </TabsTrigger>
                        <TabsTrigger value="steps">
                            <ListChecks className="mr-2 h-4 w-4" />
                            Pasos
                        </TabsTrigger>
                        <TabsTrigger value="extra">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Sherlock
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Información General</CardTitle>
                                <CardDescription>Datos básicos de la receta y categorización.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Nombre de la Receta</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Ej: Salsa Brava Casera" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Estado</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccione un estado" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="DRAFT">Borrador</SelectItem>
                                                        <SelectItem value="ACTIVE">Activo</SelectItem>
                                                        <SelectItem value="ARCHIVED">Archivado</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="categoryId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Categoría</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccione categoría" />
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
                                        name="familyId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Familia (Opcional)</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Seleccione familia" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {families.map((fam) => (
                                                            <SelectItem key={fam.id} value={fam.id}>
                                                                {fam.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descripción</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Breve descripción de la receta..."
                                                    className="resize-none"
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="prepTime"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Prep. (min)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="cookTime"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Cocción (min)</FormLabel>
                                                <FormControl>
                                                    <Input type="number" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="servings"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Raciones</FormLabel>
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

                    <TabsContent value="ingredients" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Ingredientes</CardTitle>
                                    <CardDescription>Añade los ingredientes y cantidades necesarias.</CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendIngredient({ ingredientId: "", quantity: 0, unitId: "", notes: "" })}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Añadir Ingrediente
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {ingredientFields.map((field, index) => (
                                    <div key={field.id} className="flex flex-col gap-4 p-4 border rounded-lg relative bg-muted/30">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute top-2 right-2 text-destructive"
                                            onClick={() => removeIngredient(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormField
                                                control={form.control}
                                                name={`ingredients.${index}.ingredientId`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Ingrediente</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Seleccionar..." />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {ingredients.map((ing) => (
                                                                    <SelectItem key={ing.id} value={ing.id}>
                                                                        {ing.name}
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
                                                name={`ingredients.${index}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Cantidad</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" step="any" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`ingredients.${index}.unitId`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Unidad</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Unidad..." />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {units.map((u) => (
                                                                    <SelectItem key={u.id} value={u.id}>
                                                                        {u.name} ({u.abbreviation})
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name={`ingredients.${index}.notes`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Notas/Preparación</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Ej: picado fino, en juliana..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="steps" className="space-y-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Pasos de Preparación</CardTitle>
                                    <CardDescription>Detalla los pasos para elaborar la receta.</CardDescription>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const currentSteps = form.getValues("steps") || []
                                        form.setValue("steps", [...currentSteps, { text: "" }])
                                    }}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Añadir Paso
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {(form.watch("steps") || []).map((step, index) => (
                                    <div key={index} className="flex gap-4 items-start">
                                        <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <FormField
                                                control={form.control}
                                                name={`steps.${index}.text`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Describa este paso..."
                                                                className="min-h-[80px]"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive mt-1"
                                            onClick={() => {
                                                const currentSteps = form.getValues("steps")
                                                const newSteps = [...currentSteps]
                                                newSteps.splice(index, 1)
                                                form.setValue("steps", newSteps)
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="extra" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Sherlock Audit & Protocolos</CardTitle>
                                <CardDescription>Información específica para auditorías y servicio en sala.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="protocoloDeSala"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Protocolo de Sala</FormLabel>
                                            <FormDescription>
                                                Instrucciones de emplatado, servicio, recomendaciones de maridaje o advertencias de alérgenos.
                                            </FormDescription>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Escriba el protocolo aquí..."
                                                    className="min-h-[200px]"
                                                    {...field}
                                                    value={field.value || ''}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-4">
                                    <ChefHat className="h-6 w-6 text-blue-500 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 italic">Chef GPT Integration</h4>
                                        <p className="text-sm text-blue-800 dark:text-blue-200">
                                            Esta sección pronto contará con sugerencias automáticas de la IA para optimizar costes y mejorar los protocolos de servicio.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </form>
        </Form>
    )
}
