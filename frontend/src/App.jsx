import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000"; 

const PIPELINE_NODES = [
  { key: "profile", label: "Extract Profile" },
  { key: "jobs", label: "Scrape Jobs" },
  { key: "matches", label: "Match" },
  { key: "refined", label: "Refine (LLM)" },
  { key: "tailored", label: "Tailor" },
  { key: "structured", label: "Structure" },
  { key: "cover_letters", label: "Cover Letters" },
  { key: "artifacts", label: "PDFs" },
];

export default function App() {
  const [resumeText, setResumeText] = useState("");
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(true);
  const [simulate, setSimulate] = useState(false);
  const [logs, setLogs] = useState([]);
  const startTsRef = useRef(null);

  function pushLog(msg) {
    setLogs((s) => [`${new Date().toLocaleTimeString()}: ${msg}`, ...s].slice(0, 60));
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0] || null;
    if (!f) {
      setFile(null);
      return;
    }
    const allowed = [".txt", ".md", ".pdf", ".docx"];
    const name = f.name.toLowerCase();
    const ok = allowed.some((ext) => name.endsWith(ext));
    if (!ok) {
      pushLog(`Warn: file type ${f.name} not recommended for demo`);
    }
    setFile(f);
  }

  async function runPipeline() {
    setLoading(true);
    setResult(null);
    setStatus("starting");
    setJobId(null);
    startTsRef.current = Date.now();
    try {
      const formData = new FormData();
      if (file) formData.append("file", file);
      else formData.append("resume_text", resumeText || ""); // server expects something
      formData.append("top_n", 3);
      formData.append("agentic", String(true));

      pushLog("Submitting run to server...");
      const res = await axios.post(`${API_URL}/run`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      const data = res.data;
      setJobId(data.job_id);
      setStatus("started");
      pushLog(`Job started: ${data.job_id}`);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || "Unknown error";
      pushLog(`Error starting job: ${msg}`);
      setStatus("error starting job");
    } finally {
      setLoading(false);
    }
  }

  // Poller
  useEffect(() => {
    if (!jobId) return;
    let mounted = true;
    let stopped = false;

    const poll = async () => {
      try {
        const res = await axios.get(`${API_URL}/jobs/${jobId}`, { timeout: 120000 });
        if (!mounted) return;
        const data = res.data;
        setStatus(data.status || "");
        if (data.result) setResult(data.result);
        else setResult(null);

        if (data.status === "done" || data.status === "error" || !polling || stopped) {
          pushLog(`Polling stopped (status: ${data.status})`);
          return;
        }
      } catch (e) {
        pushLog(`Poll error: ${e.message || "network"}`);
      }
      setTimeout(poll, 2000);
    };

    if (simulate) {
      pushLog("Simulate mode: animating pipeline (no backend polling)");
      fakeSimulate(jobId);
    } else {
      poll();
    }

    return () => {
      mounted = false;
      stopped = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, polling, simulate]);

  // Simulate pipeline for demos (if backend slow or missing LLM)
  async function fakeSimulate(id) {
    setStatus("started");
    setResult(null);
    const steps = ["profile", "jobs", "matches", "refined", "tailored", "structured", "cover_letters", "artifacts"];
    let fake = {};
    for (let i = 0; i < steps.length; i++) {
      // small delay for each step
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 600));
      const k = steps[i];
      fake = { ...fake, [k]: true };
      setResult({ ...fake, pdf_files: i >= 6 ? [`outputs/runs/${id}/resumes/${id}_resume.pdf`] : [] });
    }
    setStatus("done");
    pushLog("Simulation finished");
  }

  function nodeCompleted(resultObj, key) {
    if (!resultObj) return false;
    if (key === "refined") return !!resultObj.refined;
    if (key === "artifacts") return (resultObj.pdf_files && resultObj.pdf_files.length > 0) || !!resultObj.artifacts;
    return resultObj[key] !== undefined && resultObj[key] !== null;
  }

  function copyJobId() {
    if (!jobId) return;
    navigator.clipboard?.writeText(jobId);
    pushLog("Job ID copied to clipboard");
  }

  function openAllPdfs() {
    if (!result?.pdf_files) return;
    result.pdf_files.forEach((p) => {
      const url = `${API_URL}/download?path=${encodeURIComponent(p)}`;
      window.open(url, "_blank");
    });
    pushLog(`Opened ${result.pdf_files.length} PDF(s)`);
  }

  return (
    
    <div className="min-h-screen min-w-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-sky-700">🧠 Job Agent — Demo</h1>
            <p className="text-sm text-slate-500 mt-1">Proof-of-concept front end — connects to your FastAPI backend</p>
          </div>
          <div className="text-xs text-slate-600">
            {jobId ? (
              <div className="flex items-center gap-2">
                <span className="font-mono px-2 py-1 bg-white border rounded">{jobId}</span>
                <button onClick={copyJobId} className="text-xs px-2 py-1 border rounded">
                  Copy
                </button>
              </div>
            ) : (
              <span className="italic">No job running</span>
            )}
          </div>
        </header>

        {/* Main white card */}
        <main className="bg-white shadow-xl rounded-2xl p-8 w-full">
          <div>
            <label className="block text-sm font-medium text-slate-700">Paste resume text (recommended for demo)</label>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              className="mt-2 w-full rounded border p-3 h-36 focus:ring-2 focus:ring-sky-300"
              placeholder="Paste resume text here..."
            />
          </div>

          <div className="mt-4 flex items-center gap-4 bg-gray-50 p-4 rounded-3xl">
            <input type="file" onChange={handleFileChange} accept=".txt,.md,.pdf,.docx" className="ml-auto bg-gray-100 text-black px-4 py-2 rounded shadow hover:opacity-95 disabled:opacity-50" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked /> Agentic (LLM)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={simulate} onChange={(e) => setSimulate(e.target.checked)} /> Simulate (demo)
            </label>

            <button
              onClick={runPipeline}
              disabled={loading}
              className="ml-auto bg-sky-600 text-black px-4 py-2 rounded shadow hover:opacity-95 disabled:opacity-50"
            >
              {loading ? "Starting…" : "Run Job Agent"}
            </button>
          </div>

          <div className="mt-6">
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-600">Status:</div>
              <div className="font-semibold">{status || "idle"}</div>
              {status === "started" && startTsRef.current && <ElapsedTimer startTsRef={startTsRef} />}
              {result?.pdf_files?.length > 0 && (
                <button onClick={openAllPdfs} className="ml-auto text-sm px-3 py-1 border rounded">
                  Open PDFs
                </button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Pipeline</h3>
                <div className="space-y-2">
                  {PIPELINE_NODES.map((n) => {
                    const done = nodeCompleted(result, n.key);
                    return (
                      <div
                        key={n.key}
                        className={`flex items-center gap-3 p-2 rounded ${
                          done ? "bg-green-50 border border-green-100" : "bg-slate-50 border border-slate-100"
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full ${done ? "bg-green-500" : "bg-slate-300"}`} />
                        <div className="text-sm">{n.label}</div>
                        {done && <div className="ml-auto text-xs text-green-700">done</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Result / Artifacts</h3>

                {!result && <div className="text-xs text-slate-500">No result yet.</div>}
                {result && (
                  <div>
                    <pre className="bg-slate-100 p-3 rounded text-xs max-h-44 overflow-auto">{JSON.stringify(result, null, 2)}</pre>

                    {result.pdf_files && result.pdf_files.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium">PDFs</h4>
                        <ul className="mt-2 space-y-2">
                          {result.pdf_files.map((p, idx) => (
                            <li key={idx} className="flex items-center justify-between border rounded p-2 bg-white">
                              <div className="truncate max-w-xs text-sm">{p.split("/").pop()}</div>
                              <div className="flex gap-2">
                                <a
                                  className="text-xs px-2 py-1 border rounded"
                                  target="_blank"
                                  rel="noreferrer"
                                  href={`${API_URL}/download?path=${encodeURIComponent(p)}`}
                                >
                                  Download
                                </a>
                                <a className="text-xs px-2 py-1 border rounded" target="_blank" rel="noreferrer" href={p}>
                                  Open raw
                                </a>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium">Logs</h4>
              <div className="mt-2 bg-black text-green-200 p-3 rounded h-36 overflow-auto text-xs">
                {logs.length === 0 ? <div className="text-slate-400">No logs yet</div> : logs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function ElapsedTimer({ startTsRef }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!startTsRef.current) return null;
  const diff = Date.now() - startTsRef.current;
  const s = Math.floor(diff / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return <div className="text-sm text-slate-500">• running {mm}:{ss}</div>;
}
