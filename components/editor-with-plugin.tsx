"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useCallback, useEffect, useState } from "react"
import { debounce } from "lodash"
import { GrammarExtension } from "@/lib/grammar-extension"
import { Toolbar } from "@/components/toolbar"
import { checkGrammar } from "@/lib/language-tool"
import { Card, CardContent } from "@/components/ui/card"
import { GrammarErrorPlugin } from "@/components/grammar-error-plugin"

export function Editor() {
  const [grammarErrors, setGrammarErrors] = useState([])

  const editor = useEditor({
    extensions: [
      StarterKit,
      GrammarExtension.configure({
        grammarErrors,
      }),
    ],
    content: `<p>Try typing something with a grammar error, like "I is going to the store."</p>`,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      debouncedGrammarCheck(html)
    },
  })

  const debouncedGrammarCheck = useCallback(
    debounce(async (html) => {
      if (!html) return

      try {
        // Extract text content from HTML
        const tempDiv = document.createElement("div")
        tempDiv.innerHTML = html
        const text = tempDiv.textContent || ""

        if (text.trim().length < 5) return

        const errors = await checkGrammar(text)
        setGrammarErrors(errors)
      } catch (error) {
        console.error("Grammar check failed:", error)
      }
    }, 1000),
    [],
  )

  useEffect(() => {
    if (editor && grammarErrors.length > 0) {
      editor.commands.updateGrammarErrors(grammarErrors)
    }
  }, [editor, grammarErrors])

  if (!editor) {
    return null
  }

  return (
    <Card className="border rounded-lg shadow-sm">
      <Toolbar editor={editor} />
      <CardContent className="p-4 relative">
        <EditorContent editor={editor} className="prose max-w-none min-h-[300px] focus:outline-none" />
        <GrammarErrorPlugin editor={editor} />
      </CardContent>
    </Card>
  )
}
