import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

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

interface GrammarExtensionOptions {
  grammarErrors: GrammarError[]
}

export const GrammarExtension = Extension.create<GrammarExtensionOptions>({
  name: "grammarChecker",

  addOptions() {
    return {
      grammarErrors: [],
    }
  },

  addCommands() {
    return {
      updateGrammarErrors:
        (errors) =>
        ({ editor }) => {
          this.options.grammarErrors = errors
          // Force a redraw of decorations
          editor.view.dispatch(editor.state.tr.setMeta("forceUpdate", true))
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("grammarChecker"),
        state: {
          init() {
            return DecorationSet.empty
          },
          apply: (tr, oldState) => {
            // Always recalculate decorations when content changes or when forced
            if (tr.docChanged || tr.getMeta("forceUpdate")) {
              const { doc } = tr
              const decorations: Decoration[] = []
              const { grammarErrors } = this.options

              if (!grammarErrors || !grammarErrors.length) {
                return DecorationSet.empty
              }

              // Create a plain text version of the document to match with error offsets
              let plainText = ""
              const textPositions: number[] = []

              doc.nodesBetween(0, doc.content.size, (node, pos) => {
                if (node.isText) {
                  const nodeText = node.text || ""
                  for (let i = 0; i < nodeText.length; i++) {
                    textPositions.push(pos + i)
                  }
                  plainText += nodeText
                }
                return true
              })

              // Map grammar errors to document positions
              grammarErrors.forEach((error) => {
                if (error.offset < textPositions.length) {
                  const from = textPositions[error.offset]
                  const to =
                    error.offset + error.length < textPositions.length
                      ? textPositions[error.offset + error.length]
                      : from + error.length

                  if (from !== undefined && to !== undefined) {
                    decorations.push(
                      Decoration.inline(from, to, {
                        class: "grammar-error",
                        "data-error": JSON.stringify({
                          message: error.message,
                          replacements: error.replacements,
                        }),
                      }),
                    )
                  }
                }
              })

              return DecorationSet.create(doc, decorations)
            }

            return oldState.map(tr.mapping, tr.doc)
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})
