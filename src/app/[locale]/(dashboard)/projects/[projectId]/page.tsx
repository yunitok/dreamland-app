import { redirect } from 'next/navigation'

interface ProjectPageProps {
  params: Promise<{ projectId: string; locale: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId, locale } = await params
  
  // Redirect to list view by default
  redirect(`/${locale}/projects/${projectId}/list`)
}
