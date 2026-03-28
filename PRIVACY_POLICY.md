# Privacy Policy for Imskir: Search Scryfall with Natural Language

**Last updated:** March 28, 2026

## Overview

Imskir is a browser extension that translates natural language search queries into Scryfall search syntax using AI. This privacy policy explains how the extension handles your data.

## Data Collection and Usage

### API Keys

You provide an API key for your chosen AI provider (Google Gemini, Anthropic Claude, or OpenAI). This key is stored locally in your browser using `chrome.storage.sync` and is only used to authenticate requests to the AI provider you selected. Your API key is never sent to the extension developer or any other third party.

### Search Queries

When you submit a natural language search on Scryfall, your query is sent to the AI provider you configured in order to translate it into Scryfall search syntax. The extension also stores your recent search history (up to 50 entries) locally in your browser using `chrome.storage.local`. This history never leaves your device.

### Card Lookups

When your query references specific card names, the extension makes requests to the public Scryfall API (`api.scryfall.com`) to verify card names. These requests contain only the card name being looked up.

## Data Storage

All data (API keys, settings, and search history) is stored locally in your browser. No data is collected, stored, or transmitted to the extension developer.

## Third-Party Services

The extension communicates with the following third-party services based on your configuration:

- **Google Gemini API** (if selected as provider)
- **Anthropic Claude API** (if selected as provider)
- **OpenAI API** (if selected as provider)
- **Scryfall API** (for card name lookups)

Your use of these services is subject to their respective privacy policies.

## Changes to This Policy

Updates to this privacy policy will be posted in the extension's repository.

## Contact

If you have questions about this privacy policy, please open an issue at [https://github.com/braedongough/imskir-browser-extension/issues](https://github.com/braedongough/imskir-browser-extension/issues).
