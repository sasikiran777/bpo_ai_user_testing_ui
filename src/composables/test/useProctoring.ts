import { onBeforeUnmount, ref } from 'vue'
import type { ProctoringEvent, ProctoringEventType } from '@/types/test/test.types'

export const useProctoring = () => {
  const events = ref<ProctoringEvent[]>([])
  const active = ref(false)
  const changedWindowsCount = ref(0)
  const inactive = ref(false)

  const push = (type: ProctoringEventType) => {
    events.value.push({ type, ts: Date.now() })
  }

  const onVisibility = () => {
    if (!active.value) return
    const isHidden = document.visibilityState === 'hidden'
    push(isHidden ? 'tab_hidden' : 'tab_visible')
    if (isHidden) {
      if (!inactive.value) changedWindowsCount.value += 1
      inactive.value = true
    } else {
      inactive.value = false
    }
  }

  const onBlur = () => {
    if (!active.value) return
    push('window_blur')
    if (!inactive.value) changedWindowsCount.value += 1
    inactive.value = true
  }

  const onFocus = () => {
    if (!active.value) return
    push('window_focus')
    inactive.value = false
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
    changedWindowsCount.value = 0
    inactive.value = false
  }

  onBeforeUnmount(stop)

  return { events, active, changedWindowsCount, start, stop, reset }
}
