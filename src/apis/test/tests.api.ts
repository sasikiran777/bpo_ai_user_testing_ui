import { http, isApiConfigured } from '@/config/http_handler'
import type { ApiEnvelope } from '@/types/api/api.types'
import type { TestCatalogItem } from '@/types/test/testCatalog.types'

const mockTests: TestCatalogItem[] = [
  {
    id: 'd5dfaa69-da3e-43e0-9d57-7e596328e710',
    name: 'English',
    code: 'english',
    description: 'Measures real-world English communication with timed writing, comprehension, and speaking.',
    instruction: [
      'You can take this test only once.',
      'Do not refresh/close the tab or switch away. Leaving the test may mark it as failed.',
      'Writing: 5 minutes. Reading: 5 minutes. Speaking: 3 minutes (auto-recording)',
      'Microphone access is required for the Speaking section.',
      'Your activity (tab changes / focus loss) is tracked silently during the test.',
    ],
    is_active: true,
    attempted: false,
    user_test_mapping_id: null,
    status: 'not_attempted',
    reset_count: 0,
    completed_at: null,
    grading_completed: false,
    sections: [
      {
        id: 'dcaaa524-e683-4e52-a65a-2510b9a54578',
        test_id: 'd5dfaa69-da3e-43e0-9d57-7e596328e710',
        name: 'Write',
        description: 'Writing',
        max_marks: 10,
        max_time: 5,
        is_active: true,
      },
      {
        id: 'ed8ec6d0-87b7-41c3-8824-ec5dd2bdb734',
        test_id: 'd5dfaa69-da3e-43e0-9d57-7e596328e710',
        name: 'Read',
        description: 'Comprehension and Reading',
        max_marks: 10,
        max_time: 5,
        is_active: true,
      },
      {
        id: '61f9f116-437a-4044-a982-138563abf819',
        test_id: 'd5dfaa69-da3e-43e0-9d57-7e596328e710',
        name: 'Speak',
        description: 'Speaking',
        max_marks: 10,
        max_time: 3,
        is_active: true,
      },
    ],
  },
  {
    id: 'ebeed71d-2c9d-4047-ac43-534259e70917',
    name: 'Agentic AI',
    code: 'agentic_ai',
    description: 'Future module for agentic AI workflows and scenario-based testing.',
    instruction: [],
    is_active: false,
    attempted: false,
    user_test_mapping_id: null,
    status: 'not_attempted',
    reset_count: 0,
    completed_at: null,
    grading_completed: false,
    sections: [],
  },
]

const unwrap = <T>(envelope: ApiEnvelope<T>): T => {
  if (!envelope.success) {
    throw { status: 200, message: envelope.message ?? 'Request failed', raw: envelope }
  }
  return envelope.data
}

type StartMyTestResponse = {
  user_test_mapping_id: string
}

export const testsApi = {
  async startMyTest(testId: string, payload: { micro_phone_permission: boolean }): Promise<StartMyTestResponse> {
    if (!isApiConfigured) return { user_test_mapping_id: `mock_${testId}` }
    const { data } = await http.post<ApiEnvelope<StartMyTestResponse>>(`/tests/my-tests/${testId}`, payload)
    return unwrap(data)
  },
  async saveAnswers(payload: {
    user_test_mapping_id: string
    questions: string[]
    answers: string[]
    section_id: string
    changed_windows_count: number
  }): Promise<unknown> {
    if (!isApiConfigured) return { ok: true }
    const { data } = await http.post<ApiEnvelope<unknown>>('/tests/my-tests/save-answers', payload)
    return unwrap(data)
  },
  async get(testId: string): Promise<TestCatalogItem> {
    if (!isApiConfigured) {
      const found = mockTests.find((t) => t.id === testId)
      if (found) return found
      return mockTests[0]!
    }
    try {
      const { data } = await http.get<ApiEnvelope<TestCatalogItem>>(`/tests/${testId}`)
      return unwrap(data)
    } catch (e) {
      const status = (e as { status?: number } | undefined)?.status
      if (import.meta.env.DEV && typeof status === 'undefined') {
        const found = mockTests.find((t) => t.id === testId)
        if (found) return found
        return mockTests[0]!
      }
      throw e
    }
  },
  async myTests(): Promise<TestCatalogItem[]> {
    if (!isApiConfigured) return mockTests
    try {
      const { data } = await http.get<ApiEnvelope<TestCatalogItem[]>>('/tests/my-tests')
      return unwrap(data)
    } catch (e) {
      const status = (e as { status?: number } | undefined)?.status
      if (import.meta.env.DEV && typeof status === 'undefined') return mockTests
      throw e
    }
  },
  async list(): Promise<TestCatalogItem[]> {
    return this.myTests()
  },
}
