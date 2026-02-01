"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pencil, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import { format } from "date-fns"
import { es, enUS } from "date-fns/locale"
import { useTranslations, useLocale } from "next-intl"
import { SentimentHistoryFilters } from "./sentiment-history-filters"
import { SentimentCheckInSheet } from "./sentiment-check-in-sheet"

interface TeamMood {
  id: string
  departmentName: string
  sentimentScore: number
  dominantEmotion: string
  keyConcerns?: string | null
  detectedAt: Date
}

interface SentimentHistoryTableProps {
  moods: TeamMood[]
  departments: string[]
}

interface FilterState {
  search: string
  department: string
  zone: string
}

const PAGE_SIZES = [10, 25, 50] as const

export function SentimentHistoryTable({ moods, departments }: SentimentHistoryTableProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    department: "all",
    zone: "all",
  })
  const [sortConfig, setSortConfig] = useState<{ key: keyof TeamMood | string; direction: 'asc' | 'desc' } | null>({ key: 'detectedAt', direction: 'desc' }) // Default sort by date desc
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [selectedMood, setSelectedMood] = useState<TeamMood | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Effect to check for new-checkin query param
  useEffect(() => {
    if (searchParams.get('new-checkin') === 'true') {
      handleCreateClick()
    }
  }, [searchParams])

  const handleCloseForm = () => {
    setIsFormOpen(false)
    // Remove query param if it exists
    if (searchParams.get('new-checkin')) {
        router.replace(pathname)
    }
  }
  
  const t = useTranslations("sentiment")
  const tProjects = useTranslations("projects")
  const locale = useLocale()

  const dateLocale = locale === "es" ? es : enUS

  const getZoneFromScore = (score: number): string => {
    if (score < 40) return "critical"
    if (score < 70) return "stable"
    return "healthy"
  }

  const getZoneColor = (score: number) => {
    if (score < 40) return "text-red-500 bg-red-500/10 border-red-500/20"
    if (score < 70) return "text-orange-500 bg-orange-500/10 border-orange-500/20"
    return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
  }

  // Reset page when filters change
  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    setCurrentPage(1)
  }

  const handleSort = (key: keyof TeamMood | string) => {
    setSortConfig(current => {
       if (current?.key === key) {
         return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
       }
       return { key, direction: 'asc' }
    })
  }

  const filteredMoods = useMemo(() => {
    let result = moods.filter((mood) => {
      // Search filter
      if (filters.search !== "") {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch =
          mood.departmentName.toLowerCase().includes(searchLower) ||
          mood.dominantEmotion.toLowerCase().includes(searchLower) ||
          (mood.keyConcerns?.toLowerCase().includes(searchLower) ?? false)
        if (!matchesSearch) return false
      }
      // Department filter
      if (filters.department !== "all" && mood.departmentName !== filters.department) return false
      // Zone filter
      if (filters.zone !== "all" && getZoneFromScore(mood.sentimentScore) !== filters.zone) return false
      return true
    })

    // Sorting
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const aValue = a[sortConfig.key as keyof TeamMood]
        const bValue = b[sortConfig.key as keyof TeamMood]

        // Handle date sorting explicitly if detectedAt is a Date object or string
        if (sortConfig.key === 'detectedAt') {
            const dA = new Date(a.detectedAt).getTime()
            const dB = new Date(b.detectedAt).getTime()
            return sortConfig.direction === 'asc' ? dA - dB : dB - dA
        }

        // Generic comparison
        const vA = aValue ?? ''
        const vB = bValue ?? ''
        
        if (vA < vB) return sortConfig.direction === 'asc' ? -1 : 1
        if (vA > vB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    
    return result
  }, [moods, filters, sortConfig])

  // Pagination
  const totalPages = Math.ceil(filteredMoods.length / pageSize)
  const paginatedMoods = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredMoods.slice(start, start + pageSize)
  }, [filteredMoods, currentPage, pageSize])

  const handlePageSizeChange = (newSize: string) => {
    setPageSize(Number(newSize))
    setCurrentPage(1)
  }

  const handleCreateClick = () => {
    setSelectedMood(null)
    setFormMode("create")
    setIsFormOpen(true)
  }

  const handleEditClick = (e: React.MouseEvent, mood: TeamMood) => {
    e.stopPropagation()
    setSelectedMood(mood)
    setFormMode("edit")
    setIsFormOpen(true)
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig?.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
    if (sortConfig.direction === 'asc') return <ArrowUp className="ml-2 h-4 w-4" />
    return <ArrowDown className="ml-2 h-4 w-4" />
  }

  return (
    <>
      {/* Filters */}
      <SentimentHistoryFilters
        departments={departments}
        onFiltersChange={handleFiltersChange}
        totalCount={moods.length}
        filteredCount={filteredMoods.length}
      />

      {/* Table */}
      <div className="premium-card rounded-xl border bg-card text-card-foreground shadow-sm mt-6">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead 
                  className="font-bold cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('detectedAt')}
                >
                  <div className="flex items-center">
                    {t("dateLabel")}
                    <SortIcon column="detectedAt" />
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('departmentName')}
                >
                  <div className="flex items-center">
                    {t("departmentLabel")}
                    <SortIcon column="departmentName" />
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('sentimentScore')}
                >
                  <div className="flex items-center">
                    {t("zoneLabel")}
                    <SortIcon column="sentimentScore" />
                  </div>
                </TableHead>
                <TableHead 
                  className="font-bold cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('dominantEmotion')}
                >
                  <div className="flex items-center">
                    {t("emotionLabel")}
                    <SortIcon column="dominantEmotion" />
                  </div>
                </TableHead>
                <TableHead className="text-right font-bold">{tProjects("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMoods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm">{t("noRecords")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMoods.map((mood) => (
                  <TableRow
                    key={mood.id}
                    className="group border-b transition-colors hover:bg-muted/30 border-border/40 cursor-pointer"
                    onClick={(e) => handleEditClick(e, mood)}
                  >
                    <TableCell className="p-4 align-middle font-medium">
                      {format(new Date(mood.detectedAt), "d MMM, yyyy", { locale: dateLocale })}
                    </TableCell>
                    <TableCell className="p-4 align-middle">{mood.departmentName}</TableCell>
                    <TableCell className="p-4 align-middle">
                      <Badge 
                        variant="outline" 
                        className={`text-xs font-semibold ${getZoneColor(mood.sentimentScore)}`}
                      >
                        {mood.sentimentScore}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4 align-middle">{mood.dominantEmotion}</TableCell>
                    <TableCell className="p-4 align-middle text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleEditClick(e, mood)}
                        >
                          <Pencil className="h-4 w-4" />
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
        {filteredMoods.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{tProjects("showing")}</span>
              <span className="font-medium text-foreground">
                {(currentPage - 1) * pageSize + 1}
              </span>
              <span>{tProjects("to")}</span>
              <span className="font-medium text-foreground">
                {Math.min(currentPage * pageSize, filteredMoods.length)}
              </span>
              <span>{tProjects("of")}</span>
              <span className="font-medium text-foreground">{filteredMoods.length}</span>
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
                <span className="text-sm text-muted-foreground">{tProjects("perPage")}</span>
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
                  {tProjects("page")} {currentPage} {tProjects("of")} {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Check-in Sheet Form */}
      <SentimentCheckInSheet
        mood={selectedMood}
        departments={departments}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        mode={formMode}
      />
    </>
  )
}
