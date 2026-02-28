import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Citation } from '../types'

function CitationBadge({ citation }: { citation: Citation }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <span className="inline-block relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center px-1.5 py-0.5 mx-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
      >
        Source {citation.source_index}
      </button>
      {expanded && (
        <div className="absolute z-10 bottom-full left-0 mb-1 w-80 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-xs">
          <div className="font-medium text-gray-900 mb-1">{citation.document_name}</div>
          <div className="text-gray-500 mb-2">Page{citation.page_numbers.length > 1 ? 's' : ''} {citation.page_numbers.join(', ')}</div>
          <div className="text-gray-700 leading-relaxed border-l-2 border-blue-300 pl-2">{citation.snippet}</div>
        </div>
      )}
    </span>
  )
}

function renderContentWithCitations(content: string, citations: Citation[]) {
  if (!citations.length) {
    return <ReactMarkdown>{content}</ReactMarkdown>
  }

  // Split content by [Source N] references
  const parts = content.split(/(\[Source \d+\])/)
  return (
    <div className="prose prose-sm max-w-none">
      {parts.map((part, i) => {
        const match = part.match(/^\[Source (\d+)\]$/)
        if (match) {
          const idx = parseInt(match[1])
          const citation = citations.find((c) => c.source_index === idx)
          if (citation) {
            return <CitationBadge key={i} citation={citation} />
          }
        }
        return <ReactMarkdown key={i}>{part}</ReactMarkdown>
      })}
    </div>
  )
}

export default function ChatMessage({
  role,
  content,
  citations = [],
}: {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-gray-200 text-gray-800'
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="text-sm">{renderContentWithCitations(content, citations)}</div>
        )}
      </div>
    </div>
  )
}
