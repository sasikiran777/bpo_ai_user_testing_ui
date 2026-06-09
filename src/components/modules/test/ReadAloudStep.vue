<script setup lang="ts">
import AppButton from "@/components/ui/AppButton.vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import type { SpeakingTopic } from "@/types/test/test.types";

const props = defineProps<{
  timerLabel: string;
  timerValue: string;
  disabled?: boolean;
  topic: SpeakingTopic;
  startedAt: number | null;
  isTimerRunning: boolean;
  isExpired: boolean;
}>();

const emit = defineEmits<{
  (e: "start"): void;
  (e: "submit", audio: Blob): void;
  (e: "autoSubmit", audio: Blob, startedAt: number): void;
}>();

const mediaRecorder = ref<MediaRecorder | null>(null);
const mediaStream = ref<MediaStream | null>(null);
const chunks = ref<BlobPart[]>([]);
const recording = ref(false);
const submitting = ref(false);
const permissionError = ref<string | null>(null);
const recordedBlob = ref<Blob | null>(null);
const previewUrl = ref<string | null>(null);

const revokePreview = () => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
  previewUrl.value = null;
};

const stopStream = () => {
  mediaStream.value?.getTracks().forEach((track) => track.stop());
  mediaStream.value = null;
};

const setRecordedBlob = (blob: Blob) => {
  recordedBlob.value = blob;
  revokePreview();
  previewUrl.value = URL.createObjectURL(blob);
};

const canStartRecording = computed(
  () =>
    !props.disabled &&
    !recording.value &&
    !submitting.value &&
    !props.isExpired &&
    !recordedBlob.value,
);
const canStopRecording = computed(() => recording.value);
const canSubmit = computed(
  () => !props.disabled && !recording.value && !submitting.value && !!recordedBlob.value,
);
const canRerecord = computed(
  () =>
    !props.disabled &&
    !recording.value &&
    !submitting.value &&
    !props.isExpired &&
    !!recordedBlob.value,
);

const buildBlob = (mimeType?: string) => new Blob(chunks.value, { type: mimeType ?? "audio/webm" });

const finalizeRecorderState = () => {
  mediaRecorder.value = null;
  stopStream();
};

const stopRecording = (auto: boolean) => {
  const recorder = mediaRecorder.value;
  if (!recorder || recorder.state !== "recording") return;

  const startedAt = props.startedAt ?? Date.now();
  recording.value = false;
  submitting.value = auto;

  recorder.addEventListener(
    "stop",
    () => {
      const blob = buildBlob(recorder.mimeType);
      chunks.value = [];
      finalizeRecorderState();

      if (auto) {
        const fallbackBlob =
          blob.size > 0 ? blob : (recordedBlob.value ?? new Blob([], { type: "audio/webm" }));
        emit("autoSubmit", fallbackBlob, startedAt);
        return;
      }

      if (!blob.size) {
        permissionError.value = "Recording failed. Please try again.";
        submitting.value = false;
        return;
      }

      setRecordedBlob(blob);
      submitting.value = false;
    },
    { once: true },
  );

  recorder.stop();
};

const startRecording = async () => {
  if (!canStartRecording.value && !canRerecord.value) return;

  permissionError.value = null;
  if (!props.startedAt && !props.isTimerRunning) emit("start");
  revokePreview();
  recordedBlob.value = null;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    mediaStream.value = stream;
    mediaRecorder.value = recorder;
    chunks.value = [];
    recording.value = true;

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.value.push(event.data);
    });

    recorder.addEventListener(
      "stop",
      () => {
        stopStream();
      },
      { once: true },
    );

    recorder.start();
  } catch (error) {
    permissionError.value =
      error instanceof Error
        ? error.message
        : "Microphone permission denied. Please allow access and try again.";
    submitting.value = false;
    recording.value = false;
    finalizeRecorderState();
  }
};

const rerecord = async () => {
  if (!canRerecord.value) return;
  await startRecording();
};

const submit = () => {
  if (!recordedBlob.value) {
    permissionError.value = "Please record your answer before submitting.";
    return;
  }

  const ok = window.confirm(
    "Submitting will end the Read Aloud section and move to the next section. You cannot re-record after submitting. Continue?",
  );
  if (!ok) return;

  submitting.value = true;
  emit("submit", recordedBlob.value);
};

watch(
  () => props.isExpired,
  (expired) => {
    if (!expired) return;
    if (recording.value) {
      stopRecording(true);
      return;
    }
    if (recordedBlob.value) emit("autoSubmit", recordedBlob.value, props.startedAt ?? Date.now());
  },
);

onBeforeUnmount(() => {
  if (recording.value) stopRecording(true);
  else finalizeRecorderState();
  revokePreview();
});
</script>

<template>
  <div class="grid gap-6 rounded-3xl border border-white/10 bg-black/25 p-6 backdrop-blur">
    <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="text-xs font-extrabold tracking-[1.8px] text-white/55">SECTION 4</div>
        <h2 class="mt-1 text-xl font-extrabold tracking-[-0.3px]">Read Aloud (90 seconds)</h2>
        <p class="mt-1 text-sm text-white/65">
          Read the passage aloud clearly. You can replay and re-record before final submission.
        </p>
      </div>
    </div>

    <div class="rounded-3xl border border-white/10 bg-black/30 p-5">
      <div class="text-sm font-semibold text-white/85">Passage</div>
      <div class="mt-2 whitespace-pre-line text-sm leading-6 text-white/75">{{ topic.prompt }}</div>
    </div>

    <div
      v-if="permissionError"
      class="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
    >
      {{ permissionError }}
    </div>

    <div class="flex flex-col gap-3 rounded-3xl border border-white/10 bg-black/30 p-5">
      <div class="text-sm font-semibold text-white/80">
        Status:
        <span v-if="recording" class="text-[#ff8a1f]">Recording...</span>
        <span v-else-if="submitting" class="text-white/70">Submitting...</span>
        <span v-else-if="recordedBlob" class="text-emerald-200">Ready to submit</span>
        <span v-else class="text-white/70">Not started</span>
      </div>

      <audio v-if="previewUrl" class="w-full" :src="previewUrl" controls />

      <div class="flex flex-wrap gap-3">
        <AppButton v-if="canStartRecording" class="h-10 px-6" @click="startRecording">
          Start Recording
        </AppButton>
        <AppButton
          v-if="canStopRecording"
          variant="secondary"
          class="h-10 px-6"
          @click="stopRecording(false)"
        >
          Stop Recording
        </AppButton>
        <AppButton v-if="canRerecord" variant="secondary" class="h-10 px-6" @click="rerecord">
          Re-record
        </AppButton>
        <AppButton v-if="canSubmit" class="h-10 px-6" @click="submit">Submit</AppButton>
      </div>
    </div>
  </div>
</template>
