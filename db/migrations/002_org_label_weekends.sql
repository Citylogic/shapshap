-- Organisation + meeting label (PRD §5.1 / §6.4). Empty string backfills
-- existing rows; U03 requires non-empty values on create. Caps match the PRD.
-- include_weekends defaults false to match the Setup mock (toggle off).
ALTER TABLE meetings
  ADD COLUMN organisation TEXT NOT NULL DEFAULT '',
  ADD COLUMN meeting_label TEXT NOT NULL DEFAULT '',
  ADD COLUMN include_weekends BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE meetings
  ADD CONSTRAINT meetings_organisation_len CHECK (char_length(organisation) <= 48),
  ADD CONSTRAINT meetings_meeting_label_len CHECK (char_length(meeting_label) <= 80);
