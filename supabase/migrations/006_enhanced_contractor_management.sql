-- Enhanced Contractor Management Schema
-- Add enhanced fields to contractors table
ALTER TABLE contractors 
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS service_areas TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS contract_start DATE,
ADD COLUMN IF NOT EXISTS contract_end DATE,
ADD COLUMN IF NOT EXISTS monthly_rate DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sla TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Add enhanced fields to vehicles table
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS year_of_manufacture INTEGER,
ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
ADD COLUMN IF NOT EXISTS road_tax_expiry DATE,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    contractor_id BIGINT REFERENCES contractors(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    user VARCHAR(255) NOT NULL DEFAULT 'System',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_contractor_id ON audit_logs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_contractors_status ON contractors(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_contractor_id ON vehicles(contractor_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

-- Enable Row Level Security for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit_logs
CREATE POLICY "Users can view audit logs for contractors" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM contractors c 
            WHERE c.id = audit_logs.contractor_id
        )
    );

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Update RLS policies for contractors and vehicles to include new fields
DROP POLICY IF EXISTS "Users can view contractors" ON contractors;
CREATE POLICY "Users can view contractors" ON contractors
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert contractors" ON contractors;
CREATE POLICY "Users can insert contractors" ON contractors
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update contractors" ON contractors;
CREATE POLICY "Users can update contractors" ON contractors
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete contractors" ON contractors;
CREATE POLICY "Users can delete contractors" ON contractors
    FOR DELETE USING (true);

DROP POLICY IF EXISTS "Users can view vehicles" ON vehicles;
CREATE POLICY "Users can view vehicles" ON vehicles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert vehicles" ON vehicles;
CREATE POLICY "Users can insert vehicles" ON vehicles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update vehicles" ON vehicles;
CREATE POLICY "Users can update vehicles" ON vehicles
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete vehicles" ON vehicles;
CREATE POLICY "Users can delete vehicles" ON vehicles
    FOR DELETE USING (true);

-- Grant permissions
GRANT ALL ON audit_logs TO authenticated;
GRANT SELECT ON audit_logs TO anon;

-- Update existing contractors with default values
UPDATE contractors 
SET 
    contact_person = 'N/A',
    email = 'contact@example.com',
    phone = 'N/A',
    address = 'N/A',
    service_areas = '{}',
    specialties = '{}',
    contract_start = CURRENT_DATE,
    contract_end = CURRENT_DATE + INTERVAL '1 year',
    monthly_rate = 0,
    sla = 'Standard service level agreement',
    status = 'active'
WHERE contact_person IS NULL OR email IS NULL;

-- Update existing vehicles with default values
UPDATE vehicles 
SET 
    year_of_manufacture = 2020,
    insurance_expiry = CURRENT_DATE + INTERVAL '1 year',
    road_tax_expiry = CURRENT_DATE + INTERVAL '6 months',
    status = 'active'
WHERE status IS NULL;