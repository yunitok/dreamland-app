"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, Copy, Check } from "lucide-react"
import { Button } from "@/modules/shared/ui/button"

interface JsonViewerProps {
  data: unknown
  initialExpanded?: boolean
}

export function JsonViewer({ data, initialExpanded = true }: JsonViewerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-7 text-xs gap-1.5 z-10"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copiado" : "Copiar"}
      </Button>
      <div className="font-mono text-xs leading-relaxed overflow-auto max-h-[600px] p-4 bg-muted/30 rounded-lg border">
        <JsonNode value={data} expanded={initialExpanded} depth={0} />
      </div>
    </div>
  )
}

function JsonNode({
  value,
  expanded: initialExpanded,
  depth,
  keyName,
}: {
  value: unknown
  expanded: boolean
  depth: number
  keyName?: string
}) {
  const [expanded, setExpanded] = useState(initialExpanded && depth < 2)

  if (value === null) {
    return (
      <span>
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-orange-500 dark:text-orange-400">null</span>
      </span>
    )
  }

  if (typeof value === "boolean") {
    return (
      <span>
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-violet-600 dark:text-violet-400">{String(value)}</span>
      </span>
    )
  }

  if (typeof value === "number") {
    return (
      <span>
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-cyan-600 dark:text-cyan-400">{value}</span>
      </span>
    )
  }

  if (typeof value === "string") {
    const truncated = value.length > 200 ? value.slice(0, 200) + "..." : value
    return (
      <span>
        {keyName !== undefined && <KeyLabel name={keyName} />}
        <span className="text-emerald-600 dark:text-emerald-400">&quot;{truncated}&quot;</span>
      </span>
    )
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <span>
          {keyName !== undefined && <KeyLabel name={keyName} />}
          <span className="text-muted-foreground">[]</span>
        </span>
      )
    }

    return (
      <div>
        <span
          className="cursor-pointer select-none inline-flex items-center gap-0.5 hover:text-primary"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3 inline" />
          ) : (
            <ChevronRight className="h-3 w-3 inline" />
          )}
          {keyName !== undefined && <KeyLabel name={keyName} />}
          <span className="text-muted-foreground">
            [{!expanded && <span> {value.length} items </span>}]
          </span>
        </span>
        {expanded && (
          <div className="ml-4 border-l border-border/50 pl-3">
            {value.map((item, i) => (
              <div key={i} className="py-0.5">
                <JsonNode value={item} expanded={depth < 1} depth={depth + 1} keyName={String(i)} />
                {i < value.length - 1 && <span className="text-muted-foreground">,</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)

    if (entries.length === 0) {
      return (
        <span>
          {keyName !== undefined && <KeyLabel name={keyName} />}
          <span className="text-muted-foreground">{"{}"}</span>
        </span>
      )
    }

    return (
      <div>
        <span
          className="cursor-pointer select-none inline-flex items-center gap-0.5 hover:text-primary"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3 inline" />
          ) : (
            <ChevronRight className="h-3 w-3 inline" />
          )}
          {keyName !== undefined && <KeyLabel name={keyName} />}
          <span className="text-muted-foreground">
            {"{"}
            {!expanded && <span> {entries.length} keys </span>}
            {!expanded && "}"}
          </span>
        </span>
        {expanded && (
          <div className="ml-4 border-l border-border/50 pl-3">
            {entries.map(([key, val], i) => (
              <div key={key} className="py-0.5">
                <JsonNode value={val} expanded={depth < 1} depth={depth + 1} keyName={key} />
                {i < entries.length - 1 && <span className="text-muted-foreground">,</span>}
              </div>
            ))}
          </div>
        )}
        {expanded && <span className="text-muted-foreground">{"}"}</span>}
      </div>
    )
  }

  return <span className="text-muted-foreground">{String(value)}</span>
}

function KeyLabel({ name }: { name: string }) {
  return <span className="text-sky-700 dark:text-sky-300">&quot;{name}&quot;: </span>
}
