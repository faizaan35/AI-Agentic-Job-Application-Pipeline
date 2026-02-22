import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"

export default function HistoryPage() {
  const [chats, setChats] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const stored =
      JSON.parse(localStorage.getItem("chats")) || []
    setChats(stored.reverse())
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-6">
        Chats
      </h1>

      <div className="space-y-4">
        {chats.length === 0 && (
          <p className="text-muted-foreground">
            No chats yet.
          </p>
        )}

        {chats.map((chat) => (
          <Card
            key={chat.id}
            className="p-4 cursor-pointer hover:bg-muted transition"
            onClick={() => navigate(`/chat/${chat.id}`)}
          >
            <p className="text-sm font-medium">
              {chat.title}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}