-- Tabla para los equipos ESP32
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  wifi_ssid TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para el historial de aperturas
CREATE TABLE gate_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- e.g., 'open'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para 'devices'
CREATE POLICY "Users can manage their own devices" 
ON devices FOR ALL 
USING (auth.uid() = owner_id);

-- Políticas para 'gate_logs'
CREATE POLICY "Users can see their own logs" 
ON gate_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs" 
ON gate_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Habilitar Realtime para la tabla devices
ALTER PUBLICATION supabase_realtime ADD TABLE devices;
