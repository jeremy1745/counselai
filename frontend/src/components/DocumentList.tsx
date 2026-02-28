import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listDocuments, deleteDocument } from '../api/client'
import type { Document } from '../types'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
}

export default function DocumentList({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient()

  const { data: docs } = useQuery({
    queryKey: ['documents', caseId],
    queryFn: () => listDocuments(caseId),
    refetchInterval: (query) => {
      const data = query.state.data
      if (data?.some((d: Document) => d.status === 'pending' || d.status === 'processing')) {
        return 2000
      }
      return false
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => deleteDocument(caseId, docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', caseId] }),
  })

  if (!docs?.length) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">Documents</h3>
      {docs.map((doc: Document) => (
        <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 text-sm">
          <div className="flex items-center gap-3 min-w-0">
            <span className="truncate font-medium text-gray-800">{doc.filename}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[doc.status]}`}>
              {doc.status}
            </span>
            {doc.page_count !== null && (
              <span className="text-gray-400 text-xs">{doc.page_count} pages</span>
            )}
          </div>
          <button
            onClick={() => deleteMutation.mutate(doc.id)}
            className="text-gray-400 hover:text-red-500 text-xs ml-2 shrink-0"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}
