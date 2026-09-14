import CategoryManager from "../components/CategoryManager";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="section-label self-start">Manage Categories</p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
          Expense & Income Categories
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          Organize your spending patterns and manage custom categories.
        </p>
      </div>

      <div className="max-w-2xl">
        <CategoryManager />
      </div>
    </div>
  );
}
