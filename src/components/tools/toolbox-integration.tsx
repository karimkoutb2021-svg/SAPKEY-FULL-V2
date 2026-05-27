'use client';

import { useState, useCallback, useEffect } from 'react';
import { CommandPalette } from './command-palette';
import { CodingWizard } from './coding-wizard';
import { AuditPanel } from './audit-panel';
import { LabelPrintModal } from './label-print';
import { ProductMasterCard } from './product-master-card';

type ToolId = 'coding' | 'audit' | 'label' | 'passport' | 'productcard' | 'approve' | 'ocr' | null;

interface ToolboxIntegrationProps {
  children?: React.ReactNode;
}

export function ToolboxIntegration({}: ToolboxIntegrationProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolId>(null);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleCommand = useCallback((commandId: string) => {
    setActiveTool(commandId as ToolId);
  }, []);

  const closeTool = useCallback(() => {
    setActiveTool(null);
  }, []);

  return (
    <>
      {/* Palette button (floating) */}
      <button
        onClick={() => setPaletteOpen(true)}
        className="fixed bottom-6 left-6 z-[200] w-12 h-12 rounded-full bg-white/[0.08] border border-white/[0.1] backdrop-blur-xl flex items-center justify-center hover:bg-white/[0.12] transition-all duration-300 shadow-lg hover:shadow-xl"
        style={{ backgroundColor: 'rgba(10,10,12,0.8)' }}
        title="Ctrl+K — فتح الأدوات"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
          <path d="M4 6h16M4 12h16M4 18h12" />
        </svg>
      </button>

      {/* Keyboard shortcut hint (shown briefly on mount) */}
      <div className="fixed bottom-6 left-24 z-[200]">
        <kbd className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[10px] text-gray-500 font-mono backdrop-blur-xl">
          ⌘K
        </kbd>
      </div>

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onCommand={handleCommand}
      />

      <CodingWizard
        isOpen={activeTool === 'coding'}
        onClose={closeTool}
      />

      <AuditPanel
        isOpen={activeTool === 'audit' || activeTool === 'ocr'}
        onClose={closeTool}
      />

      <LabelPrintModal
        isOpen={activeTool === 'label'}
        onClose={closeTool}
      />

      <ProductMasterCard
        isOpen={activeTool === 'productcard' || activeTool === 'passport'}
        onClose={closeTool}
      />
    </>
  );
}

export function usePalette() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const toggle = useCallback(() => setPaletteOpen((p) => !p), []);
  return { paletteOpen, setPaletteOpen, toggle };
}
