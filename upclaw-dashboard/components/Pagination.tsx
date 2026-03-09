import React from "react";

interface PaginationProps {
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  totalCount: number;
}

export function Pagination({
  page,
  setPage,
  pageSize,
  totalCount,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 2) {
        pages.push(0, 1, 2, "...", totalPages - 1);
      } else if (page >= totalPages - 3) {
        pages.push(0, "...", totalPages - 3, totalPages - 2, totalPages - 1);
      } else {
        pages.push(0, "...", page - 1, page, page + 1, "...", totalPages - 1);
      }
    }
    return pages;
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "24px 0",
      }}
    >
      <span style={{ fontSize: "13px", color: "var(--text-3)" }}>
        Showing {page * pageSize + 1}-
        {Math.min((page + 1) * pageSize, totalCount)} of {totalCount} items
      </span>
      <div style={{ display: "flex", gap: "6px" }}>
        {getPageNumbers().map((p, index) => {
          if (p === "...") {
            return (
              <button
                key={`ellipsis-${index}`}
                disabled
                style={{
                  padding: "6px 12px",
                  border: "1px solid transparent",
                  background: "transparent",
                  color: "var(--text-3)",
                  fontSize: "13px",
                  fontFamily: "inherit",
                }}
              >
                ...
              </button>
            );
          }

          const pageNum = p as number;
          const isActive = pageNum === page;

          return (
            <button
              key={pageNum}
              onClick={() => setPage(pageNum)}
              style={{
                padding: "6px 12px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                background: isActive ? "var(--text)" : "var(--bg)",
                color: isActive ? "white" : "inherit",
                fontSize: "13px",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              {pageNum + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
