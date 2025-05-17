"use client"

import { useCallback, useEffect, useState } from "react"
import type { Editor } from "@tiptap/react"
import { GrammarTooltip } from "@/components/grammar-tooltip"

interface GrammarErrorPluginProps {
  editor: Editor
}

export function GrammarErrorPlugin({ editor }: GrammarErrorPluginProps) {
  const [activeError, setActiveError] = useState<{
    element: HTMLElement
    error: any
    position: { x: number; y: number }
  } | null>(null)

  const handleClick = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement

    if (target.classList.contains("grammar-error")) {
      try {
        const errorData = JSON.parse(target.getAttribute("data-error") || "{}")
        const rect = target.getBoundingClientRect()

        setActiveError({
          element: target,
          error: errorData,
          position: {
            x: rect.left,
            y: rect.top,
          },
        })
      } catch (e) {
        console.error("Failed to parse error data", e)
      }
    } else if (!target.closest(".grammar-tooltip")) {
      setActiveError(null)
    }
  }, [])

  const handleReplace = useCallback(
    (replacement: string) => {
      if (activeError) {
        const { element } = activeError

        // Find the position in the document
        const domPos = editor.view.posAtDOM(element, 0)
        if (domPos !== null) {
          editor
            .chain()
            .focus()
            .deleteRange({ from: domPos, to: domPos + element.textContent!.length })
            .insertContent(replacement)
            .run()
        }

        setActiveError(null)
      }
    },
    [activeError, editor],
  )

  useEffect(() => {
    if (editor) {
      const editorElement = editor.view.dom
      editorElement.addEventListener("click", handleClick)

      return () => {
        editorElement.removeEventListener("click", handleClick)
      }
    }
  }, [editor, handleClick])

  if (!activeError) {
    return null
  }

  return (
    <GrammarTooltip
      error={activeError.error}
      position={activeError.position}
      onReplace={handleReplace}
      onClose={() => setActiveError(null)}
    />
  )
}
