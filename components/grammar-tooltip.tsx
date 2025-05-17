"use client"

import type React from "react"
import { useState, useRef, useEffect, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Check, X, EyeOff } from "lucide-react"

interface GrammarTooltipProps {
  error: {
    message: string
    replacements: string[]
    ruleId?: string
  }
  position: {
    x: number
    y: number
  }
  onReplace: (replacement: string) => void
  onIgnore: () => void
  onClose: () => void
  onInteraction: (isActive: boolean) => void
}

export const GrammarTooltip = forwardRef<HTMLDivElement, GrammarTooltipProps>(
  ({ error, position, onReplace, onIgnore, onClose, onInteraction }, ref) => {
    const tooltipRef = useRef<HTMLDivElement>(null)
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
    const [appliedSuggestion, setAppliedSuggestion] = useState<string | null>(null)
    const [isIgnored, setIsIgnored] = useState(false)
    const [isVisible, setIsVisible] = useState(true)

    // Merge the forwarded ref with our local ref
    useEffect(() => {
      if (ref) {
        if (typeof ref === "function") {
          ref(tooltipRef.current)
        } else {
          ref.current = tooltipRef.current
        }
      }
    }, [ref])

    // Calculate tooltip position with improved positioning
    useEffect(() => {
      if (tooltipRef.current) {
        const rect = tooltipRef.current.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        let x = position.x
        let y = position.y - rect.height - 10 // Position above the text by default

        // Adjust if tooltip would go off the right edge
        if (x + rect.width > viewportWidth) {
          x = viewportWidth - rect.width - 10
        }

        // Adjust if tooltip would go off the left edge
        if (x < 10) {
          x = 10
        }

        // Adjust if tooltip would go off the top edge
        if (y < 10) {
          y = position.y + 25 // Position below the text instead
        }

        // Adjust if tooltip would go off the bottom edge
        if (y + rect.height > viewportHeight) {
          y = position.y - rect.height - 10 // Position above the text
        }

        setTooltipPosition({ x, y })
      }
    }, [position])

    // Handle applying a suggestion with improved feedback
    const handleApplySuggestion = (replacement: string) => {
      setAppliedSuggestion(replacement)
      onInteraction(true) // Mark as actively interacting

      // Call the onReplace callback
      onReplace(replacement)

      // Keep the success state visible for a moment
      setTimeout(() => {
        setIsVisible(false)
      }, 800)
    }

    // Handle ignoring this error with improved feedback
    const handleIgnore = (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsIgnored(true)
      onInteraction(true) // Mark as actively interacting

      // Call the onIgnore callback after showing visual feedback
      setTimeout(() => {
        onIgnore()
      }, 500)
    }

    // Handle mouse events to prevent accidental dismissal
    const handleMouseEnter = () => {
      onInteraction(true)
    }

    const handleMouseLeave = () => {
      onInteraction(false)
    }

    if (!isVisible) return null

    return (
      <div
        ref={tooltipRef}
        className="fixed z-50 grammar-tooltip"
        style={{
          left: `${tooltipPosition.x}px`,
          top: `${tooltipPosition.y}px`,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Card className={`w-72 shadow-lg transition-all duration-200 ${isIgnored ? "opacity-90 bg-gray-50" : ""}`}>
          <CardContent className="p-3">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium">{error.message}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 -mr-1 -mt-1"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!isIgnored && error.replacements.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground mb-1">Suggestions:</p>
                <div className="flex flex-wrap gap-1">
                  {error.replacements.map((replacement, index) => (
                    <Button
                      key={index}
                      variant={appliedSuggestion === replacement ? "default" : "outline"}
                      size="sm"
                      className={`text-xs h-7 flex items-center gap-1 transition-all ${
                        appliedSuggestion === replacement ? "bg-green-600 text-white" : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleApplySuggestion(replacement)
                      }}
                      aria-label={`Apply suggestion: ${replacement}`}
                    >
                      <Check className="h-3 w-3" />
                      {replacement}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {isIgnored ? (
              <div className="mt-2 text-center py-1">
                <p className="text-sm text-gray-500 flex items-center justify-center gap-1">
                  <EyeOff className="h-3 w-3" />
                  Error ignored
                </p>
              </div>
            ) : (
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs flex-1 flex items-center gap-1"
                  onClick={handleIgnore}
                  aria-label="Ignore this error"
                >
                  <EyeOff className="h-3 w-3" />
                  Ignore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose()
                  }}
                  aria-label="Dismiss suggestion"
                >
                  Dismiss
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  },
)

GrammarTooltip.displayName = "GrammarTooltip"
