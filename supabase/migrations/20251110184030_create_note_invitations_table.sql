/*
  # Create Note Invitations Table

  1. New Tables
    - `note_invitations`
      - `id` (uuid, primary key)
      - `note_id` (uuid, foreign key to notes)
      - `invited_by` (uuid, foreign key to auth.users)
      - `invited_email` (text)
      - `created_at` (timestamptz)
      
  2. Security
    - Enable RLS on `note_invitations` table
    - Add policy for authenticated users to invite others to their own notes
    - Add policy for authenticated users to view invitations they sent
    
  3. Indexes
    - Add index on note_id for faster lookups
    - Add index on invited_email for faster lookups
*/

CREATE TABLE IF NOT EXISTS note_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS note_invitations_note_id_idx ON note_invitations(note_id);
CREATE INDEX IF NOT EXISTS note_invitations_invited_email_idx ON note_invitations(invited_email);

ALTER TABLE note_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can invite others to their own notes"
  ON note_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_invitations.note_id
      AND notes.user_id = auth.uid()
    )
    AND auth.uid() = invited_by
  );

CREATE POLICY "Users can view invitations they sent"
  ON note_invitations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = invited_by);
