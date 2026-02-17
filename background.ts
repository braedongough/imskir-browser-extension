import { generateText, tool } from "ai"
import { z } from "zod"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { createAnthropic } from "@ai-sdk/anthropic"

const syntax = `... Scryfall search syntax reference ...
Colors: c: or color: (w, u, r, b, g, colorless, multicolor, guild/shard names)
Color identity: id: or identity:
Card types: t: or type:
Oracle text: o: or oracle: (use quotes for phrases, ~ for card name)
Full oracle: fo: or fulloracle:
Keywords: keyword: or kw:
Mana costs: m: or mana: (e.g. m:2WW, m:{G}{U})
Mana value: mv or manavalue (with comparisons like mv=5, mv>=3)
Power: pow or power (pow>=8, pow>tou)
Toughness: tou or toughness
Loyalty: loy or loyalty
Multi-faced: is:split, is:flip, is:transform, is:meld, is:dfc, is:mdfc
Spells/permanents: is:spell, is:permanent, is:historic, is:vanilla
Rarity: r: or rarity: (common, uncommon, rare, mythic, special, bonus)
Sets: s:, e:, set:, edition: (three-letter set codes)
Collector number: cn: or number:
Blocks: b: or block:
Set types: st:core, st:expansion, st:masters, st:commander, etc.
Cubes: cube: (vintage, modern, legacy, etc.)
Format legality: f: or format: (standard, modern, legacy, vintage, commander, pioneer, pauper, etc.)
Banned/restricted: banned:, restricted:
Commander: is:commander, is:brawler, is:companion
Reserved list: is:reserved
Prices: usd, eur, tix (with comparisons like usd>=0.50)
Cheapest: cheapest:usd, cheapest:eur, cheapest:tix
Artist: a: or artist:
Flavor text: ft: or flavor:
Watermark: wm: or watermark:
New printings: new:art, new:artist, new:flavor, new:frame, new:rarity, new:language
Border: border: (black, white, silver, borderless)
Frame: frame: (1993, 1997, 2003, 2015, future, legendary, etc.)
Foil: is:foil, is:nonfoil, is:etched, is:glossy
Full art: is:full
High-res: is:hires
Games: game: (paper, mtgo, arena)
Promos: is:promo, is:spotlight
Year/date: year, date (with comparisons, e.g. year<=1994, date>=2015-08-18)
Art tags: art: or atag:
Oracle tags: function: or otag:
Reprints: is:reprint, not:reprint, is:unique, prints=, sets=
Languages: lang: or language: (lang:any for all)
Land nicknames: is:dual, is:fetchland, is:shockland, is:checkland, etc.
Negation: prefix with - (e.g. -t:creature), or use not: instead of is:
OR: use "or" between terms (e.g. t:fish or t:bird)
Nesting: use parentheses (e.g. t:legendary (t:goblin or t:elf))
Exact names: prefix with ! (e.g. !"Lightning Bolt")
Regex: use /regex/ with type:, oracle:, flavor:, name:
Display: unique:cards/prints/art, display:grid/checklist/full/text
Sorting: order:name/cmc/power/usd/rarity/color/released/edhrec, direction:asc/desc
Preferences: prefer:oldest/newest/usd-low/usd-high
Devotion: devotion: (e.g. devotion:{u/b}{u/b}{u/b})
Produces: produces: (e.g. produces=wu)
Include extras: include:extras`

interface ProviderConfig {
  provider: string
  apiKey: string
  modelId: string
}

function getSettings(): Promise<ProviderConfig> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["provider", "apiKey", "modelId"], (result) => {
      resolve({
        provider: result.provider || "",
        apiKey: result.apiKey || "",
        modelId: result.modelId || ""
      })
    })
  })
}

function createModel(config: ProviderConfig) {
  if (config.provider === "google") {
    const google = createGoogleGenerativeAI({ apiKey: config.apiKey })
    return google(config.modelId)
  }
  if (config.provider === "openai") {
    const openai = createOpenAI({ apiKey: config.apiKey })
    return openai(config.modelId)
  }
  if (config.provider === "anthropic") {
    const anthropic = createAnthropic({ apiKey: config.apiKey })
    return anthropic(config.modelId)
  }
  throw new Error(`Unknown provider: ${config.provider}`)
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== "translate-query") {
    return
  }

  translateQuery(message.query)
    .then((translatedQuery) => sendResponse({ translatedQuery }))
    .catch((error) => {
      console.error("[Imskir] Translation error:", error)
      sendResponse({ translatedQuery: null, error: error.message })
    })

  return true
})

async function translateQuery(query: string): Promise<string> {
  const config = await getSettings()

  if (!config.apiKey || !config.provider) {
    throw new Error("No API key configured. Open extension options to set up your provider and API key.")
  }

  const model = createModel(config)

  const { text } = await generateText({
    model,
    system: [
      "You are an expert at Magic the Gathering and using the Scryfall api.",
      `The scryfall search api has the following syntax rules for searching: ${syntax}`,
      "Your job is to help users generate search queries that adhere to the scryfall search syntax based on their natural language query.",
      "When users mention specific card names, use the scryfall-search tool to look up the exact card name before including it in the query.",
      "Respond with ONLY the Scryfall search query. No explanation, no markdown, no extra text."
    ].join("\n"),
    tools: {
      "scryfall-search": tool({
        description:
          "Fuzzy search for a Magic card by name using the Scryfall API. Returns the card's exact name. Use this when the user mentions a specific card name to get the correct spelling.",
        inputSchema: z.object({
          cardName: z
            .string()
            .describe("The card name to search for (can be partial or misspelled)")
        }),
        execute: async ({ cardName }) => {
          console.log("[Imskir] Tool call: scryfall-search, cardName:", cardName)
          const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`
          const response = await fetch(url)

          if (!response.ok) {
            console.log("[Imskir] Card not found:", cardName)
            return { error: "Card not found", query: cardName }
          }

          const card = await response.json()
          console.log("[Imskir] Card found:", card.name)
          return { name: card.name, type_line: card.type_line, oracle_text: card.oracle_text }
        }
      })
    },
    maxRetries: 3,
    prompt: query
  })

  console.log("[Imskir] Final translated query:", text)
  return text.trim()
}
