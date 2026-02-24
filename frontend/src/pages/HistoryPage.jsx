import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Trash2, Pencil, Check, X, MessageSquare, Clock } from "lucide-react"

export default function HistoryPage() {
  const [chats, setChats] = useState([])
  const [search, setSearch] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [newTitle, setNewTitle] = useState("")
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("chats")) || []
    setChats(stored.reverse())
  }, [])

  const saveChats = (updated) => {
    localStorage.setItem("chats", JSON.stringify(updated.slice().reverse()))
    setChats(updated)
  }

  const deleteChat = (id) => {
    setDeletingId(id)
    setTimeout(() => {
      const updated = chats.filter((chat) => chat.id !== id)
      saveChats(updated)
      setDeletingId(null)
    }, 300)
  }

  const startRename = (chat, e) => {
    e.stopPropagation()
    setEditingId(chat.id)
    setNewTitle(chat.title)
  }

  const confirmRename = (id, e) => {
    e.stopPropagation()
    const updated = chats.map((chat) =>
      chat.id === id ? { ...chat, title: newTitle } : chat
    )
    saveChats(updated)
    setEditingId(null)
  }

  const cancelRename = (e) => {
    e.stopPropagation()
    setEditingId(null)
  }

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(search.toLowerCase())
  )

  // Group chats by recency label (Today / Yesterday / Older)
  const grouped = filteredChats.reduce((acc, chat) => {
    const label = chat.createdAt
      ? (() => {
          const diff = Date.now() - chat.createdAt
          if (diff < 86400000) return "Today"
          if (diff < 172800000) return "Yesterday"
          return "Older"
        })()
      : "All Chats"
    if (!acc[label]) acc[label] = []
    acc[label].push(chat)
    return acc
  }, {})

  const groupOrder = ["Today", "Yesterday", "Older", "All Chats"]

  return (
    <div className="h-full overflow-y-auto px-6 py-10">
      <div className="max-w-3xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-white/60" />
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              History
            </h1>
          </div>
          <p className="text-white/40 text-sm ml-12">
            {chats.length} conversation{chats.length !== 1 ? "s" : ""} saved
          </p>
        </div>

        {/* ── Search ─────────────────────────────────────────────────── */}
        <div className="relative mb-8">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-grey flex items-center justify-center">
            <Search className="w-3.5 h-3.5 text-white" />
            </div>
          <input
            type="text"
            placeholder="Search your conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl
                       pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/25
                       focus:outline-none focus:border-white/20 focus:bg-white/[0.05]
                       transition-all duration-200 backdrop-blur-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {filteredChats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
              <MessageSquare className="w-7 h-7 text-white/20" />
            </div>
            <p className="text-white/30 text-sm">
              {search ? `No results for "${search}"` : "No conversations yet"}
            </p>
          </div>
        )}

        {/* ── Chat groups ─────────────────────────────────────────────── */}
        <div className="space-y-8">
          {groupOrder.map((label) => {
            const group = grouped[label]
            if (!group) return null
            return (
              <div key={label}>
                {/* Group label */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[11px] font-medium text-white/30 uppercase tracking-widest">
                    {label}
                  </span>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {group.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => editingId !== chat.id && navigate(`/chat/${chat.id}`)}
                      style={{
                        opacity: deletingId === chat.id ? 0 : 1,
                        transform: deletingId === chat.id ? "translateX(12px)" : "translateX(0)",
                        transition: "opacity 0.3s ease, transform 0.3s ease",
                      }}
                      className="group relative flex items-center gap-4 px-5 py-4
                                 bg-white/[0.03] hover:bg-white/[0.055]
                                 border border-white/[0.06] hover:border-white/[0.12]
                                 rounded-2xl cursor-pointer
                                 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]
                                 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_4px_24px_rgba(0,0,0,0.3)]
                                 transition-all duration-200 backdrop-blur-sm"
                    >
                      {/* Icon */}
                      <div className="shrink-0 w-8 h-8 rounded-xl
                                      bg-white/[0.04] border border-white/[0.07]
                                      flex items-center justify-center
                                      group-hover:bg-white/[0.07] transition-colors">
                        <MessageSquare className="w-3.5 h-3.5 text-white/40 group-hover:text-white/60 transition-colors" />
                      </div>

                      {/* Title / edit input */}
                      <div className="flex-1 min-w-0">
                        {editingId === chat.id ? (
                          <input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmRename(chat.id, e)
                              if (e.key === "Escape") cancelRename(e)
                            }}
                            className="w-full bg-transparent text-white text-sm
                                       border-b border-white/20 pb-0.5
                                       focus:outline-none focus:border-white/40 transition-colors"
                            autoFocus
                          />
                        ) : (
                          <p className="text-sm text-white/80 group-hover:text-white
                                        truncate transition-colors font-medium">
                            {chat.title}
                          </p>
                        )}
                        {chat.messages && (
                          <p className="text-xs text-white/25 mt-0.5">
                            {chat.messages.length} message{chat.messages.length !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="shrink-0 flex items-center gap-1
                                      opacity-0 group-hover:opacity-100
                                      translate-x-1 group-hover:translate-x-0
                                      transition-all duration-200">
                        {editingId === chat.id ? (
                          <>
                            <button
                              onClick={(e) => confirmRename(chat.id, e)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center
                                         text-emerald-400 hover:text-emerald-300
                                         hover:bg-emerald-400/10 transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelRename}
                              className="w-7 h-7 rounded-lg flex items-center justify-center
                                         text-white/30 hover:text-white/70
                                         hover:bg-white/10 transition-all"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={(e) => startRename(chat, e)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center
                                         text-white/25 hover:text-white/70
                                         hover:bg-white/[0.08] transition-all"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteChat(chat.id) }}
                              className="w-7 h-7 rounded-lg flex items-center justify-center
                                         text-white/25 hover:text-red-400
                                         hover:bg-red-400/10 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
