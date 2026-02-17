"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ProjectRole } from "@prisma/client"
import { Button } from "@/modules/shared/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/shared/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/modules/shared/ui/command"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/shared/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/shared/ui/table"
import { Plus, Trash2, Shield, Check, ChevronsUpDown, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { assignUserToProject, removeUserFromProject } from "@/modules/admin/actions/project-members"

interface ProjectInfo {
  id: string
  title: string
  department: string
  status: string
}

interface Membership {
  id: string
  role: ProjectRole
  project: ProjectInfo
}

interface ProjectAccessPanelProps {
  userId: string
  currentMemberships: Membership[]
  allProjects: ProjectInfo[]
}

export function ProjectAccessPanel({
  userId,
  currentMemberships,
  allProjects,
}: ProjectAccessPanelProps) {
  const t = useTranslations("admin")
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [addingProject, setAddingProject] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [selectedRole, setSelectedRole] = useState<ProjectRole>("VIEWER")
  const [openProjectCombobox, setOpenProjectCombobox] = useState(false)

  const roleDescriptions: Record<ProjectRole, string> = {
    OWNER: t("roleDescOwner"),
    MANAGER: t("roleDescManager"),
    EDITOR: t("roleDescEditor"),
    VIEWER: t("roleDescViewer"),
  }

  // Proyectos disponibles (no asignados aún)
  const assignedIds = new Set(currentMemberships.map(m => m.project.id))
  const availableProjects = allProjects.filter(p => !assignedIds.has(p.id))

  const handleAssign = async () => {
    if (!selectedProjectId) return
    setLoading("assign")

    const result = await assignUserToProject(userId, selectedProjectId, selectedRole)
    if (result.success) {
      toast.success(t("projectAssigned"))
      setAddingProject(false)
      setSelectedProjectId("")
      setSelectedRole("VIEWER")
      router.refresh()
    } else {
      toast.error(result.error || t("projectAssignFailed"))
    }

    setLoading(null)
  }

  const handleRemove = async (projectId: string) => {
    setLoading(projectId)

    const result = await removeUserFromProject(userId, projectId)
    if (result.success) {
      toast.success(t("projectRemoved"))
      router.refresh()
    } else {
      toast.error(result.error || t("projectRemoveFailed"))
    }

    setLoading(null)
  }

  const handleRoleChange = async (projectId: string, newRole: ProjectRole) => {
    setLoading(projectId)

    const result = await assignUserToProject(userId, projectId, newRole)
    if (result.success) {
      toast.success(t("roleUpdated"))
      router.refresh()
    } else {
      toast.error(result.error || t("roleUpdateFailed"))
    }

    setLoading(null)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("projectAccess")}</CardTitle>
          <Badge variant="secondary">{currentMemberships.length}</Badge>
        </div>
        {!addingProject && availableProjects.length > 0 && (
          <Button size="sm" onClick={() => setAddingProject(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("addProject")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulario para añadir proyecto */}
        {addingProject && (
          <div className="grid grid-cols-[1fr_auto] items-end gap-3 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("project")}</label>
              <Popover open={openProjectCombobox} onOpenChange={setOpenProjectCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openProjectCombobox}
                    className="w-full justify-between font-normal"
                  >
                    {selectedProjectId
                      ? (() => {
                          const p = availableProjects.find(p => p.id === selectedProjectId)
                          return p ? `${p.title} (${p.department})` : t("selectProject")
                        })()
                      : t("selectProject")}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-87.5 p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("searchProject")} />
                    <CommandList>
                      <CommandEmpty>{t("noProjectsFound")}</CommandEmpty>
                      <CommandGroup>
                        {availableProjects.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.title} ${p.department}`}
                            onSelect={() => {
                              setSelectedProjectId(p.id === selectedProjectId ? "" : p.id)
                              setOpenProjectCombobox(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedProjectId === p.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <span className="truncate">{p.title}</span>
                            <span className="ml-auto text-xs text-muted-foreground">{p.department}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium flex items-center gap-1">
                  {t("role")}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-70 text-xs space-y-1.5 p-3">
                        <p><strong>Owner:</strong> {roleDescriptions.OWNER}</p>
                        <p><strong>Manager:</strong> {roleDescriptions.MANAGER}</p>
                        <p><strong>Editor:</strong> {roleDescriptions.EDITOR}</p>
                        <p><strong>Viewer:</strong> {roleDescriptions.VIEWER}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as ProjectRole)}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">Owner</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="EDITOR">Editor</SelectItem>
                    <SelectItem value="VIEWER">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAssign}
                disabled={!selectedProjectId || loading === "assign"}
                size="sm"
              >
                {t("assign")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddingProject(false)}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}

        {/* Tabla de membresías actuales */}
        {currentMemberships.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("project")}</TableHead>
                <TableHead>{t("department")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentMemberships.map((membership) => (
                <TableRow key={membership.id}>
                  <TableCell className="font-medium">
                    {membership.project.title}
                  </TableCell>
                  <TableCell>{membership.project.department}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{membership.project.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={membership.role}
                      onValueChange={(v) => handleRoleChange(membership.project.id, v as ProjectRole)}
                      disabled={loading === membership.project.id}
                    >
                      <SelectTrigger className="w-[130px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">Owner</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="EDITOR">Editor</SelectItem>
                        <SelectItem value="VIEWER">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(membership.project.id)}
                      disabled={loading === membership.project.id}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{t("noProjectAccess")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
