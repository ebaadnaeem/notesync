import { supabase, type Note } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type { Note };

export function subscribeToNote(
  noteId: string,
  onUpdate: (note: Note) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`note:${noteId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notes',
        filter: `id=eq.${noteId}`,
      },
      (payload) => {
        onUpdate(payload.new as Note);
      }
    )
    .subscribe();

  return channel;
}

export async function getNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notes:', error);
    return [];
  }

  return data || [];
}

export async function getNote(id: string): Promise<Note | null> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching note:', error);
    return null;
  }

  return data;
}

export async function createNote(): Promise<Note | null> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error('User not authenticated');
    return null;
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({
      title: '',
      content: '',
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating note:', error);
    return null;
  }

  return data;
}

export async function updateNote(
  id: string,
  updates: { title?: string; content?: string }
): Promise<Note | null> {
  const { data, error } = await supabase
    .from('notes')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating note:', error);
    return null;
  }

  return data;
}

export async function deleteNote(id: string): Promise<boolean> {
  const { error } = await supabase.from('notes').delete().eq('id', id);

  if (error) {
    console.error('Error deleting note:', error);
    return false;
  }

  return true;
}
