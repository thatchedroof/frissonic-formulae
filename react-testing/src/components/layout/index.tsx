import React from 'react'
import { Header } from '../header'
import { ThemeProvider } from './theme-provider';

export const getNoneLayout = (page: React.ReactElement) => page

export const getDefaultLayout = (page: React.ReactElement) => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="h-min-screen">
        <Header />
        {page}
      </div>
    </ThemeProvider>
  )
}
