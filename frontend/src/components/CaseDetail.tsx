import { Routes, Route, useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCase, listConversations, createConversation } from '../api/client'
import DocumentUpload from './DocumentUpload'
import DocumentList from './DocumentList'
import ChatWindow from './ChatWindow'
import type { Conversation } from '../types'

function CaseSidebar({ caseId }: { caseId: string }) {
  const navigate = useNavigate()
  const { data: caseData } = useQuery({ queryKey: ['case', caseId], queryFn: () => getCase(caseId) })
  const { data: conversations } = useQuery({
    queryKey: ['conversations', caseId],
    queryFn: () => listConversations(caseId),
  })

  const handleNewChat = async () => {
    const conv = await createConversation(caseId)
    navigate(`/cases/${caseId}/chat/${conv.id}`)
  }

  return (
    <div className="w-80 border-r border-slate-200 bg-white flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-slate-200">
        <Link to="/" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">&larr; All Cases</Link>
        <h2 className="text-lg font-bold text-slate-900 mt-1">{caseData?.name}</h2>
        {caseData?.description && (
          <p className="text-sm text-slate-500 mt-1">{caseData.description}</p>
        )}
      </div>

      <div className="p-4 space-y-4">
        <DocumentUpload caseId={caseId} />
        <DocumentList caseId={caseId} />
      </div>

      <div className="p-4 border-t border-slate-200 mt-auto">
        <button
          onClick={handleNewChat}
          className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
        >
          New Conversation
        </button>
        {conversations && conversations.length > 0 && (
          <div className="mt-3 space-y-1">
            {conversations.map((conv: Conversation) => (
              <Link
                key={conv.id}
                to={`/cases/${caseId}/chat/${conv.id}`}
                className="block px-3 py-2 text-sm text-slate-700 hover:bg-stone-100 rounded-md truncate"
              >
                {conv.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function CaseDetail() {
  const { caseId } = useParams<{ caseId: string }>()
  if (!caseId) return null

  return (
    <div className="flex-1 flex overflow-hidden">
      <CaseSidebar caseId={caseId} />
      <div className="flex-1 flex flex-col">
        <Routes>
          <Route
            path="chat/:convId"
            element={<ChatWindow />}
          />
          <Route
            path="*"
            element={
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Upload documents and start a conversation
              </div>
            }
          />
        </Routes>
      </div>
    </div>
  )
}
