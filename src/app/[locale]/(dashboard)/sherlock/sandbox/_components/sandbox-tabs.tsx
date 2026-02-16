"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/modules/shared/ui/tabs"
import { Database, Package } from "lucide-react"
import { YurestSandbox } from "./yurest-sandbox"
import { GstockSandbox } from "./gstock-sandbox"

export function SandboxTabs() {
  return (
    <Tabs defaultValue="yurest" className="w-full">
      <TabsList>
        <TabsTrigger value="yurest">
          <Database className="h-3.5 w-3.5 mr-1.5" />
          Yurest
        </TabsTrigger>
        <TabsTrigger value="gstock">
          <Package className="h-3.5 w-3.5 mr-1.5" />
          GStock
        </TabsTrigger>
      </TabsList>
      <TabsContent value="yurest" className="mt-4">
        <YurestSandbox />
      </TabsContent>
      <TabsContent value="gstock" className="mt-4">
        <GstockSandbox />
      </TabsContent>
    </Tabs>
  )
}
