import { apiBaseUrl, http, isApiConfigured } from "@/config/http_handler";
import type { ApiEnvelope } from "@/types/api/api.types";
import type { TestCatalogItem } from "@/types/test/testCatalog.types";
import type { ReadingQuestion, ReadingSet, SpeakingTopic } from "@/types/test/test.types";

const mockTests: TestCatalogItem[] = [
  {
    id: "d5dfaa69-da3e-43e0-9d57-7e596328e710",
    name: "English",
    code: "english",
    description:
      "Measures real-world English communication with timed writing, comprehension, and speaking.",
    instruction: [
      "You can take this test only once.",
      "Do not refresh/close the tab or switch away. Leaving the test may mark it as failed.",
      "Writing: 5 minutes. Reading: 5 minutes. Speaking: 3 minutes (auto-recording)",
      "Microphone access is required for the Speaking section.",
      "Your activity (tab changes / focus loss) is tracked silently during the test.",
    ],
    is_active: true,
    attempted: false,
    user_test_mapping_id: null,
    status: "not_attempted",
    reset_count: 0,
    completed_at: null,
    grading_completed: false,
    sections: [
      {
        id: "dcaaa524-e683-4e52-a65a-2510b9a54578",
        test_id: "d5dfaa69-da3e-43e0-9d57-7e596328e710",
        name: "Write",
        description: "Writing",
        max_marks: 10,
        max_time: 5,
        is_active: true,
      },
      {
        id: "ed8ec6d0-87b7-41c3-8824-ec5dd2bdb734",
        test_id: "d5dfaa69-da3e-43e0-9d57-7e596328e710",
        name: "Read",
        description: "Comprehension and Reading",
        max_marks: 10,
        max_time: 5,
        is_active: true,
      },
      {
        id: "61f9f116-437a-4044-a982-138563abf819",
        test_id: "d5dfaa69-da3e-43e0-9d57-7e596328e710",
        name: "Speak",
        description: "Speaking",
        max_marks: 10,
        max_time: 3,
        is_active: true,
      },
    ],
  },
  {
    id: "ebeed71d-2c9d-4047-ac43-534259e70917",
    name: "Agentic AI",
    code: "agentic_ai",
    description: "Future module for agentic AI workflows and scenario-based testing.",
    instruction: [],
    is_active: false,
    attempted: false,
    user_test_mapping_id: null,
    status: "not_attempted",
    reset_count: 0,
    completed_at: null,
    grading_completed: false,
    sections: [],
  },
];

const unwrap = <T>(envelope: ApiEnvelope<T>): T => {
  if (!envelope.success) {
    throw { status: 200, message: envelope.message ?? "Request failed", raw: envelope };
  }
  return envelope.data;
};

const unwrapMaybeEnvelope = <T>(data: unknown): T => {
  const maybeEnvelope = data as Partial<ApiEnvelope<unknown>> | null;
  const isEnvelope =
    maybeEnvelope &&
    typeof maybeEnvelope === "object" &&
    "success" in maybeEnvelope &&
    "data" in maybeEnvelope;
  if (isEnvelope) return unwrap(maybeEnvelope as ApiEnvelope<T>);
  return data as T;
};

type BackendReadingQuestion = {
  type: "mcq" | "blank" | "short";
  question: string;
  answer?: string;
  answer_key?: string;
  options?: string[];
};

type BackendReading = {
  id: string;
  passage: string;
  questions: BackendReadingQuestion[];
};

type BackendSpeakingTopic = {
  id: string;
  topic: string;
};

const normalizeReading = (raw: BackendReading, sectionId: string): ReadingSet => {
  const questions: ReadingQuestion[] = (raw.questions ?? []).map((q, idx) => {
    const id = `q_${idx + 1}`;
    const prompt = q.question ?? "";
    if (q.type === "mcq") {
      return {
        id,
        type: "mcq",
        prompt,
        options: q.options ?? [],
        correctAnswer: q.answer ?? "",
      };
    }
    if (q.type === "blank") {
      return {
        id,
        type: "blank",
        prompt,
        correctAnswer: q.answer ?? "",
      };
    }
    return {
      id,
      type: "short",
      prompt,
      correctAnswer: q.answer_key ?? q.answer ?? "",
    };
  });

  return {
    id: raw.id ?? `reading_${sectionId}`,
    passage: raw.passage ?? "",
    questions,
  };
};

const normalizeSpeakingTopic = (raw: BackendSpeakingTopic, sectionId: string): SpeakingTopic => {
  return {
    id: raw.id ?? `speaking_${sectionId}`,
    prompt: raw.topic ?? "",
  };
};

type StartMyTestResponse = {
  user_test_mapping_id: string;
};

export const testsApi = {
  async startMyTest(
    testId: string,
    payload: { micro_phone_permission: boolean },
  ): Promise<StartMyTestResponse> {
    if (!isApiConfigured) return { user_test_mapping_id: `mock_${testId}` };
    const { data } = await http.post<unknown>(`/tests/my-tests/${testId}`, payload);

    const maybeEnvelope = data as Partial<ApiEnvelope<unknown>> | null;
    const body =
      maybeEnvelope &&
      typeof maybeEnvelope === "object" &&
      "success" in maybeEnvelope &&
      "data" in maybeEnvelope
        ? unwrap(maybeEnvelope as ApiEnvelope<unknown>)
        : data;

    const mappingId =
      (body as { user_test_mapping_id?: string; id?: string } | null)?.user_test_mapping_id ??
      (body as { id?: string } | null)?.id;

    if (!mappingId) {
      throw { status: 200, message: "Start response missing mapping id", raw: data };
    }

    return { user_test_mapping_id: mappingId };
  },
  async saveAnswers(payload: {
    user_test_mapping_id: string;
    questions: string[];
    answers: string[];
    section_id: string;
    changed_windows_count: number;
    test_notes?: string[];
  }): Promise<unknown> {
    if (!isApiConfigured) return { ok: true };
    const { data } = await http.post<ApiEnvelope<unknown>>("/tests/my-tests/save-answers", payload);
    return unwrap(data);
  },
  async saveAudioAnswer(payload: {
    user_test_mapping_id: string;
    section_id: string;
    question: string;
    changed_windows_count: number;
    audio: Blob;
    test_notes?: string[];
  }): Promise<unknown> {
    if (!isApiConfigured) return { ok: true };
    const form = new FormData();
    form.append("user_test_mapping_id", payload.user_test_mapping_id);
    form.append("section_id", payload.section_id);
    form.append("question", payload.question);
    form.append("changed_windows_count", String(payload.changed_windows_count ?? 0));
    if (payload.test_notes?.length) {
      form.append("test_notes", JSON.stringify(payload.test_notes));
    }

    const filename = payload.audio.type?.includes("wav")
      ? "audio.wav"
      : payload.audio.type?.includes("mpeg")
        ? "audio.mp3"
        : payload.audio.type?.includes("mp4") || payload.audio.type?.includes("m4a")
          ? "audio.m4a"
          : payload.audio.type?.includes("ogg")
            ? "audio.ogg"
            : "audio.webm";

    const file = new File([payload.audio], filename, { type: payload.audio.type || "audio/webm" });
    form.append("audio", file);

    const { data } = await http.post<ApiEnvelope<unknown>>("/tests/my-tests/save-audio", form, {
      headers: {
        "Content-Type": undefined,
      },
    });
    return unwrap(data);
  },
  async getReadingBySection(sectionId: string): Promise<ReadingSet> {
    if (!isApiConfigured) {
      return {
        id: `mock_reading_${sectionId}`,
        passage:
          "BPO Solutions Group helps organizations improve customer experience by providing skilled teams and modern tools.",
        questions: [],
      };
    }
    const { data } = await http.get<ApiEnvelope<unknown>>(
      `/tests/sections/${encodeURIComponent(sectionId)}/reading`,
    );
    const body = unwrapMaybeEnvelope<BackendReading>(data);
    return normalizeReading(body, sectionId);
  },
  async getSpeakingTopicBySection(sectionId: string): Promise<SpeakingTopic> {
    if (!isApiConfigured) {
      return {
        id: `mock_speaking_${sectionId}`,
        prompt: "Talk about a challenge you faced at work and how you solved it.",
      };
    }
    const { data } = await http.get<ApiEnvelope<unknown>>(
      `/tests/sections/${encodeURIComponent(sectionId)}/speaking-topic`,
    );
    const body = unwrapMaybeEnvelope<BackendSpeakingTopic>(data);
    return normalizeSpeakingTopic(body, sectionId);
  },
  async get(testId: string): Promise<TestCatalogItem> {
    if (!isApiConfigured) {
      const found = mockTests.find((t) => t.id === testId);
      if (found) return found;
      return mockTests[0]!;
    }
    try {
      const { data } = await http.get<ApiEnvelope<TestCatalogItem>>(`/tests/${testId}`);
      return unwrap(data);
    } catch (e) {
      const status = (e as { status?: number } | undefined)?.status;
      if (import.meta.env.DEV && typeof status === "undefined") {
        const found = mockTests.find((t) => t.id === testId);
        if (found) return found;
        return mockTests[0]!;
      }
      throw e;
    }
  },
  async myTests(): Promise<TestCatalogItem[]> {
    if (!isApiConfigured) return mockTests;
    try {
      const { data } = await http.get<ApiEnvelope<TestCatalogItem[]>>("/tests/my-tests");
      return unwrap(data);
    } catch (e) {
      const status = (e as { status?: number } | undefined)?.status;
      if (import.meta.env.DEV && typeof status === "undefined") return mockTests;
      throw e;
    }
  },
  async failMyTest(testId: string): Promise<unknown> {
    if (!isApiConfigured) return { ok: true };
    const { data } = await http.post<ApiEnvelope<unknown>>(`/tests/my-tests/${testId}/fail`, {});
    return unwrap(data);
  },
  async dropMyTest(userTestMappingId: string, opts?: { keepalive?: boolean }): Promise<unknown> {
    if (!isApiConfigured) return { ok: true };

    if (opts?.keepalive && typeof fetch !== "undefined") {
      const base = apiBaseUrl.replace(/\/$/, "");
      const url = `${base}/my-tests/${encodeURIComponent(userTestMappingId)}/drop`;
      const token = localStorage.getItem("auth_token");

      try {
        await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: "{}",
          keepalive: true,
          credentials: "include",
        });
      } catch {
        return { ok: false };
      }

      return { ok: true };
    }

    const { data } = await http.post<ApiEnvelope<unknown>>(
      `/my-tests/${encodeURIComponent(userTestMappingId)}/drop`,
      {},
    );
    return unwrap(data);
  },
  async myTestResults(userTestMappingId: string): Promise<unknown> {
    if (!isApiConfigured) return { ok: true };
    const { data } = await http.get<ApiEnvelope<unknown>>(
      `/tests/my-tests/results/${encodeURIComponent(userTestMappingId)}`,
    );
    return unwrapMaybeEnvelope<unknown>(data);
  },
  async myTestSectionAudio(userTestMappingId: string, sectionId: string): Promise<Blob> {
    if (!isApiConfigured) return new Blob();
    const { data } = await http.get(
      `/tests/my-tests/audio/${encodeURIComponent(userTestMappingId)}/sections/${encodeURIComponent(sectionId)}`,
      { responseType: "blob" },
    );
    return data as Blob;
  },
  async list(): Promise<TestCatalogItem[]> {
    return this.myTests();
  },
};
