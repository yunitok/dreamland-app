"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { createRole, updateRole } from "@/lib/actions/roles"
import { Plus, Pencil } from "lucide-react"
import { useRouter } from "next/navigation"

interface RoleDialogProps {
  role?: any
}

const RESOURCES = ["projects", "users", "roles", "departments", "sentiment", "admin"]
const ACTIONS = ["view", "create", "edit", "delete", "manage"]

export function RoleDialog({ role }: RoleDialogProps) {
  const t = useTranslations("admin")
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    name: role?.name || "",
    description: role?.description || "",
    permissions: role?.permissions?.map((p: any) => `${p.action}:${p.resource}`) || []
  })

  useEffect(() => {
    if (open && role) {
        setFormData({
            name: role.name,
            description: role.description || "",
            permissions: role.permissions.map((p: any) => `${p.action}:${p.resource}`)
        })
    } else if (open && !role) {
        setFormData({ name: "", description: "", permissions: [] })
    }
  }, [open, role])

  const togglePermission = (action: string, resource: string) => {
    const key = `${action}:${resource}`
    setFormData(prev => {
        const newPermissions = prev.permissions.includes(key)
            ? prev.permissions.filter((p: string) => p !== key)
            : [...prev.permissions, key]
        return { ...prev, permissions: newPermissions }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = role
        ? await updateRole(role.id, formData)
        : await createRole(formData)

      if (result.success) {
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error || "An error occurred")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {role ? (
          <Button variant="ghost" size="icon" disabled={role.isSystem}>
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t("addRole")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? t("editRole") : t("addRole")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
                <Label htmlFor="name">{t("roleName")}</Label>
                <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={role?.isSystem}
                />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="description">{t("descriptionLabel")}</Label>
                <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={role?.isSystem}
                />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
                <Label>{t("permissions.title")}</Label>
            </div>
            
            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr className="border-b">
                            <th className="h-10 px-4 text-left font-medium text-muted-foreground w-[150px]">
                                {t("permissions.resource")}
                            </th>
                            <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                                {t("permissions.accessLevel")}
                            </th>
                            <th className="h-10 px-4 text-right font-medium text-muted-foreground w-[100px]">
                                {t("actions")}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {RESOURCES.map(resource => {
                            const resourcePermissions = ACTIONS.map(a => `${a}:${resource}`)
                            const activePermissions = resourcePermissions.filter(p => formData.permissions.includes(p))
                            const isAllSelected = activePermissions.length === ACTIONS.length

                            const toggleAll = () => {
                                if (isAllSelected) {
                                    setFormData(prev => ({
                                        ...prev,
                                        permissions: prev.permissions.filter((p: string) => !resourcePermissions.includes(p))
                                    }))
                                } else {
                                    setFormData(prev => ({
                                        ...prev,
                                        permissions: [...new Set([...prev.permissions, ...resourcePermissions])]
                                    }))
                                }
                            }

                            return (
                                <tr key={resource} className="group hover:bg-muted/30 transition-colors">
                                    <td className="p-4 font-medium">
                                        <div className="flex items-center gap-2">
                                            {t(`permissions.resources.${resource}` as any)}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-2">
                                            {ACTIONS.map(action => (
                                                <div 
                                                    key={`${action}:${resource}`} 
                                                    className={`
                                                        flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium cursor-pointer transition-all
                                                        ${formData.permissions.includes(`${action}:${resource}`) 
                                                            ? 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/15' 
                                                            : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'}
                                                    `}
                                                    onClick={() => !role?.isSystem && togglePermission(action, resource)}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${formData.permissions.includes(`${action}:${resource}`) ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                                                    {t(`permissions.actions.${action}` as any)}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button 
                                            type="button" 
                                            variant="ghost" 
                                            size="sm" 
                                            className="h-8 text-xs hover:bg-primary/5 hover:text-primary"
                                            onClick={toggleAll}
                                            disabled={role?.isSystem}
                                        >
                                            {isAllSelected ? t("unselectAll") : t("selectAll")}
                                        </Button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          
          <DialogFooter>
            <Button type="submit" disabled={loading || role?.isSystem}>
              {loading ? "Saving..." : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
