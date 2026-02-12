
"use client"

import { useState } from "react"
import { Tag } from "@prisma/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/modules/shared/ui/dialog"
import { Button } from "@/modules/shared/ui/button"
import { Input } from "@/modules/shared/ui/input"
import { Label } from "@/modules/shared/ui/label"
// import { ScrollArea } from "@/modules/shared/ui/scroll-area"
import { Plus, Pencil, Trash2, X, Check, type LucideIcon } from "lucide-react"
import { createTag, updateTag, deleteTag } from "@/modules/projects/actions/tags" // Assuming this path
import { cn } from "@/lib/utils"

interface TagManagerDialogProps {
  projectId: string
  tags: Tag[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#6B7280", // Gray
]

export function TagManagerDialog({ projectId, tags, trigger, open, onOpenChange }: TagManagerDialogProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newTagMode, setNewTagMode] = useState(false)
  const [formData, setFormData] = useState({ name: "", color: COLORS[5] })
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setFormData({ name: "", color: COLORS[5] })
    setEditingId(null)
    setNewTagMode(false)
    setLoading(false)
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) return
    setLoading(true)
    try {
      await createTag({
        projectId,
        name: formData.name,
        color: formData.color,
      })
      resetForm()
    } catch (error) {
      console.error("Error creating tag", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) return
    setLoading(true)
    try {
      await updateTag(id, {
        name: formData.name,
        color: formData.color,
      })
      resetForm()
    } catch (error) {
      console.error("Error updating tag", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will remove the tag from all tasks.")) return
    try {
      await deleteTag(id)
    } catch (error) {
      console.error("Error deleting tag", error)
    }
  }

  const startEdit = (tag: Tag) => {
    setNewTagMode(false)
    setEditingId(tag.id)
    setFormData({ name: tag.name, color: tag.color })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* List of Tags */}
          <div className="h-[300px] pr-4 border rounded-md p-2 overflow-y-auto">
            <div className="space-y-2">
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg group">
                  {editingId === tag.id ? (
                    <div className="flex items-center gap-2 w-full animate-in fade-in zoom-in-95">
                       <input
                        type="color"
                        value={tag.color} // Visual only, real input below
                        disabled
                        className="w-6 h-6 rounded border-none cursor-not-allowed opacity-50"
                      />
                      <div className="flex-1 flex gap-2">
                         {/* Edit Form Inserted Here or handled via state sharing? 
                             To keep it simple, I'll render the form separately or inline.
                             Let's render inline for UX.
                         */}
                         <span className="text-sm text-muted-foreground italic">Editing below...</span>
                      </div>
                      <Button size="icon" variant="ghost" onClick={resetForm}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full border border-black/10 shadow-sm"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm font-medium">{tag.name}</span>
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(tag)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(tag.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {tags.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No tags yet. Create one!
                </div>
              )}
            </div>
          </div>

          {/* Edit/Create Form */}
          <div className="border-t pt-4">
            {(newTagMode || editingId) ? (
              <div className="space-y-3 animate-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{editingId ? "Edit Tag" : "New Tag"}</h4>
                  <Button variant="ghost" size="sm" onClick={resetForm} className="h-6 w-6 p-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <div className="space-y-1">
                    <Label className="sr-only">Color</Label>
                    <div className="flex flex-wrap gap-1 max-w-[120px]">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                                className={cn(
                                    "w-5 h-5 rounded-full border border-black/10 transition-transform",
                                    formData.color === c ? "ring-2 ring-offset-1 ring-black scale-110" : "hover:scale-110"
                                )}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="sr-only">Name</Label>
                    <Input 
                      placeholder="Tag name..." 
                      value={formData.name}
                      onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                </div>

                <Button 
                    className="w-full" 
                    onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                    disabled={loading || !formData.name.trim()}
                >
                    {loading ? "Saving..." : (editingId ? "Save Changes" : "Create Tag")}
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full border-dashed"
                onClick={() => { setNewTagMode(true); setFormData({ name: "", color: COLORS[5] }); }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Tag
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
