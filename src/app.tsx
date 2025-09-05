import React, { useState, useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { createRouter } from './router'
import initWasm from '../frissonic-formulae/pkg/frissonic_formulae'
import { Spinner } from './components/ui/shadcn-io/spinner'

export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      await initWasm()
      setReady(true)
      // greet('App')
    })()
  }, [])

  if (!ready)
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-900">
        <Spinner size={48} className="text-neutral-200" variant="ring" />
      </div>
    )

  return <RouterProvider router={createRouter()} />
}
