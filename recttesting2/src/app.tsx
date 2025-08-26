// import React, { useState, useEffect } from 'react'
// import { RouterProvider } from 'react-router-dom'
// import { createRouter } from './router'
// import initWasm, { greet } from '../recttesting2/pkg/recttesting2'

// export default function App() {
//   const [ready, setReady] = useState(false)

//   useEffect(() => {
//     ;(async () => {
//       await initWasm()
//       setReady(true)
//       greet('App')
//     })()
//   }, [])

//   if (!ready) return <Spinner

//   return <RouterProvider router={createRouter()} />
// }
