-- Add image_url column to menu_items for product photos
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to menu images
CREATE POLICY "Anyone can view menu images"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-images');

-- Allow admins/managers to upload menu images
CREATE POLICY "Admins can upload menu images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'menu-images' AND is_admin_or_manager(auth.uid()));

-- Allow admins/managers to update menu images
CREATE POLICY "Admins can update menu images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'menu-images' AND is_admin_or_manager(auth.uid()));

-- Allow admins/managers to delete menu images
CREATE POLICY "Admins can delete menu images"
ON storage.objects FOR DELETE
USING (bucket_id = 'menu-images' AND is_admin_or_manager(auth.uid()));