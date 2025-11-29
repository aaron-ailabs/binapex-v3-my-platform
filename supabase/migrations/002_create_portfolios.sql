-- Create portfolios table
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    total_value DECIMAL(15,2) DEFAULT 0.00,
    total_gain_loss DECIMAL(15,2) DEFAULT 0.00,
    total_gain_loss_percent DECIMAL(8,4) DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_portfolios_updated_at ON portfolios(updated_at DESC);

-- Grant permissions
GRANT SELECT ON portfolios TO anon;
GRANT ALL PRIVILEGES ON portfolios TO authenticated;