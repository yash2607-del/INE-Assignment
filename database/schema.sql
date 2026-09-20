-- Database Schema for INE Product Price Tracker
-- Compatible with Supabase / PostgreSQL

-- 1. Tracked Products Table
CREATE TABLE IF NOT EXISTS tracked_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_product_id INTEGER NOT NULL UNIQUE,
    product_name VARCHAR(255) NOT NULL,
    product_url VARCHAR(500) NOT NULL,
    category VARCHAR(100),
    sku VARCHAR(100),
    current_price NUMERIC(10, 2),
    current_stock INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Price & Stock History Table
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracked_product_id UUID NOT NULL REFERENCES tracked_products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    stock INTEGER NOT NULL,
    scraped_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Scrape Logs Table (Attempt-by-attempt log)
CREATE TABLE IF NOT EXISTS scrape_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracked_product_id UUID REFERENCES tracked_products(id) ON DELETE CASCADE,
    external_product_id INTEGER NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'RETRIED', 'FAILED')),
    attempt_number INTEGER DEFAULT 1,
    duration_ms INTEGER,
    error_message TEXT,
    extracted_price NUMERIC(10, 2),
    extracted_stock INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Database Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracked_products_ext_id ON tracked_products(external_product_id);
CREATE INDEX IF NOT EXISTS idx_tracked_products_active ON tracked_products(is_active);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(tracked_product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_scraped_at ON price_history(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_product_id ON scrape_logs(tracked_product_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_started_at ON scrape_logs(started_at DESC);

-- Trigger to automatically update updated_at on tracked_products
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_tracked_products_modtime
    BEFORE UPDATE ON tracked_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
