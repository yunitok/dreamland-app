"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/modules/shared/ui/badge"
import { Shield } from "lucide-react"

interface ProfileRoleSectionProps {
  user: {
    role: string
    permissions: string[]
  }
}

export function ProfileRoleSection({ user }: ProfileRoleSectionProps) {
  const t = useTranslations("profile.role")

  // Mapeo de códigos de rol a nombres legibles
  const roleNames: Record<string, string> = {
    "SUPER_ADMIN": "Super Admin",
    "ADMIN": "Admin",
    "STRATEGIC_PM": "Strategic PM",
    "TEAM_LEAD": "Team Lead",
    "TEAM_MEMBER": "Team Member"
  }

  const roleName = roleNames[user.role] || user.role

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{t("yourRole")}</p>
          <p className="text-lg font-semibold">{roleName}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-3">{t("permissions")}</p>
        <div className="flex flex-wrap gap-2">
          {user.permissions.map((permission, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {permission}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
