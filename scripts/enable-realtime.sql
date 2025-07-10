-- Enable realtime for grocery_items table
ALTER TABLE grocery_items REPLICA IDENTITY FULL;

-- Enable realtime publication for grocery_items
ALTER PUBLICATION supabase_realtime ADD TABLE grocery_items;

-- Optional: Also enable for families and family_members if you want real-time family updates
ALTER TABLE families REPLICA IDENTITY FULL;
ALTER TABLE family_members REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE families;
ALTER PUBLICATION supabase_realtime ADD TABLE family_members;
