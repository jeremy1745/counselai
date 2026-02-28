import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getMessages } from '../api/client'
import { useChat } from '../hooks/useChat'
import ChatMessage from './ChatMessage'
import type { Message } from '../types'

export default function ChatWindow() {
  const { convId } = useParams<{ convId: string }>()
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: messages } = useQuery({
    queryKey: ['messages', convId],
    queryFn: () => getMessages(convId!),
    enabled: !!convId,
  })

  const { streamingContent, isStreaming, citations, send } = useChat(() => {
    queryClient.invalidateQueries({ queryKey: ['messages', convId] })
    queryClient.invalidateQueries({ queryKey: ['conversations'] })
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!messages?.length && !isStreaming && (
          <div className="flex-1 flex items-center justify-center h-full text-gray-400 text-sm">
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
            <div className="px-4 py-3 rounded-2xl bg-white border border-gray-200">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your case..."
            disabled={isStreaming}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
