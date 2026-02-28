import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMessages, exportConversation } from '../api/client'
import { useChat } from '../hooks/useChat'
import ChatMessage from './ChatMessage'
import type { Message } from '../types'

export default function ChatWindow() {
  const { convId } = useParams<{ convId: string }>()
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: messages } = useQuery({
    queryKey: ['messages', convId],
    queryFn: () => getMessages(convId!),
    enabled: !!convId,
  })

  const [exporting, setExporting] = useState(false)

  const handleExport = async (format: 'pdf' | 'markdown') => {
    if (!convId || exporting) return
    setExporting(true)
    try {
      await exportConversation(convId, format)
    } catch (e) {
      console.error('Export failed', e)
    } finally {
      setExporting(false)
    }
  }

  const { streamingContent, isStreaming, citations, send } = useChat(() => {
    queryClient.invalidateQueries({ queryKey: ['messages', convId] })
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  useEffect(() => {
    inputRef.current?.focus()
  }, [convId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isStreaming || !convId) return
    const content = input.trim()
    setInput('')
    queryClient.setQueryData(['messages', convId], (old: Message[] | undefined) => [
      ...(old || []),
      { id: 'temp', conversation_id: convId, role: 'user' as const, content, citations: [], created_at: new Date().toISOString() },
    ])
    await send(convId, content)
  }

  if (!convId) return null

  return (
    <div className="flex-1 flex flex-col">
      {messages?.length ? (
        <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting}
            className="px-3 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50 transition-colors"
          >
            {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            onClick={() => handleExport('markdown')}
            disabled={exporting}
            className="px-3 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-100 disabled:opacity-50 transition-colors"
          >
            {exporting ? 'Exporting...' : 'Export Markdown'}
          </button>
        </div>
      ) : null}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!messages?.length && !isStreaming && (
          <div className="flex-1 flex items-center justify-center h-full text-slate-400 text-sm">
            Ask a question about your case documents
          </div>
        )}
        {messages?.map((msg: Message) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} citations={msg.citations} />
        ))}
        {isStreaming && streamingContent && (
          <ChatMessage role="assistant" content={streamingContent} citations={citations} />
        )}
        {isStreaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 bg-white">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your case..."
            disabled={isStreaming}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
