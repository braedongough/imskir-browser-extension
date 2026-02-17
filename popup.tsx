import { useState, useEffect } from "react"

const PROVIDERS = {
  google: { label: "Google Gemini", defaultModel: "gemini-flash-lite-latest" },
  anthropic: { label: "Anthropic Claude", defaultModel: "claude-sonnet-4-5-20250929" },
  openai: { label: "OpenAI", defaultModel: "gpt-4o-mini" }
} as const

type ProviderId = keyof typeof PROVIDERS

function Popup() {
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

  return (
    <div style={{ width: 300, padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Imskir Settings</h2>

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
  )
}

export default Popup
