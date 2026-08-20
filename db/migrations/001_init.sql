CREATE TABLE meetings (
  id            TEXT PRIMARY KEY,
  starts_on     DATE        NOT NULL,
  ends_on       DATE        NOT NULL,
  window_start  TIME        NOT NULL,
  window_end    TIME        NOT NULL,
  slot_minutes  SMALLINT    NOT NULL DEFAULT 30,
  tz            TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL
);

CREATE TABLE responses (
  meeting_id      TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  participant_id  TEXT NOT NULL,
  name            TEXT,
  slots           INTEGER[] NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, participant_id)
);

CREATE INDEX ON meetings (expires_at);
