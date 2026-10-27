-- Default configuration. Everything here is editable by an administrator in the app
-- (Admin → Progression), so these are starting points, not hard-coded rules.

insert into public.progression_settings (id, base_xp, xp_step, max_level, high_score_threshold)
values (true, 100, 25, 100, 90);

insert into public.xp_rules (source, default_xp, min_xp, max_xp) values
    ('lesson_completion', 20, 5, 100),
    ('quiz_completion', 30, 10, 150),
    ('high_score_bonus', 20, 0, 100),
    ('homework_completion', 50, 10, 200),
    ('exam_completion', 100, 25, 400),
    ('boss_battle', 200, 50, 800),
    ('secret_quest', 50, 25, 100),
    ('streak', 50, 10, 200),
    ('manual_adjustment', 0, 0, 500);

-- Rank ladder. Level bands follow the design brief; the mastery gates make sure a rank reflects
-- demonstrated learning, not only time spent.
insert into public.ranks (code, name, description, sort_order, min_level, min_average_score, min_passed_assessments, min_completed_lessons) values
    ('F', 'Unawakened', 'Every journey begins in the dark. Complete lessons to stir your power.', 1, 1, 0, 0, 0),
    ('E', 'Awakened Initiate', 'The first spark. You have shown you can learn and be tested.', 2, 10, 50, 1, 3),
    ('D', 'Seeker', 'You seek knowledge on purpose and pass your trials.', 3, 20, 55, 3, 6),
    ('C', 'Adept', 'Your skills are steady and your results consistent.', 4, 30, 60, 5, 10),
    ('B', 'Vanguard', 'You lead from the front of your class.', 5, 40, 65, 8, 15),
    ('A', 'Champion', 'Few reach this far. Mastery is becoming habit.', 6, 50, 70, 12, 20),
    ('S', 'Sovereign', 'A force of learning. Others look to your example.', 7, 60, 75, 16, 25),
    ('SS', 'Ascendant', 'You have outgrown the old limits.', 8, 70, 80, 20, 30),
    ('SSS', 'Paragon', 'The summit. Your mastery is beyond doubt.', 9, 85, 85, 25, 40);

-- Subjects: `theme` keys map to colours and icons in src/@types/subjects/SubjectOptions.ts
insert into public.subjects (slug, name, description, theme, sort_order) values
    ('mathematics', 'Mathematics', 'Number, algebra, geometry, statistics and problem solving.', 'arcane', 1),
    ('science', 'Science', 'Physics, chemistry, biology and earth science.', 'verdant', 2),
    ('english', 'English', 'Reading, writing, literature and language.', 'ember', 3),
    ('history', 'History & Society', 'History, geography, civics and economics.', 'amber', 4),
    ('technology', 'Technology', 'Computing, coding, design and engineering.', 'storm', 5),
    ('arts', 'Arts & Music', 'Visual arts, music, drama and media.', 'rose', 6),
    ('languages', 'World Languages', 'Learning to read, write and speak other languages.', 'tide', 7),
    ('health', 'Health & PE', 'Physical education, health and wellbeing.', 'vigor', 8);

-- Class titles per subject. Higher tiers also ask for mastery (average best score in that subject's
-- graded assessments) so a title like "Advanced Mathematician" means something.
insert into public.class_titles (subject_id, tier, title, description, min_subject_level, min_mastery)
select s.id, t.tier, t.title, t.description, t.min_level, t.min_mastery
from public.subjects s
join (values
    ('mathematics', 1, 'Numeral Initiate', 'Your first steps along the path of numbers.', 1, 0),
    ('mathematics', 2, 'Apprentice Mathematician', 'Patterns begin to reveal themselves.', 5, 0),
    ('mathematics', 3, 'Mathematician', 'You wield equations with confidence.', 12, 60),
    ('mathematics', 4, 'Advanced Mathematician', 'Complex problems bend to your reasoning.', 20, 70),
    ('mathematics', 5, 'Master Mathematician', 'Your proofs are clean and your logic exact.', 30, 80),
    ('mathematics', 6, 'Sage of Numbers', 'The language of the universe is yours.', 45, 85),
    ('science', 1, 'Lab Initiate', 'Curiosity is your first instrument.', 1, 0),
    ('science', 2, 'Apprentice Scientist', 'You ask questions and test them.', 5, 0),
    ('science', 3, 'Scientist', 'Evidence guides your conclusions.', 12, 60),
    ('science', 4, 'Advanced Scientist', 'You see the systems behind the world.', 20, 70),
    ('science', 5, 'Master Scientist', 'Experiments yield to your insight.', 30, 80),
    ('science', 6, 'Sage of Elements', 'Nature''s laws are an open book to you.', 45, 85),
    ('english', 1, 'Word Initiate', 'Every story begins with a single word.', 1, 0),
    ('english', 2, 'Apprentice Wordsmith', 'Your sentences are finding their shape.', 5, 0),
    ('english', 3, 'Wordsmith', 'You read closely and write with purpose.', 12, 60),
    ('english', 4, 'Advanced Wordsmith', 'Argument and imagery are your tools.', 20, 70),
    ('english', 5, 'Master Wordsmith', 'Your words move readers.', 30, 80),
    ('english', 6, 'Sage of Words', 'Language itself answers your call.', 45, 85),
    ('history', 1, 'Chronicle Initiate', 'The past begins to speak to you.', 1, 0),
    ('history', 2, 'Apprentice Historian', 'You weigh sources and ask why.', 5, 0),
    ('history', 3, 'Historian', 'You connect causes and consequences.', 12, 60),
    ('history', 4, 'Advanced Historian', 'Empires and ideas are clear to you.', 20, 70),
    ('history', 5, 'Master Historian', 'You read the patterns of ages.', 30, 80),
    ('history', 6, 'Sage of Ages', 'Time keeps no secrets from you.', 45, 85),
    ('technology', 1, 'Circuit Initiate', 'You power on your first machine.', 1, 0),
    ('technology', 2, 'Apprentice Technomancer', 'Instructions become working spells.', 5, 0),
    ('technology', 3, 'Technomancer', 'You design, build and debug.', 12, 60),
    ('technology', 4, 'Advanced Technomancer', 'Systems obey your architecture.', 20, 70),
    ('technology', 5, 'Master Technomancer', 'You craft elegant, reliable creations.', 30, 80),
    ('technology', 6, 'Sage of Circuits', 'Code and machine are extensions of your will.', 45, 85),
    ('arts', 1, 'Muse Initiate', 'You begin to create.', 1, 0),
    ('arts', 2, 'Apprentice Artisan', 'Your craft gains form and colour.', 5, 0),
    ('arts', 3, 'Artisan', 'Technique and expression meet.', 12, 60),
    ('arts', 4, 'Advanced Artisan', 'Your work carries a voice of its own.', 20, 70),
    ('arts', 5, 'Master Artisan', 'Audiences remember what you make.', 30, 80),
    ('arts', 6, 'Sage of Muses', 'Inspiration answers when you call.', 45, 85),
    ('languages', 1, 'Phrase Initiate', 'Your first words in a new tongue.', 1, 0),
    ('languages', 2, 'Apprentice Linguist', 'You can hold a simple conversation.', 5, 0),
    ('languages', 3, 'Linguist', 'You read and respond with ease.', 12, 60),
    ('languages', 4, 'Advanced Linguist', 'Nuance and idiom are within reach.', 20, 70),
    ('languages', 5, 'Master Linguist', 'You think in more than one language.', 30, 80),
    ('languages', 6, 'Sage of Tongues', 'Every border is a doorway to you.', 45, 85),
    ('health', 1, 'Vigor Initiate', 'You learn how your body and mind work.', 1, 0),
    ('health', 2, 'Apprentice Athlete', 'Healthy habits take root.', 5, 0),
    ('health', 3, 'Athlete', 'You train with knowledge and intent.', 12, 60),
    ('health', 4, 'Advanced Athlete', 'Strategy and stamina in balance.', 20, 70),
    ('health', 5, 'Master Athlete', 'You lead by healthy example.', 30, 80),
    ('health', 6, 'Sage of Vigor', 'Body and mind move as one.', 45, 85)
) as t(slug, tier, title, description, min_level, min_mastery) on t.slug = s.slug;

-- Cross-subject ("hybrid") titles
insert into public.class_titles (subject_id, tier, title, description, min_subject_level, min_mastery, min_subject_count) values
    (null, 1, 'Polymath', 'Three paths walked with real skill.', 12, 60, 3),
    (null, 2, 'Renaissance Scholar', 'Mastery across five disciplines.', 20, 70, 5);
