ALTER TABLE galleries
  ADD COLUMN privacy text NOT NULL DEFAULT 'friends'
  CHECK (privacy IN ('private', 'friends', 'public'));
