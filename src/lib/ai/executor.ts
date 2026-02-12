import { createTaskList, deleteTaskList, updateTaskList } from '@/modules/projects/actions/task-lists'
import { createTask, deleteTask, updateTask } from '@/modules/projects/actions/tasks'
import { generateProjectReport } from '@/app/actions/report-actions'
import { TaskStatus } from '@prisma/client'

export interface ToolCall {
  name: string
  args: Record<string, unknown>
}

export interface ExecutionContext {
  projectId: string
  statuses: TaskStatus[]
}

export async function executeAiTools(
  toolCalls: ToolCall[],
  context: ExecutionContext
) {
  const executionResults: string[] = []
  let lastCreatedListId: string | null = null
  let generatedReport: { id: string, title: string, content: string, redirectUrl: string } | undefined = undefined

  for (const call of toolCalls) {
    console.log(`[Executor] Processing tool: ${call.name}`, call.args)
    const args = call.args
    const { projectId, statuses } = context

    try {
      if (call.name === 'createTaskList') {
        const list = await createTaskList({
          name: args.name,
          description: args.description,
          projectId
        })
        lastCreatedListId = list.id
        executionResults.push(`List created: "${args.name}"`)
      }

      if (call.name === 'updateTaskList') {
        await updateTaskList(args.listId, {
          name: args.name,
          description: args.description
        })
        executionResults.push(`List updated. ID: "${args.listId}"`)
      }

      if (call.name === 'deleteTaskList') {
        await deleteTaskList(args.listId)
        executionResults.push(`List deleted. ID: "${args.listId}"`)
      }

      if (call.name === 'deleteTask') {
        await deleteTask(args.taskId)
        executionResults.push(`Task deleted. ID: "${args.taskId}"`)
      }

      if (call.name === 'createTask') {
        let targetListId = args.listId

        // Handle dynamic list creation in same turn
        if (targetListId === 'LATEST_CREATED' || targetListId === 'PENDING') {
          if (lastCreatedListId) {
            targetListId = lastCreatedListId
          } else {
            console.warn('Task requested for LATEST_CREATED list but no list was created.')
          }
        }

        // Validate statusId
        let targetStatusId = args.statusId
        const statusExists = statuses.some((s) => s.id === targetStatusId)
        if (!statusExists) {
          console.warn(`Invalid statusId "${targetStatusId}" provided by AI. Falling back to default.`)
          if (statuses.length > 0) {
            targetStatusId = statuses[0].id
          } else {
            throw new Error('No statuses available in project')
          }
        }

        await createTask({
          title: args.title,
          description: args.description,
          listId: targetListId,
          statusId: targetStatusId,
          dueDate: args.dueDate ? new Date(args.dueDate) : undefined
        })
        executionResults.push(`Task created: "${args.title}"`)
      }

      if (call.name === 'updateTask') {
        await updateTask(args.taskId, {
          title: args.title,
          description: args.description,
          dueDate: args.dueDate ? new Date(args.dueDate) : undefined
        })
        executionResults.push(`Task updated. ID: "${args.taskId}"`)
      }

      if (call.name === 'generateReport') {
        // Use the projectId provided by the model, or fallback to current
        const targetProjectId = args.projectId || projectId
        const report = await generateProjectReport(targetProjectId)
        generatedReport = report
        executionResults.push(`Report generated: "${report.title}"`)
      }
    } catch (error: unknown) {
      console.error(`Error executing tool ${call.name}:`, error)
      const message = error instanceof Error ? error.message : String(error)
      executionResults.push(`Error in ${call.name}: ${message}`)
    }
  }

  return { executionResults, lastCreatedListId, generatedReport }
}
