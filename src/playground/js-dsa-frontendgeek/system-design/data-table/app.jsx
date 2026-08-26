import { DataTable } from "./components/DataTable";
import { RowActionsMenu } from "./components/RowActionsMenu";
import { fetchPage } from "./productsApi";

const columns = [
  { key: "id", header: "ID", width: 60, sortable: true, resizable: true },
  { key: "title", header: "name", width: 160, sortable: true, resizable: true },
  { key: "brand", header: "brand", width: 140, sortable: true, resizable: true },
  { key: "category", header: "category", width: 140, sortable: true, resizable: true },
  { key: "price", header: "price", width: 90, sortable: true, resizable: true, render: (row) => `$${row.price}` },
  { key: "rating", header: "rating", width: 80, sortable: true, resizable: true },
  {
    key: "availabilityStatus",
    header: "status",
    width: 140,
    sortable: false,
    resizable: true,
    render: (row) => (
      <span className={`dt-badge dt-badge--${row.availabilityStatus === "In Stock" ? "available" : "unavailable"}`}>
        {row.availabilityStatus}
      </span>
    ),
  },
  {
    key: "actions",
    header: "",
    width: 50,
    sortable: false,
    resizable: false,
    render: (row) => (
      <RowActionsMenu
        row={row}
        items={[
          { label: "Edit", onClick: (r) => console.log("edit", r.id) },
          { label: "Delete", onClick: (r) => console.log("delete", r.id) },
        ]}
      />
    ),
  },
];

export default function App() {
  return (
    <DataTable
      title="Product list"
      columns={columns}
      fetchPage={fetchPage}
      rowKey="id"
      selectable
      searchable
      onSelectionChange={(ids) => console.log("selected:", ids)}
    />
  );
}
