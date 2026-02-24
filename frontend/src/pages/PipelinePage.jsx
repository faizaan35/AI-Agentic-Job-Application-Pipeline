import { useEffect, useState } from "react"
import { CheckCircle2, Circle, Loader2, Upload, Briefcase, FileText, Sparkles } from "lucide-react"

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
          jobsScraped: 10,
          matches: result.matches?.length || 0,
          pdfs:
            (result.structured?.length || 0) * 2 +
            (result.cover_letters?.length || 0) +
            (result.interview_prep?.length || 0),
        })

        setSteps(prev =>
          prev.map(step => ({ ...step, status: "completed" }))
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
    const durations = [5000, 3500, 3500, 3500]

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

  // Progress line width based on steps
  const completedCount = steps.filter(s => s.status === "completed").length
  const activeCount = steps.filter(s => s.status === "active").length
  const progressPct = ((completedCount + activeCount * 0.5) / (steps.length - 1)) * 100

  return (
    <div className="h-full overflow-y-auto px-6 py-10">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-semibold text-white mb-2 tracking-tight">
            Resume Optimization Pipeline
          </h1>
          <p className="text-white/40 text-sm">
            Visualize and monitor your AI-powered career workflow.
          </p>
        </div>

        {/* ── Upload + Run ────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-3 mb-16">

          {/* Upload button — outline style */}
          <label className="flex items-center gap-2.5 px-5 py-3 rounded-2xl
                            border border-white/15 hover:border-white/30
                            bg-white/[0.03] hover:bg-white/[0.06]
                            transition-all duration-200 cursor-pointer group">
            <Upload className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors" />
            <span className="text-white/50 group-hover:text-white/80 text-sm transition-colors">
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

          {/* Run button */}
          <button
            onClick={runPipeline}
            disabled={isRunning}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl
                       bg-emerald-500 hover:bg-emerald-400
                       text-black font-medium text-sm
                       shadow-[0_0_20px_rgba(16,185,129,0.25)]
                       hover:shadow-[0_0_28px_rgba(16,185,129,0.4)]
                       transition-all duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Run Pipeline
              </>
            )}
          </button>

        </div>

        {/* ── Pipeline Stepper ────────────────────────────────────────── */}
        <div className="relative mb-16 px-4">

          {/* Background track */}
          <div className="absolute top-5 left-[10%] w-[80%] h-[2px] bg-white/[0.06] z-0" />

          {/* Animated progress fill */}
          <div
            className="absolute top-5 left-[10%] h-[2px] bg-emerald-500/60 z-0 transition-all duration-700 ease-in-out"
            style={{ width: `${Math.min(progressPct * 0.8, 80)}%` }}
          />

          <div className="flex items-start justify-between relative z-10">
            {steps.map(step => (
              <div key={step.id} className="flex flex-col items-center w-1/5">

                {/* Circle */}
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-full border-2 transition-all duration-500 ${
                    step.status === "completed"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : step.status === "active"
                      ? "bg-white/[0.06] border-white/30 text-white shadow-[0_0_12px_rgba(255,255,255,0.1)]"
                      : "bg-white/[0.03] border-white/10 text-white/30"
                  }`}
                >
                  {step.status === "completed" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : step.status === "active" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>

                <h3 className={`mt-4 text-xs font-semibold text-center transition-colors duration-300 ${
                  step.status === "completed"
                    ? "text-emerald-400"
                    : step.status === "active"
                    ? "text-white"
                    : "text-white/40"
                }`}>
                  {step.title}
                </h3>

                <p className="mt-1.5 text-[11px] text-white/30 text-center px-1 leading-relaxed">
                  {step.description}
                </p>

              </div>
            ))}
          </div>
        </div>

        {/* ── Stat Cards ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">

          <div className="relative overflow-hidden bg-white/[0.03] border border-white/[0.07]
                          rounded-2xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider font-medium">Jobs Scraped</p>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Briefcase className="w-3.5 h-3.5 text-emerald-500/70" />
              </div>
            </div>
            <h2 className="text-3xl font-semibold text-white">{stats.jobsScraped}</h2>
          </div>

          <div className="relative overflow-hidden bg-white/[0.03] border border-white/[0.07]
                          rounded-2xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider font-medium">Top Matches</p>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-blue-400/70" />
              </div>
            </div>
            <h2 className="text-3xl font-semibold text-white">{stats.matches}</h2>
          </div>

          <div className="relative overflow-hidden bg-white/[0.03] border border-white/[0.07]
                          rounded-2xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/40 text-xs uppercase tracking-wider font-medium">PDFs Generated</p>
              <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-violet-400/70" />
              </div>
            </div>
            <h2 className="text-3xl font-semibold text-white">{stats.pdfs}</h2>
          </div>

        </div>

      </div>
    </div>
  )
}
