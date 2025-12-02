-- Create positions table
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    average_cost DECIMAL(10,4) NOT NULL,
    current_price DECIMAL(10,4) DEFAULT 0.0000,
    total_value DECIMAL(15,2) DEFAULT 0.00,
    gain_loss DECIMAL(15,2) DEFAULT 0.00,
    gain_loss_percent DECIMAL(8,4) DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_positions_portfolio_id ON positions(portfolio_id);
CREATE INDEX idx_positions_symbol ON positions(symbol);
CREATE INDEX idx_positions_updated_at ON positions(updated_at DESC);

