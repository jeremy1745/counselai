import { Routes, Route, useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCase,
  listConversations,
  createConversation,
  deleteConversation,
  archiveConversation,
  unarchiveConversation,
} from '../api/client'
import { useAuth } from '../context/AuthContext'
import DocumentUpload from './DocumentUpload'
import DocumentList from './DocumentList'
import ChatWindow from './ChatWindow'
import type { Conversation } from '../types'

function CaseSidebar({ caseId }: { caseId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isSuperadmin = user?.role === 'superadmin'

  const { data: caseData } = useQuery({ queryKey: ['case', caseId], queryFn: () => getCase(caseId) })
  const { data: conversations } = useQuery({
    queryKey: ['conversations', caseId],
    queryFn: () => listConversations(caseId, isSuperadmin),
  })

  const handleNewChat = async () => {
    const conv = await createConversation(caseId)
    navigate(`/cases/${caseId}/chat/${conv.id}`)
  }

  const deleteMutation = useMutation({
    mutationFn: deleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', caseId] })
      navigate(`/cases/${caseId}`)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: archiveConversation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations', caseId] }),
  })

  const unarchiveMutation = useMutation({
    mutationFn: unarchiveConversation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conversations', caseId] }),
  })

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
              <div
                key={conv.id}
                className={`group flex items-center rounded-md hover:bg-stone-100 ${conv.archived_at ? 'opacity-50' : ''}`}
              >
                <Link
                  to={`/cases/${caseId}/chat/${conv.id}`}
                  className="flex-1 px-3 py-2 text-sm text-slate-700 truncate"
                >
                  <span className="flex items-center gap-1.5">
                    {conv.title}
                    {conv.archived_at && (
                      <span className="text-[10px] px-1 py-px bg-slate-200 text-slate-500 rounded font-medium shrink-0">
                        Archived
                      </span>
                    )}
                  </span>
                </Link>
                {isSuperadmin && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center pr-2 gap-1 shrink-0">
                    {conv.archived_at ? (
                      <button
                        onClick={() => unarchiveMutation.mutate(conv.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 px-1"
                        title="Unarchive"
                      >
                        Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => archiveMutation.mutate(conv.id)}
                        className="text-xs text-amber-600 hover:text-amber-800 px-1"
                        title="Archive"
                      >
                        Archive
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Delete this conversation?')) {
                          deleteMutation.mutate(conv.id)
                        }
                      }}
                      className="text-xs text-red-500 hover:text-red-700 px-1"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
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
