import { create } from 'zustand'

type Toast = {
  id: number
  message: string
}

type ToastState = {
  toasts: Toast[]
  addToast: (message: string) => void
}

let nextId = 0

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  addToast: (message) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, message }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 2500)
  },
}))
