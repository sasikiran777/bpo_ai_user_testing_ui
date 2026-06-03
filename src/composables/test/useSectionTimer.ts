import { computed, onBeforeUnmount, ref } from 'vue'

export const useSectionTimer = (durationSec: number, onExpire?: () => void) => {
  const deadline = ref<number | null>(null)
  const now = ref(Date.now())
  const intervalId = ref<number | null>(null)
  const expiredOnce = ref(false)

  const start = () => {
    expiredOnce.value = false
    deadline.value = Date.now() + durationSec * 1000
    now.value = Date.now()
    if (intervalId.value != null) window.clearInterval(intervalId.value)
    intervalId.value = window.setInterval(() => {
      now.value = Date.now()
      if (deadline.value == null) return
      if (!expiredOnce.value && now.value >= deadline.value) {
        expiredOnce.value = true
        onExpire?.()
      }
    }, 250)
  }

  const stop = () => {
    deadline.value = null
    if (intervalId.value != null) window.clearInterval(intervalId.value)
    intervalId.value = null
  }

  const remainingSec = computed(() => {
    if (deadline.value == null) return durationSec
    const ms = Math.max(0, deadline.value - now.value)
    return Math.ceil(ms / 1000)
  })

  const isRunning = computed(() => deadline.value != null)
  const isExpired = computed(() => isRunning.value && remainingSec.value <= 0)

  const format = computed(() => {
    const sec = remainingSec.value
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  onBeforeUnmount(stop)

  return { start, stop, remainingSec, isRunning, isExpired, format }
}

