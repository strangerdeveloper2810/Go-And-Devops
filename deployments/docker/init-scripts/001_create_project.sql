CREATE TABLE IF NOT EXISTS projects (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   name varchar(255) NOT NULL,
   git_url TEXT NOT NULL,
   branch TEXT,
   status varchar(255) DEFAULT 'pending',
   created_at TIMESTAMP NOT NULL DEFAULT NOW(),
   updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
   deleted_at TIMESTAMP
);
