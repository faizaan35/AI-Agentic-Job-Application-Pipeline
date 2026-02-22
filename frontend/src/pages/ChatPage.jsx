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
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  // Auto-scroll when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handle first message from ChatHome
  useEffect(() => {
    if (initialMessage) {
      const firstUser = { role: "user", content: initialMessage }
      setMessages([firstUser])
      callGroq([firstUser])
    }
  }, [initialMessage])

  // Groq call function
  const callGroq = async (messageArray) => {
    try {
      setLoading(true)

      // 🔥 Convert frontend roles to Groq-compatible roles
      const formattedMessages = messageArray.map((msg) => ({
        role: msg.role === "ai" ? "assistant" : msg.role,
        content: msg.content,
      }))

      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: formattedMessages,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || "Backend error")
      }

      const aiMessage = {
        role: "ai",
        content: data.reply,
      }

      setMessages((prev) => [...prev, aiMessage])

    } catch (err) {
      console.error("Chat error:", err)

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "⚠️ Server error. Please try again.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  // Send message handler
  const sendMessage = () => {
    if (!input.trim()) return

    const userMessage = { role: "user", content: input }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInput("")

    callGroq(updatedMessages)
  }

  return (
    <div className="flex flex-col h-full">

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 pt-8">
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

          {loading && (
            <p className="text-sm text-muted-foreground">Thinking...</p>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-6 py-4 bg-background">
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