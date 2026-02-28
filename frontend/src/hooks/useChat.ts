import { useState, useCallback } from 'react'
import { sendMessage } from '../api/client'
import type { Citation } from '../types'

interface UseChatReturn {
  streamingContent: string
  isStreaming: boolean
  citations: Citation[]
  send: (convId: string, content: string) => Promise<void>
}

export function useChat(onComplete: () => void): UseChatReturn {
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [citations, setCitations] = useState<Citation[]>([])

  const send = useCallback(
    async (convId: string, content: string) => {
      setIsStreaming(true)
      setStreamingContent('')
      setCitations([])

      try {
        const res = await sendMessage(convId, content)
        const reader = res.body?.getReader()
        if (!reader) return

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'token') {
                setStreamingContent((prev) => prev + data.content)
              } else if (data.type === 'done') {
                setCitations(data.citations || [])
              }
            } catch {
              // skip malformed lines
            }
          }
        }
      } finally {
        setIsStreaming(false)
        setStreamingContent('')
        onComplete()
      }
    },
    [onComplete],
  )

  return { streamingContent, isStreaming, citations, send }
}
