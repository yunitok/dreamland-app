"use client"

import { useMemo } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "@/i18n/navigation"
import { toast } from "sonner"
import { Plus, Trash2, ChefHat, Save, Clock, Flame, Users } from "lucide-react"
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
import { Badge } from "@/modules/shared/ui/badge"
import { recipeSchema, RecipeFormValues } from "@/modules/gastrolab/schemas"
import { createRecipe, updateRecipe } from "@/modules/gastrolab/actions/recipes"
import { MeasureUnit, RecipeCategory, RecipeFamily } from "@prisma/client"
import type { IngredientSelectOption } from "@/modules/gastrolab/actions/ingredients"
import { IngredientCombobox } from "./ingredient-combobox"

interface RecipeFormProps {
    initialData?: any
    categories: RecipeCategory[]
    families: RecipeFamily[]
    ingredients: IngredientSelectOption[]
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

    const ingredientCostMap = useMemo(
        () => new Map(ingredients.map((i) => [i.id, { cost: i.cost, yield: i.yield }])),
        [ingredients]
    )

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

    const watchedIngredients = form.watch("ingredients")
    const theoreticalCost = useMemo(() => {
        return watchedIngredients.reduce((total, item) => {
            const data = ingredientCostMap.get(item.ingredientId)
            if (!data || !item.quantity) return total
            const yieldFactor = (data.yield || 100) / 100
            const cost = item.quantity * (data.cost / (yieldFactor || 1))
            return total + cost
        }, 0)
    }, [watchedIngredients, ingredientCostMap])

    const { fields: ingredientFields, append: appendIngredient, remove: removeIngredient } = useFieldArray({
        control: form.control,
        name: "ingredients",
    })

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value)

    async function onSubmit(data: RecipeFormValues) {
        try {
            if (mode === "create") {
                await createRecipe(data)
                toast.success("Receta creada correctamente")
            } else {
                await updateRecipe(initialData.id, data)
                toast.success("Receta actualizada correctamente")
            }
            router.push("/gastrolab/recipes")
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar la receta")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* ─── Header enriquecido ─── */}
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold tracking-tight">
                                {mode === "create" ? "Nueva Receta" : initialData.name}
                            </h2>
                            <Badge variant="outline" className="text-xs font-medium">
                                {formatCurrency(theoreticalCost)}
                            </Badge>
                            <Badge variant="outline" className="text-xs font-medium">
                                {formatCurrency(theoreticalCost / (Number(form.watch("servings")) || 1))}/rac
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                Prep: {form.watch("prepTime") || 0} min
                            </span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="flex items-center gap-1">
                                <Flame className="h-3.5 w-3.5" />
                                Cocción: {form.watch("cookTime") || 0} min
                            </span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {form.watch("servings") || 1} {Number(form.watch("servings")) === 1 ? "ración" : "raciones"}
                            </span>
                        </div>
                    </div>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        <Save className="mr-2 h-4 w-4" />
                        {form.formState.isSubmitting ? "Guardando..." : "Guardar"}
                    </Button>
                </div>

                {/* ─── Layout 2 columnas ─── */}
                <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-5">

                    {/* ─── Columna izquierda: 3 cards ─── */}
                    <div className="space-y-5">

                        {/* Card 1: Información General */}
                        <div className="rounded-xl border p-5 space-y-4">
                            <h3 className="text-lg font-semibold">Información General</h3>

                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nombre</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Ej: Salsa Brava Casera" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Estado" />
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
                                <FormField
                                    control={form.control}
                                    name="categoryId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Categoría</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Categoría" />
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
                            </div>

                            <FormField
                                control={form.control}
                                name="familyId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Familia</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sin familia" />
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

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Descripción</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Breve descripción de la receta..."
                                                className="resize-none min-h-20"
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Card 2: Tiempos y Raciones */}
                        <div className="rounded-xl border p-5 space-y-4">
                            <h3 className="text-lg font-semibold">Tiempos y Raciones</h3>

                            <div className="grid grid-cols-3 gap-3">
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
                        </div>

                        {/* Card 3: Chef GPT */}
                        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-5 flex gap-3">
                            <ChefHat className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Chef GPT</h4>
                                <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed mt-1">
                                    Sugerencias automáticas de IA para optimizar costes y mejorar los protocolos de servicio — próximamente.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ─── Columna derecha: Ingredientes + Elaboración + Protocolo ─── */}
                    <div className="space-y-5">

                        {/* Card: Ingredientes */}
                        <div className="rounded-xl border p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Ingredientes</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendIngredient({ ingredientId: "", quantity: 0, unitId: "", notes: "" })}
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Añadir
                                </Button>
                            </div>

                            {/* Header de columnas (desktop) */}
                            <div className="hidden sm:grid grid-cols-[1fr_80px_100px_1fr_32px] gap-2 px-1 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                <span>Ingrediente</span>
                                <span>Cant.</span>
                                <span>Unidad</span>
                                <span>Notas</span>
                                <span />
                            </div>

                            <div className="divide-y">
                                {ingredientFields.map((field, index) => (
                                    <div
                                        key={field.id}
                                        className="grid grid-cols-1 sm:grid-cols-[1fr_80px_100px_1fr_32px] gap-2 py-2.5 items-start"
                                    >
                                        <FormField
                                            control={form.control}
                                            name={`ingredients.${index}.ingredientId`}
                                            render={({ field }) => (
                                                <FormItem className="space-y-0">
                                                    <span className="sm:hidden text-xs font-medium text-muted-foreground">Ingrediente</span>
                                                    <FormControl>
                                                        <IngredientCombobox
                                                            ingredients={ingredients}
                                                            value={field.value}
                                                            onChange={field.onChange}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`ingredients.${index}.quantity`}
                                            render={({ field }) => (
                                                <FormItem className="space-y-0">
                                                    <span className="sm:hidden text-xs font-medium text-muted-foreground">Cantidad</span>
                                                    <FormControl>
                                                        <Input type="number" step="any" className="h-9" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`ingredients.${index}.unitId`}
                                            render={({ field }) => (
                                                <FormItem className="space-y-0">
                                                    <span className="sm:hidden text-xs font-medium text-muted-foreground">Unidad</span>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-9">
                                                                <SelectValue placeholder="Ud..." />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {units.map((u) => (
                                                                <SelectItem key={u.id} value={u.id}>
                                                                    {u.abbreviation}
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
                                            name={`ingredients.${index}.notes`}
                                            render={({ field }) => (
                                                <FormItem className="space-y-0">
                                                    <span className="sm:hidden text-xs font-medium text-muted-foreground">Notas</span>
                                                    <FormControl>
                                                        <Input placeholder="en juliana..." className="h-9" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-destructive shrink-0"
                                            onClick={() => removeIngredient(index)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-3 mt-2 border-t text-sm text-muted-foreground">
                                <span>{ingredientFields.length} ingrediente{ingredientFields.length !== 1 ? "s" : ""}</span>
                                <span className="font-semibold text-foreground">
                                    Coste: {formatCurrency(theoreticalCost)}
                                </span>
                            </div>
                        </div>

                        {/* Card: Elaboración */}
                        <div className="rounded-xl border p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Elaboración</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const currentSteps = form.getValues("steps") || []
                                        form.setValue("steps", [...currentSteps, { text: "" }])
                                    }}
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Añadir Paso
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {(form.watch("steps") || []).map((_step, index) => (
                                    <div key={index} className="flex gap-3 items-start">
                                        <div className="bg-primary text-primary-foreground w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold mt-1">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <FormField
                                                control={form.control}
                                                name={`steps.${index}.text`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Describa este paso..."
                                                                className="min-h-15"
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
                                            className="h-7 w-7 text-destructive mt-1"
                                            onClick={() => {
                                                const currentSteps = form.getValues("steps")
                                                const newSteps = [...currentSteps]
                                                newSteps.splice(index, 1)
                                                form.setValue("steps", newSteps)
                                            }}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Card: Protocolo de Sala */}
                        <div className="rounded-xl border p-5">
                            <FormField
                                control={form.control}
                                name="protocoloDeSala"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-lg font-semibold">Protocolo de Sala</FormLabel>
                                        <FormDescription className="text-xs">
                                            Emplatado, servicio, maridaje o advertencias de alérgenos.
                                        </FormDescription>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Instrucciones de sala..."
                                                className="min-h-24"
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </div>
            </form>
        </Form>
    )
}
