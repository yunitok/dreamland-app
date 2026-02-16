import { Header } from "@/components/layout/header"
import { SandboxTabs } from "./_components/sandbox-tabs"

export default function SandboxPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      <Header
        titleKey="sherlock.sandbox.title"
        descriptionKey="sherlock.sandbox.description"
        backHref="/sherlock"
      />

      <div className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto">
          <SandboxTabs />
        </div>
      </div>
    </div>
  )
}
