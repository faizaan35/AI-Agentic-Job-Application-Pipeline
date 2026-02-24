import { useNavigate } from "react-router-dom"
import { Plus, Mic, ChevronDown } from "lucide-react"
import { useState } from "react"

export default function ChatHome() {
  const [input, setInput] = useState("")
  const navigate = useNavigate()

  const handleSubmit = () => {
    if (!input.trim()) return
    const chatId = Date.now().toString()
    navigate(`/chat/${chatId}`, { state: { firstMessage: input } })
  }

  return (
    <div className="flex items-center justify-center h-full px-6 bg-transparent">
      <div className="w-full max-w-3xl flex flex-col items-center">

        {/* Title */}
        <h1 className="text-5xl font-semibold tracking-tight mb-10 text-white">
          CareerOS
        </h1>
        {/* input wrapper */}
        <div className="relative w-full">

        {/* OUTER GLOW RING */}
        <div className="absolute -inset-1 rounded-2xl 
                        bg-emerald-500/30 
                        blur-2xl opacity-50 pointer-events-none" />

        {/* SOLID GLASS CONTAINER */}
        <div className="relative flex items-center gap-3 rounded-2xl
                        bg-[#121417] 
                        border border-white/10
                        shadow-[0_8px_32px_rgba(0,0,0,0.6)]
                        px-5 py-4">

          <button className="text-white/60 hover:text-white transition">
            <Plus className="w-4 h-4" />
          </button>

          <input
            type="text"
            placeholder="Ask anything..."
            className="flex-1 bg-transparent outline-none 
                      text-base text-white 
                      placeholder:text-white/40"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />

          <button className="text-white/60 hover:text-white transition">
            <ChevronDown className="w-4 h-4" />
          </button>

          <button
            onClick={handleSubmit}
            className="bg-emerald-500 hover:bg-emerald-400 
                      text-black font-medium 
                      px-4 py-2 rounded-xl 
                      transition-all duration-200"
          >
            <Mic className="w-4 h-4" />
          </button>

        </div>
      </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-4 mt-8 justify-center">

          <button
            onClick={() => setInput("Scrape AI jobs and match my resume")}
            className="px-5 py-2 rounded-full 
                       bg-white/5 backdrop-blur-md 
                       border border-white/10 
                       text-white/80 text-sm
                       hover:bg-white/10 hover:text-white
                       transition-all"
          >
            Scrape & Match
          </button>

          <button
            onClick={() => setInput("Tailor my resume for a backend role")}
            className="px-5 py-2 rounded-full 
                       bg-white/5 backdrop-blur-md 
                       border border-white/10 
                       text-white/80 text-sm
                       hover:bg-white/10 hover:text-white
                       transition-all"
          >
            Tailor Resume
          </button>

          <button
            onClick={() => setInput("Analyze job market trends in AI")}
            className="px-5 py-2 rounded-full 
                       bg-white/5 backdrop-blur-md 
                       border border-white/10 
                       text-white/80 text-sm
                       hover:bg-white/10 hover:text-white
                       transition-all"
          >
            Analyze Market
          </button>

        </div>
      </div>
    </div>
  )
}