import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useProgressStore = create(
  persist(
    (set) => ({
      progress: {}, // { bookId: { page } }
      
      setProgress: (bookId, page) => {
        set((state) => ({
          progress: {
            ...state.progress,
            [bookId]: { page },
          },
        }))
      },
      
      getProgress: (bookId) => {
        const state = useProgressStore.getState()
        return state.progress[bookId] || null
      },
      
      clearProgress: (bookId) => {
        set((state) => {
          const newProgress = { ...state.progress }
          delete newProgress[bookId]
          return { progress: newProgress }
        })
      },
    }),
    {
      name: 'reader-progress', // localStorage key
    }
  )
)
