CREATE POLICY "Users can delete own UVA" 
ON public.uva_periods 
FOR DELETE 
USING (auth.uid() = user_id);