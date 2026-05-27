'use client';

import { Component, type ReactNode } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class POSErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('POS Error:', error, errorInfo);
  }

  handleClearAndReload = () => {
    try {
      localStorage.removeItem('pos-store');
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-dvh flex flex-col items-center justify-center bg-gray-50 dark:bg-[#020617] p-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
            <Trash2 className="h-7 w-7 text-red-500" />
          </div>
          <h2 className="text-lg font-bold mb-1">حدث خطأ</h2>
          <p className="text-xs text-gray-500 mb-6 max-w-xs">
            تعذر تحميل صفحة نقاط البيع. قد يكون بسبب بيانات مخزنة قديمة.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleClearAndReload}
              className="h-10 px-5 rounded-xl bg-[#22C55E] text-white text-xs font-bold hover:bg-[#16A34A] transition-all shadow-lg flex items-center gap-2"
            >
              <Trash2 className="h-3.5 w-3.5" />
              مسح الذاكرة وإعادة التحميل
            </button>
            <button
              onClick={this.handleReload}
              className="h-10 px-5 rounded-xl bg-gray-100 dark:bg-gray-800 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-all flex items-center gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              إعادة تحميل
            </button>
          </div>
          {this.state.error && (
            <p className="mt-6 text-[10px] text-gray-400 max-w-xs font-mono">
              {this.state.error.message}
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
