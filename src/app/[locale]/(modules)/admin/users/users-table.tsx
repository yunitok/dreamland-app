"use client"

import { ColumnDef, Row } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import { User, Role } from "@prisma/client"
import { DataTable } from "@/modules/shared/ui/data-table"
import { ActionCell } from "./action-cell"
import { useTranslations } from "next-intl"
import { useState, useMemo } from "react"
import { Filter } from "@/modules/shared/ui/filter-toolbar"
import { Link } from "@/i18n/navigation"
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
      cell: ({ row }: { row: Row<UserWithRole> }) => {
        return (
          <Link href={`/admin/users/${row.original.id}`} className="hover:underline font-medium">
            {row.original.name || row.original.username}
          </Link>
        )
      }
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
    <Filter>
      <Filter.Header
        filteredCount={filteredData.length}
        totalCount={data.length}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />
      <Filter.Body>
        <Filter.Search
          value={search}
          onChange={setSearch}
          placeholder={t("searchPlaceholder")}
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[150px]">
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
      </Filter.Body>
      <DataTable data={filteredData} columns={columns} />
    </Filter>
  )
}
