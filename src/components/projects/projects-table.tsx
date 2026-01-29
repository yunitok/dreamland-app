"use client"

import { useState } from "react"
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
import { cn } from "@/lib/utils"
import type { Project } from "@/generated/prisma/client"
import { Eye, Quote } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"

interface ProjectsTableProps {
  projects: Project[]
  departments: string[]
}

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
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const t = useTranslations("projects")
  const locale = useLocale()

  const filteredProjects = projects.filter((project) => {
    if (priorityFilter !== "all" && project.priority !== priorityFilter) return false
    if (departmentFilter !== "all" && project.department !== departmentFilter) return false
    return true
  })

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

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">{t("priority")}:</span>
          <div className="flex flex-wrap gap-1">
            {["all", "High", "Medium", "Low"].map((priority) => (
              <Button
                key={priority}
                variant={priorityFilter === priority ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setPriorityFilter(priority)}
                className="h-8 text-xs px-3"
              >
                {priority === "all" ? t("all") : getPriorityLabel(priority)}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">{t("department")}:</span>
          <div className="flex flex-wrap gap-1">
            <Button
              variant={departmentFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDepartmentFilter("all")}
              className="h-8 text-xs px-3"
            >
              {t("all")}
            </Button>
            {departments.map((dept) => (
              <Button
                key={dept}
                variant={departmentFilter === dept ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setDepartmentFilter(dept)}
                className="h-8 text-xs px-3"
              >
                {dept}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden premium-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="font-bold">{t("titleLabel")}</TableHead>
                <TableHead className="hidden md:table-cell font-bold">{t("department")}</TableHead>
                <TableHead className="hidden sm:table-cell font-bold">{t("type")}</TableHead>
                <TableHead className="hidden xs:table-cell font-bold">{t("priority")}</TableHead>
                <TableHead className="font-bold">{t("status")}</TableHead>
                <TableHead className="w-[60px] text-right font-bold">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm">{t("noProjectsMatch")}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
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
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
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

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    {t("created")}: {new Date(selectedProject.createdAt).toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </>
          )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
