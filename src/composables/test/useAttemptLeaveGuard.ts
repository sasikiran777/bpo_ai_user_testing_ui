import { onBeforeUnmount, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

export const useAttemptLeaveGuard = (opts: {
  enabled: { value: boolean }
  message: string
  onAbandon: (reason: 'route' | 'unload') => void | Promise<void>
}) => {
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    if (!opts.enabled.value) return
    e.preventDefault()
    e.returnValue = ''
  }

  const onPageHide = () => {
    if (!opts.enabled.value) return
    opts.onAbandon('unload')
  }

  watch(
    () => opts.enabled.value,
    (enabled) => {
      if (enabled) {
        window.addEventListener('beforeunload', onBeforeUnload)
        window.addEventListener('pagehide', onPageHide)
      } else {
        window.removeEventListener('beforeunload', onBeforeUnload)
        window.removeEventListener('pagehide', onPageHide)
      }
    },
    { immediate: true },
  )

  onBeforeRouteLeave(() => {
    if (!opts.enabled.value) return true
    const ok = window.confirm(opts.message)
    if (!ok) return false
    opts.onAbandon('route')
    return true
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', onBeforeUnload)
    window.removeEventListener('pagehide', onPageHide)
  })
}
