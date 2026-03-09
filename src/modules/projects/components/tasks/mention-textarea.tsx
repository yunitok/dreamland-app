'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/modules/shared/ui/avatar'

interface MentionUser {
  id: string
  name: string | null
  username: string
  image: string | null
}

interface MentionTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  wrapperClassName?: string
  users: MentionUser[]
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 2,
  className,
  wrapperClassName,
  users,
  onKeyDown: externalOnKeyDown,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [mentionState, setMentionState] = useState<{
    active: boolean
    query: string
    startIndex: number
  }>({ active: false, query: '', startIndex: 0 })
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredUsers = mentionState.active
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(mentionState.query.toLowerCase()) ||
          u.name?.toLowerCase().includes(mentionState.query.toLowerCase())
      ).slice(0, 8)
    : []

  // Cerrar dropdown si se hace click fuera
  useEffect(() => {
    if (!mentionState.active) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setMentionState({ active: false, query: '', startIndex: 0 })
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [mentionState.active])

  const detectMention = useCallback(
    (text: string, cursorPos: number) => {
      const textBeforeCursor = text.slice(0, cursorPos)
      // Buscar el último @ que no esté precedido por una letra/número
      const lastAtIndex = textBeforeCursor.lastIndexOf('@')

      if (lastAtIndex === -1) {
        setMentionState({ active: false, query: '', startIndex: 0 })
        return
      }

      // Verificar que @ está al inicio o precedido por espacio/newline
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' '
      if (charBefore && !/\s/.test(charBefore)) {
        setMentionState({ active: false, query: '', startIndex: 0 })
        return
      }

      const query = textBeforeCursor.slice(lastAtIndex + 1)
      // Si hay un espacio en la query, ya no estamos mencionando
      if (/\s/.test(query)) {
        setMentionState({ active: false, query: '', startIndex: 0 })
        return
      }

      setMentionState({ active: true, query, startIndex: lastAtIndex })
      setSelectedIndex(0)
    },
    []
  )

  const insertMention = useCallback(
    (user: MentionUser) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const before = value.slice(0, mentionState.startIndex)
      const after = value.slice(textarea.selectionStart)
      const newValue = `${before}@${user.username} ${after}`
      onChange(newValue)
      setMentionState({ active: false, query: '', startIndex: 0 })

      // Restaurar foco y posición del cursor
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          const cursorPos = mentionState.startIndex + user.username.length + 2 // @username + space
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(cursorPos, cursorPos)
        }
      })
    },
    [value, onChange, mentionState.startIndex]
  )

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    // Usar requestAnimationFrame para obtener selectionStart después del re-render
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        detectMention(newValue, textareaRef.current.selectionStart)
      }
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState.active && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredUsers.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredUsers[selectedIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionState({ active: false, query: '', startIndex: 0 })
        return
      }
    }
    externalOnKeyDown?.(e)
  }

  return (
    <div className={cn("relative", wrapperClassName)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
      />

      {mentionState.active && filteredUsers.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 z-50 mb-1 w-full max-w-64 rounded-md border bg-popover p-1 shadow-md"
        >
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              type="button"
              className={cn(
                "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none cursor-pointer",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onMouseEnter={() => setSelectedIndex(index)}
              onMouseDown={(e) => {
                e.preventDefault() // Evitar que el textarea pierda foco
                insertMention(user)
              }}
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback className="text-[10px]">
                  {user.name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{user.name}</span>
              <span className="text-muted-foreground">@{user.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
