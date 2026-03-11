"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/modules/shared/ui/tabs"
import { Database, Package, CalendarRange, ShoppingCart } from "lucide-react"
import { YurestSandbox } from "./yurest-sandbox"
import { GstockSandbox } from "./gstock-sandbox"
import { CoverManagerSandbox } from "./covermanager-sandbox"
import { AgoraSandbox } from "./agora-sandbox"

export function SandboxTabs() {
  return (
    <Tabs defaultValue="agora" className="w-full">
      <TabsList>
        <TabsTrigger value="agora">
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
          Agora
        </TabsTrigger>
        <TabsTrigger value="yurest">
          <Database className="h-3.5 w-3.5 mr-1.5" />
          Yurest
        </TabsTrigger>
        <TabsTrigger value="gstock">
          <Package className="h-3.5 w-3.5 mr-1.5" />
          GStock
        </TabsTrigger>
        <TabsTrigger value="covermanager">
          <CalendarRange className="h-3.5 w-3.5 mr-1.5" />
          CoverManager
        </TabsTrigger>
      </TabsList>
      <TabsContent value="agora" className="mt-4">
        <AgoraSandbox />
      </TabsContent>
      <TabsContent value="yurest" className="mt-4">
        <YurestSandbox />
      </TabsContent>
      <TabsContent value="gstock" className="mt-4">
        <GstockSandbox />
      </TabsContent>
      <TabsContent value="covermanager" className="mt-4">
        <CoverManagerSandbox />
      </TabsContent>
    </Tabs>
  )
}
