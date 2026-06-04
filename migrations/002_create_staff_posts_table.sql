CREATE TABLE IF NOT EXISTS staff_posts (
  id SERIAL PRIMARY KEY,
  post_name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL CHECK (category IN ('Teaching', 'Non-Teaching')),
  department VARCHAR(255),
  sanctioned_strength INTEGER NOT NULL DEFAULT 0 CHECK (sanctioned_strength >= 0),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
