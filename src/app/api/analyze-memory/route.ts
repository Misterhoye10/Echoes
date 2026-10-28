import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { story, title, person } = await request.json()

    if (!story || typeof story !== 'string') {
      return NextResponse.json({ error: 'Story content is required for AI analysis.' }, { status: 400 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI inference key is not configured.' }, { status: 500 })
    }

    const systemPrompt = `You are Echoes AI, an emotionally intelligent, respectful archival assistant honoring family memories in the spirit of Día de los Muertos and ancestral remembrance.
Given a family story, speech transcript, or personal memory, analyze it and return a strict JSON object with:
1. "summary": A heartfelt, 2-3 sentence memorial tribute summarizing the heart of this memory.
2. "wisdom": A profound single-sentence life lesson, quote, or principle revealed in the story.
3. "people": An array of names of people mentioned (e.g. ["Mom", "Aunt Clara", "Daniel"]).
4. "tags": An array of 4-6 thematic tags (e.g. ["family", "childhood", "recipes", "resilience"]).
5. "timeline": Estimated time period or season mentioned (e.g. "Summer 1984", "Early Childhood", "Holiday Tradition").

Respond ONLY with valid JSON. No conversational preamble.`

    const userPrompt = `Title: ${title || 'Family Memory'}
Person: ${person || 'Unspecified'}
Memory/Transcript:
"""
${story}
"""`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 800,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Groq AI error:', err)
      return NextResponse.json({ error: 'Failed to analyze memory with open-weight AI.' }, { status: response.status })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    try {
      const parsed = JSON.parse(content)
      return NextResponse.json({
        success: true,
        model: 'qwen/qwen3.8-27b (Open-Weight)',
        provider: 'Groq LPU',
        analysis: parsed,
      })
    } catch {
      return NextResponse.json({
        success: true,
        model: 'qwen/qwen3.8-27b',
        raw: content,
      })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
