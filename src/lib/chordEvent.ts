const eventBus = {
  events: {} as Record<string, ((...args: any[]) => void)[]>,
  on(event: string, callback: (...args: any[]) => void) {
    ;(this.events[event] = this.events[event] || []).push(callback)
  },
  off(event: string, callback: (...args: any[]) => void) {
    this.events[event] = (this.events[event] || []).filter((cb) => cb !== callback)
  },
  emit(event: string, data: any) {
    ;(this.events[event] || []).forEach((cb) => cb(data))
  },
}

export default eventBus
