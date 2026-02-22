export default function HistoryPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold mb-4">Chats</h1>
      <input
        placeholder="Search your chats..."
        className="w-full border rounded-md p-3 mb-6"
      />

      <div className="space-y-4">
        <div className="p-4 border rounded-md">
          Sample chat title
        </div>
      </div>
    </div>
  )
}