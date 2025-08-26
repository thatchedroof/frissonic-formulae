import React, { useMemo } from 'react'
import { RouterProvider } from 'react-router-dom'
import { createRouter } from './router'

export default function App() {
  return (
      <RouterProvider router={createRouter()} />
  )
}
