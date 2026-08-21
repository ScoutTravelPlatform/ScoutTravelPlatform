-- The original seed (20260809100000_supplier_catalog.sql) only covered a
-- handful of Disney resorts and Universal hotels, and only 2 of those 10
-- Disney properties had any room options at all. Expands both to a
-- realistic, comprehensive set of real Walt Disney World Resort hotels and
-- Universal Orlando Resort hotels, each with real room-category names, so
-- the dropdown is actually useful instead of mostly empty. Idempotent
-- throughout (on conflict do nothing), safe to re-run.

do $$
declare disney_id uuid; universal_id uuid;
begin
  select id into disney_id from public.suppliers where lower(name) = lower('Disney Destinations');
  select id into universal_id from public.suppliers where lower(name) = lower('Universal Orlando');

  -- Additional real Walt Disney World Resort hotels not in the original seed.
  insert into public.supplier_properties(supplier_id, name) values
    (disney_id, 'Disney''s Yacht Club Resort'),
    (disney_id, 'Disney''s BoardWalk Inn'),
    (disney_id, 'Disney''s BoardWalk Villas'),
    (disney_id, 'Disney''s Wilderness Lodge'),
    (disney_id, 'Disney''s Polynesian Villas & Bungalows'),
    (disney_id, 'Disney''s Grand Floridian Villas & Bungalows'),
    (disney_id, 'Bay Lake Tower at Disney''s Contemporary Resort'),
    (disney_id, 'Disney''s Old Key West Resort'),
    (disney_id, 'Disney''s Saratoga Springs Resort & Spa'),
    (disney_id, 'Disney''s Animal Kingdom Villas – Jambo House'),
    (disney_id, 'Disney''s Animal Kingdom Villas – Kidani Village'),
    (disney_id, 'Disney''s Riviera Resort'),
    (disney_id, 'Disney''s Caribbean Beach Resort'),
    (disney_id, 'Disney''s Coronado Springs Resort'),
    (disney_id, 'Disney''s Port Orleans Resort – French Quarter'),
    (disney_id, 'Disney''s Port Orleans Resort – Riverside'),
    (disney_id, 'Disney''s All-Star Movies Resort'),
    (disney_id, 'Disney''s All-Star Music Resort'),
    (disney_id, 'Disney''s All-Star Sports Resort'),
    (disney_id, 'Disney''s Art of Animation Resort'),
    (disney_id, 'Disney''s Pop Century Resort'),
    (disney_id, 'Disney''s Fort Wilderness Resort & Campground')
  on conflict do nothing;

  -- Additional real Universal Orlando Resort hotels not in the original seed.
  insert into public.supplier_properties(supplier_id, name) values
    (universal_id, 'Hard Rock Hotel'),
    (universal_id, 'Loews Royal Pacific Resort'),
    (universal_id, 'Loews Sapphire Falls Resort'),
    (universal_id, 'Universal''s Aventura Hotel'),
    (universal_id, 'Universal''s Endless Summer Resort – Surfside Inn & Suites'),
    (universal_id, 'Universal''s Endless Summer Resort – Dockside Inn & Suites')
  on conflict do nothing;

  -- Room options for every Disney hotel that had none yet, plus every newly
  -- added hotel. Theme parks (Magic Kingdom, EPCOT, etc.) intentionally get
  -- no room options — they're not lodging.
  insert into public.supplier_room_options (property_id, name)
  select p.id, v.room_name
  from public.supplier_properties p
  join (values
    ('Disney''s Contemporary Resort', 'Theme Park View Room'),
    ('Disney''s Contemporary Resort', 'Garden Wing Room'),
    ('Disney''s Contemporary Resort', 'Tower Room'),
    ('Disney''s Animal Kingdom Lodge', 'Standard View Room'),
    ('Disney''s Animal Kingdom Lodge', 'Savanna View Room'),
    ('Disney''s Animal Kingdom Lodge', 'Deluxe Savanna View Room'),
    ('Disney''s Beach Club Resort', 'Standard View Room'),
    ('Disney''s Beach Club Resort', 'Water View Room'),
    ('Disney''s Beach Club Resort', 'Club Level Room'),
    ('Aulani, A Disney Resort & Spa', 'Standard View Room'),
    ('Aulani, A Disney Resort & Spa', 'Ocean View Room'),
    ('Aulani, A Disney Resort & Spa', 'Deluxe Studio Villa'),
    ('Disney''s Yacht Club Resort', 'Standard View Room'),
    ('Disney''s Yacht Club Resort', 'Water View Room'),
    ('Disney''s Yacht Club Resort', 'Club Level Room'),
    ('Disney''s BoardWalk Inn', 'Standard View Room'),
    ('Disney''s BoardWalk Inn', 'Water View Room'),
    ('Disney''s BoardWalk Inn', 'Garden Suite'),
    ('Disney''s BoardWalk Villas', 'Studio'),
    ('Disney''s BoardWalk Villas', 'One-Bedroom Villa'),
    ('Disney''s BoardWalk Villas', 'Two-Bedroom Villa'),
    ('Disney''s Wilderness Lodge', 'Standard View Room'),
    ('Disney''s Wilderness Lodge', 'Courtyard View Room'),
    ('Disney''s Wilderness Lodge', 'Deluxe Studio'),
    ('Disney''s Polynesian Villas & Bungalows', 'Deluxe Studio'),
    ('Disney''s Polynesian Villas & Bungalows', 'Bungalow'),
    ('Disney''s Grand Floridian Villas & Bungalows', 'Deluxe Studio'),
    ('Disney''s Grand Floridian Villas & Bungalows', 'One-Bedroom Villa'),
    ('Disney''s Grand Floridian Villas & Bungalows', 'Two-Bedroom Villa'),
    ('Bay Lake Tower at Disney''s Contemporary Resort', 'Deluxe Studio'),
    ('Bay Lake Tower at Disney''s Contemporary Resort', 'One-Bedroom Villa'),
    ('Bay Lake Tower at Disney''s Contemporary Resort', 'Two-Bedroom Villa'),
    ('Disney''s Old Key West Resort', 'Deluxe Studio'),
    ('Disney''s Old Key West Resort', 'One-Bedroom Villa'),
    ('Disney''s Old Key West Resort', 'Two-Bedroom Villa'),
    ('Disney''s Old Key West Resort', 'Grand Villa'),
    ('Disney''s Saratoga Springs Resort & Spa', 'Deluxe Studio'),
    ('Disney''s Saratoga Springs Resort & Spa', 'One-Bedroom Villa'),
    ('Disney''s Saratoga Springs Resort & Spa', 'Two-Bedroom Villa'),
    ('Disney''s Saratoga Springs Resort & Spa', 'Treehouse Villa'),
    ('Disney''s Animal Kingdom Villas – Jambo House', 'Deluxe Studio'),
    ('Disney''s Animal Kingdom Villas – Jambo House', 'One-Bedroom Villa'),
    ('Disney''s Animal Kingdom Villas – Jambo House', 'Two-Bedroom Villa'),
    ('Disney''s Animal Kingdom Villas – Kidani Village', 'Deluxe Studio'),
    ('Disney''s Animal Kingdom Villas – Kidani Village', 'One-Bedroom Villa'),
    ('Disney''s Animal Kingdom Villas – Kidani Village', 'Grand Villa'),
    ('Disney''s Riviera Resort', 'Tower Studio'),
    ('Disney''s Riviera Resort', 'Deluxe Studio'),
    ('Disney''s Riviera Resort', 'One-Bedroom Villa'),
    ('Disney''s Caribbean Beach Resort', 'Standard Room'),
    ('Disney''s Caribbean Beach Resort', 'Preferred Room'),
    ('Disney''s Caribbean Beach Resort', 'Pirate Room'),
    ('Disney''s Coronado Springs Resort', 'Standard Room'),
    ('Disney''s Coronado Springs Resort', 'Preferred Room'),
    ('Disney''s Coronado Springs Resort', 'Tower Room'),
    ('Disney''s Port Orleans Resort – French Quarter', 'Standard Room'),
    ('Disney''s Port Orleans Resort – French Quarter', 'Preferred Room'),
    ('Disney''s Port Orleans Resort – Riverside', 'Standard Room'),
    ('Disney''s Port Orleans Resort – Riverside', 'Royal Room'),
    ('Disney''s Port Orleans Resort – Riverside', 'Preferred Room'),
    ('Disney''s All-Star Movies Resort', 'Standard Room'),
    ('Disney''s All-Star Movies Resort', 'Preferred Room'),
    ('Disney''s All-Star Movies Resort', 'Family Suite'),
    ('Disney''s All-Star Music Resort', 'Standard Room'),
    ('Disney''s All-Star Music Resort', 'Preferred Room'),
    ('Disney''s All-Star Music Resort', 'Family Suite'),
    ('Disney''s All-Star Sports Resort', 'Standard Room'),
    ('Disney''s All-Star Sports Resort', 'Preferred Room'),
    ('Disney''s Art of Animation Resort', 'Standard Room'),
    ('Disney''s Art of Animation Resort', 'Family Suite'),
    ('Disney''s Pop Century Resort', 'Standard Room'),
    ('Disney''s Pop Century Resort', 'Preferred Room'),
    ('Disney''s Fort Wilderness Resort & Campground', 'Campsite'),
    ('Disney''s Fort Wilderness Resort & Campground', 'Cabin')
  ) as v(property_name, room_name) on lower(p.name) = lower(v.property_name)
  where p.supplier_id = disney_id
  on conflict do nothing;

  -- Room options for every Universal hotel, including the two seeded
  -- originally with none.
  insert into public.supplier_room_options (property_id, name)
  select p.id, v.room_name
  from public.supplier_properties p
  join (values
    ('Universal''s Cabana Bay Beach Resort', 'Standard Room'),
    ('Universal''s Cabana Bay Beach Resort', 'Pool View Room'),
    ('Universal''s Cabana Bay Beach Resort', 'Family Suite'),
    ('Loews Portofino Bay Hotel', 'Standard Room'),
    ('Loews Portofino Bay Hotel', 'Bay View Room'),
    ('Loews Portofino Bay Hotel', 'Club Level Room'),
    ('Hard Rock Hotel', 'Standard Room'),
    ('Hard Rock Hotel', 'Deluxe Room'),
    ('Hard Rock Hotel', 'Pool View Room'),
    ('Loews Royal Pacific Resort', 'Standard Room'),
    ('Loews Royal Pacific Resort', 'Garden View Room'),
    ('Loews Royal Pacific Resort', 'Club Level Room'),
    ('Loews Sapphire Falls Resort', 'Standard Room'),
    ('Loews Sapphire Falls Resort', 'Water View Room'),
    ('Loews Sapphire Falls Resort', 'Club Level Room'),
    ('Universal''s Aventura Hotel', 'Standard Room'),
    ('Universal''s Aventura Hotel', 'Preferred View Room'),
    ('Universal''s Aventura Hotel', 'Suite'),
    ('Universal''s Endless Summer Resort – Surfside Inn & Suites', 'Standard Room'),
    ('Universal''s Endless Summer Resort – Surfside Inn & Suites', 'Suite'),
    ('Universal''s Endless Summer Resort – Dockside Inn & Suites', 'Standard Room'),
    ('Universal''s Endless Summer Resort – Dockside Inn & Suites', 'Suite')
  ) as v(property_name, room_name) on lower(p.name) = lower(v.property_name)
  where p.supplier_id = universal_id
  on conflict do nothing;
end $$;
