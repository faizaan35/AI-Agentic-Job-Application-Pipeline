import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function AgentTrace({ trace }) {
  const statusColor = (status) => {
    if (status === "completed") return "default"
    if (status === "running") return "secondary"
    if (status === "skipped") return "outline"
    return "outline"
  }

  return (
    <div className="h-full p-6 overflow-auto">
      <h2 className="font-semibold mb-6">Execution Trace</h2>

      <div className="space-y-4">
        {trace.map((step) => (
          <Card key={step.key} className="p-4 flex justify-between items-center">
            <span className="text-sm">{step.name}</span>
            <Badge variant={statusColor(step.status)}>
              {step.status}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  )
}
