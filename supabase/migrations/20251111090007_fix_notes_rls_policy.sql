/*
  # Fix Notes RLS Policy for Sharing
  
  1. Changes
    - Update SELECT policy to use auth.jwt() instead of querying auth.users table
    - This avoids permission denied errors when checking invited users
    - Uses the email from JWT token which is always accessible
    
  2. Security
    - Users can view notes they created
    - Users can view notes they've been invited to via email
    - Only note owners can modify or delete notes
    - All policies require authentication
*/

DROP POLICY IF EXISTS "Users can view own or invited notes" ON notes;

CREATE POLICY "Users can view own or invited notes"
  ON notes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM note_invitations
      WHERE note_invitations.note_id = notes.id
      AND note_invitations.invited_email = (auth.jwt() ->> 'email')
    )
  );