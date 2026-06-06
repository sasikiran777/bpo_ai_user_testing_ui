import { apiBaseUrl, http } from "@/config/http_handler";
import type { ApiEnvelope } from "@/types/api/api.types";
import type { TestCatalogItem } from "@/types/test/testCatalog.types";
import type { ReadingQuestion, ReadingSet, SpeakingTopic } from "@/types/test/test.types";

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
    const { data } = await http.get<ApiEnvelope<unknown>>(
      `/tests/sections/${encodeURIComponent(sectionId)}/reading`,
    );
    const body = unwrapMaybeEnvelope<BackendReading>(data);
    return normalizeReading(body, sectionId);
  },
  async getSpeakingTopicBySection(sectionId: string): Promise<SpeakingTopic> {
    const { data } = await http.get<ApiEnvelope<unknown>>(
      `/tests/sections/${encodeURIComponent(sectionId)}/speaking-topic`,
    );
    const body = unwrapMaybeEnvelope<BackendSpeakingTopic>(data);
    return normalizeSpeakingTopic(body, sectionId);
  },
  async get(testId: string): Promise<TestCatalogItem> {
    const { data } = await http.get<ApiEnvelope<TestCatalogItem>>(`/tests/${testId}`);
    return unwrap(data);
  },
  async myTests(): Promise<TestCatalogItem[]> {
    const { data } = await http.get<ApiEnvelope<TestCatalogItem[]>>("/tests/my-tests");
    return unwrap(data);
  },
  async failMyTest(testId: string): Promise<unknown> {
    const { data } = await http.post<ApiEnvelope<unknown>>(`/tests/my-tests/${testId}/fail`, {});
    return unwrap(data);
  },
  async dropMyTest(userTestMappingId: string, opts?: { keepalive?: boolean }): Promise<unknown> {
    if (opts?.keepalive && typeof fetch !== "undefined") {
      const base = apiBaseUrl.replace(/\/$/, "");
      const url = `${base}/tests/my-tests/${encodeURIComponent(userTestMappingId)}/drop`;
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
      `/tests/my-tests/${encodeURIComponent(userTestMappingId)}/drop`,
      {},
    );
    return unwrap(data);
  },
  async myTestResults(userTestMappingId: string): Promise<unknown> {
    const { data } = await http.get<ApiEnvelope<unknown>>(
      `/tests/my-tests/results/${encodeURIComponent(userTestMappingId)}`,
    );
    return unwrapMaybeEnvelope<unknown>(data);
  },
  async myTestSectionAudio(userTestMappingId: string, sectionId: string): Promise<Blob> {
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
