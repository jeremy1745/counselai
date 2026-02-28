import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listCases, createCase, deleteCase } from '../api/client'
import type { Case } from '../types'

export default function CaseList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const { data: cases, isLoading } = useQuery({ queryKey: ['cases'], queryFn: listCases })

  const createMutation = useMutation({
    mutationFn: createCase,
    onSuccess: (newCase) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      setShowCreate(false)
      setName('')
      setDescription('')
      navigate(`/cases/${newCase.id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate({ name: name.trim(), description: description.trim() })
  }

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-gray-500">Loading cases...</div>
  }

  return (
    <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          New Case
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <input
            type="text"
            placeholder="Case name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full mb-3 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-600 text-sm hover:text-gray-800">
              Cancel
            </button>
          </div>
        </form>
      )}

      {!cases?.length ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">No cases yet</p>
          <p className="text-sm">Create your first case to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c: Case) => (
            <div
              key={c.id}
              onClick={() => navigate(`/cases/${c.id}`)}
              className="p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{c.name}</h3>
                  {c.description && <p className="text-sm text-gray-500 mt-1">{c.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    Created {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Delete this case and all its data?')) {
                      deleteMutation.mutate(c.id)
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 text-sm text-red-500 hover:text-red-700 px-2 py-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
