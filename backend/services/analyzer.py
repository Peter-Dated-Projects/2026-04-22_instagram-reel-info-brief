"""LLM analysis service using Ollama (gemma4:e4b).

Generates summaries and extracts structured lists from reel content.
"""

import os
import json
import logging

import httpx

logger = logging.getLogger(__name__)

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://100.70.106.65:11434")
MODEL = "gemma4:e4b"

SUMMARY_PROMPT = """Analyze this Instagram Reel's transcript and description. Produce a brief, no-fluff summary in bullet-point form that someone could copy-paste into their notes.

**Description:**
{description}

**Transcript:**
{transcript}

Format your response EXACTLY like this (use these headers, use bullet points):

**Topic:** one-line description of what this reel is about

**Key Takeaways:**
- (most important point 1)
- (most important point 2)
- (etc.)

**Notable Quotes/Claims:**
- "exact quote or paraphrased claim" (if any)

**Who This Is For:** one-line target audience

Keep it short and dense. No filler words. No introductions. Just the useful information."""

LISTS_PROMPT = """You are an expert content analyst. Given the transcript and description of an Instagram Reel, extract any lists, steps, tips, recommendations, or enumerable items mentioned in the content.

**Description:**
{description}

**Transcript:**
{transcript}

Extract ALL lists found in the content. Each list should have a descriptive title and its items.

Respond in this exact JSON format (and nothing else):
{{
  "lists": [
    {{
      "title": "List Title",
      "items": ["item 1", "item 2", "item 3"]
    }}
  ]
}}

If no lists are found, respond with: {{"lists": []}}
Important: respond ONLY with valid JSON, no markdown fencing, no explanation."""


async def generate_summary(transcript: str, description: str) -> str:
    """Generate an AI summary of the reel content.

    Args:
        transcript: The speech transcript
        description: The reel's caption/description

    Returns:
        Summary text
    """
    prompt = SUMMARY_PROMPT.format(
        transcript=transcript or "(No speech detected)",
        description=description or "(No description provided)",
    )

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", "Failed to generate summary.")


async def extract_lists(transcript: str, description: str) -> list[dict]:
    """Extract structured lists from the reel content.

    Args:
        transcript: The speech transcript
        description: The reel's caption/description

    Returns:
        List of dicts with 'title' and 'items' keys
    """
    prompt = LISTS_PROMPT.format(
        transcript=transcript or "(No speech detected)",
        description=description or "(No description provided)",
    )

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                "model": MODEL,
                "prompt": prompt,
                "stream": False,
            },
        )
        response.raise_for_status()
        data = response.json()
        raw_response = data.get("response", "")

    # Parse JSON from response
    try:
        # Try to extract JSON from the response (handle potential markdown fencing)
        cleaned = raw_response.strip()
        if cleaned.startswith("```"):
            # Remove markdown code fencing
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1])

        parsed = json.loads(cleaned)
        return parsed.get("lists", [])
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse lists JSON: {raw_response[:200]}")
        return []
