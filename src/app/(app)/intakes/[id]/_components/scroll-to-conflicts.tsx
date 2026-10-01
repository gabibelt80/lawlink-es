"use client";

export function ScrollToConflicts() {
  return (
    <button
      type="button"
      onClick={() => {
        document
          .getElementById("conflict-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }}
      className="mt-2 text-xs font-medium text-amber-800 underline underline-offset-2 hover:no-underline dark:text-amber-200"
    >
      Ir a la sección de conflictos ↓
    </button>
  );
}