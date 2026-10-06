"use client";

import React from "react";

export function FiliaisTableHeader() {
  return (
    <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-400">
      <tr>
        <th className="pb-2 font-medium w-24">Cód.</th>
        <th className="pb-2 font-medium">Nome / Razão Social</th>
        <th className="pb-2 font-medium w-48">CNPJ / Identificação</th>
        <th className="pb-2 font-medium w-24">Status</th>
        <th className="pb-2 font-medium text-right w-24">Ações</th>
      </tr>
    </thead>
  );
}