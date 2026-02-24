import { useEffect, useState } from "react"
import { CheckCircle2, Circle, Loader2, Upload } from "lucide-react"

export default function PipelinePage() {
  const [file, setFile] = useState(null)
  const [jobId, setJobId] = useState(null)
  const [isRunning, setIsRunning] = useState(false)

  const [steps, setSteps] = useState([
    {
      id: 1,
      title: "Scrape Jobs",
      description: "Collect relevant job listings from sources.",
      status: "pending",
    },
    {
      id: 2,
      title: "Match Resume",
      description: "Rank jobs using similarity scoring.",
      status: "pending",
    },
    {
      id: 3,
      title: "Tailor Resume",
      description: "Generate customized resume.",
      status: "pending",
    },
    {
      id: 4,
      title: "Generate Interview Prep",
      description: "Create interview strategy & plan.",
      status: "pending",
    },
    {
      id: 5,
      title: "Render PDFs",
      description: "Generate resume & prep documents.",
      status: "pending",
    },
  ])

  const [stats, setStats] = useState({
    jobsScraped: 0,
    matches: 0,
    pdfs: 0,
  })

  // =========================
  // Run Pipeline
  // =========================

  const runPipeline = async () => {
    if (!file) {
      alert("Upload your resume PDF first.")
      return
    }

    setIsRunning(true)

    setSteps(prev =>
      prev.map((step, index) => ({
        ...step,
        status: index === 0 ? "active" : "pending",
      }))
    )

    const formData = new FormData()
    formData.append("file", file)
    formData.append("top_n", "2")
    formData.append("agentic", "true")

    const res = await fetch("http://127.0.0.1:8000/run", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()
    setJobId(data.job_id)
  }

  // =========================
  // Poll Backend
  // =========================

  useEffect(() => {
    if (!jobId) return

    const interval = setInterval(async () => {
      const res = await fetch(`http://127.0.0.1:8000/jobs/${jobId}`)
      const data = await res.json()

      if (data.status === "done") {
        clearInterval(interval)

        const result = data.result

        setStats({
          jobsScraped: 10, // Always 10 scraped
          matches: result.matches?.length || 0,
          pdfs:
            (result.structured?.length || 0) * 2 +
            (result.cover_letters?.length || 0) +
            (result.interview_prep?.length || 0),
        })

        setSteps(prev =>
          prev.map(step => ({
            ...step,
            status: "completed",
          }))
        )

        setIsRunning(false)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [jobId])

  // =========================
  // Animated Step Progression
  // =========================

  useEffect(() => {
    if (!isRunning) return

    let current = 0

    const durations = [5000, 3500, 3500, 3500] // First step 5 sec

    const advanceStep = () => {
      setSteps(prev => {
        const updated = [...prev]

        if (current < updated.length - 1) {
          updated[current].status = "completed"
          updated[current + 1].status = "active"
          current++
        }

        return updated
      })

      if (current < durations.length) {
        setTimeout(advanceStep, durations[current])
      }
    }

    setTimeout(advanceStep, durations[0])

  }, [isRunning])

  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="w-full max-w-6xl bg-[#0e1116] border border-white/5 rounded-3xl p-10 shadow-[0_0_60px_rgba(0,0,0,0.6)]">

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-semibold text-white mb-2">
            Resume Optimization Pipeline
          </h1>
          <p className="text-white/60">
            Visualize and monitor your AI-powered career workflow.
          </p>
        </div>

        {/* Upload + Run */}
        <div className="flex items-center justify-center gap-4 mb-14">

          <label className="flex items-center gap-2 px-5 py-3 rounded-2xl 
                            bg-[#12161d] border border-white/10 
                            hover:border-white/20 transition cursor-pointer">
            <Upload className="w-4 h-4 text-white/60" />
            <span className="text-white/70 text-sm">
              {file ? file.name : "Upload Resume (PDF)"}
            </span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) setFile(e.target.files[0])
              }}
            />
          </label>

          <button
            onClick={runPipeline}
            disabled={isRunning}
            className="px-6 py-3 rounded-2xl 
                       bg-emerald-500 text-black font-medium
                       hover:bg-emerald-400 transition-all
                       disabled:opacity-50"
          >
            {isRunning ? "Running..." : "Run Pipeline"}
          </button>

        </div>

        {/* Pipeline Flow */}
        <div className="flex items-center justify-between relative">

          <div className="absolute top-5 left-0 right-0 h-[2px] bg-white/10 z-0" />

          {steps.map(step => (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center w-1/5"
            >
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full border ${
                  step.status === "completed"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : step.status === "active"
                    ? "bg-[#1a1f27] border-white/20 text-white"
                    : "bg-[#12161d] border-white/10 text-white/40"
                }`}
              >
                {step.status === "completed" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : step.status === "active" ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
              </div>

              <h3 className="mt-4 text-sm font-semibold text-white text-center">
                {step.title}
              </h3>

              <p className="mt-2 text-xs text-white/50 text-center px-2">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-6">

          <div className="bg-[#12161d] border border-white/5 rounded-2xl p-6">
            <p className="text-white/50 text-sm">Jobs Scraped</p>
            <h2 className="text-2xl font-semibold text-white mt-2">
              {stats.jobsScraped}
            </h2>
          </div>

          <div className="bg-[#12161d] border border-white/5 rounded-2xl p-6">
            <p className="text-white/50 text-sm">Top Matches Generated</p>
            <h2 className="text-2xl font-semibold text-white mt-2">
              {stats.matches}
            </h2>
          </div>

          <div className="bg-[#12161d] border border-white/5 rounded-2xl p-6">
            <p className="text-white/50 text-sm">PDFs Generated</p>
            <h2 className="text-2xl font-semibold text-white mt-2">
              {stats.pdfs}
            </h2>
          </div>

        </div>

      </div>
    </div>
  )
}