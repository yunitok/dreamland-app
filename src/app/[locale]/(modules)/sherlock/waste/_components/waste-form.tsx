"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { wasteRecordSchema, WasteRecordFormValues } from "@/modules/sherlock/schemas"
import { createWasteRecord } from "@/modules/sherlock/actions/waste"
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
import { Textarea } from "@/modules/shared/ui/textarea"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { WasteReason } from "@prisma/client"

interface WasteFormProps {
    ingredients: any[]
}

const reasons = [
    { value: WasteReason.EXPIRED, label: "Caducado" },
    { value: WasteReason.BURNED, label: "Quemado" },
    { value: WasteReason.SPOILED, label: "Estropeado" },
    { value: WasteReason.QUALITY_ISSUE, label: "Problema de Calidad" },
    { value: WasteReason.OVERPRODUCTION, label: "Sobreproducción" },
    { value: WasteReason.YIELD_LOSS, label: "Pérdida de Rendimiento" },
    { value: WasteReason.OTHER, label: "Otro" },
]

export function WasteForm({ ingredients }: WasteFormProps) {
    const router = useRouter()
    const form = useForm<WasteRecordFormValues>({
        resolver: zodResolver(wasteRecordSchema) as any,
        defaultValues: {
            ingredientId: "",
            quantity: 0,
            reason: WasteReason.OTHER,
            notes: "",
        },
    })

    const onSubmit = async (data: WasteRecordFormValues) => {
        try {
            await createWasteRecord(data)
            toast.success("Merma registrada")
            router.push("/sherlock/waste")
            router.refresh()
        } catch (error) {
            toast.error("Error al registrar merma")
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                <FormField
                    control={form.control}
                    name="ingredientId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ingrediente</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un ingrediente" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {ingredients.map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.name} ({item.unitType.abbreviation})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Cantidad a Merma</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="reason"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Motivo</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona el motivo" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {reasons.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>
                                                {r.label}
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
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notas / Observaciones</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Detalla la causa de la merma..."
                                    className="min-h-[100px]"
                                    {...field}
                                    value={field.value || ""}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-4">
                    <Button variant="outline" type="button" onClick={() => router.back()}>
                        Cancelar
                    </Button>
                    <Button type="submit">Registrar Merma</Button>
                </div>
            </form>
        </Form>
    )
}
