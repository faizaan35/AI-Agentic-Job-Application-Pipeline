import { CheckCircle2, Circle, Loader2 } from "lucide-react"

const steps = [
  {
    id: 1,
    title: "Scrape Jobs",
    description: "Collect relevant job listings from selected sources.",
    status: "completed",
  },
  {
    id: 2,
    title: "Match Resume",
    description: "Rank jobs using semantic similarity scoring.",
    status: "completed",
  },
  {
    id: 3,
    title: "Tailor Resume",
    description: "Generate customized resumes for top matches.",
    status: "active",
  },
  {
    id: 4,
    title: "Generate Cover Letter",
    description: "Create personalized cover letters per job.",
    status: "pending",
  },
  {
    id: 5,
    title: "Application Tracking",
    description: "Track application status & responses.",
    status: "pending",
  },
]

export default function PipelinePage() {
  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="w-full max-w-6xl bg-[#0e1116] border border-white/5 rounded-3xl p-10 shadow-[0_0_60px_rgba(0,0,0,0.6)]">

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-semibold text-white mb-2">
            Resume Optimization Pipeline
          </h1>
          <p className="text-white/60">
            Visualize and monitor your AI-powered career automation workflow.
          </p>
        </div>

        {/* Pipeline Flow */}
        <div className="flex items-center justify-between relative">

          {/* Connecting Line */}
          <div className="absolute top-5 left-0 right-0 h-[2px] bg-white/10 z-0" />

          {steps.map((step, index) => (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center w-1/5"
            >
              {/* Icon */}
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

              {/* Title */}
              <h3 className="mt-4 text-sm font-semibold text-white text-center">
                {step.title}
              </h3>

              {/* Description */}
              <p className="mt-2 text-xs text-white/50 text-center px-2">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Stats Section */}
        <div className="mt-16 grid grid-cols-3 gap-6">

          <div className="bg-[#12161d] border border-white/5 rounded-2xl p-6">
            <p className="text-white/50 text-sm">Jobs Scraped</p>
            <h2 className="text-2xl font-semibold text-white mt-2">120</h2>
          </div>

          <div className="bg-[#12161d] border border-white/5 rounded-2xl p-6">
            <p className="text-white/50 text-sm">Top Matches Generated</p>
            <h2 className="text-2xl font-semibold text-white mt-2">15</h2>
          </div>

          <div className="bg-[#12161d] border border-white/5 rounded-2xl p-6">
            <p className="text-white/50 text-sm">Applications Sent</p>
            <h2 className="text-2xl font-semibold text-white mt-2">3</h2>
          </div>

        </div>

      </div>
    </div>
  )
}