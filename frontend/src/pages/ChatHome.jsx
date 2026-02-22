import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Mic, ChevronDown } from "lucide-react"
import { useState } from "react"

export default function ChatHome() {
  const [input, setInput] = useState("")
  const navigate = useNavigate()

  const handleSubmit = () => {
    if (!input.trim()) return
    // generate temporary chat id
    const chatId = Date.now().toString()
    navigate(`/chat/${chatId}`, { state: { firstMessage: input } })
  }

  return (
    <div className="flex items-center justify-center h-full px-6">
      <div className="w-full max-w-3xl flex flex-col items-center">

        {/* Logo / Title */}
        <h1 className="text-5xl font-semibold tracking-tight mb-8">
          AI Assistant
        </h1>

        {/* Input Card */}
        <Card className="w-full rounded-2xl shadow-md p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon">
              <Plus className="w-4 h-4" />
            </Button>

            <Input
              placeholder="Ask anything..."
              className="border-none focus-visible:ring-0 text-base"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />

            <Button variant="ghost" size="icon">
              <ChevronDown className="w-4 h-4" />
            </Button>

            <Button size="icon" onClick={handleSubmit}>
              <Mic className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-3 mt-6 justify-center">
          <Badge
            variant="secondary"
            className="cursor-pointer px-4 py-2 text-sm"
            onClick={() => setInput("Scrape AI jobs and match my resume")}
          >
            Scrape & Match
          </Badge>

          <Badge
            variant="secondary"
            className="cursor-pointer px-4 py-2 text-sm"
            onClick={() => setInput("Tailor my resume for a backend role")}
          >
            Tailor Resume
          </Badge>

          <Badge
            variant="secondary"
            className="cursor-pointer px-4 py-2 text-sm"
            onClick={() => setInput("Analyze job market trends in AI")}
          >
            Analyze Market
          </Badge>
        </div>
      </div>
    </div>
  )
}