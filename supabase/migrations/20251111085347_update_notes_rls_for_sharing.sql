/*
  # Update Notes RLS Policies for Sharing
  
  1. Changes
    - Update SELECT policy to allow users to view notes they own OR have been invited to
    - Keep INSERT, UPDATE, and DELETE policies restricted to owners only
    - This enables the share functionality while maintaining security
    
  2. Security
    - Users can view notes they created
    - Users can view notes they've been invited to (via note_invitations table)
    - Only note owners can modify or delete notes
    - All policies require authentication
*/

DROP POLICY IF EXISTS "Users can view own notes" ON notes;

CREATE POLICY "Users can view own or invited notes"
  ON notes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM note_invitations
      WHERE note_invitations.note_id = notes.id
      AND note_invitations.invited_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );