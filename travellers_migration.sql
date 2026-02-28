-- Travellers table for storing client travel details
CREATE TABLE IF NOT EXISTS travellers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  passport_number TEXT,
  passport_expiry DATE,
  id_number TEXT,
  id_expiration DATE,
  birth_date DATE,
  miles_bonus_card TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE travellers ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can do everything
CREATE POLICY "Authenticated users full access to travellers"
  ON travellers FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Index for search
CREATE INDEX idx_travellers_name ON travellers (last_name, first_name);
CREATE INDEX idx_travellers_passport ON travellers (passport_number) WHERE passport_number IS NOT NULL;
CREATE INDEX idx_travellers_email ON travellers (email) WHERE email IS NOT NULL;

-- Seed initial traveller data
INSERT INTO travellers (first_name, last_name, passport_number, passport_expiry, id_number, id_expiration, birth_date, miles_bonus_card, phone, email) VALUES
('SPYRIDON', 'BLATSIOS', 'AY1066981', NULL, 'AP 233544', NULL, '1972-12-14', '130791253', '6997254991', 'sblatsios@gmail.com'),
('ILIAS', 'BATZOGIANNIS', 'AT1765967', NULL, NULL, NULL, '1984-09-24', '139032600', '6948531448', 'iliasbatzo@yahoo.gr'),
('EVGENIA', 'MOYSIDOU', NULL, NULL, 'AM 281812', NULL, '1993-08-30', '143786521', '6987989752', 'edmoysidou@gmail.com'),
('EVANGELOS', 'KAPETIS', 'AP3188175', '2034-02-16', 'AB 881264', NULL, '1967-06-10', '130791360', '6997254991', 'kapetise@windowslive.com'),
('AIKATERINI', 'KAPETI', 'AY1927273', '2033-01-20', NULL, NULL, '1997-02-24', '139309645', '6946279784', 'kkapeti97@outlook.com'),
('MICHAIL', 'DIRCHALIDIS', 'AT4346078', NULL, NULL, NULL, '1991-06-05', '124428312', '6957200922', 'mdirhalidis@platon.edu.gr'),
('FILARETOS', 'PAPAVRAMIDIS', 'AY3173359', NULL, NULL, NULL, '1983-06-13', '132523156', '6972306348', 'filaretus13@yahoo.gr'),
('IOANNIS', 'PAPADOPOULOS', 'AY0427666', NULL, NULL, NULL, '1994-05-31', '134834523', '6983859966', 'giannis.1994@hotmail.com'),
('EFPRAXIA', 'KAPETI', 'AM412718', NULL, NULL, NULL, '2000-06-16', '151816346', NULL, NULL),
('GEORGIA', 'SAVVIDOU', 'AT8295512', NULL, NULL, NULL, '1988-05-11', '156058582', NULL, NULL),
('PETROS', 'PAPADOPOULOS', NULL, NULL, NULL, NULL, '1999-03-14', '139881022', NULL, 'petrospap@pi-tech.gr'),
('STYLIANOS', 'CHATZIIOANNOU', NULL, NULL, 'AZ 812249', NULL, '1980-05-22', NULL, NULL, NULL),
('ANESTIS', 'PAPADOPOULOS', NULL, NULL, 'AB882847', NULL, '1963-09-29', '141507435', '6947277197', 'mail@platon.edu.gr'),
('ALEXANDROS', 'PAPADOPOULOS', NULL, NULL, 'AM412838', NULL, '2001-06-07', '144084301', '6942072312', 'ceo@atravel.gr'),
('Kyriaki Maria', 'Papadopoulou', NULL, NULL, 'AN901319', NULL, '2003-11-19', '155480054', '6945787924', 'kelypap03@gmail.com'),
('PANAGIOTIS - STYLIANOS', 'GLYKOS', NULL, NULL, 'AI 901523', NULL, '1990-04-16', NULL, NULL, NULL),
('MARIA', 'PAPASTAMOU', NULL, NULL, 'AM 870761', NULL, '2001-12-28', NULL, NULL, NULL),
('EVRIDIKI', 'PLATSA', NULL, NULL, 'AH 317663', NULL, '1969-10-30', NULL, NULL, 'viciplatsa@hotmail.gr'),
('Aikaterini Eftychia', 'Chrysargyri', NULL, NULL, 'A00975442', '2034-10-09', '2001-01-24', NULL, NULL, NULL);
