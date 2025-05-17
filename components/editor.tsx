"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useCallback, useEffect, useState, useRef } from "react"
import { debounce } from "lodash"
import { GrammarExtension } from "@/lib/grammar-extension"
import { Toolbar } from "@/components/toolbar"
import { checkGrammar } from "@/lib/language-tool"
import { Card, CardContent } from "@/components/ui/card"
import { GrammarTooltip } from "@/components/grammar-tooltip"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { Button } from "@/components/ui/button"
import { EyeOff } from "lucide-react"

export function Editor() {
  const [grammarErrors, setGrammarErrors] = useState([])
  const [isChecking, setIsChecking] = useState(false)
  const [activeError, setActiveError] = useState<{
    element: HTMLElement
    error: any
    position: { x: number; y: number }
    range: { from: number; to: number }
    text: string
  } | null>(null)

  // Store ignored errors in local storage with a more robust structure
  const [ignoredErrors, setIgnoredErrors] = useLocalStorage<
    Array<{
      ruleId: string
      text: string
      timestamp: number
    }>
  >("ignored-grammar-errors-v2", [])

  // Track if the user is currently interacting with the tooltip
  const [isTooltipActive, setIsTooltipActive] = useState(false)

  // Refs for handling hover behavior
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const errorElementRef = useRef<HTMLElement | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      GrammarExtension.configure({
        grammarErrors,
      }),
    ],
    content: `<p>Try typing something with a grammar error, like "I is going to the store." or "She have a car."</p>`,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      debouncedGrammarCheck(html)
    },
  })

  // Create a more robust unique key for an error
  const createErrorKey = useCallback((error: any, text: string) => {
    const ruleId = error.rule?.id || "unknown-rule"
    // Normalize the text to handle slight variations
    const normalizedText = text.trim().toLowerCase()
    return { ruleId, text: normalizedText }
  }, [])

  // Check if an error is in the ignored list
  const isErrorIgnored = useCallback(
    (error: any, text: string) => {
      const { ruleId, text: normalizedText } = createErrorKey(error, text)

      return ignoredErrors.some(
        (ignored) =>
          (ignored.ruleId === ruleId && normalizedText.includes(ignored.text)) || ignored.text.includes(normalizedText),
      )
    },
    [ignoredErrors, createErrorKey],
  )

  const debouncedGrammarCheck = useCallback(
    debounce(async (html) => {
      if (!html) return

      try {
        setIsChecking(true)
        // Extract text content from HTML
        const tempDiv = document.createElement("div")
        tempDiv.innerHTML = html
        const text = tempDiv.textContent || ""

        if (text.trim().length < 5) {
          setGrammarErrors([])
          return
        }

        const errors = await checkGrammar(text)
        console.log("Grammar errors found:", errors.length)

        // Filter out ignored errors with more robust checking
        const filteredErrors = errors.filter((error) => {
          const errorText = text.substring(error.offset, error.offset + error.length)
          const isIgnored = isErrorIgnored(error, errorText)

          if (isIgnored) {
            console.log(`Filtered out ignored error: "${errorText}" (${error.rule?.id || "unknown"})`)
          }

          return !isIgnored
        })

        console.log(`Displaying ${filteredErrors.length} errors after filtering ignored ones`)
        setGrammarErrors(filteredErrors)
      } catch (error) {
        console.error("Grammar check failed:", error)
      } finally {
        setIsChecking(false)
      }
    }, 1000),
    [isErrorIgnored],
  )

  useEffect(() => {
    if (editor && grammarErrors.length > 0) {
      editor.commands.updateGrammarErrors(grammarErrors)
    }
  }, [editor, grammarErrors])

  // Improved mouse event handling for grammar errors
  useEffect(() => {
    if (!editor) return

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement

      if (target.classList.contains("grammar-error")) {
        // Store reference to the error element
        errorElementRef.current = target

        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current)
        }

        // Set a small delay before showing the tooltip
        hoverTimeoutRef.current = setTimeout(() => {
          try {
            const errorData = JSON.parse(target.getAttribute("data-error") || "{}")
            const rect = target.getBoundingClientRect()

            // Get the position in the document
            const pos = editor.view.posAtDOM(target, 0)
            if (pos === null) return

            const errorText = target.textContent || ""

            setActiveError({
              element: target,
              error: errorData,
              position: {
                x: rect.left,
                y: rect.top,
              },
              range: {
                from: pos,
                to: pos + errorText.length,
              },
              text: errorText,
            })
          } catch (e) {
            console.error("Failed to parse error data", e)
          }
        }, 200)
      }
    }

    // Create a more robust mouse tracking system
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeError || isTooltipActive) return

      const target = e.target as HTMLElement

      // Check if we're hovering over the error or the tooltip
      const isOverError = target.classList.contains("grammar-error") || target.closest(".grammar-error") !== null
      const isOverTooltip = target.closest(".grammar-tooltip") !== null

      // If we're not over either, and not in active interaction mode, start a timer to hide
      if (!isOverError && !isOverTooltip) {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current)
        }

        hoverTimeoutRef.current = setTimeout(() => {
          setActiveError(null)
        }, 500) // Longer delay before hiding
      } else {
        // If we moved back over the error or tooltip, cancel any pending hide
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current)
          hoverTimeoutRef.current = null
        }
      }
    }

    // Handle clicks outside the tooltip to dismiss it
    const handleClickOutside = (e: MouseEvent) => {
      if (!activeError) return

      const target = e.target as HTMLElement
      const isClickOnError = activeError.element.contains(target)
      const isClickOnTooltip = tooltipRef.current?.contains(target)

      if (!isClickOnError && !isClickOnTooltip) {
        setActiveError(null)
        setIsTooltipActive(false)
      }
    }

    const editorElement = editor.view.dom
    editorElement.addEventListener("mouseover", handleMouseOver)
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      editorElement.removeEventListener("mouseover", handleMouseOver)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mousedown", handleClickOutside)

      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [editor, activeError, isTooltipActive])

  // Handle accepting a suggestion
  const handleReplaceSuggestion = useCallback(
    (replacement: string) => {
      if (activeError && editor) {
        const { range } = activeError

        const { from, to } = editor.state.selection

        // Apply the suggestion
        //editor.chain().focus().deleteRange(range).insertContent(replacement).run()
        editor
          .chain()
          // First set selection to the error range
          .setTextSelection({ from: range.from, to: range.to })
          // Then replace that selected text
          .deleteSelection()
          .insertContent(replacement)
          // Restore original selection if it was somewhere else
          .setTextSelection({ from, to })
          .run()

        // Close the tooltip after a short delay to show the success state
        setTimeout(() => {
          setActiveError(null)
          setIsTooltipActive(false)
        }, 800) // Longer delay to show success state
      }
    },
    [activeError, editor],
  )

  // Improved ignore functionality
  const handleIgnoreError = useCallback(() => {
    if (activeError && activeError.error) {
      const { error, text } = activeError

      // Create a more robust error identifier
      const { ruleId, text: normalizedText } = createErrorKey(error, text)

      console.log(`Ignoring error: "${normalizedText}" (${ruleId})`)

      // Add to ignored errors with timestamp
      setIgnoredErrors((prev) => [
        ...prev,
        {
          ruleId,
          text: normalizedText,
          timestamp: Date.now(),
        },
      ])

      // Close the tooltip
      setActiveError(null)
      setIsTooltipActive(false)

      // Re-run grammar check to update highlights
      if (editor) {
        // Force immediate check instead of using the debounced version
        const html = editor.getHTML()
        checkGrammar(html.replace(/<[^>]*>/g, "")).then((errors) => {
          // Filter out the newly ignored error
          const filteredErrors = errors.filter((err) => {
            const errText = html.replace(/<[^>]*>/g, "").substring(err.offset, err.offset + err.length)
            return !isErrorIgnored(err, errText)
          })

          setGrammarErrors(filteredErrors)
          editor.commands.updateGrammarErrors(filteredErrors)
        })
      }
    }
  }, [activeError, editor, createErrorKey, setIgnoredErrors, isErrorIgnored])

  // Handle tooltip interaction state
  const handleTooltipInteraction = useCallback((isActive: boolean) => {
    setIsTooltipActive(isActive)
  }, [])

  // Handle dismissing a suggestion
  const handleDismissSuggestion = useCallback(() => {
    setActiveError(null)
    setIsTooltipActive(false)
  }, [])

  // Clear all ignored errors
  const handleResetIgnored = useCallback(() => {
    setIgnoredErrors([])
    // Re-run grammar check to show previously ignored errors
    if (editor) {
      debouncedGrammarCheck(editor.getHTML())
    }
  }, [setIgnoredErrors, editor, debouncedGrammarCheck])

  if (!editor) {
    return null
  }

  return (
    <Card className="border rounded-lg shadow-sm">
      <Toolbar editor={editor} />
      <CardContent className="p-4">
        <div className="relative">
          <EditorContent editor={editor} className="prose max-w-none min-h-[300px] focus:outline-none" />
          {isChecking && (
            <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded-md shadow-sm">
              Checking grammar...
            </div>
          )}
          {activeError && (
            <GrammarTooltip
              ref={tooltipRef}
              error={activeError.error}
              position={activeError.position}
              onReplace={handleReplaceSuggestion}
              onIgnore={handleIgnoreError}
              onClose={handleDismissSuggestion}
              onInteraction={handleTooltipInteraction}
            />
          )}
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>Grammar errors are highlighted with a red underline. Hover over an error to see suggestions.</p>
          <p>
            Click on a suggestion to apply it, click "Ignore" to permanently hide this error, or click "Dismiss" to
            close the tooltip.
          </p>
          {ignoredErrors.length > 0 && (
            <div className="mt-2 flex items-center gap-2 p-2 bg-gray-50 rounded-md">
              <EyeOff className="h-4 w-4 text-gray-400" />
              <span>Ignored errors: {ignoredErrors.length}</span>
              <Button variant="link" size="sm" className="h-auto p-0 ml-auto" onClick={handleResetIgnored}>
                Reset All
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
