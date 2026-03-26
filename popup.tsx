import { useState, useEffect } from "react"

const PROVIDERS = {
  google: { label: "Google Gemini", defaultModel: "gemini-flash-lite-latest" },
  anthropic: { label: "Anthropic Claude", defaultModel: "claude-sonnet-4-5-20250929" },
  openai: { label: "OpenAI", defaultModel: "gpt-4o-mini" }
} as const

type ProviderId = keyof typeof PROVIDERS

interface HistoryEntry {
  id: string
  query: string
  translatedQuery: string
  timestamp: number
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) {
    return "just now"
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function Popup() {
  const [tab, setTab] = useState<"history" | "settings">("history")
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [provider, setProvider] = useState<ProviderId>("google")
  const [apiKey, setApiKey] = useState("")
  const [modelId, setModelId] = useState(PROVIDERS.google.defaultModel)
  const [status, setStatus] = useState("")

  useEffect(() => {
    chrome.storage.sync.get(["enabled", "provider", "apiKey", "modelId"], (result) => {
      if (result.enabled !== undefined) {
        setEnabled(result.enabled)
      }
      if (result.provider) {
        setProvider(result.provider)
      }
      if (result.apiKey) {
        setApiKey(result.apiKey)
      }
      if (result.modelId) {
        setModelId(result.modelId)
      }
    })
    chrome.storage.local.get("searchHistory", (result) => {
      setHistory(result.searchHistory || [])
    })
  }, [])

  function handleToggle() {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    chrome.storage.sync.set({ enabled: newEnabled })
  }

  function handleProviderChange(newProvider: ProviderId) {
    setProvider(newProvider)
    setModelId(PROVIDERS[newProvider].defaultModel)
  }

  function handleSave() {
    chrome.storage.sync.set({ provider, apiKey, modelId }, () => {
      setStatus("Saved!")
      setTimeout(() => setStatus(""), 2000)
    })
  }

  function handleCopy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1500)
  }

  function handleClearHistory() {
    chrome.storage.local.set({ searchHistory: [] })
    setHistory([])
  }

  return (
    <div style={{ width: 300, padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        .copyable { transition: background-color 0.15s; }
        .copyable:hover { background-color: #f0f4ff; }
        .copyable .copy-icon { opacity: 0; transition: opacity 0.15s; }
        .copyable:hover .copy-icon { opacity: 0.5; }
      `}</style>
      <div style={{
        display: "flex",
        gap: 0,
        marginBottom: 12,
        borderBottom: "1px solid #e0e0e0"
      }}>
        {(["history", "settings"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: "8px 0",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              background: "none",
              border: "none",
              borderBottom: tab === t ? "2px solid #1a73e8" : "2px solid transparent",
              color: tab === t ? "#1a73e8" : "#666",
              textTransform: "capitalize"
            }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "history" && (
        <div>
          {history.length === 0 && (
            <p style={{ fontSize: 13, color: "#888", textAlign: "center", margin: "24px 0" }}>
              No searches yet
            </p>
          )}
          {history.length > 0 && (
            <>
              <div style={{ maxHeight: 350, overflowY: "auto" }}>
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      border: "1px solid #e0e0e0",
                      borderRadius: 6,
                      padding: "8px 10px",
                      marginBottom: 8,
                      fontSize: 13
                    }}>
                    <div
                      className="copyable"
                      onClick={() => handleCopy(entry.query, `${entry.id}-query`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 6,
                        fontWeight: 600,
                        marginBottom: 4,
                        cursor: "pointer",
                        borderRadius: 4,
                        padding: "3px 6px",
                        margin: "-3px -6px 4px"
                      }}>
                      <span>{entry.query}</span>
                      <span className="copy-icon" style={{ flexShrink: 0, color: copiedKey === `${entry.id}-query` ? "#1a73e8" : "#888" }}>
                        {copiedKey === `${entry.id}-query` ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        )}
                      </span>
                    </div>
                    <div
                      className="copyable"
                      onClick={() => handleCopy(entry.translatedQuery, `${entry.id}-translated`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 6,
                        fontFamily: "monospace",
                        fontSize: 12,
                        color: "#555",
                        wordBreak: "break-all",
                        cursor: "pointer",
                        borderRadius: 4,
                        padding: "3px 6px",
                        margin: "0 -6px"
                      }}>
                      <span>{entry.translatedQuery}</span>
                      <span className="copy-icon" style={{ flexShrink: 0, color: copiedKey === `${entry.id}-translated` ? "#1a73e8" : "#888" }}>
                        {copiedKey === `${entry.id}-translated` ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        )}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                      {formatTimeAgo(entry.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleClearHistory}
                style={{
                  marginTop: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                  backgroundColor: "transparent",
                  color: "#888",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  width: "100%"
                }}>
                Clear History
              </button>
            </>
          )}
        </div>
      )}

      {tab === "settings" && (
        <div>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
            padding: "8px 0",
            borderBottom: "1px solid #e0e0e0"
          }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {enabled ? "Enabled" : "Disabled"}
            </span>
            <button
              onClick={handleToggle}
              role="switch"
              aria-checked={enabled}
              style={{
                position: "relative",
                width: 44,
                height: 24,
                borderRadius: 12,
                border: "none",
                cursor: "pointer",
                backgroundColor: enabled ? "#1a73e8" : "#ccc",
                transition: "background-color 0.2s",
                padding: 0
              }}>
              <span style={{
                position: "absolute",
                top: 2,
                left: enabled ? 22 : 2,
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: "white",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
              }} />
            </button>
          </div>

          <label style={{ display: "block", marginBottom: 10 }}>
            <span style={{ display: "block", marginBottom: 2, fontSize: 13, fontWeight: 600 }}>Provider</span>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as ProviderId)}
              style={{ width: "100%", padding: 6, fontSize: 13 }}>
              {Object.entries(PROVIDERS).map(([id, { label }]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </label>

          <label style={{ display: "block", marginBottom: 10 }}>
            <span style={{ display: "block", marginBottom: 2, fontSize: 13, fontWeight: 600 }}>API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              style={{ width: "100%", padding: 6, fontSize: 13, boxSizing: "border-box" }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", marginBottom: 2, fontSize: 13, fontWeight: 600 }}>Model ID</span>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              style={{ width: "100%", padding: 6, fontSize: 13, boxSizing: "border-box" }}
            />
          </label>

          <button
            onClick={handleSave}
            style={{
              padding: "6px 16px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              backgroundColor: "#1a73e8",
              color: "white",
              border: "none",
              borderRadius: 4
            }}>
            Save
          </button>

          {status && (
            <span style={{ marginLeft: 8, fontSize: 13, color: "green" }}>{status}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default Popup
