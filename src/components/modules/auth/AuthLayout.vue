<template>
  <div
    class="relative grid min-h-screen place-items-start overflow-hidden bg-[#060606] px-4 py-6 text-white before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] before:bg-size-[20px_20px] before:opacity-40 before:content-[''] after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(900px_560px_at_20%_15%,rgba(255,138,31,0.20),transparent_60%),radial-gradient(900px_560px_at_80%_85%,rgba(255,255,255,0.06),transparent_60%)] after:content-[''] sm:py-10 lg:place-items-center"
  >
    <div
      class="relative grid w-full max-w-245 grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-black/20 shadow-[0_22px_70px_rgba(0,0,0,0.55)] backdrop-blur lg:grid-cols-2"
    >
      <section class="order-2 relative overflow-hidden bg-[#0a0a0a] p-6 sm:p-8 lg:order-1 lg:p-10">
        <div
          class="pointer-events-none absolute right-6 top-6 hidden h-44 w-44 bg-[radial-gradient(circle_at_2px_2px,rgba(255,138,31,0.9)_2px,transparent_2.2px),radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.18)_2px,transparent_2.2px)] bg-position-[0_0,7px_7px] bg-repeat bg-size-[14px_14px,14px_14px] opacity-35 mask-[radial-gradient(circle_at_30%_30%,black_35%,transparent_72%)] sm:block"
        />

        <div class="relative flex flex-col gap-10">
          <div class="flex flex-wrap items-center gap-4">
            <div class="grid h-14 w-14 place-items-center rounded-2xl bg-white">
              <span class="text-xl font-black tracking-tight text-black">BPO</span>
            </div>

            <div class="min-w-0 leading-tight">
              <div class="text-xl font-extrabold tracking-[-0.4px] sm:text-2xl">
                BPO <span class="text-white/70">Solutions</span>
              </div>
              <div class="text-lg font-extrabold tracking-[-0.4px] text-white/70 sm:text-xl">Group</div>
              <div class="mt-1 text-sm font-bold text-[#ff8a1f]">AI User Testing Platform</div>
            </div>
          </div>

          <div class="max-w-md">
            <div class="text-xs font-extrabold tracking-[1.6px] text-[#ff8a1f]">
              AI-POWERED SKILL ASSESSMENTS
            </div>
            <h1 class="mt-3 text-2xl font-extrabold leading-tight tracking-[-0.6px] sm:text-3xl">
              Test user skills with AI.
            </h1>
            <p class="mt-3 text-sm leading-6 text-white/70">
              Create assessments, run sessions, and review insights to understand real-world user
              capability.
            </p>
          </div>

          <div class="grid gap-3 text-sm text-white/75">
            <div class="flex items-center gap-3">
              <span class="h-2 w-2 rounded-full bg-[#ff8a1f]" />
              <span>Adaptive questions powered by AI</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="h-2 w-2 rounded-full bg-[#ff8a1f]" />
              <span>Instant scoring and feedback</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="h-2 w-2 rounded-full bg-[#ff8a1f]" />
              <span>Session history and analytics</span>
            </div>
          </div>
        </div>
      </section>

      <section class="order-1 grid place-items-center bg-white p-5 text-slate-900 sm:p-8 lg:order-2 lg:p-10">
        <slot />
      </section>
    </div>
  </div>
</template>
