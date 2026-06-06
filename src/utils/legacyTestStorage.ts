export const clearLegacyTestStorage = () => {
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith("bpo_test_session:") ||
        k.startsWith("bpo_test_results:") ||
        k.startsWith("bpo_test_grading_ready_at:")
      ) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
};

