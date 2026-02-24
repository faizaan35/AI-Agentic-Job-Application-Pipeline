import { useEffect, useState, useRef } from "react"
import { useParams, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Send, Copy, Check } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { codeToHtml } from "shiki"

// ─── Shiki Code Block ────────────────────────────────────────────────────────

// Fallback to "text" for any language Shiki doesn't know
const SUPPORTED_LANGS = new Set([
  "js", "jsx", "ts", "tsx", "javascript", "typescript",
  "python", "java", "c", "cpp", "csharp", "go", "rust",
  "html", "css", "json", "yaml", "bash", "shell", "sh",
  "sql", "php", "ruby", "swift", "kotlin", "dart", "r",
  "xml", "markdown", "md", "plaintext", "text"
])

function CodeBlock({ language, code }) {
  const [html, setHtml] = useState("")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  const safeLang = SUPPORTED_LANGS.has(language?.toLowerCase())
    ? language.toLowerCase()
    : "text"

  useEffect(() => {
    if (!code) return

    setHtml("")
    setError(false)

    codeToHtml(code, {
      lang: safeLang,
      theme: "dark-plus",
    })
      .then(setHtml)
      .catch(() => setError(true))
  }, [code, safeLang])

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/5 bg-[#0c1016] shadow-[0_6px_30px_rgba(0,0,0,0.6)]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-xs text-white/40 font-mono tracking-wide">
          {language || "text"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Shiki output — falls back to plain mono until ready or on error */}
      {html && !error ? (
        <div
          dangerouslySetInnerHTML={{ __html: html }}
          className="[&>pre]:p-4 [&>pre]:overflow-x-auto [&>pre]:m-0 [&>pre]:bg-transparent [&>pre]:text-sm [&>pre]:leading-relaxed"
        />
      ) : (
        <pre className="p-4 text-[#abb2bf] font-mono text-sm overflow-x-auto leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
    </div>
  )
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────

export default function ChatPage() {
  const { id } = useParams()
  const location = useLocation()
  const initialMessage = location.state?.firstMessage

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  // 🔹 Load existing chat if it exists
  useEffect(() => {
    if (!id) return
    const storedChats = JSON.parse(localStorage.getItem("chats")) || []
    const existingChat = storedChats.find((c) => c.id === id)
    if (existingChat) setMessages(existingChat.messages)
  }, [id])

  // 🔹 Handle first message from ChatHome
  useEffect(() => {
    if (!initialMessage) return
    const firstUser = { role: "user", content: initialMessage }
    setMessages([firstUser])
    callGroq([firstUser])
  }, [initialMessage])

  // 🔹 Auto-save chat to localStorage
  useEffect(() => {
    if (!id || messages.length === 0) return
    const existingChats = JSON.parse(localStorage.getItem("chats")) || []
    const chatIndex = existingChats.findIndex((c) => c.id === id)
    const chatData = {
      id,
      title: messages[0]?.content.slice(0, 40) || "New Chat",
      messages,
    }
    if (chatIndex >= 0) {
      existingChats[chatIndex] = chatData
    } else {
      existingChats.push(chatData)
    }
    localStorage.setItem("chats", JSON.stringify(existingChats))
  }, [messages, id])

  // 🔹 Auto-scroll when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // 🔹 Call Groq API
  const callGroq = async (messageArray) => {
    try {
      setLoading(true)
      const formattedMessages = messageArray.map((msg) => ({
        role: msg.role === "ai" ? "assistant" : msg.role,
        content: msg.content,
      }))

      const response = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: formattedMessages }),
      })

      const data = await response.json()
      if (!response.ok || data.error) throw new Error(data.error || "Backend error")

      setMessages((prev) => [...prev, { role: "ai", content: data.reply }])
    } catch (err) {
      console.error("Chat error:", err)
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "⚠️ Server error. Please try again." },
      ])
    } finally {
      setLoading(false)
    }
  }

  // 🔹 Send message
  const sendMessage = () => {
    if (!input.trim()) return
    const userMessage = { role: "user", content: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    callGroq(updatedMessages)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Messages */}
      <ScrollArea className="flex-1 h-0 px-6 pt-8">
        <div className="max-w-3xl mx-auto space-y-8">

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex gap-4 ${msg.role === "user" ? "justify-end" : ""}`}
            >
              {msg.role === "ai" && (
                <Avatar className="bg-emerald-500/10" >
                  <AvatarFallback >AI</AvatarFallback>
                </Avatar>
              )}

              <Card
                className={`p-5 max-w-[75%] text-sm rounded-2xl transition-all duration-200 ${
                  msg.role === "user"
                    ? "bg-[#0f1c18] border border-emerald-500/20 text-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                    : "bg-[#12161d] border border-white/5 text-white/90 shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
                  }`}
              >
                {msg.role === "user" ? (
                  <p className="leading-relaxed whitespace-pre-wrap text-white/90">{msg.content}</p>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({ children }) => (
                        <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
                      ),

                      li: ({ children }) => (
                        <li className="leading-relaxed [&>p]:mb-0 [&>p]:inline">
                          {children}
                        </li>
                      ),

                      ul: ({ children }) => (
                        <ul className="list-disc ml-5 space-y-1 mb-4">{children}</ul>
                      ),

                      ol: ({ children }) => (
                        <ol className="list-decimal ml-5 space-y-1 mb-4">{children}</ol>
                      ),

                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),

                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold mb-3 mt-4">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-bold mb-2 mt-4">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-semibold mb-2 mt-3">{children}</h3>
                      ),

                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-muted-foreground/30 pl-4 my-3 text-muted-foreground italic">
                          {children}
                        </blockquote>
                      ),

                      hr: () => <hr className="my-4 border-muted-foreground/20" />,

                      // ✅ Robust code block — guards against undefined children
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "")

                        // Guard: children can be undefined in edge cases inside lists
                        const codeString = children != null
                          ? String(children).replace(/\n$/, "")
                          : ""

                        if (!inline && match && codeString) {
                          return <CodeBlock language={match[1]} code={codeString} />
                        }

                        return (
                          <code
                            className="bg-black/20 px-1.5 py-0.5 rounded text-sm font-mono"
                            {...props}
                          >
                            {children}
                          </code>
                        )
                      },
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </Card>

              {msg.role === "user" && (
                <Avatar>
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-4">
              <Avatar>
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-muted">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-6 py-4 bg-transparent">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Input
            placeholder="Ask follow-up..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1"
          />
          <Button size="icon" onClick={sendMessage} disabled={loading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
