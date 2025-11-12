/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Add missing index on `note_invitations.invited_by` foreign key
    - Optimize all RLS policies to use `(select auth.uid())` pattern to avoid re-evaluation per row
    - Remove unused indexes that are not being utilized

  2. RLS Policy Optimizations
    - Update all policies on `notes` table to use optimized auth function calls
    - Update all policies on `note_invitations` table to use optimized auth function calls

  3. Index Management
    - Add covering index for `invited_by` foreign key
    - Keep `note_id` and `invited_email` indexes as they may be used for queries
*/

-- Add missing index for invited_by foreign key
CREATE INDEX IF NOT EXISTS note_invitations_invited_by_idx ON note_invitations(invited_by);

-- Drop and recreate RLS policies on notes table with optimized auth calls
DROP POLICY IF EXISTS "Users can view own or invited notes" ON notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON notes;
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

CREATE POLICY "Users can view own or invited notes"
  ON notes FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM note_invitations
      WHERE note_invitations.note_id = notes.id
      AND note_invitations.invited_email = (select auth.jwt()->>'email')
    )
  );

CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

-- Drop and recreate RLS policies on note_invitations table with optimized auth calls
DROP POLICY IF EXISTS "Users can invite others to their own notes" ON note_invitations;
DROP POLICY IF EXISTS "Users can view invitations they sent" ON note_invitations;

CREATE POLICY "Users can invite others to their own notes"
  ON note_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = note_invitations.note_id
      AND notes.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can view invitations they sent"
  ON note_invitations FOR SELECT
  TO authenticated
  USING (invited_by = (select auth.uid()));