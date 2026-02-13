import { ColumnDef, Row } from "@tanstack/react-table"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import { User, Role } from "@prisma/client"
import { ActionCell } from "./action-cell"

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

export interface ColumnLabels {
  columnName: string
  columnEmail: string
  columnRole: string
  columnCreated: string
}

export const getColumns = (labels: ColumnLabels): ColumnDef<UserWithRole>[] => [
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
          label={labels.columnName}
          column={column}
          sortable={true}
        />
      )
    },
  },
  {
    accessorKey: "email",
    header: labels.columnEmail,
  },
  {
    accessorKey: "role.name",
    header: labels.columnRole,
    id: "role",
    cell: ({ row }: { row: Row<UserWithRole> }) => {
      const role = row.original.role
      return <div className="font-medium">{role?.name || "-"}</div>
    }
  },
  {
    accessorKey: "createdAt",
    header: labels.columnCreated,
    cell: ({ row }: { row: Row<UserWithRole> }) => {
      return new Date(row.getValue("createdAt")).toLocaleDateString()
    },
  },
  {
    id: "actions",
    cell: ({ row }: { row: Row<UserWithRole> }) => <ActionCell user={row.original} />,
  },
]
