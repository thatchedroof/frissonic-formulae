import React, { ReactNode } from 'react'
import { ModeToggle } from './mode-toggle'
import { Music } from 'lucide-react'

interface IProps {
  leftNode?: ReactNode
}
export function Header(props: IProps) {
  return (
    <div className="fixed left-0 top-0 w-full z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3">
        <a href="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            <Music className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">Frissonic Formulae</span>
            <span className="text-[0.65rem] text-muted-foreground -mt-0.5 tracking-widest uppercase">by thatchedroof</span>
          </div>
        </a>
        <ModeToggle />
      </div>
    </div>
  )
}
