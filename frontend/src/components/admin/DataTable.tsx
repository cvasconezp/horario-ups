import React, { useState, useMemo } from 'react';
import { Search, Edit2, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  /** Used for sorting when render returns JSX — extract a sortable primitive */
  sortValue?: (row: T) => string | number;
}

interface DataTableProps<T extends { id: number }> {
  data: T[];
  columns: Column<T>[];
  searchableFields?: (keyof T)[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  isLoading?: boolean;
  /** Items per page. 0 = show all (no pagination). Default 50 */
  pageSize?: number;
}

function getSortValue(val: unknown): string | number {
  if (val == null) return '';
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // ISO date strings
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) return new Date(val).getTime();
    return val.toLowerCase();
  }
  if (typeof val === 'object' && 'nombre' in (val as Record<string, unknown>)) {
    return String((val as Record<string, unknown>).nombre).toLowerCase();
  }
  return String(val).toLowerCase();
}

export function DataTable<T extends { id: number }>({
  data,
  columns,
  searchableFields = [],
  onEdit,
  onDelete,
  isLoading = false,
  pageSize = 50,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortValueFn, setSortValueFn] = useState<((row: T) => string | number) | null>(null);

  // Filter data
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item) =>
      searchableFields.some((field) => {
        const value = item[field];
        if (value && typeof value === 'object' && 'nombre' in (value as Record<string, unknown>)) {
          return String((value as Record<string, unknown>).nombre).toLowerCase().includes(term);
        }
        return String(value).toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, searchableFields]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = sortValueFn ? sortValueFn(a) : getSortValue(a[sortKey]);
      const bVal = sortValueFn ? sortValueFn(b) : getSortValue(b[sortKey]);
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortOrder, sortValueFn]);

  // Paginate
  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(sortedData.length / pageSize)) : 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = pageSize > 0
    ? sortedData.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize)
    : sortedData;

  const handleSort = (col: Column<T>) => {
    if (sortKey === col.key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(col.key);
      setSortOrder('asc');
      setSortValueFn(col.sortValue ? () => col.sortValue! : null);
    }
  };

  // Reset page when search changes
  const handleSearch = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      {searchableFields.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-200">
            <tr>
              {columns.map((col) => {
                const isSortable = col.sortable !== false; // All sortable by default
                const isActive = sortKey === col.key;
                return (
                  <th
                    key={String(col.key)}
                    className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
                  >
                    {isSortable ? (
                      <button
                        onClick={() => handleSort(col)}
                        className="flex items-center gap-1 hover:text-blue-600 transition group"
                      >
                        {col.label}
                        {isActive ? (
                          sortOrder === 'asc' ? (
                            <ChevronUp size={14} className="text-blue-600" />
                          ) : (
                            <ChevronDown size={14} className="text-blue-600" />
                          )
                        ) : (
                          <ChevronsUpDown size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
              {(onEdit || onDelete) && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onEdit || onDelete ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No hay datos disponibles
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3 text-sm text-gray-900">
                      {col.render
                        ? col.render(item[col.key], item)
                        : String(item[col.key] ?? '')}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination + Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <div className="text-sm text-gray-600">
          {pageSize > 0 && sortedData.length > pageSize
            ? `${(safeCurrentPage - 1) * pageSize + 1}–${Math.min(safeCurrentPage * pageSize, sortedData.length)} de ${sortedData.length} registros`
            : `${sortedData.length} de ${data.length} registros`}
        </div>

        {pageSize > 0 && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              «
            </button>
            <button
              onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
              disabled={safeCurrentPage === 1}
              className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (safeCurrentPage <= 3) {
                page = i + 1;
              } else if (safeCurrentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = safeCurrentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded border ${
                    page === safeCurrentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
              disabled={safeCurrentPage === totalPages}
              className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="px-2 py-1 text-sm rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-50"
            >
              »
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
