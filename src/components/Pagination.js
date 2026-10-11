// Pagination.js — Composant de pagination réutilisable
// Props: page, totalPages, total, pageSize, onPageChange

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, total, pageSize, onPageChange }) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  // Génère les numéros de pages à afficher (avec ellipsis)
  function getPages() {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('…');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('…');
      pages.push(totalPages);
    }
    return pages;
  }

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 34, height: 34, padding: '0 6px',
    border: '1.5px solid #E5E5E5', borderRadius: 8,
    fontSize: 13, fontWeight: 500,
    cursor: 'pointer', background: '#fff', color: '#404040',
    fontFamily: 'Poppins, sans-serif',
    transition: 'all 0.15s',
    userSelect: 'none',
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 10,
      padding: '14px 0 4px',
      borderTop: '1px solid #F0F0F0',
    }}>
      {/* Info */}
      <span style={{ fontSize: 12, color: '#A3A3A3', fontFamily: 'Poppins, sans-serif' }}>
        {from}–{to} sur <strong style={{ color: '#525252' }}>{total}</strong>
      </span>

      {/* Boutons */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {/* Précédent */}
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          style={{
            ...btnBase,
            opacity: page === 1 ? 0.4 : 1,
            cursor: page === 1 ? 'default' : 'pointer',
          }}
          onMouseEnter={e => { if (page !== 1) e.currentTarget.style.borderColor = '#E8920A'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E5E5'; }}
        >
          <ChevronLeft size={15} strokeWidth={2} />
        </button>

        {/* Pages */}
        {getPages().map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} style={{ ...btnBase, border: 'none', cursor: 'default', color: '#A3A3A3' }}>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                ...btnBase,
                background: p === page ? '#E8920A' : '#fff',
                color:      p === page ? '#fff'    : '#404040',
                borderColor: p === page ? '#E8920A' : '#E5E5E5',
                fontWeight: p === page ? 700 : 500,
              }}
              onMouseEnter={e => { if (p !== page) e.currentTarget.style.borderColor = '#E8920A'; }}
              onMouseLeave={e => { if (p !== page) e.currentTarget.style.borderColor = '#E5E5E5'; }}
            >
              {p}
            </button>
          )
        )}

        {/* Suivant */}
        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{
            ...btnBase,
            opacity: page === totalPages ? 0.4 : 1,
            cursor: page === totalPages ? 'default' : 'pointer',
          }}
          onMouseEnter={e => { if (page !== totalPages) e.currentTarget.style.borderColor = '#E8920A'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E5E5'; }}
        >
          <ChevronRight size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
