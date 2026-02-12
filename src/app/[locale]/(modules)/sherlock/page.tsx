
import { Button } from "@/modules/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/ui/card";

export default function SherlockPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sherlock Audit System</h1>
          <p className="text-muted-foreground">
            Audit and track operational processes across the organization.
          </p>
        </div>
        <div className="flex gap-2">
          <Button>New Audit</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Recent Audits</CardTitle>
            <CardDescription>View latest activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>No audits yet.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
