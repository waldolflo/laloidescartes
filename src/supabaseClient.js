import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jahbkwrftliquqziwwva.supabase.co/";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphaGJrd3JmdGxpcXVxeml3d3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTA0ODAsImV4cCI6MjA3MjQyNjQ4MH0.3I9hfS2C9P1RCICk-5XYpYqlBtFvQbo6ETeVqzD46Fk";
export const supabase = createClient(supabaseUrl, supabaseKey);

// 🔑 Ajoute aussi un export par défaut
export default supabase;
