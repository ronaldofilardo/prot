"use client";

export function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, idx) => (
        <tr key={idx} className="animate-pulse">
          <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" /></td>
          <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-12" /></td>
          <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-48" /></td>
          <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
          <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28 ml-auto" /></td>
          <td className="py-4 px-6 text-center"><div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-16 mx-auto" /></td>
        </tr>
      ))}
    </>
  );
}
