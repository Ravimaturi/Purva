-- Run this in your Supabase SQL Editor to update the project_status enum with all valid stages used by the application

ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'Discussion';
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'Design & Prep';
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'In Progress';
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'Observations';
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'Work is on hold';
ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'Handover';
