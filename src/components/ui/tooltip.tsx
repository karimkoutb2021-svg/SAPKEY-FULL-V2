import { ReactNode } from 'react';

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-gray-900/95 backdrop-blur-sm text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-active:opacity-100 group-active:visible transition-all duration-200 whitespace-nowrap z-[100] shadow-xl pointer-events-none border border-white/10 flex items-center justify-center">
        {text}
        {/* Arrow pointer */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900/95" />
      </div>
    </div>
  );
}
