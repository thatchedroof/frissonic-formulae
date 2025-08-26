import React, { ReactNode } from 'react'
import { Button } from '../ui/button'
import { ModeToggle } from './mode-toggle'

interface IProps {
  leftNode?: ReactNode
}
export function Header(props: IProps) {
  return (
    <div className="fixed left-0 top-0 flex w-full items-center justify-between border bg-muted text-muted-foreground bg-opacity-70 px-4 py-4 md:px-12">
      <a href="/" className="text-xs md:text-base">
        React Testing
      </a>
      <ModeToggle />
    </div>
  )
}
