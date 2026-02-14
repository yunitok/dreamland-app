export interface Task {
  id: string
  title: string
  startDate: Date | null
  dueDate: Date | null
  progress: number
  status: {
    id: string
    name: string
    color: string
    isClosed: boolean
  }
  assignee: {
    id: string
    name: string | null
    image: string | null
  } | null
  parentId: string | null
  predecessors: Array<{
    id: string
    predecessor: { id: string; title: string }
  }>
  successors: Array<{
    id: string
    successor: { id: string; title: string }
  }>
}
