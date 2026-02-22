'use client'

import { useState, useTransition, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/modules/shared/ui/sheet'
import { Button } from '@/modules/shared/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/modules/shared/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/modules/shared/ui/select'
import { Badge } from '@/modules/shared/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/modules/shared/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/modules/shared/ui/command'
import { Users, UserPlus, Trash2, Loader2, ChevronsUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProjectRole } from '@prisma/client'
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  getUsersWithProjectAccess,
} from '@/modules/projects/actions/members'
import { useEffect } from 'react'

// ============================================================================
// TYPES
// ============================================================================

interface Member {
  id: string
  role: ProjectRole
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
    username: string
  }
}

interface CandidateUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
  username: string
}

interface ProjectMembersPanelProps {
  projectId: string
  canManage: boolean
}

// ============================================================================
// HELPERS
// ============================================================================

const ROLE_LABELS: Record<ProjectRole, string> = {
  OWNER: 'Owner',
  MANAGER: 'Manager',
  EDITOR: 'Editor',
  VIEWER: 'Viewer',
}

const ROLE_COLORS: Record<ProjectRole, string> = {
  OWNER: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  MANAGER: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  EDITOR: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  VIEWER: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
}

const getInitials = (name: string | null, username: string) =>
  (name ?? username).slice(0, 2).toUpperCase()

// ============================================================================
// COMPONENT
// ============================================================================

export function ProjectMembersPanel({ projectId, canManage }: ProjectMembersPanelProps) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [candidates, setCandidates] = useState<CandidateUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('VIEWER')
  const [comboOpen, setComboOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  const load = async () => {
    setLoading(true)
    try {
      const [membersData, candidatesData] = await Promise.all([
        getProjectMembers(projectId),
        canManage ? getUsersWithProjectAccess(projectId) : Promise.resolve([]),
      ])
      setMembers(membersData)
      setCandidates(candidatesData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  const handleAdd = () => {
    if (!selectedUserId) return
    startTransition(async () => {
      try {
        await addProjectMember(projectId, selectedUserId, selectedRole)
        setSelectedUserId('')
        setSelectedRole('VIEWER')
        await load()
      } catch (e) {
        console.error(e)
      }
    })
  }

  const handleRoleChange = (userId: string, role: ProjectRole) => {
    startTransition(async () => {
      try {
        await updateProjectMember(projectId, userId, role)
        await load()
      } catch (e) {
        console.error(e)
      }
    })
  }

  const handleRemove = (userId: string) => {
    startTransition(async () => {
      try {
        await removeProjectMember(projectId, userId)
        await load()
      } catch (e) {
        console.error(e)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8" title="Gestionar miembros">
          <Users className="h-4 w-4" />
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-105 flex flex-col overflow-hidden p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-muted-foreground" />
            Miembros del proyecto
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Add member (only for managers/owners) */}
          {canManage && (
            <div className="space-y-3 p-4 rounded-xl border bg-muted/40">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Añadir miembro</p>
              <Popover open={comboOpen} onOpenChange={setComboOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboOpen}
                    className="h-9 w-full justify-between font-normal"
                  >
                    {selectedUserId
                      ? (() => {
                          const u = candidates.find(c => c.id === selectedUserId)
                          return u ? (u.name ?? u.username) : 'Selecciona un usuario…'
                        })()
                      : 'Selecciona un usuario…'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Buscar usuario…"
                      onValueChange={() => {
                        requestAnimationFrame(() => listRef.current?.scrollTo(0, 0))
                      }}
                    />
                    <CommandList ref={listRef}>
                      <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                      <CommandGroup>
                        {candidates.map(u => (
                          <CommandItem
                            key={u.id}
                            value={`${u.name ?? ''} ${u.username} ${u.email ?? ''}`}
                            onSelect={() => {
                              setSelectedUserId(u.id)
                              setComboOpen(false)
                            }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', selectedUserId === u.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="font-medium">{u.name ?? u.username}</span>
                            {u.email && <span className="text-muted-foreground ml-1.5 text-xs truncate">{u.email}</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <div className="flex gap-2">
                <Select value={selectedRole} onValueChange={v => setSelectedRole(v as ProjectRole)}>
                  <SelectTrigger className="w-32 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABELS) as ProjectRole[]).filter(r => r !== 'OWNER').map(r => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleAdd}
                  disabled={!selectedUserId || isPending}
                  className="flex-1 h-9 gap-1.5"
                  size="sm"
                >
                  {isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <UserPlus className="h-4 w-4" />}
                  Añadir
                </Button>
              </div>
            </div>
          )}

          {/* Members list */}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2">
              {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
            </p>

            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ul className="space-y-1">
                {members.map(m => (
                  <li key={m.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/60 transition-colors cursor-default">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={m.user.image ?? undefined} />
                      <AvatarFallback className="text-xs font-medium">{getInitials(m.user.name, m.user.username)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">{m.user.name ?? m.user.username}</p>
                      {m.user.email && <p className="text-xs text-muted-foreground truncate mt-0.5">{m.user.email}</p>}
                    </div>

                    {canManage ? (
                      <Select
                        value={m.role}
                        onValueChange={v => handleRoleChange(m.user.id, v as ProjectRole)}
                        disabled={isPending}
                      >
                        <SelectTrigger className="h-7 w-25 text-xs shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_LABELS) as ProjectRole[]).map(r => (
                            <SelectItem key={r} value={r} className="text-xs">{ROLE_LABELS[r]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={`text-xs shrink-0 ${ROLE_COLORS[m.role]}`}>
                        {ROLE_LABELS[m.role]}
                      </Badge>
                    )}

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => handleRemove(m.user.id)}
                        disabled={isPending}
                        title="Eliminar miembro"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
