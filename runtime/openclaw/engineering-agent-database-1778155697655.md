# OpenClaw Output

model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# NearJobs Database Engineering Artifact

## Project Overview
NearJobs is a location-based job marketplace connecting workers with nearby short-term employment opportunities. The database must support geospatial queries, real-time job matching, user profiles, applications, messaging, payments, and reviews at scale.

## Technology Stack
- **Primary Database**: PostgreSQL 16 with PostGIS 3.4 extension
- **Cache Layer**: Redis 7.2 (session, hot data, geospatial cache)
- **Search**: PostgreSQL full-text search + pg_trgm for fuzzy matching
- **Migrations**: Flyway 10.x
- **Connection Pool**: PgBouncer 1.21 (transaction mode)
- **Backup**: pgBackRest 2.49

---

## Files to Create

### 1. `db/migrations/V001__enable_extensions.sql`

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- Verify PostGIS
SELECT PostGIS_Version();
```

### 2. `db/migrations/V002__create_users_schema.sql`

```sql
CREATE SCHEMA IF NOT EXISTS nearjobs;
SET search_path TO nearjobs, public;

CREATE TYPE user_role AS ENUM ('worker', 'employer', 'admin', 'support');
CREATE TYPE user_status AS ENUM ('pending_verification', 'active', 'suspended', 'deactivated');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email CITEXT NOT NULL UNIQUE,
    phone_e164 VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'worker',
    status user_status NOT NULL DEFAULT 'pending_verification',
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_phone_format CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9]\d{1,14}$')
);

CREATE INDEX idx_users_email_active ON users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone_active ON users (phone_e164) WHERE deleted_at IS NULL AND phone_e164 IS NOT NULL;
CREATE INDEX idx_users_role_status ON users (role, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users (created_at DESC);

CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    date_of_birth DATE,
    avatar_url TEXT,
    bio TEXT,
    headline VARCHAR(255),
    home_location GEOGRAPHY(POINT, 4326),
    home_address_line1 VARCHAR(255),
    home_address_line2 VARCHAR(255),
    home_city VARCHAR(100),
    home_region VARCHAR(100),
    home_postal_code VARCHAR(20),
    home_country_code CHAR(2),
    search_radius_km INTEGER NOT NULL DEFAULT 25 CHECK (search_radius_km BETWEEN 1 AND 200),
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    locale VARCHAR(10) NOT NULL DEFAULT 'en-US',
    identity_verification verification_status NOT NULL DEFAULT 'unverified',
    background_check verification_status NOT NULL DEFAULT 'unverified',
    average_rating NUMERIC(3,2) CHECK (average_rating BETWEEN 0 AND 5),
    rating_count INTEGER NOT NULL DEFAULT 0,
    completed_jobs INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_home_location ON user_profiles USING GIST (home_location);
CREATE INDEX idx_profiles_display_name_trgm ON user_profiles USING GIN (display_name gin_trgm_ops);
CREATE INDEX idx_profiles_rating ON user_profiles (average_rating DESC NULLS LAST) WHERE rating_count > 0;

CREATE TABLE employer_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    company_slug VARCHAR(255) NOT NULL UNIQUE,
    company_logo_url TEXT,
    company_website TEXT,
    company_size VARCHAR(20),
    industry VARCHAR(100),
    tax_id_encrypted BYTEA,
    business_license_url TEXT,
    verification_status verification_status NOT NULL DEFAULT 'unverified',
    average_rating NUMERIC(3,2) CHECK (average_rating BETWEEN 0 AND 5),
    rating_count INTEGER NOT NULL DEFAULT 0,
    total_jobs_posted INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employer_company_trgm ON employer_profiles USING GIN (company_name gin_trgm_ops);
CREATE INDEX idx_employer_slug ON employer_profiles (company_slug);
```

### 3. `db/migrations/V003__create_skills_categories.sql`

```sql
SET search_path TO nearjobs, public;

CREATE TABLE job_categories (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES job_categories(id) ON DELETE SET NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    icon_name VARCHAR(50),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON job_categories (parent_id) WHERE is_active = TRUE;

CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL UNIQUE,
    category_id INTEGER REFERENCES job_categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_skills_name_trgm ON skills USING GIN (name gin_trgm_ops);
CREATE INDEX idx_skills_category ON skills (category_id) WHERE is_active = TRUE;

CREATE TABLE user_skills (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level SMALLINT NOT NULL DEFAULT 3 CHECK (proficiency_level BETWEEN 1 AND 5),
    years_experience NUMERIC(4,1) CHECK (years_experience >= 0),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, skill_id)
);

CREATE INDEX idx_user_skills_skill ON user_skills (skill_id, proficiency_level DESC);
```

### 4. `db/migrations/V004__create_jobs.sql`

```sql
SET search_path TO nearjobs, public;

CREATE TYPE job_status AS ENUM ('draft', 'published', 'paused', 'filled', 'cancelled', 'expired', 'completed');
CREATE TYPE job_type AS ENUM ('one_time', 'recurring', 'short_term', 'on_demand');
CREATE TYPE pay_type AS ENUM ('hourly', 'fixed', 'daily', 'per_task');
CREATE TYPE urgency AS ENUM ('flexible', 'standard', 'urgent', 'immediate');

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    category_id INTEGER NOT NULL REFERENCES job_categories(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(280) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    job_type job_type NOT NULL,
    status job_status NOT NULL DEFAULT 'draft',
    urgency urgency NOT NULL DEFAULT 'standard',
    pay_type pay_type NOT NULL,
    pay_amount_min NUMERIC(12,2) NOT NULL CHECK (pay_amount_min >= 0),
    pay_amount_max NUMERIC(12,2) CHECK (pay_amount_max IS NULL OR pay_amount_max >= pay_amount_min),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    estimated_hours NUMERIC(6,2) CHECK (estimated_hours > 0),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    postal_code VARCHAR(20),
    country_code CHAR(2) NOT NULL,
    is_remote BOOLEAN NOT NULL DEFAULT FALSE,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    application_deadline TIMESTAMPTZ,
    max_applicants INTEGER CHECK (max_applicants > 0),
    positions_available INTEGER NOT NULL DEFAULT 1 CHECK (positions_available > 0),
    positions_filled INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    application_count INTEGER NOT NULL DEFAULT 0,
    search_vector TSVECTOR,
    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_dates CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
    CONSTRAINT chk_positions CHECK (positions_filled <= positions_available),
    CONSTRAINT uq_employer_slug UNIQUE (employer_id, slug)
);

CREATE INDEX idx_jobs_location ON jobs USING GIST (location) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX idx_jobs_status_published ON jobs (status, published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_employer ON jobs (employer_id, status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_category_status ON jobs (category_id, status) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX idx_jobs_search_vector ON jobs USING GIN (search_vector);
CREATE INDEX idx_jobs_starts_at ON jobs (starts_at) WHERE status = 'published';
CREATE INDEX idx_jobs_expires_at ON jobs (expires_at) WHERE status = 'published';
CREATE INDEX idx_jobs_pay_amount ON jobs (pay_amount_min DESC, pay_amount_max DESC) WHERE status = 'published';

CREATE TABLE job_skills (
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE RESTRICT,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    min_proficiency SMALLINT CHECK (min_proficiency BETWEEN 1 AND 5),
    PRIMARY KEY (job_id, skill_id)
);

CREATE INDEX idx_job_skills_skill ON job_skills (skill_id, is_required);

CREATE TABLE job_schedule_slots (
    id BIGSERIAL PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
    filled INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT chk_slot_dates CHECK (ends_at > starts_at),
    CONSTRAINT chk_slot_capacity CHECK (filled <= capacity)
);

CREATE INDEX idx_slots_job ON job_schedule_slots (job_id, starts_at);
CREATE INDEX idx_slots_starts_at ON job_schedule_slots (starts_at) WHERE filled < capacity;
```

### 5. `db/migrations/V005__create_applications.sql`

```sql
SET search_path TO nearjobs, public;

CREATE TYPE application_status AS ENUM (
    'submitted', 'under_review', 'shortlisted', 'interview_scheduled',
    'offered', 'accepted', 'declined', 'rejected', 'withdrawn', 'completed'
);

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status application_status NOT NULL DEFAULT 'submitted',
    cover_letter TEXT,
    proposed_rate NUMERIC(12,2) CHECK (proposed_rate >= 0),
    availability_note TEXT,
    distance_km NUMERIC(8,2),
    match_score NUMERIC(5,2) CHECK (match_score BETWEEN 0 AND 100),
    employer_notes TEXT,
    rejection_reason VARCHAR(255),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_job_worker UNIQUE (job_id, worker_id)
);

CREATE INDEX idx_applications_job_status ON applications (job_id, status, submitted_at DESC);
CREATE INDEX idx_applications_worker ON applications (worker_id, status, submitted_at DESC);
CREATE INDEX idx_applications_status_submitted ON applications (status, submitted_at DESC);
CREATE INDEX idx_applications_match_score ON applications (job_id, match_score DESC NULLS LAST);

CREATE TABLE application_status_history (
    id BIGSERIAL PRIMARY KEY,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    from_status application_status,
    to_status application_status NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_history_application ON application_status_history (application_id, created_at DESC);
```

### 6. `db/migrations/V006__create_messaging.sql`

```sql
SET search_path TO nearjobs, public;

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    employer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    worker_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    last_message_at TIMESTAMPTZ,
    last_message_preview VARCHAR(255),
    employer_unread_count INTEGER NOT NULL DEFAULT 0,
    worker_unread_count INTEGER NOT NULL DEFAULT 0,
    is_archived_employer BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived_worker BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_conversation_parties UNIQUE (job_id, employer_id, worker_id)
);

CREATE INDEX idx_conversations_employer ON conversations (employer_id, last_message_at DESC) WHERE NOT is_archived_employer;
CREATE INDEX idx_conversations_worker ON conversations (worker_id, last_message_at DESC) WHERE NOT is_archived_worker;

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
) PARTITION BY RANGE (created_at);

CREATE TABLE messages_2025_q1 PARTITION OF messages FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE messages_2025_q2 PARTITION OF messages FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE messages_2025_q3 PARTITION OF messages FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE messages_2025_q4 PARTITION OF messages FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE messages_2026_q1 PARTITION OF messages FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

CREATE INDEX idx_messages_conversation ON messages (conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages (sender_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages (conversation_id) WHERE read_at IS NULL AND deleted_at IS NULL;
```

### 7. `db/migrations/V007__create_payments.sql`

```sql
SET search_path TO nearjobs, public;

CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'held_escrow', 'released', 'refunded', 'failed', 'disputed');
CREATE TYPE payment_method_type AS ENUM ('card', 'bank_account', 'wallet');
CREATE TYPE transaction_type AS ENUM ('charge', 'refund', 'payout', 'fee', 'adjustment');

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method_type payment_method_type NOT NULL,
    provider VARCHAR(50) NOT NULL,
    provider_token VARCHAR(255) NOT NULL,
    last_four VARCHAR(4),
    brand VARCHAR(50),
    exp_month SMALLINT CHECK (exp_month BETWEEN 1 AND 12),
    exp_year SMALLINT CHECK (exp_year >= 2024),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_payment_methods_default ON payment_methods (user_id) WHERE is_default = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_payment_methods_user ON payment_methods (user_id) WHERE deleted_at IS NULL;

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    payer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    payee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    gross_amount NUMERIC(12,2) NOT NULL CHECK (gross_amount > 0),
    platform_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
    processing_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (processing_fee >= 0),
    net_amount NUMERIC(12,2) NOT NULL CHECK (net_amount >= 0),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    provider VARCHAR(50) NOT NULL,
    provider_payment_id VARCHAR(255) UNIQUE,
    provider_charge_id VARCHAR(255),
    escrow_release_at TIMESTAMPTZ,
    authorized_at TIMESTAMPTZ,
    captured_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    failure_code VARCHAR(100),
    failure_reason TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_job ON payments (job_id, created_at DESC);
CREATE INDEX idx_payments_payer ON payments (payer_id, status, created_at DESC);
CREATE INDEX idx_payments_payee ON payments (payee_id, status, created_at DESC);
CREATE INDEX idx_payments_status ON payments (status, created_at DESC);
CREATE INDEX idx_payments_escrow_release ON payments (escrow_release_at) WHERE status = 'held_escrow';

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    transaction_type transaction_type NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency CHAR(3) NOT NULL,
    provider_transaction_id VARCHAR(255),
    balance_after NUMERIC(14,2),
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_payment ON transactions (payment_id, created_at DESC);
CREATE INDEX idx_transactions_type ON transactions (transaction_type, created_at DESC);
```

### 8. `db/migrations/V008__create_reviews.sql`

```sql
SET search_path TO nearjobs, public;

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE RESTRICT,
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE RESTRICT,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(150),
    body TEXT CHECK (body IS NULL OR length(body) <= 5000),
    communication_rating SMALLINT CHECK (communication_rating BETWEEN 1 AND 5),
    quality_rating SMALLINT CHECK (quality_rating BETWEEN 1 AND 5),
    professionalism_rating SMALLINT CHECK (professionalism_rating BETWEEN 1 AND 5),
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    flagged_count INTEGER NOT NULL DEFAULT 0,
    response_body TEXT,
    response_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_review_per_party UNIQUE (application_id, reviewer_id),
    CONSTRAINT chk_no_self_review CHECK (reviewer_id <> reviewee_id)
);

CREATE INDEX idx_reviews_reviewee ON reviews (reviewee_id, is_visible, created_at DESC);
CREATE INDEX idx_reviews_reviewer ON reviews (reviewer_id, created_at DESC);
CREATE INDEX idx_reviews_job ON reviews (job_id, created_at DESC);
```

### 9. `db/migrations/V009__create_audit_notifications.sql`

```sql
SET search_path TO nearjobs, public;

CREATE TABLE audit_log (
    id BIGSERIAL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_ip INET,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    before_state JSONB,
    after_state JSONB,
    user_agent TEXT,
    request_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE audit_log_2025_q1 PARTITION OF audit_log FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE audit_log_2025_q2 PARTITION OF audit_log FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE audit_log_2025_q3 PARTITION OF audit_log FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE audit_log_2025_q4 PARTITION OF audit_log FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');

CREATE INDEX idx_audit_actor ON audit_log (actor_id, created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_log (action, created_at DESC);

CREATE TYPE notification_channel AS ENUM ('in_app', 'email', 'sms', 'push');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'read');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    template_key VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status notification_status NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failure_reason TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_pending ON notifications (status, created_at) WHERE status = 'pending';

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    device_id VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at) WHERE revoked_at IS NULL;
```

### 10. `db/migrations/V010__triggers_functions.sql`

```sql
SET search_path TO nearjobs, public;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'nearjobs' AND column_name = 'updated_at'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON nearjobs.%I', t);
        EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON nearjobs.%I
                        FOR EACH ROW EXECUTE FUNCTION set_updated_at()', t);
    END LOOP;
END $$;

-- Job search vector
CREATE OR REPLACE FUNCTION jobs_update_search_vector() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.requirements, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jobs_search_vector
BEFORE INSERT OR UPDATE OF title, description, requirements, city ON jobs
FOR EACH ROW EXECUTE FUNCTION jobs_update_search_vector();

-- Application status history
CREATE OR REPLACE FUNCTION track_application_status_change() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO application_status_history (application_id, from_status, to_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, NULLIF(current_setting('app.current_user_id', true), '')::UUID);
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO application_status_history (application_id, from_status, to_status, changed_by)
        VALUES (NEW.id, NULL, NEW.status, NULLIF(current_setting('app.current_user_id', true), '')::UUID);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_application_status_history
AFTER INSERT OR UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION track_application_status_change();

-- Conversation last message
CREATE OR REPLACE FUNCTION update_conversation_on_message() RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET last_message_at = NEW.created_at,
        last_message_preview = LEFT(NEW.body, 250),
        employer_unread_count = CASE WHEN NEW.sender_id = employer_id THEN employer_unread_count
                                     ELSE employer_unread_count + 1 END,
        worker_unread_count = CASE WHEN NEW.sender_id = worker_id THEN worker_unread_count
                                   ELSE worker_unread_count + 1 END,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW WHEN (NEW.is_system = FALSE)
EXECUTE FUNCTION update_conversation_on_message();

-- Application count on job
CREATE OR REPLACE FUNCTION update_job_application_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE jobs SET application_count = application_count + 1 WHERE id = NEW.job_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE jobs SET application_count = GREATEST(application_count - 1, 0) WHERE id = OLD.job_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_job_application_count
AFTER INSERT OR DELETE ON applications
FOR EACH ROW EXECUTE FUNCTION update_job_application_count();

-- Recompute reviewee rating
CREATE OR REPLACE FUNCTION recompute_user_rating(target_user UUID) RETURNS VOID AS $$
DECLARE
    avg_rating NUMERIC(3,2);
    rcount INTEGER;
BEGIN
    SELECT ROUND(AVG(rating)::NUMERIC, 2), COUNT(*)
    INTO avg_rating, rcount
    FROM reviews WHERE reviewee_id = target_user AND is_visible = TRUE;

    UPDATE user_profiles SET average_rating = avg_rating, rating_count = rcount
    WHERE user_id = target_user;
    UPDATE employer_profiles SET average_rating = avg_rating, rating_count = rcount
    WHERE user_id = target_user;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_recompute_rating() RETURNS TRIGGER AS $$
BEGIN
    PERFORM recompute_user_rating(COALESCE(NEW.reviewee_id, OLD.reviewee_id));
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_review_rating
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW EXECUTE FUNCTION trg_recompute_rating();
```

### 11. `db/migrations/V011__create_views.sql`

```sql
SET search_path TO nearjobs, public;

-- Active jobs view with employer
CREATE OR REPLACE VIEW v_active_jobs AS
SELECT
    j.id, j.title, j.slug, j.description, j.category_id,
    j.pay_type, j.pay_amount_min, j.pay_amount_max, j.currency,
    j.location, j.city, j.region, j.country_code, j.is_remote,
    j.starts_at, j.ends_at, j.urgency, j.published_at, j.expires_at,
    j.application_count, j.view_count,
    e.user_id AS employer_id, e.company_name, e.company_slug,
    e.company_logo_url, e.average_rating AS employer_rating,
    c.name AS category_name, c.slug AS category_slug
FROM jobs j
JOIN employer_profiles e ON e.user_id = j.employer_id
JOIN job_categories c ON c.id = j.category_id
WHERE j.status = 'published'
  AND j.deleted_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > NOW());

-- Materialized view for nearby jobs aggregation
CREATE MATERIALIZED VIEW mv_job_stats_by_category AS
SELECT
    c.id AS category_id,
    c.name AS category_name,
    COUNT(j.id) FILTER (WHERE j.status = 'published') AS active_jobs,
    AVG(j.pay_amount_min) FILTER (WHERE j.status = 'published') AS avg_min_pay,
    AVG(j.pay_amount_max) FILTER (WHERE j.status = 'published') AS avg_max_pay,
    NOW() AS refreshed_at
FROM job_categories c
LEFT JOIN jobs j ON j.category_id = c.id AND j.deleted_at IS NULL
GROUP BY c.id, c.name;

CREATE UNIQUE INDEX idx_mv_job_stats_category ON mv_job_stats_by_category (category_id);
```

### 12. `db/migrations/V012__create_roles_security.sql`

```sql
-- Application roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nearjobs_app') THEN
        CREATE ROLE nearjobs_app LOGIN PASSWORD 'CHANGE_ME_VIA_SECRETS_MANAGER';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nearjobs_readonly') THEN
        CREATE ROLE nearjobs_readonly LOGIN PASSWORD 'CHANGE_ME_VIA_SECRETS_MANAGER';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nearjobs_migrator') THEN
        CREATE ROLE nearjobs_migrator LOGIN PASSWORD 'CHANGE_ME_VIA_SECRETS_MANAGER';
    END IF;
END $$;

GRANT CONNECT ON DATABASE nearjobs TO nearjobs_app, nearjobs_readonly;
GRANT USAGE ON SCHEMA nearjobs TO nearjobs_app, nearjobs_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA nearjobs TO nearjobs_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA nearjobs TO nearjobs_app;
GRANT SELECT ON ALL TABLES IN SCHEMA nearjobs TO nearjobs_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA nearjobs
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nearjobs_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA nearjobs
    GRANT USAGE, SELECT ON SEQUENCES TO nearjobs_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA nearjobs
    GRANT SELECT ON TABLES TO nearjobs_readonly;

GRANT ALL PRIVILEGES ON SCHEMA nearjobs TO nearjobs_migrator;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA nearjobs TO nearjobs_migrator;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA nearjobs TO nearjobs_migrator;

-- Row-level security on sensitive tables
ALTER TABLE nearjobs.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_methods_owner_select ON nearjobs.payment_methods
FOR SELECT TO nearjobs_app
USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID);

CREATE POLICY payment_methods_owner_modify ON nearjobs.payment_methods
FOR ALL TO nearjobs_app
USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID)
WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::UUID);
```

### 13. `db/queries/nearby_jobs.sql`

```sql
-- Find nearby published jobs within radius (parameterized)
-- Params: $1 = lat, $2 = lon, $3 = radius_km, $4 = category_id (nullable), $5 = limit, $6 = offset
SELECT
    j.id,
    j.title,
    j.slug,
    j.pay_type,
    j.pay_amount_min,
    j.pay_amount_max,
    j.currency,
    j.city,
    j.urgency,
    j.published_at,
    ST_Distance(j.location, ST_MakePoint($2, $1)::geography) / 1000.0 AS distance_km,
    e.company_name,
    e.company_logo_url,
    e.average_rating AS employer_rating
FROM nearjobs.jobs j
JOIN nearjobs.employer_profiles e ON e.user_id = j.employer_id
WHERE j.status = 'published'
  AND j.deleted_at IS NULL
  AND (j.expires_at IS NULL OR j.expires_at > NOW())
  AND ST_DWithin(j.location, ST_MakePoint($2, $1)::geography, $3 * 1000)
  AND ($4::INTEGER IS NULL OR j.category_id = $4)
ORDER BY j.location <-> ST_MakePoint($2, $1)::geography
LIMIT $5 OFFSET $6;
```

### 14. `db/queries/match_score.sql`

```sql
-- Compute match score between worker and job
-- Params: $1 = worker_id, $2 = job_id
WITH worker_skills AS (
    SELECT skill_id, proficiency_level FROM nearjobs.user_skills WHERE user_id = $1
),
job_required AS (
    SELECT skill_id, min_proficiency, is_required FROM nearjobs.job_skills WHERE job_id = $2
),
skill_match AS (
    SELECT
        COUNT(*) FILTER (WHERE jr.is_required AND ws.skill_id IS NOT NULL
                         AND ws.proficiency_level >= COALESCE(jr.min_proficiency, 1)) AS required_met,
        COUNT(*) FILTER (WHERE jr.is_required) AS required_total,
        COUNT(*) FILTER (WHERE NOT jr.is_required AND ws.skill_id IS NOT NULL) AS optional_met,
        COUNT(*) FILTER (WHERE NOT jr.is_required) AS optional_total
    FROM job_required jr
    LEFT JOIN worker_skills ws ON ws.skill_id = jr.skill_id
),
distance_calc AS (
    SELECT
        ST_Distance(up.home_location, j.location) / 1000.0 AS distance_km,
        up.search_radius_km
    FROM nearjobs.user_profiles up, nearjobs.jobs j
    WHERE up.user_id = $1 AND j.id = $2 AND up.home_location IS NOT NULL
)
SELECT
    LEAST(100,
        COALESCE((sm.required_met::NUMERIC / NULLIF(sm.required_total, 0)) * 60, 0) +
        COALESCE((sm.optional_met::NUMERIC / NULLIF(sm.optional_total, 0)) * 20, 20) +
        COALESCE(GREATEST(0, 20 - (dc.distance_km / NULLIF(dc.search_radius_km, 0)) * 20), 10)
    )::NUMERIC(5,2) AS match_score,
    sm.required_met, sm.required_total, dc.distance_km
FROM skill_match sm
LEFT JOIN distance_calc dc ON TRUE;
```

### 15. `db/maintenance/partition_management.sql`

```sql
-- Auto-create future partitions for messages and audit_log
CREATE OR REPLACE FUNCTION nearjobs.create_quarterly_partition(
    parent_table TEXT, target_date DATE
) RETURNS VOID AS $$
DECLARE
    quarter_start DATE;
    quarter_end DATE;
    partition_name TEXT;
BEGIN
    quarter_start := DATE_TRUNC('quarter', target_date)::DATE;
    quarter_end := (quarter_start + INTERVAL '3 months')::DATE;
    partition_name := parent_table || '_' || TO_CHAR(quarter_start, 'YYYY') || '_q' ||
                      EXTRACT(QUARTER FROM quarter_start)::TEXT;

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = partition_name) THEN
        EXECUTE format(
            'CREATE TABLE nearjobs.%I PARTITION OF nearjobs.%I FOR VALUES FROM (%L) TO (%L)',
            partition_name, parent_table, quarter_start, quarter_end
        );
        RAISE NOTICE 'Created partition %', partition_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron (run monthly)
-- SELECT cron.schedule('create_partitions', '0 0 1 * *', $$
--   SELECT nearjobs.create_quarterly_partition('messages', (NOW() + INTERVAL '3 months')::DATE);
--   SELECT nearjobs.create_quarterly_partition('audit_log', (NOW() + INTERVAL '3 months')::DATE);
-- $$);
```

### 16. `db/seeds/seed_categories_skills.sql`

```sql
INSERT INTO nearjobs.job_categories (slug, name, description, sort_order) VALUES
('delivery', 'Delivery & Courier', 'Food, package, and grocery delivery', 1),
('cleaning', 'Cleaning Services', 'Residential and commercial cleaning', 2),
('moving', 'Moving & Hauling', 'Moving help, furniture assembly', 3),
('handyman', 'Handyman', 'Repairs, installations, maintenance', 4),
('events', 'Event Staff', 'Catering, setup, hospitality', 5),
('retail', 'Retail & Warehouse', 'Stocking, inventory, fulfillment', 6),
('childcare', 'Childcare', 'Babysitting, nannying', 7),
('petcare', 'Pet Care', 'Dog walking, pet sitting', 8),
('tutoring', 'Tutoring & Teaching', 'Academic and skill tutoring', 9),
('admin', 'Administrative', 'Data entry, virtual assistance', 10)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO nearjobs.skills (slug, name, category_id) VALUES
('drivers-license', 'Driver License', 1),
('own-vehicle', 'Own Vehicle', 1),
('deep-cleaning', 'Deep Cleaning', 2),
('heavy-lifting', 'Heavy Lifting', 3),
('plumbing', 'Plumbing', 4),
('electrical', 'Electrical', 4),
('food-handling', 'Food Handler Certificate', 5),
('forklift', 'Forklift Operation', 6),
('cpr-certified', 'CPR Certified', 7),
('pet-first-aid', 'Pet First Aid', 8),
('math-tutoring', 'Math Tutoring', 9),
('ms-office', 'Microsoft Office', 10)
ON CONFLICT (slug) DO NOTHING;
```

### 17. `db/config/pgbouncer.ini`

```ini
[databases]
nearjobs = host=postgres-primary.internal port=5432 dbname=nearjobs auth_user=pgbouncer_auth
nearjobs_ro = host=postgres-replica.internal port=5432 dbname=nearjobs auth_user=pgbouncer_auth

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
auth_query = SELECT username, password FROM pgbouncer.user_lookup($1)
pool_mode = transaction
max_client_conn = 10000
default_pool_size = 50
reserve_pool_size = 10
reserve_pool_timeout = 3
server_idle_timeout = 600
server_lifetime = 3600
query_timeout = 30
query_wait_timeout = 10
client_idle_timeout = 0
log_connections = 1
log_disconnections = 1
stats_period = 60
admin_users = pgbouncer_admin
ignore_startup_parameters = extra_float_digits,search_path
tls_sslmode = require
tls_cert_file = /etc/pgbouncer/server.crt
tls_key_file = /etc/pgbouncer/server.key
```

### 18. `db/config/postgresql.tuning.conf`

```conf
# Connection
max_connections = 500
superuser_reserved_connections = 5

# Memory (assuming 32GB RAM host)
shared_buffers = 8GB
effective_cache_size = 24GB
work_mem = 32MB
maintenance_work_mem = 2GB
huge_pages = try

# WAL & Checkpoints
wal_level = replica
max_wal_size = 16GB
min_wal_size = 2GB
checkpoint_completion_target = 0.9
wal_compression = on
wal_buffers = 64MB

# Replication
max_wal_senders = 10
max_replication_slots = 10
hot_standby = on
hot_standby_feedback = on

# Query planner
random_page_cost = 1.1
effective_io_concurrency = 200
default_statistics_target = 200

# Parallel query
max_worker_processes = 16
max_parallel_workers_per_gather = 4
max_parallel_workers = 16
max_parallel_maintenance_workers = 4

# Logging
log_min_duration_statement = 500
log_checkpoints = on
log_lock_waits = on
log_temp_files = 0
log_autovacuum_min_duration = 1000
log_line_prefix = '%m [%p] %q%u@%d/%a '

# Autovacuum
autovacuum = on
autovacuum_max_workers = 6
autovacuum_naptime = 30s
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05

# Statement stats
shared_preload_libraries = 'pg_stat_statements,pg_cron,auto_explain'
pg_stat_statements.track = all
auto_explain.log_min_duration = 1000
auto_explain.log_analyze = on
```

### 19. `db/backup/pgbackrest.conf`

```conf
[global]
repo1-path=/var/lib/pgbackrest
repo1-retention-full=14
repo1-retention-diff=7
repo1-cipher-type=aes-256-cbc
repo1-cipher-pass=ENCRYPTION_KEY_FROM_VAULT
repo1-s3-bucket=nearjobs-db-backups
repo1-s3-endpoint=s3.amazonaws.com
repo1-s3-region=us-east-1
repo1-type=s3
process-max=4
log-level-console=info
log-level-file=detail
start-fast=y
compress-type=zst
compress-level=3

[nearjobs]
pg1-path=/var/lib/postgresql/16/main
pg1-port=5432
pg1-user=postgres
```

```bash
# Backup schedule (cron)
# Full backup weekly Sundays 02:00 UTC
0 2 * * 0 pgbackrest --stanza=nearjobs --type=full backup
# Differential daily 02:00 UTC except Sunday
0 2 * * 1-6 pgbackrest --stanza=nearjobs --type=diff backup
# Incremental every 6 hours
0 */6 * * * pgbackrest --stanza=nearjobs --type=incr backup
```

### 20. `db/tests/test_schema.sql`

```sql
BEGIN;
SELECT plan(20);

-- Extensions
SELECT has_extension('postgis');
SELECT has_extension('pg_trgm');
SELECT has_extension('btree_gist');

-- Core tables
SELECT has_table('nearjobs', 'users');
SELECT has_table('nearjobs', 'user_profiles');
SELECT has_table('nearjobs', 'jobs');
SELECT has_table('nearjobs', 'applications');
SELECT has_table('nearjobs', 'payments');
SELECT has_table('nearjobs', 'reviews');
SELECT has_table('nearjobs', 'messages');

-- Constraints
SELECT col_not_null('nearjobs', 'users', 'email');
SELECT col_is_unique('nearjobs', 'users', 'email');
SELECT has_check('nearjobs', 'jobs', 'chk_dates');

-- Indexes
SELECT has_index('nearjobs', 'jobs', 'idx_jobs_location');
SELECT has_index('nearjobs', 'jobs', 'idx_jobs_search_vector');

-- Triggers
SELECT has_trigger('nearjobs', 'jobs', 'trg_jobs_search_vector');
SELECT has_trigger('nearjobs', 'applications', 'trg_application_status_history');

-- Seeded data
SELECT ok((SELECT COUNT(*) > 0 FROM nearjobs.job_categories), 'Categories seeded');
SELECT ok((SELECT COUNT(*) > 0 FROM nearjobs.skills), 'Skills seeded');

-- Functional test: create user, post job, apply, verify
INSERT INTO nearjobs.users (id, email, password_hash, role, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'employer@test.com', 'hash', 'employer', 'active');
INSERT INTO nearjobs.users (id, email, password_hash, role, status)
VALUES ('00000000-0000-0000-0000-000000000002', 'worker@test.com', 'hash', 'worker', 'active');
INSERT INTO nearjobs.employer_profiles (user_id, company_name, company_slug)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test Co', 'test-co');
INSERT INTO nearjobs.user_profiles (user_id, first_name, last_name, home_location)
VALUES ('00000000-0000-0000-0000-000000000002', 'Test', 'Worker',
        ST_MakePoint(-73.9857, 40.7484)::geography);

INSERT INTO nearjobs.jobs (id, employer_id, category_id, title, slug, description,
    job_type, pay_type, pay_amount_min, currency, location, city, country_code, status, published_at)
VALUES ('11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000001', 1,
        'Test Delivery', 'test-delivery', 'Deliver packages',
        'one_time', 'fixed', 50.00, 'USD',
        ST_MakePoint(-73.9857, 40.7484)::geography, 'NYC', 'US', 'published', NOW());

SELECT ok((SELECT search_vector IS NOT NULL FROM nearjobs.jobs
           WHERE id = '11111111-1111-1111-1111-111111111111'),
          'Search vector populated by trigger');

INSERT INTO nearjobs.applications (job_id, worker_id, status)
VALUES ('11111111-1111-1111-1111-111111111111',
        '00000000-0000-0000-0000-000000000002', 'submitted');

SELECT is((SELECT application_count FROM nearjobs.jobs
           WHERE id = '11111111-1111-1111-1111-111111111111'), 1,
          'Application count incremented');

SELECT * FROM finish();
ROLLBACK;
```

---

## Validation & Testing Instructions

### 1. Apply Migrations
```bash
# Install Flyway 10.x
flyway -url=jdbc:postgresql://localhost:5432/nearjobs \
       -user=nearjobs_migrator \
       -password=$DB_MIGRATOR_PASSWORD \
       -locations=filesystem:./db/migrations \
       -schemas=nearjobs \
       migrate

# Apply seeds
psql -U nearjobs_migrator -d nearjobs -f db/seeds/seed_categories_skills.sql
```

### 2. Run Schema Tests (pgTAP)
```bash
# Install pgTAP
psql -d nearjobs -c "CREATE EXTENSION IF NOT EXISTS pgtap;"

# Run tests
pg_prove -d nearjobs db/tests/test_schema.sql
```
Expected output: `All tests successful. Files=1, Tests=20`.

### 3. Verify Geospatial Performance
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title, ST_Distance(location, ST_MakePoint(-73.9857, 40.7484)::geography)/1000 AS km
FROM nearjobs.jobs
WHERE status = 'published'
  AND ST_DWithin(location, ST_MakePoint(-73.9857, 40.7484)::geography, 25000)
ORDER BY location <-> ST_MakePoint(-73.9857, 40.7484)::geography
LIMIT 50;
```
Validate: Plan uses `Index Scan using idx_jobs_location`. Execution time < 50ms with 1M rows.

### 4. Load Test Data
```bash
# Generate 100k users, 500k jobs, 2M applications
pgbench -U nearjobs_migrator -d nearjobs -i -s 100 --foreign-keys
```

### 5. Smoke Test Connection Pooling
```bash
pgbench -h pgbouncer.internal -p 6432 -U nearjobs_app -d nearjobs \
  -c 200 -j 8 -T 60 -S
```
Target: > 5000 TPS on read-only workload.

### 6. Backup Verification
```bash
pgbackrest --stanza=nearjobs check
pgbackrest --stanza=nearjobs --type=full backup
pgbackrest --stanza=nearjobs info
# Restore drill quarterly to staging
pgbackrest --stanza=nearjobs --delta restore
```

### 7. Replication Lag Monitoring
```sql
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn,
       pg_wal_lsn_diff(sent_lsn, replay_lsn) AS lag_bytes
FROM pg_stat_replication;
```
Alert threshold: lag_bytes > 50MB or > 5 seconds.

### 8. Security Validation
```sql
-- Verify RLS
SET ROLE nearjobs_app;
SET app.current_user_id = '00000000-0000-0000-0000-000000000002';
SELECT COUNT(*) FROM nearjobs.payment_methods; -- only sees own

-- Verify least privilege
SET ROLE nearjobs_readonly;
INSERT INTO nearjobs.users (...) VALUES (...); -- must fail
```

### 9. Performance Baselines (SLO)
| Query | p95 Target |
|-------|-----------|
| Nearby jobs (25km radius) | < 80ms |
| Application status update | < 20ms |
| User profile fetch | < 10ms |
| Match score computation | < 100ms |
| Message insert | < 15ms |

Validate via `pg_stat_statements` after 24h production traffic.

### 10. Operational Runbook
- **Daily**: Monitor `pg_stat_statements` for queries > 500ms; check replication lag.
- **Weekly**: Run `VACUUM ANALYZE` on hot tables; refresh `mv_job_stats_by_category`.
- **Monthly**: Create next quarter's partitions via `create_quarterly_partition`; review index bloat with `pgstattuple`.
- **Quarterly**: Restore drill from S3 backups to staging; rotate role passwords via secrets manager.

---

## Capacity Planning
- **Year 1**: 500K users, 2M jobs, 10M applications, 50M messages → ~150GB
- **Year 3**: 5M users, 20M jobs, 100M applications, 500M messages → ~1.5TB
- Vertical scale to db.r6g.4xlarge (16 vCPU, 128GB) at 80% capacity threshold
- Horizontal: read replicas (3 replicas), then shard `messages`/`audit_log` by `created_at` quarter

## Disaster Recovery
- **RPO**: 5 minutes (WAL archiving to S3 every 60s, max 5min lag tolerated)
- **RTO**: 30 minutes (automated failover via Patroni + etcd)
- **Cross-region replica**: us-west-2 streaming replica with 1-hour lag tolerance
- **Point-in-time recovery**: 14-day retention via pgBackRest