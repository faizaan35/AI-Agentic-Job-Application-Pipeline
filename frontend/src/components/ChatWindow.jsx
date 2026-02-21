import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function ChatWindow({ trace, setTrace }) {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content: "Hello! Tell me what you'd like to do today.",
    },
  ])

  const [input, setInput] = useState("")

  const updateTrace = async (actions) => {
    // Reset all to idle first
    setTrace((prev) =>
      prev.map((step) => ({ ...step, status: "idle" }))
    )

    // Intent detection
    await new Promise((r) => setTimeout(r, 400))
    setTrace((prev) =>
      prev.map((step) =>
        step.key === "intent"
          ? { ...step, status: "completed" }
          : step
      )
    )

    // Run selected agents sequentially
    for (const action of actions) {
      await new Promise((r) => setTimeout(r, 600))

      setTrace((prev) =>
        prev.map((step) =>
          step.key === action
            ? { ...step, status: "running" }
            : step
        )
      )

      await new Promise((r) => setTimeout(r, 800))

      setTrace((prev) =>
        prev.map((step) =>
          step.key === action
            ? { ...step, status: "completed" }
            : step
        )
      )
    }
  }

  const send = () => {
    if (!input.trim()) return

    const userMessage = { role: "user", content: input }

    const lower = input.toLowerCase()
    let actions = []

    if (lower.includes("scrape")) actions.push("scraper")
    if (lower.includes("match")) actions.push("matcher")
    if (lower.includes("tailor")) actions.push("tailor")
    if (lower.includes("pdf")) actions.push("pdf")

    if (actions.length === 0) {
      // Full pipeline default
      actions = ["scraper", "matcher", "tailor", "pdf"]
    }

    updateTrace(actions)

    const aiMessage = {
      role: "ai",
      content: `Intent detected. Executing: ${actions.join(", ")}`,
    }

    setMessages((m) => [...m, userMessage, aiMessage])
    setInput("")
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : ""
              }`}
            >
              {msg.role === "ai" && (
                <Avatar>
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}

              <Card
                className={`max-w-[70%] p-4 whitespace-pre-line ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : ""
                }`}
              >
                {msg.content}
              </Card>

              {msg.role === "user" && (
                <Avatar>
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4 flex gap-2">
        <Input
          placeholder="Ask me to scrape jobs, match resume, tailor..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button onClick={send}>Send</Button>
      </div>
    </div>
  )
}
