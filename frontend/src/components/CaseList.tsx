import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listCases, listDocuments, createCase, deleteCase, archiveCase, unarchiveCase } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Case } from '../types'

export default function CaseList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isSuperadmin = user?.role === 'superadmin'
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const { data: cases, isLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: () => listCases(isSuperadmin),
  })

  const { data: documentCount } = useQuery({
    queryKey: ['total-documents', cases?.map(c => c.id)],
    queryFn: async () => {
      if (!cases?.length) return 0
      const results = await Promise.all(cases.map(c => listDocuments(c.id)))
      return results.reduce((sum, docs) => sum + docs.length, 0)
    },
    enabled: !!cases?.length,
  })

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

  const archiveMutation = useMutation({
    mutationFn: archiveCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  })

  const unarchiveMutation = useMutation({
    mutationFn: unarchiveCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createMutation.mutate({ name: name.trim(), description: description.trim() })
  }

  const activeCases = useMemo(() => cases?.filter(c => !c.archived_at) ?? [], [cases])
  const archivedCases = useMemo(() => cases?.filter(c => c.archived_at) ?? [], [cases])
  const recentCases = useMemo(
    () => [...activeCases].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5),
    [activeCases],
  )

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-slate-500">Loading...</div>
  }

  return (
    <div className="flex-1 bg-stone-50 min-h-0">
      {/* Hero Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12 sm:py-16 flex items-center justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              Welcome back{user?.email ? `, ${user.email}` : ''}
            </h1>
            <p className="text-indigo-200 text-lg mb-6">Your AI-powered legal workspace</p>
            <button
              onClick={() => {
                setShowCreate(true)
                setTimeout(() => document.getElementById('case-name-input')?.focus(), 100)
              }}
              className="px-6 py-3 bg-white text-indigo-900 rounded-lg font-semibold hover:bg-indigo-50 transition-colors shadow-lg"
            >
              Create New Case
            </button>
          </div>
          <div className="hidden md:block">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="opacity-20">
              <path d="M60 10L60 30" stroke="white" strokeWidth="4" strokeLinecap="round"/>
              <circle cx="60" cy="8" r="6" fill="white"/>
              <path d="M60 30L20 50" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <path d="M60 30L100 50" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <path d="M10 50C10 50 15 70 30 70C45 70 50 50 50 50" stroke="white" strokeWidth="3" fill="none"/>
              <path d="M70 50C70 50 75 70 90 70C105 70 110 50 110 50" stroke="white" strokeWidth="3" fill="none"/>
              <path d="M55 30L55 95" stroke="white" strokeWidth="3"/>
              <path d="M65 30L65 95" stroke="white" strokeWidth="3"/>
              <rect x="35" y="95" width="50" height="8" rx="2" fill="white"/>
              <rect x="25" y="103" width="70" height="8" rx="2" fill="white"/>
            </svg>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-indigo-500 p-5 flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{activeCases.length}</p>
              <p className="text-sm text-slate-500">Active Cases</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-l-4 border-amber-500 p-5 flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600">
                <path d="M21 8v13H3V8"/>
                <path d="M1 3h22v5H1z"/>
                <path d="M10 12h4"/>
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{archivedCases.length}</p>
              <p className="text-sm text-slate-500">Archived Cases</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-l-4 border-emerald-500 p-5 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{documentCount ?? '—'}</p>
              <p className="text-sm text-slate-500">Total Documents</p>
              <p className="text-xs text-slate-400">Across all cases</p>
            </div>
          </div>
        </div>

        {/* Feature / Capability Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
                <line x1="9" y1="11" x2="13" y2="11"/>
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Document Analysis</h3>
            <p className="text-sm text-slate-500">Upload and analyze legal documents with AI-powered extraction and summarization</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">AI Legal Chat</h3>
            <p className="text-sm text-slate-500">Ask questions about your cases with context-aware, citation-backed AI responses</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 text-center hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">Case Management</h3>
            <p className="text-sm text-slate-500">Organize cases, track documents, and manage conversations in one workspace</p>
          </div>
        </div>

        {/* Recent Cases Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900">Recent Cases</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
            >
              New Case
            </button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreate} className="mb-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
              <input
                id="case-name-input"
                type="text"
                placeholder="Case name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mb-3 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <textarea
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full mb-3 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={2}
              />
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-colors">
                  Create
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-slate-600 text-sm hover:text-slate-800">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {!recentCases.length ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  <line x1="12" y1="12" x2="12" y2="16"/>
                  <line x1="10" y1="14" x2="14" y2="14"/>
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-700 mb-1">No cases yet</p>
              <p className="text-sm text-slate-500">Create your first case to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCases.map((c: Case) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="p-4 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-sm cursor-pointer group transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900">{c.name}</h3>
                      {c.description && <p className="text-sm text-slate-500 mt-1">{c.description}</p>}
                      <p className="text-xs text-slate-400 mt-1">
                        Created {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {isSuperadmin && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            archiveMutation.mutate(c.id)
                          }}
                          className="text-sm text-amber-600 hover:text-amber-800 px-2 py-1"
                        >
                          Archive
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Delete this case and all its data?')) {
                              deleteMutation.mutate(c.id)
                            }
                          }}
                          className="text-sm text-red-500 hover:text-red-700 px-2 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Archived cases (superadmin only) */}
        {isSuperadmin && archivedCases.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Archived Cases</h2>
            <div className="space-y-3">
              {archivedCases.map((c: Case) => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/cases/${c.id}`)}
                  className="p-4 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 hover:shadow-sm cursor-pointer group transition-all opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900">{c.name}</h3>
                        <span className="text-xs px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-medium">
                          Archived
                        </span>
                      </div>
                      {c.description && <p className="text-sm text-slate-500 mt-1">{c.description}</p>}
                      <p className="text-xs text-slate-400 mt-1">
                        Created {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          unarchiveMutation.mutate(c.id)
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-800 px-2 py-1"
                      >
                        Unarchive
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm('Delete this case and all its data?')) {
                            deleteMutation.mutate(c.id)
                          }
                        }}
                        className="text-sm text-red-500 hover:text-red-700 px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
