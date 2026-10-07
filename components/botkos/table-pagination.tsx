"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

interface TablePaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: TablePaginationProps) {
  if (totalItems <= pageSize || totalPages <= 1) {
    return null
  }

  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, totalItems)

  // Generate page numbers to show
  const pageNumbers: number[] = []
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i)
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--line)] bg-[#fffefa] px-5 py-3.5 sm:flex-row text-xs">
      <div className="text-[var(--ink-muted)]">
        Menampilkan <strong className="text-[var(--ink)]">{startIndex}</strong> -{" "}
        <strong className="text-[var(--ink)]">{endIndex}</strong> dari{" "}
        <strong className="text-[var(--ink)]">{totalItems}</strong> data
      </div>

      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Halaman sebelumnya"
          className="inline-flex items-center gap-1 border border-[var(--line)] bg-transparent px-2.5 py-1 font-medium text-[var(--ink)] hover:bg-black/5 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={14} />
          <span>Sebelumnya</span>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 px-1">
          {pageNumbers.map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`flex h-7 w-7 items-center justify-center font-mono font-semibold transition-colors ${
                currentPage === page
                  ? "bg-[var(--wood)] text-white"
                  : "text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]"
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Halaman berikutnya"
          className="inline-flex items-center gap-1 border border-[var(--line)] bg-transparent px-2.5 py-1 font-medium text-[var(--ink)] hover:bg-black/5 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <span>Berikutnya</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}
