"use client"

import { ColumnDef, Row } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import { User, Role } from "@prisma/client"
import { DataTable } from "@/modules/shared/ui/data-table"
import { ActionCell } from "./action-cell"
import { useTranslations } from "next-intl"
import { useState, useMemo } from "react"
import { Input } from "@/modules/shared/ui/input"
import { Search, SlidersHorizontal, X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"

type UserWithRole = User & {
  role: Role | null
}

interface ColumnHeaderProps {
  label: string
  column?: any
  sortable?: boolean
}

const ColumnHeader = ({ label, column, sortable }: ColumnHeaderProps) => {
  if (!sortable) {
    return <div className="font-medium">{label}</div>
  }

  return (
    <Button
      variant="ghost"
      onClick={() => column?.toggleSorting(column?.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  )
}

export function UsersTable({ data, roles }: { data: UserWithRole[], roles: Role[] }) {
  const t = useTranslations("admin")
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")

  const filteredData = useMemo(() => {
    return data.filter((user) => {
      // Search filter
      const searchLower = search.toLowerCase()
      const matchesSearch = 
        user.name?.toLowerCase().includes(searchLower) || 
        user.email?.toLowerCase().includes(searchLower) ||
        user.username?.toLowerCase().includes(searchLower)

      if (search && !matchesSearch) return false

      // Role filter
      if (roleFilter !== "all") {
        if (roleFilter === "no_role") {
            if (user.roleId) return false
        } else if (user.roleId !== roleFilter) {
            return false
        }
      }

      return true
    })
  }, [data, search, roleFilter])

  const clearFilters = () => {
    setSearch("")
    setRoleFilter("all")
  }

  const hasActiveFilters = search !== "" || roleFilter !== "all"

  const columns: ColumnDef<UserWithRole>[] = [
    {
      accessorKey: "image",
      header: "",
      cell: ({ row }: { row: Row<UserWithRole> }) => {
        const image = row.getValue("image") as string
        return image ? (
          <img src={image} alt={row.getValue("name")} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
            {(row.getValue("name") as string)?.charAt(0).toUpperCase()}
          </div>
        )
      }
    },
    {
      accessorKey: "name",
      header: ({ column }: { column: any }) => {
        return (
          <ColumnHeader
            label={t("columnName")}
            column={column}
            sortable={true}
          />
        )
      },
    },
    {
      accessorKey: "email",
      header: t("columnEmail"),
    },
    {
      accessorKey: "role.name",
      header: t("columnRole"),
      id: "role",
      cell: ({ row }: { row: Row<UserWithRole> }) => {
        const role = row.original.role
        return <div className="font-medium">{role?.name || "-"}</div>
      }
    },
    {
      accessorKey: "createdAt",
      header: t("columnCreated"),
      cell: ({ row }: { row: Row<UserWithRole> }) => {
        return new Date(row.getValue("createdAt")).toLocaleDateString()
      },
    },
    {
      id: "actions",
      cell: ({ row }: { row: Row<UserWithRole> }) => <ActionCell user={row.original} />,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
                <SlidersHorizontal className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-semibold">{t("filters")}</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {filteredData.length} {t("of")} {data.length}
            </span>
        </div>
        <div className="flex items-center gap-2">
            {hasActiveFilters && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                    <X className="h-3 w-3 mr-1" />
                    {t("clearFilters")}
                </Button>
            )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-3">
        <div className="col-span-2 md:w-auto md:min-w-[250px] flex-grow-0">
            <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <Input
                    placeholder={t("searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 bg-background/50 border-muted-foreground/20 focus:border-primary transition-colors"
                />
            </div>
        </div>
        <div className="col-span-2 md:col-span-1 flex flex-wrap items-center gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="h-10 w-full md:w-[180px] bg-background/50 text-sm">
                    <SelectValue placeholder={t("allRoles")} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t("allRoles")}</SelectItem>
                    {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                    <SelectItem value="no_role">{t("noRole")}</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
      <DataTable data={filteredData} columns={columns} />
    </div>
  )
}
