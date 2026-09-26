-- Meeting label is the only free-text subject on the row.
ALTER TABLE meetings DROP CONSTRAINT meetings_organisation_len;
ALTER TABLE meetings DROP COLUMN organisation;
