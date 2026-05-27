'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { QueryClient } from '@tanstack/react-query';

const supabase = createClient();
const queryClient = new QueryClient();

export function useDocument<T>(tableName: string, id: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setData(null); setLoading(false); return; }
    setLoading(true);
    
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) setError(error.message);
        else setData(data as T);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [tableName, id]);

  return { data, loading, error };
}

export function useCollection<T>(tableName: string, filters?: { column: string; value: string }[]) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      let query = supabase.from(tableName).select('*');
      
      if (filters) {
        filters.forEach(f => {
          query = query.eq(f.column, f.value);
        });
      }
      
      try {
        const { data, error } = await query;
        if (error) setError(error.message);
        else setData((data || []) as T[]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [tableName, filters?.map(f => f.value).join(',')]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from(tableName).select('*');
      setData((data || []) as T[]);
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  return { data, loading, error, refetch };
}

export function useSupabaseMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(async (table: string, data: Record<string, unknown>) => {
    setLoading(true); setError(null);
    try { 
      const { data: result, error } = await supabase.from(table).insert(data).select().single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: [table] });
      return result;
    }
    catch (e: unknown) { 
      const msg = e instanceof Error ? e.message : 'Error'; 
      setError(msg); 
      throw e; 
    }
    finally { setLoading(false); }
  }, []);

  const update = useCallback(async (table: string, id: string, data: Record<string, unknown>) => {
    setLoading(true); setError(null);
    try { 
      const { data: result, error } = await supabase.from(table).update(data).eq('id', id).select().single();
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: [table] });
      return result;
    }
    catch (e: unknown) { 
      const msg = e instanceof Error ? e.message : 'Error'; 
      setError(msg); 
      throw e; 
    }
    finally { setLoading(false); }
  }, []);

  const remove = useCallback(async (table: string, id: string) => {
    setLoading(true); setError(null);
    try { 
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: [table] });
    }
    catch (e: unknown) { 
      const msg = e instanceof Error ? e.message : 'Error'; 
      setError(msg); 
      throw e; 
    }
    finally { setLoading(false); }
  }, []);

  return { add, update, remove, loading, error };
}

export { queryClient };
export { supabase };