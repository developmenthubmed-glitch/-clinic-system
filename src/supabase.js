import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://fjagxfufsntdrqstxgcv.supabase.co"
const supabaseKey = "sb_publishable_OHSV90-CGYYo-U-P32DNZg_tt1SpbNd"

export const supabase = createClient(supabaseUrl, supabaseKey);