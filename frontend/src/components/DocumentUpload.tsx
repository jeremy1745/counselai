import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { uploadDocuments } from '../api/client'

export default function DocumentUpload({ caseId }: { caseId: string }) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (files: File[]) => uploadDocuments(caseId, files),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', caseId] }),
  })

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        mutation.mutate(acceptedFiles)
      }
    },
    [mutation],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
  })

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'
      }`}
    >
      <input {...getInputProps()} />
      {mutation.isPending ? (
        <p className="text-sm text-slate-500">Uploading...</p>
      ) : isDragActive ? (
        <p className="text-sm text-indigo-600">Drop PDFs here</p>
      ) : (
        <div>
          <p className="text-sm text-slate-600">Drag & drop PDF files here, or click to select</p>
          <p className="text-xs text-slate-400 mt-1">Only PDF files are accepted</p>
        </div>
      )}
      {mutation.isError && (
        <p className="text-sm text-red-500 mt-2">Upload failed. Please try again.</p>
      )}
    </div>
  )
}
