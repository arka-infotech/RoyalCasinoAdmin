-- Migration: Add admin hierarchy fields to users table
-- Run in psql: \i src/lib/migration.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS credit_balance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Insert admin user (password: admin123)
-- Generate hash with: node -e "const b=require('bcryptjs');b.hash('admin123',10).then(h=>console.log(h))"
INSERT INTO users (username, password_hash, chips, role, credit_balance)
VALUES (
  'admin',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
  0,
  'admin',
  0
)
ON CONFLICT (username) DO UPDATE SET role = 'admin';
