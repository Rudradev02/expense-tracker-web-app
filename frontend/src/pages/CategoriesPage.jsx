import CategoryManager from "../components/CategoryManager";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <span className="section-label self-start" style={{ color: "var(--text-muted)" }}>
          Structure
        </span>
        <h2 className="text-2xl font-bold tracking-tight m-0 mt-1" style={{ color: "var(--text)" }}>
          Categories & Taxonomy
        </h2>
        <p className="text-xs sm:text-sm m-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
          Organize spending patterns and configure custom category tags.
        </p>
      </div>

      <div className="max-w-2xl">
        <CategoryManager />
      </div>
    </div>
  );
}
