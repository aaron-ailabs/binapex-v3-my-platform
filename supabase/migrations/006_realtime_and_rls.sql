-- Enable real-time subscriptions for orders
ALTER TABLE orders REPLICA IDENTITY FULL;

-- Create publication for authenticated users
CREATE PUBLICATION authenticated_orders FOR TABLE orders
    WITH (publish = 'insert, update, delete');

-- Row level security for orders
CREATE POLICY "Users can see their own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Row level security for portfolios
CREATE POLICY "Users can see their own portfolios" ON portfolios
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios" ON portfolios
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Row level security for positions
CREATE POLICY "Users can see their own positions" ON positions
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM portfolios 
        WHERE portfolios.id = positions.portfolio_id 
        AND portfolios.user_id = auth.uid()
    ));

-- Row level security for watchlists
CREATE POLICY "Users can see their own watchlists" ON watchlists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own watchlists" ON watchlists
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);