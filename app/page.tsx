import { Editor } from "@/components/editor"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Rich Text Editor with Grammar Checking</h1>
      <p className="text-gray-600 mb-8">
        Write your content below. Grammar errors will be highlighted with a red underline. Hover over the underlined
        text to see suggestions.
      </p>
      <Editor />
    </main>
  )
}
