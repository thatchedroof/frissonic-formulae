import React, { ReactNode } from 'react'
import { ModeToggle } from './mode-toggle'

interface IProps {
  leftNode?: ReactNode
}
export function Header(props: IProps) {
  return (
    <div className="fixed left-0 top-0 flex w-full items-center justify-between border bg-card text-card-foreground bg-opacity-70 px-4 py-4 md:px-12 z-50">
      <a href="/" className="text-2xl font-bold ml-4 italic">
        thatchedroof
      </a>
      <ModeToggle />
    </div>
  )
}
