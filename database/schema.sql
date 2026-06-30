-- FocusFlow PostgreSQL Production-Ready Secure Database Schema
-- Designed by: Senior Backend Engineer & Database Architect
-- Optimized for: PostgreSQL 15+, scalability, high concurrency, and strict security compliance

-- Enable UUID extension for cryptographically secure, non-sequential resource identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Custom Enum Types for strict domain validation
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_verification');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'completed', 'overdue');
CREATE TYPE goal_status AS ENUM ('not_started', 'in_progress', 'completed', 'failed');
CREATE TYPE notification_category AS ENUM (
    'upcoming_tasks', 
    'overdue_tasks', 
    'goal_reminders', 
    'habit_reminders', 
    'daily_target_reminders', 
    'deadline_alerts', 
    'completion_celebrations', 
    'streak_reminders'
);
CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');
CREATE TYPE feedback_category AS ENUM ('feedback', 'bug_report', 'feature_request');

-- Helper trigger function to automatically update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Argon2id or bcrypt hash (never stored in plain text)
    profile_photo_url VARCHAR(512),
    timezone VARCHAR(100) DEFAULT 'UTC' NOT NULL,
    theme VARCHAR(50) DEFAULT 'slate-dark' NOT NULL,
    language VARCHAR(10) DEFAULT 'en' NOT NULL,
    account_status user_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance & secure query lookups
CREATE UNIQUE INDEX idx_users_email ON users(email);


-- 2. USER SETTINGS & NOTIFICATION PREFERENCES
CREATE TABLE user_notification_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    master_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    upcoming_tasks BOOLEAN DEFAULT TRUE NOT NULL,
    overdue_tasks BOOLEAN DEFAULT TRUE NOT NULL,
    goal_reminders BOOLEAN DEFAULT TRUE NOT NULL,
    habit_reminders BOOLEAN DEFAULT TRUE NOT NULL,
    daily_target_reminders BOOLEAN DEFAULT TRUE NOT NULL,
    deadline_alerts BOOLEAN DEFAULT TRUE NOT NULL,
    completion_celebrations BOOLEAN DEFAULT TRUE NOT NULL,
    streak_reminders BOOLEAN DEFAULT TRUE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON user_notification_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();


-- 3. SESSIONS & REFRESH TOKENS (Secure token rotation & revocation)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) UNIQUE NOT NULL, -- Hashed value for secure comparison
    ip_address VARCHAR(45),
    user_agent VARCHAR(512),
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_user_sessions_updated_at
BEFORE UPDATE ON user_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(refresh_token_hash);


-- 4. TASKS TABLE
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority priority_level DEFAULT 'medium' NOT NULL,
    status task_status DEFAULT 'todo' NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE,
    reminder_time TIMESTAMP WITH TIME ZONE,
    category VARCHAR(100) DEFAULT 'General' NOT NULL,
    tags VARCHAR(50)[] DEFAULT '{}'::VARCHAR[] NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Indexes for lightning-fast task boards & calendar queries
CREATE INDEX idx_tasks_user_id_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);


-- 5. GOALS & MILESTONES
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100) NOT NULL,
    priority priority_level DEFAULT 'medium' NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE,
    status goal_status DEFAULT 'not_started' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE goal_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_milestones_goal_id ON goal_milestones(goal_id);


-- 6. HABIT TRACKER TABLE
CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    frequency VARCHAR(50) DEFAULT 'daily' NOT NULL, -- 'daily', 'weekly', 'custom'
    reminder_time TIME,
    current_streak INTEGER DEFAULT 0 CHECK (current_streak >= 0) NOT NULL,
    longest_streak INTEGER DEFAULT 0 CHECK (longest_streak >= 0) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_habits_updated_at
BEFORE UPDATE ON habits
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Habit logs for multi-year completions history tracking
CREATE TABLE habit_completion_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_habit_date UNIQUE (habit_id, completed_date)
);

CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habit_logs_habit_id_date ON habit_completion_logs(habit_id, completed_date);


-- 7. DAILY TARGETS TABLE (Accountability snapshots)
CREATE TABLE daily_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_count INTEGER NOT NULL,
    target_date DATE DEFAULT CURRENT_DATE NOT NULL,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100) NOT NULL,
    status task_status DEFAULT 'todo' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_target_date UNIQUE (user_id, target_date)
);

CREATE INDEX idx_daily_targets_user_date ON daily_targets(user_id, target_date);


-- 8. REMEMBER ME TABLE (Secure client-uploaded reference assets)
CREATE TABLE remember_me_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    priority priority_level DEFAULT 'medium' NOT NULL,
    file_reference_url VARCHAR(512), -- Secure cloud storage reference link
    file_mime_type VARCHAR(100), -- 'image/png', 'application/pdf', 'audio/wav', etc.
    file_size_bytes BIGINT,
    external_link VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_remember_me_updated_at
BEFORE UPDATE ON remember_me_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_remember_me_user_id ON remember_me_items(user_id);


-- 9. NOTIFICATIONS ARCHIVE TABLE
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category notification_category NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    is_sent BOOLEAN DEFAULT FALSE NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_user_sent_read ON notifications(user_id, is_sent, is_read);


-- 10. SECURE SHARE LINKS (5-minute expiring snap-sharing tokens)
CREATE TABLE share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), -- System internal ID (never exposed to client)
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    secure_token VARCHAR(64) UNIQUE NOT NULL, -- Cryptographically random token (exposed in URL)
    selected_sections VARCHAR(100)[] DEFAULT '{}'::VARCHAR[] NOT NULL, -- E.g. {'Study Goals', 'Habits'}
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index secure_token lookup since it's the URL key
CREATE UNIQUE INDEX idx_share_links_token ON share_links(secure_token);
CREATE INDEX idx_share_links_owner ON share_links(owner_id);


-- 11. FRIEND SYSTEM & LEADERBOARDS
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status friend_request_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
    CONSTRAINT self_friendship_check CHECK (user_id <> friend_id)
);

CREATE TRIGGER update_friendships_updated_at
BEFORE UPDATE ON friendships
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE leaderboards (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_score INTEGER DEFAULT 0 CHECK (total_score >= 0) NOT NULL,
    weekly_score INTEGER DEFAULT 0 CHECK (weekly_score >= 0) NOT NULL,
    monthly_score INTEGER DEFAULT 0 CHECK (monthly_score >= 0) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_friendships_lookup ON friendships(user_id, status);
CREATE INDEX idx_leaderboards_total ON leaderboards(total_score DESC);
CREATE INDEX idx_leaderboards_weekly ON leaderboards(weekly_score DESC);


-- 12. STUDY GROUP & SHARED SESSIONS
CREATE TABLE study_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE study_group_members (
    group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    PRIMARY KEY (group_id, user_id)
);


-- 13. FEEDBACK, BUG REPORTS & SYSTEM AUDITS
CREATE TABLE user_feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for anonymous feedback
    category feedback_category DEFAULT 'feedback' NOT NULL,
    message TEXT NOT NULL,
    device_metadata JSONB DEFAULT '{}'::JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Completely anonymous security event log for audit compliance
CREATE TABLE security_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL, -- e.g., "USER_ERASE_DATA", "FAILED_LOGIN", "LINK_REVOKED"
    hashed_user_id VARCHAR(64), -- SHA256 of user ID for complete privacy in analytics
    ip_address_masked VARCHAR(45), -- Masked IP (e.g. 192.168.1.XXX)
    user_agent VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_event_type ON security_audit_logs(event_type);
