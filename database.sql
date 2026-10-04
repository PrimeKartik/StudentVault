-- 1. Create tables
CREATE TABLE STUDENT (
    student_id UUID PRIMARY KEY DEFAULT auth.uid(), -- Linked to Supabase Auth
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL
);

CREATE TABLE STUDENT_PHONE (
    student_id UUID REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    PRIMARY KEY (student_id, phone)
);

CREATE TABLE CATEGORY (
    student_id UUID REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    category_name TEXT NOT NULL,
    PRIMARY KEY (student_id, category_name)
);

CREATE TABLE CERTIFICATE (
    certificate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    issuer TEXT NOT NULL,
    issue_date DATE NOT NULL,
    file_path TEXT NOT NULL,
    student_id UUID REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    category_name TEXT NOT NULL,
    -- Composite foreign key to CATEGORY
    FOREIGN KEY (student_id, category_name) REFERENCES CATEGORY(student_id, category_name) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE PROJECT (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    student_id UUID REFERENCES STUDENT(student_id) ON DELETE CASCADE,
    -- Duration is a derived attribute, calculated at runtime: (end_date - start_date)
    CHECK (end_date >= start_date)
);

CREATE TABLE TECHNOLOGY (
    technology_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technology_name TEXT UNIQUE NOT NULL
);

CREATE TABLE USES (
    project_id UUID REFERENCES PROJECT(project_id) ON DELETE CASCADE,
    technology_id UUID REFERENCES TECHNOLOGY(technology_id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    PRIMARY KEY (project_id, technology_id)
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE STUDENT ENABLE ROW LEVEL SECURITY;
ALTER TABLE STUDENT_PHONE ENABLE ROW LEVEL SECURITY;
ALTER TABLE CATEGORY ENABLE ROW LEVEL SECURITY;
ALTER TABLE CERTIFICATE ENABLE ROW LEVEL SECURITY;
ALTER TABLE PROJECT ENABLE ROW LEVEL SECURITY;
ALTER TABLE TECHNOLOGY ENABLE ROW LEVEL SECURITY;
ALTER TABLE USES ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies

-- STUDENT: student can only access their own profile
CREATE POLICY "Users can view own student record" ON STUDENT FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can insert own student record" ON STUDENT FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Users can update own student record" ON STUDENT FOR UPDATE USING (auth.uid() = student_id);
CREATE POLICY "Users can delete own student record" ON STUDENT FOR DELETE USING (auth.uid() = student_id);

-- STUDENT_PHONE
CREATE POLICY "Users can manage own phone numbers" ON STUDENT_PHONE FOR ALL USING (auth.uid() = student_id);

-- CATEGORY
CREATE POLICY "Users can manage own categories" ON CATEGORY FOR ALL USING (auth.uid() = student_id);

-- CERTIFICATE
CREATE POLICY "Users can manage own certificates" ON CERTIFICATE FOR ALL USING (auth.uid() = student_id);

-- PROJECT
CREATE POLICY "Users can manage own projects" ON PROJECT FOR ALL USING (auth.uid() = student_id);

-- TECHNOLOGY: Global, readable by all authenticated, insertable by authenticated
CREATE POLICY "Everyone can view technologies" ON TECHNOLOGY FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can add technologies" ON TECHNOLOGY FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- USES: Manageable if the student owns the associated project
CREATE POLICY "Users can view uses for their projects" ON USES FOR SELECT USING (
    EXISTS (SELECT 1 FROM PROJECT WHERE project_id = USES.project_id AND student_id = auth.uid())
);
CREATE POLICY "Users can insert uses for their projects" ON USES FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM PROJECT WHERE project_id = USES.project_id AND student_id = auth.uid())
);
CREATE POLICY "Users can update uses for their projects" ON USES FOR UPDATE USING (
    EXISTS (SELECT 1 FROM PROJECT WHERE project_id = USES.project_id AND student_id = auth.uid())
);
CREATE POLICY "Users can delete uses for their projects" ON USES FOR DELETE USING (
    EXISTS (SELECT 1 FROM PROJECT WHERE project_id = USES.project_id AND student_id = auth.uid())
);

-- 4. Storage Bucket (Run manually in SQL Editor or via Supabase UI if needed)
INSERT INTO storage.buckets (id, name, public) VALUES ('student-files', 'student-files', false) ON CONFLICT DO NOTHING;

-- Policies for Storage: Student can only upload and read files in their own folder (e.g., student_<uuid>/...)
CREATE POLICY "Student can upload to their own folder" ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'student-files' 
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

CREATE POLICY "Student can read their own files" ON storage.objects FOR SELECT 
USING (
    bucket_id = 'student-files' 
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
);

CREATE POLICY "Student can delete their own files" ON storage.objects FOR DELETE 
USING (
    bucket_id = 'student-files' 
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
);
