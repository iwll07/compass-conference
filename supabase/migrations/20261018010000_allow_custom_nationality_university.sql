-- Allow custom nationality and university when 'Other' is chosen.
-- Run in the Supabase SQL Editor.

alter table registrations
    drop constraint if exists registrations_nationality_valid,
    drop constraint if exists registrations_university_valid;

alter table registrations
    add constraint registrations_nationality_valid check (
        nationality in ('Egypt', 'Sudan', 'Saudi Arabia', 'UAE', 'Kuwait', 'Qatar', 'Syria', 'Other')
        or (char_length(trim(nationality)) >= 2 and char_length(trim(nationality)) <= 60)
    ),
    add constraint registrations_university_valid check (
        university in (
            'Beni Suef National University', 'Beni Suef University',
            'Benha National University', 'Alexandria National University',
            'Mansoura National University', 'American University',
            'New Giza University', 'New Valley University', 'Other'
        )
        or (char_length(trim(university)) >= 2 and char_length(trim(university)) <= 100)
    );
