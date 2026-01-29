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
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("priority")}:</span>
          {["all", "High", "Medium", "Low"].map((priority) => (
            <Button
              key={priority}
              variant={priorityFilter === priority ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setPriorityFilter(priority)}
              className="h-7"
            >
              {priority === "all" ? t("all") : getPriorityLabel(priority)}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-sm text-muted-foreground">{t("department")}:</span>
          <Button
            variant={departmentFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setDepartmentFilter("all")}
            className="h-7"
          >
            {t("all")}
          </Button>
          {departments.map((dept) => (
            <Button
              key={dept}
              variant={departmentFilter === dept ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setDepartmentFilter(dept)}
              className="h-7"
            >
              {dept}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("titleLabel")}</TableHead>
              <TableHead>{t("department")}</TableHead>
              <TableHead>{t("type")}</TableHead>
              <TableHead>{t("priority")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="w-[80px]">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {t("noProjectsMatch")}
                </TableCell>
              </TableRow>
            ) : (
              filteredProjects.map((project) => (
                <TableRow key={project.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium max-w-[300px] truncate">
                    {project.title}
                  </TableCell>
                  <TableCell>{project.department}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs", typeStyles[project.type as keyof typeof typeStyles])}>
                      {getTypeLabel(project.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs", priorityStyles[project.priority as keyof typeof priorityStyles])}
                    >
                      {getPriorityLabel(project.priority)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary"
                      className={cn("text-xs", statusStyles[project.status as keyof typeof statusStyles])}
                    >
                      {getStatusLabel(project.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedProject(project)}
                      className="h-8 w-8"
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

      {/* Project Detail Sheet */}
      <Sheet open={!!selectedProject} onOpenChange={() => setSelectedProject(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
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
        </SheetContent>
      </Sheet>
    </>
  )
}
