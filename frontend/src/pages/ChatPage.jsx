import { useEffect, useState, useRef } from "react"
import { useParams, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Send } from "lucide-react"

export default function ChatPage() {
  const { id } = useParams()
  const location = useLocation()
  const initialMessage = location.state?.firstMessage

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const bottomRef = useRef(null)

  // Insert first message when coming from ChatHome
  useEffect(() => {
    if (initialMessage) {
      const firstUser = { role: "user", content: initialMessage }
      const firstAI = {
        role: "ai",
        content:
          "This is a placeholder response. Groq integration will generate real answers.",
      }

      setMessages([firstUser, firstAI])
    }
  }, [initialMessage])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = () => {
    if (!input.trim()) return

    const userMessage = { role: "user", content: input }
    const aiMessage = {
      role: "ai",
      content:
        "This is a simulated response. Replace this with Groq API call.",
    }

    setMessages((prev) => [...prev, userMessage, aiMessage])
    setInput("")
  }

  return (
    <div className="flex flex-col h-full">

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-8">

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-4 ${
                msg.role === "user" ? "justify-end" : ""
              }`}
            >
              {msg.role === "ai" && (
                <Avatar>
                  <AvatarFallback>AI</AvatarFallback>
                </Avatar>
              )}

              <Card
                className={`p-4 max-w-[75%] whitespace-pre-line text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
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

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-6 py-4 bg-background ">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Input
            placeholder="Ask follow-up..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1"
          />
          <Button size="icon" onClick={sendMessage}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}