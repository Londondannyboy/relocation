-- Add Bain & Gray to companies table
INSERT INTO companies (
  name,
  slug,
  description,
  headquarters,
  website,
  phone,
  specializations,
  status,
  company_type,
  founded_year,
  created_at,
  updated_at
) VALUES (
  'Bain & Gray',
  'bain-and-gray',
  'Boutique business support and PA recruitment agency specializing in Executive Assistants, Chief of Staff, and senior administrative placements. Established in 2009, now employee-owned, offering temporary, permanent, and retained recruitment services with a focus on culture-talent alignment.',
  'London, UK',
  'https://www.bainandgray.com/',
  '020 7036 2030',
  ARRAY['Executive Assistant Recruitment', 'Chief of Staff Recruitment', 'Personal Assistant Recruitment', 'Administrative Recruitment', 'Office Manager Recruitment'],
  'published',
  'executive_assistant_recruiters',
  2009,
  NOW(),
  NOW()
) RETURNING id, slug;

-- Verify the insert
SELECT id, name, slug, headquarters, company_type, specializations
FROM companies
WHERE slug = 'bain-and-gray';
