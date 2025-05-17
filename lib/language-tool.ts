export interface GrammarError {
  offset: number
  length: number
  message: string
  replacements: string[]
  rule?: {
    id: string
    description: string
    issueType: string
  }
}

export async function checkGrammar(text: string): Promise<GrammarError[]> {
  try {
    console.log("Checking grammar for text:", text.substring(0, 50) + (text.length > 50 ? "..." : ""))

    // Use the public LanguageTool API
    const response = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        text,
        language: "en-US",
        disabledRules: "WHITESPACE_RULE,UPPERCASE_SENTENCE_START",
      }),
    })

    if (!response.ok) {
      throw new Error(`LanguageTool API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.matches) {
      console.warn("No matches found in LanguageTool response")
      return []
    }

    const errors = data.matches.map((match: any) => ({
      offset: match.offset,
      length: match.length,
      message: match.message,
      replacements: match.replacements.map((r: any) => r.value).slice(0, 5),
      rule: match.rule
        ? {
            id: match.rule.id,
            description: match.rule.description,
            issueType: match.rule.issueType,
          }
        : undefined,
    }))

    return errors
  } catch (error) {
    console.error("Grammar check failed:", error)
    return []
  }
}
