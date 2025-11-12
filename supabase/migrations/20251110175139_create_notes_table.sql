/*
  # Create notes table for NoteSync

  1. New Tables
    - `notes`
      - `id` (uuid, primary key) - Unique identifier for each note
      - `title` (text) - Note title, defaults to empty string
      - `content` (text) - Note content, defaults to empty string
      - `created_at` (timestamptz) - When the note was created
      - `updated_at` (timestamptz) - When the note was last updated
      - `user_id` (uuid) - Owner of the note (for future auth integration)
  
  2. Security
    - Enable RLS on `notes` table
    - Add policy for anyone to read notes (temporary, will restrict after auth)
    - Add policy for anyone to insert notes (temporary, will restrict after auth)
    - Add policy for anyone to update notes (temporary, will restrict after auth)
    - Add policy for anyone to delete notes (temporary, will restrict after auth)
  
  3. Indexes
    - Index on `created_at` for sorting recent notes
    - Index on `user_id` for filtering user's notes (future use)
*/

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text DEFAULT '',
  content text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notes"
  ON notes
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert notes"
  ON notes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update notes"
  ON notes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete notes"
  ON notes
  FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS notes_created_at_idx ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
