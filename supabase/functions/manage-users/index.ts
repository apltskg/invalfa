import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Check if the user is an admin
        const { data: { user } } = await supabaseClient.auth.getUser()

        if (!user) {
            throw new Error('Unauthorized')
        }

        const { data: roleData, error: roleError } = await supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .single()

        if (roleError || !roleData) {
            console.error('Role check failed:', roleError)
            throw new Error('Unauthorized - Admin only')
        }

        // Initialize Admin Client for user management
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { action, email, password, userId, fullName } = await req.json()

        if (action === 'create') {
            if (!email || !password) throw new Error('Email and password required')

            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: fullName }
            })

            if (error) throw error

            // Also ensure profile exists (trigger might handle it, but good to be safe or update role immediately)
            // We rely on the trigger for profile creation, but let's set the role to staff by default
            if (data.user) {
                const { error: roleInsertError } = await supabaseAdmin
                    .from('user_roles')
                    .insert({ user_id: data.user.id, role: 'staff' })

                if (roleInsertError) console.error('Error assigning default role:', roleInsertError)
            }

            return new Response(
                JSON.stringify({ success: true, user: data.user }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (action === 'delete') {
            if (!userId) throw new Error('User ID required')

            // Prevent deleting yourself
            if (userId === user.id) {
                throw new Error('Cannot delete your own account')
            }

            const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId)

            if (error) throw error

            return new Response(
                JSON.stringify({ success: true, data }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        throw new Error('Invalid action')

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
