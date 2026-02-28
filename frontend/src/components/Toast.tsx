import { useEffect } from 'react'

export default function Toast({
  message,
  type = 'error',
  onClose,
}: {
  message: string
  type?: 'error' | 'success'
  onClose: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div
      className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm text-white z-50 ${
        type === 'error' ? 'bg-red-600' : 'bg-green-600'
      }`}
    >
      {message}
      <button onClick={onClose} className="ml-3 opacity-70 hover:opacity-100">&times;</button>
    </div>
  )
}
