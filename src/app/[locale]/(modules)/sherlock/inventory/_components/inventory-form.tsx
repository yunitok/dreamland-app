"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { InventoryStatus, Ingredient } from "@prisma/client"

import { Button } from "@/modules/shared/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/modules/shared/ui/form"
import { Input } from "@/modules/shared/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/modules/shared/ui/select"
import { inventoryRecordSchema, InventoryRecordFormValues } from "@/modules/sherlock/schemas"
import { createInventoryRecord, updateInventoryRecord } from "@/modules/sherlock/actions/inventory"

interface InventoryFormProps {
    initialData?: any // InventoryRecord with ingredient
    ingredients: (Ingredient & { unitType: { abbreviation: string } })[]
}

export function InventoryForm({ initialData, ingredients }: InventoryFormProps) {
    const router = useRouter()

    const form = useForm<InventoryRecordFormValues>({
        resolver: zodResolver(inventoryRecordSchema) as any,
        defaultValues: (initialData ? {
            ingredientId: initialData.ingredientId,
            quantity: initialData.quantity,
            location: initialData.location || "",
            expiryDate: initialData.expiryDate ? new Date(initialData.expiryDate).toISOString().split('T')[0] : "",
            productionDate: initialData.productionDate ? new Date(initialData.productionDate).toISOString().split('T')[0] : "",
            freezeDate: initialData.freezeDate ? new Date(initialData.freezeDate).toISOString().split('T')[0] : "",
            openDate: initialData.openDate ? new Date(initialData.openDate).toISOString().split('T')[0] : "",
            lotNumber: initialData.lotNumber || "",
            batchNumber: initialData.batchNumber || "",
            status: initialData.status,
        } : {
            ingredientId: "",
            quantity: 0,
            location: "",
            expiryDate: "",
            productionDate: "",
            freezeDate: "",
            openDate: "",
            lotNumber: "",
            batchNumber: "",
            status: InventoryStatus.AVAILABLE,
        }) as any,
    })

    async function onSubmit(data: InventoryRecordFormValues) {
        try {
            if (initialData) {
                await updateInventoryRecord(initialData.id, data)
                toast.success("Registro actualizado")
            } else {
                await createInventoryRecord(data)
                toast.success("Registro creado")
            }
            router.push("/sherlock/inventory")
            router.refresh()
        } catch (error) {
            toast.error("Error al guardar el registro")
            console.error(error)
        }
    }

    const formatToInputDate = (value: any) => {
        if (!value) return ""
        if (value instanceof Date) return value.toISOString().split('T')[0]
        if (typeof value === 'string' && value.includes('T')) return value.split('T')[0]
        return value
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="ingredientId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ingrediente</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    disabled={!!initialData}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un ingrediente" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {ingredients.map((ing) => (
                                            <SelectItem key={ing.id} value={ing.id}>
                                                {ing.name} ({ing.unitType.abbreviation})
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
                        name="quantity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cantidad</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.001" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ubicación</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ej. Almacén Central, Cámara 1..." {...field} value={field.value || ""} />
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
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un estado" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value={InventoryStatus.AVAILABLE}>Disponible</SelectItem>
                                        <SelectItem value={InventoryStatus.RESERVED}>Reservado</SelectItem>
                                        <SelectItem value={InventoryStatus.EXPIRED}>Caducado</SelectItem>
                                        <SelectItem value={InventoryStatus.QUARANTINE}>En Cuarentena</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg">
                    <div className="col-span-full font-semibold text-sm border-b pb-2">Trazabilidad</div>

                    <FormField
                        control={form.control}
                        name="lotNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nº Lote</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="batchNumber"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nº Partida</FormLabel>
                                <FormControl>
                                    <Input {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="productionDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fecha Producción</FormLabel>
                                <FormControl>
                                    <Input
                                        type="date"
                                        {...field}
                                        value={formatToInputDate(field.value)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="expiryDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fecha Caducidad</FormLabel>
                                <FormControl>
                                    <Input
                                        type="date"
                                        {...field}
                                        value={formatToInputDate(field.value)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="freezeDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fecha Congelación</FormLabel>
                                <FormControl>
                                    <Input
                                        type="date"
                                        {...field}
                                        value={formatToInputDate(field.value)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="openDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fecha Apertura</FormLabel>
                                <FormControl>
                                    <Input
                                        type="date"
                                        {...field}
                                        value={formatToInputDate(field.value)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>
                        Cancelar
                    </Button>
                    <Button type="submit">
                        {initialData ? "Guardar Cambios" : "Crear Registro"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}
