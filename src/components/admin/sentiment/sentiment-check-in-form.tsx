"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { teamMoodSchema, TeamMoodFormData } from "@/lib/validations/sentiment";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTeamMood, updateTeamMood } from "@/lib/actions/sentiment";
import { SentimentZoneSelector } from "./sentiment-zone-selector";
import { useTransition } from "react";
import { Loader2 } from "lucide-react";

interface SentimentCheckInFormProps {
  initialData?: TeamMoodFormData & { id: string };
  departments: string[];
}

export function SentimentCheckInForm({ initialData, departments }: SentimentCheckInFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<TeamMoodFormData>({
    resolver: zodResolver(teamMoodSchema) as any,
    defaultValues: {
      departmentName: initialData?.departmentName || "",
      sentimentScore: initialData?.sentimentScore || 50,
      dominantEmotion: initialData?.dominantEmotion || "",
      keyConcerns: initialData?.keyConcerns || "",
      detectedAt: initialData?.detectedAt ? new Date(initialData.detectedAt) : new Date(),
    },
  });

  function onSubmit(values: TeamMoodFormData) {
    startTransition(async () => {
      if (initialData?.id) {
        await updateTeamMood(initialData.id, values);
      } else {
        await createTeamMood(values);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 premium-card p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="departmentName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un departamento" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
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
            name="detectedAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Diagnóstico</FormLabel>
                <FormControl>
                  <Input 
                    type="date" 
                    value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                  />
                </FormControl>
                <FormDescription>
                  Puedes registrar evaluaciones pasadas para completar el histórico.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 border rounded-xl p-6 bg-muted/30">
        <FormField
            control={form.control}
            name="sentimentScore"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">Zona Emocional</FormLabel>
                <FormControl>
                  <SentimentZoneSelector 
                    value={field.value} 
                    onChange={field.onChange} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dominantEmotion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Emoción Dominante (Titular)</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Optimismo Cauto, Saturación Digital..." {...field} />
              </FormControl>
              <FormDescription>
                Una frase corta que defina el estado general.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="keyConcerns"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Causas / Preocupaciones (Detalle)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Detalla aquí los motivos, citas textuales o temas clave discutidos..." 
                  className="min-h-[120px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending} className="w-full md:w-auto">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Actualizar Evaluación" : "Registrar Evaluación"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
