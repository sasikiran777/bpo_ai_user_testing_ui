export type TestSectionSummary = {
  id: string;
  test_id: string;
  name: string;
  description: string;
  max_marks: number;
  max_time: number;
  is_active: boolean;
};

export type TestCatalogItem = {
  id: string;
  name: string;
  code: string;
  description: string;
  instruction: string[];
  is_active: boolean;
  sections: TestSectionSummary[];
  attempted: boolean;
  user_test_mapping_id: string | null;
  status: "not_attempted" | "in_progress" | "completed" | "failed" | "grading";
  reset_count: number;
  completed_at: string | null;
  grading_completed: boolean;
};
