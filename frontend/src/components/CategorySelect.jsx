import { useCategories } from "../context/CategoriesContext";

export default function CategorySelect({ id, value, onChange, required = true }) {
  const { categories, loading } = useCategories();

  const names = categories.map((c) => c.name);
  const hasOrphan = value && !names.some((n) => n.toLowerCase() === value.toLowerCase());

  if (loading) {
    return (
      <select id={id} className="input-field" disabled>
        <option>Loading categories...</option>
      </select>
    );
  }

  if (categories.length === 0 && !value) {
    return (
      <select id={id} className="input-field" disabled>
        <option value="">Create a category first</option>
      </select>
    );
  }

  return (
    <select
      id={id}
      className="input-field"
      value={value}
      onChange={onChange}
      required={required}
    >
      {!value && (
        <option value="" disabled>
          Select category
        </option>
      )}
      {hasOrphan && (
        <option value={value}>{value} (legacy)</option>
      )}
      {categories.map((cat) => (
        <option key={cat.id} value={cat.name}>
          {cat.name}
        </option>
      ))}
    </select>
  );
}
