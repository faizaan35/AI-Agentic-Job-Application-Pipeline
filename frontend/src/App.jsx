import { BrowserRouter, Routes, Route } from "react-router-dom"
import AppLayout from "./layout/AppLayout"
import ChatHome from "./pages/ChatHome"
import ChatPage from "./pages/ChatPage"
import HistoryPage from "./pages/HistoryPage"
import PipelinePage from "./pages/PipelinePage"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<ChatHome />} />
          <Route path="/chat/:id" element={<ChatPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}