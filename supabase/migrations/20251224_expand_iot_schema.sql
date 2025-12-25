-- Expand IoT schema to support multiple connection types and metadata
ALTER TABLE public.iot_devices 
ADD COLUMN IF NOT EXISTS connection_type TEXT DEFAULT 'bluetooth' 
CHECK (connection_type IN ('bluetooth', 'usb', 'serial', 'wifi', 'cloud'));

ALTER TABLE public.iot_devices 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.vital_signs 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update comments
COMMENT ON COLUMN public.iot_devices.connection_type IS 'The protocol used to connect to the device';
COMMENT ON COLUMN public.iot_devices.metadata IS 'Device-specific configuration and state';
COMMENT ON COLUMN public.vital_signs.metadata IS 'Additional measurement-specific data';
