import { useState } from "react"
import ChatWindow from "../components/ChatWindow"
import AgentTrace from "../components/AgentTrace"
import { Separator } from "@/components/ui/separator"

const initialTrace = [
  { key: "intent", name: "Intent Detection", status: "idle" },
  { key: "scraper", name: "Job Scraper Agent", status: "idle" },
  { key: "matcher", name: "Resume Matcher", status: "idle" },
  { key: "tailor", name: "Tailoring Agent", status: "idle" },
  { key: "pdf", name: "PDF Generator", status: "idle" },
]

export default function Home() {
  const [trace, setTrace] = useState(initialTrace)

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="px-6 py-4 border-b flex items-center justify-between">
        <h1 className="text-lg font-semibold">AI Job Application System</h1>
        <span className="text-sm text-muted-foreground">
          Multi-Agent Orchestrator
        </span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <ChatWindow trace={trace} setTrace={setTrace} />
        </div>

        <Separator orientation="vertical" />

        <div className="w-[350px]">
          <AgentTrace trace={trace} />
        </div>
      </div>
    </div>
  )
}
