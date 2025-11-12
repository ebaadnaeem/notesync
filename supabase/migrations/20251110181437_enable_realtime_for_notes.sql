/*
  # Enable Realtime for Notes Table

  1. Changes
    - Enable Realtime replication for the `notes` table
    - This allows real-time collaboration features where multiple users can see changes instantly
  
  2. Purpose
    - Supports collaborative editing mode
    - Users can see updates from other collaborators in real-time
*/

ALTER PUBLICATION supabase_realtime ADD TABLE notes;
