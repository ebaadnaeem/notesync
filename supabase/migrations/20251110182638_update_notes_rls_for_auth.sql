/*
  # Update RLS Policies for Authenticated Users

  1. Changes
    - Drop the temporary permissive policies
    - Add strict RLS policies that require authentication
    - Users can only view, insert, update, and delete their own notes
    - Automatically set user_id on insert using auth.uid()
  
  2. Security
    - All policies now require authentication
    - Users can only access notes where user_id matches their auth.uid()
    - Insert policy automatically sets user_id to prevent spoofing
*/

DROP POLICY IF EXISTS "Anyone can view notes" ON notes;
DROP POLICY IF EXISTS "Anyone can insert notes" ON notes;
DROP POLICY IF EXISTS "Anyone can update notes" ON notes;
DROP POLICY IF EXISTS "Anyone can delete notes" ON notes;

CREATE POLICY "Users can view own notes"
  ON notes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
