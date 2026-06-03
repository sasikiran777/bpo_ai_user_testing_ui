import { onBeforeUnmount, ref } from 'vue'
import type { ProctoringEvent, ProctoringEventType } from '@/types/test/test.types'

export const useProctoring = () => {
  const events = ref<ProctoringEvent[]>([])
  const active = ref(false)

  const push = (type: ProctoringEventType) => {
    events.value.push({ type, ts: Date.now() })
  }

  const onVisibility = () => {
    if (!active.value) return
    push(document.visibilityState === 'hidden' ? 'tab_hidden' : 'tab_visible')
  }

  const onBlur = () => {
    if (!active.value) return
    push('window_blur')
  }

  const onFocus = () => {
    if (!active.value) return
    push('window_focus')
  }

  const start = () => {
    if (active.value) return
    active.value = true
    document.addEventListener('visibilitychange', onVisibility, { passive: true })
    window.addEventListener('blur', onBlur, { passive: true })
    window.addEventListener('focus', onFocus, { passive: true })
  }

  const stop = () => {
    if (!active.value) return
    active.value = false
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('blur', onBlur)
    window.removeEventListener('focus', onFocus)
  }

  const reset = () => {
    events.value = []
  }

  onBeforeUnmount(stop)

  return { events, active, start, stop, reset }
}

