import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://scryfall.com/*"]
}

const GLOW_RING_STYLES = `
@property --imskir-angle {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: false;
}

@keyframes imskir-rotate {
  to {
    --imskir-angle: 360deg;
  }
}

#imskir-glow-ring {
  position: absolute;
  border-radius: 6px;
  box-sizing: content-box;
  padding: 3px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  background: conic-gradient(
    from var(--imskir-angle),
    #ff4500,
    #ffa500,
    #8b0000,
    #1a0a00,
    #ff6b35,
    #ff4500
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) padding-box,
    linear-gradient(#fff 0 0) content-box;
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#fff 0 0) padding-box,
    linear-gradient(#fff 0 0) content-box;
  mask-composite: exclude;
  filter: blur(4px);
  z-index: 0;
}

#imskir-glow-ring.imskir-visible {
  opacity: 1;
}

#imskir-glow-ring.imskir-loading {
  opacity: 1;
  animation: imskir-rotate 1.5s linear infinite;
}
`

function injectStyles() {
  const style = document.createElement("style")
  style.textContent = GLOW_RING_STYLES
  document.head.appendChild(style)
}

function syncRingPosition(ring: HTMLDivElement, input: HTMLInputElement) {
  ring.style.top = (input.offsetTop - 3) + "px"
  ring.style.left = (input.offsetLeft - 3) + "px"
  ring.style.width = input.offsetWidth + "px"
  ring.style.height = input.offsetHeight + "px"
}

function createGlowRing(searchInput: HTMLInputElement): HTMLDivElement | null {
  const parent = searchInput.parentElement
  if (!parent) {
    return null
  }

  parent.style.position = "relative"
  parent.style.overflow = "visible"
  searchInput.style.position = "relative"
  searchInput.style.zIndex = "1"

  const ring = document.createElement("div")
  ring.id = "imskir-glow-ring"
  searchInput.insertAdjacentElement("afterend", ring)

  syncRingPosition(ring, searchInput)

  const observer = new ResizeObserver(() => {
    syncRingPosition(ring, searchInput)
  })
  observer.observe(searchInput)

  window.addEventListener("resize", () => {
    syncRingPosition(ring, searchInput)
  })

  return ring
}

function setRingState(ring: HTMLDivElement, state: "hidden" | "visible" | "loading") {
  ring.classList.remove("imskir-visible", "imskir-loading")
  if (state === "visible") {
    ring.classList.add("imskir-visible")
  } else if (state === "loading") {
    ring.classList.add("imskir-loading")
  }
}

function interceptSearch() {
  const searchInput = document.querySelector<HTMLInputElement>('input[name="q"][type="text"], input[name="q"]:not([type])')
  if (!searchInput) {
    return
  }

  const form = searchInput.closest("form")
  if (!form) {
    return
  }

  injectStyles()
  const ring = createGlowRing(searchInput)

  let enabled = false

  chrome.storage.sync.get(["enabled"], (result) => {
    enabled = result.enabled === true
    if (ring) {
      setRingState(ring, enabled ? "visible" : "hidden")
    }
  })

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      enabled = changes.enabled.newValue === true
      if (ring) {
        setRingState(ring, enabled ? "visible" : "hidden")
      }
    }
  })

  form.addEventListener("submit", async (event) => {
    event.preventDefault()

    const query = searchInput.value.trim()
    if (!query) {
      return
    }

    if (!enabled) {
      form.submit()
      return
    }

    console.log("[Imskir] Intercepted search query:", query)

    if (ring) {
      setRingState(ring, "loading")
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "translate-query",
        query
      })

      if (response?.error) {
        console.warn("[Imskir] Translation failed:", response.error)
      } else if (response?.translatedQuery) {
        console.log("[Imskir] Translated query:", response.translatedQuery)
        searchInput.value = response.translatedQuery
      }
    } catch (error) {
      console.warn("[Imskir] Extension context invalidated, submitting original query")
    }

    if (ring) {
      setRingState(ring, "visible")
    }

    form.submit()
  })
}

interceptSearch()
