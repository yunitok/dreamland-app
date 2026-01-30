"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { Project } from "@/generated/prisma/client"
import { Eye, Quote, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"
import { ProjectFilters } from "./project-filters"
import { ProjectEditForm } from "./project-edit-form"

interface ProjectsTableProps {
  projects: Project[]
  departments: string[]
}

interface FilterState {
  search: string
  department: string
  priority: string
  type: string
  status: string
}

const PAGE_SIZES = [10, 25, 50] as const

const priorityStyles = {
  High: "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20",
  Medium: "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20",
  Low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20",
}

const statusStyles = {
  Active: "bg-blue-500/10 text-blue-500",
  Pending: "bg-muted text-muted-foreground",
  Done: "bg-emerald-500/10 text-emerald-500",
}

const typeStyles = {
  Problem: "bg-red-500/5 text-red-400",
  Idea: "bg-violet-500/5 text-violet-400",
}

export function ProjectsTable({ projects, departments }: ProjectsTableProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    department: "all",
    priority: "all",
    type: "all",
    status: "all",
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(25)
  const t = useTranslations("projects")
  const locale = useLocale()

  // Reset page when filters change
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Search filter
      if (filters.search !== "") {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch = 
          project.title.toLowerCase().includes(searchLower) ||
          project.description.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }
      // Other filters
      if (filters.priority !== "all" && project.priority !== filters.priority) return false
      if (filters.department !== "all" && project.department !== filters.department) return false
      if (filters.type !== "all" && project.type !== filters.type) return false
      if (filters.status !== "all" && project.status !== filters.status) return false
      return true
    })
  }, [projects, filters])

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / pageSize)
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredProjects.slice(start, start + pageSize)
  }, [filteredProjects, currentPage, pageSize])

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize))
    setCurrentPage(1)
  }

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      High: t("high"),
      Medium: t("medium"),
      Low: t("low"),
    }
    return labels[priority] || priority
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      Active: t("active"),
      Pending: t("pending"),
      Done: t("done"),
    }
    return labels[status] || status
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      Problem: t("problem"),
      Idea: t("idea"),
    }
    return labels[type] || type
  }

  const handleEditClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    setEditingProject(project)
    setFormMode("edit")
    setIsFormOpen(true)
  }

  const handleCreateClick = () => {
    setEditingProject(null)
    setFormMode("create")
    setIsFormOpen(true)
  }

  return (
    <>
      {/* Filters */}
      <ProjectFilters
        departments={departments}
        onFiltersChange={handleFiltersChange}
        onCreateClick={handleCreateClick}
        totalCount={projects.length}
        filteredCount={filteredProjects.length}
      />

      {/* Table */}
      <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden premium-card mt-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="font-bold">{t("titleLabel")}</TableHead>
                <TableHead className="hidden md:table-cell font-bold">{t("department")}</TableHead>
                <TableHead className="hidden sm:table-cell font-bold">{t("type")}</TableHead>
                <TableHead className="hidden xs:table-cell font-bold">{t("priority")}</TableHead>
                <TableHead className="font-bold">{t("status")}</TableHead>
                <TableHead className="w-[80px] text-right font-bold">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {paginatedProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm">{t("noProjectsMatch")}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedProjects.map((project) => (
                <TableRow 
                  key={project.id} 
                  className="group cursor-pointer hover:bg-muted/30 border-border/40"
                  onClick={() => setSelectedProject(project)}
                >
                  <TableCell className="font-semibold py-4">
                    <div className="flex flex-col gap-1">
                      <span className="truncate max-w-[180px] xs:max-w-[250px] md:max-w-[400px]">
                        {project.title}
                      </span>
                      <div className="flex md:hidden items-center gap-2 text-[10px] text-muted-foreground font-normal">
                        <span>{project.department}</span>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span>{getTypeLabel(project.type)}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {project.department}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="outline" className={cn("text-[10px] px-2 py-0 h-5 font-bold uppercase tracking-tighter", typeStyles[project.type as keyof typeof typeStyles])}>
                      {getTypeLabel(project.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden xs:table-cell">
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px] px-2 py-0 h-5 font-bold uppercase tracking-tighter", priorityStyles[project.priority as keyof typeof priorityStyles])}
                    >
                      {getPriorityLabel(project.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary"
                      className={cn("text-[10px] px-2 py-0 h-5 font-bold uppercase tracking-tighter", statusStyles[project.status as keyof typeof statusStyles])}
                    >
                      {getStatusLabel(project.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        onClick={(e) => handleEditClick(e, project)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filteredProjects.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("showing")}</span>
            <span className="font-medium text-foreground">
              {(currentPage - 1) * pageSize + 1}
            </span>
            <span>{t("to")}</span>
            <span className="font-medium text-foreground">
              {Math.min(currentPage * pageSize, filteredProjects.length)}
            </span>
            <span>{t("of")}</span>
            <span className="font-medium text-foreground">{filteredProjects.length}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{t("perPage")}</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">
                {t("page")} {currentPage} {t("of")} {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Project Detail Sheet */}
    <Sheet open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <SheetContent className="w-full sm:max-w-xl p-0 overflow-y-auto">
          <div className="p-6">
          {selectedProject && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", priorityStyles[selectedProject.priority as keyof typeof priorityStyles])}
                  >
                    {getPriorityLabel(selectedProject.priority)}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs", typeStyles[selectedProject.type as keyof typeof typeStyles])}
                  >
                    {getTypeLabel(selectedProject.type)}
                  </Badge>
                </div>
                <SheetTitle className="text-xl mt-2">{selectedProject.title}</SheetTitle>
                <SheetDescription>
                  {selectedProject.department} • {getStatusLabel(selectedProject.status)}
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">{t("description")}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedProject.description}
                  </p>
                </div>

                {selectedProject.sourceQuote && (
                  <div className="border-l-2 border-primary/50 pl-4 py-2 bg-muted/30 rounded-r-lg">
                    <div className="flex items-start gap-2">
                      <Quote className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-sm italic text-muted-foreground">
                        {selectedProject.sourceQuote}
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {t("created")}: {new Date(selectedProject.createdAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setEditingProject(selectedProject)
                      setFormMode("edit")
                      setIsFormOpen(true)
                      setSelectedProject(null)
                    }}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    {t("editProject")}
                  </Button>
                </div>
              </div>
            </>
          )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Form */}
      <ProjectEditForm
        project={editingProject}
        departments={departments}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        mode={formMode}
      />
    </>
  )
}
