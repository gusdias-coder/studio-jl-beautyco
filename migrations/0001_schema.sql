CREATE TABLE services (
  id TEXT PRIMARY KEY, name TEXT NOT NULL,
  duration_min INTEGER NOT NULL CHECK (duration_min BETWEEN 15 AND 480),
  price_cents INTEGER CHECK (price_cents >= 0)
);
CREATE TABLE professionals (id TEXT PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE professional_services (
  professional_id TEXT REFERENCES professionals(id) NOT NULL,
  service_id TEXT REFERENCES services(id) NOT NULL,
  PRIMARY KEY (professional_id, service_id)
);
CREATE TABLE working_hours (
  professional_id TEXT REFERENCES professionals(id) NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_min INTEGER NOT NULL CHECK (start_min BETWEEN 0 AND 1410 AND start_min % 30 = 0),
  end_min INTEGER NOT NULL CHECK (end_min > start_min AND end_min <= 1440),
  PRIMARY KEY (professional_id, weekday, start_min)
);
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL,
  professional_id TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL CHECK (ends_at > starts_at),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  duration_min INTEGER NOT NULL,
  price_cents INTEGER,
  demo_code TEXT NOT NULL,
  manage_token_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  FOREIGN KEY (professional_id, service_id) REFERENCES professional_services(professional_id, service_id)
);
CREATE INDEX bookings_schedule ON bookings(professional_id, starts_at) WHERE status = 'confirmed';
CREATE INDEX bookings_demo_limit ON bookings(demo_code, starts_at) WHERE status = 'confirmed';
CREATE TABLE time_off (
  id TEXT PRIMARY KEY,
  professional_id TEXT REFERENCES professionals(id),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL CHECK (ends_at > starts_at)
);
CREATE INDEX time_off_schedule ON time_off(starts_at);
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY,
  at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  actor TEXT NOT NULL, action TEXT NOT NULL, entity_id TEXT NOT NULL
);
CREATE TABLE demo_limits (
  bucket TEXT NOT NULL, subject TEXT NOT NULL, hits INTEGER NOT NULL,
  PRIMARY KEY (bucket, subject)
);

CREATE TRIGGER check_new_booking BEFORE INSERT ON bookings
WHEN NEW.status = 'confirmed'
BEGIN
  SELECT RAISE(ABORT, 'demo_booking_limit') WHERE (
    SELECT count(*) FROM bookings WHERE demo_code = NEW.demo_code AND status = 'confirmed'
      AND starts_at > strftime('%Y-%m-%dT%H:%M:%fZ','now')
  ) >= 3;
  SELECT RAISE(ABORT, 'schedule_conflict') WHERE EXISTS (
    SELECT 1 FROM bookings WHERE professional_id = NEW.professional_id AND status = 'confirmed'
      AND starts_at < NEW.ends_at AND ends_at > NEW.starts_at
    UNION ALL
    SELECT 1 FROM time_off WHERE (professional_id IS NULL OR professional_id = NEW.professional_id)
      AND starts_at < NEW.ends_at AND ends_at > NEW.starts_at
  );
END;

CREATE TRIGGER check_moved_booking BEFORE UPDATE OF professional_id, starts_at, ends_at ON bookings
WHEN NEW.status = 'confirmed'
BEGIN
  SELECT RAISE(ABORT, 'schedule_conflict') WHERE EXISTS (
    SELECT 1 FROM bookings WHERE professional_id = NEW.professional_id AND status = 'confirmed'
      AND id <> OLD.id AND starts_at < NEW.ends_at AND ends_at > NEW.starts_at
    UNION ALL
    SELECT 1 FROM time_off WHERE (professional_id IS NULL OR professional_id = NEW.professional_id)
      AND starts_at < NEW.ends_at AND ends_at > NEW.starts_at
  );
END;

CREATE TRIGGER check_new_block BEFORE INSERT ON time_off
BEGIN
  SELECT RAISE(ABORT, 'schedule_conflict') WHERE EXISTS (
    SELECT 1 FROM bookings WHERE (NEW.professional_id IS NULL OR professional_id = NEW.professional_id)
      AND status = 'confirmed' AND starts_at < NEW.ends_at AND ends_at > NEW.starts_at
  );
END;

CREATE TRIGGER audit_cancel AFTER UPDATE OF status ON bookings
WHEN OLD.status = 'confirmed' AND NEW.status = 'cancelled'
BEGIN
  INSERT INTO audit_log(actor, action, entity_id) VALUES ('reserva', 'cancelada', NEW.id);
END;

CREATE TRIGGER audit_move AFTER UPDATE OF professional_id, starts_at ON bookings
WHEN OLD.professional_id <> NEW.professional_id OR OLD.starts_at <> NEW.starts_at
BEGIN
  INSERT INTO audit_log(actor, action, entity_id) VALUES ('equipe', 'remarcada', NEW.id);
END;
