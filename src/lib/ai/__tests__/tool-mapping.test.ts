import { describe, it, expect } from 'vitest'
import { getGeminiTools, getGroqTools, AI_TOOLS_REGISTRY } from '../tools'

describe('AI Tool Mapping', () => {
  it('should transform tools for Gemini correctly', () => {
    const tools = getGeminiTools()
    expect(tools).toHaveProperty('functionDeclarations')
    expect(tools.functionDeclarations).toHaveLength(Object.keys(AI_TOOLS_REGISTRY).length)
    
    const generateReport = tools.functionDeclarations.find(f => f.name === 'generateReport')
    expect(generateReport).toBeDefined()
    expect(generateReport?.description).toContain('specific project')
    expect(generateReport?.parameters.required).toContain('projectId')
  })

  it('should transform tools for Groq correctly', () => {
    const tools = getGroqTools()
    expect(tools).toHaveLength(Object.keys(AI_TOOLS_REGISTRY).length)
    expect(tools[0]).toHaveProperty('type', 'function')
    
    const generateReport = tools.find(t => t.function.name === 'generateReport')
    expect(generateReport).toBeDefined()
    expect(generateReport?.function.parameters.required).toContain('projectId')
  })
})
