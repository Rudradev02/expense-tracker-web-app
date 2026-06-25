import AddTransaction from "./AddTransaction";
import CategoryManager from "../components/CategoryManager";

export default function SidebarPanel() {
  return (
    <div className="lg:sticky lg:top-24">
      <AddTransaction />
      <CategoryManager />
    </div>
  );
}
