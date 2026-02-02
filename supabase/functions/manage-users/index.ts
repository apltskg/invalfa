import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Email format validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// UUID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidEmail(email: string): boolean {
    return EMAIL_REGEX.test(email) && email.length <= 255;
}

function isValidPassword(password: string): boolean {
    // Minimum 8 characters, at least one letter and one number
    return password.length >= 8 && password.length <= 128 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
}

function isValidUUID(id: string): boolean {
    return UUID_REGEX.test(id);
}

function sanitizeString(str: string | undefined, maxLength: number): string {
    if (!str) return '';
    return String(str).trim().substring(0, maxLength);
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

        // Check if the user is authenticated
        const { data: { user } } = await supabaseClient.auth.getUser()

        if (!user) {
            return new Response(
                JSON.stringify({ error: 'Authentication required', code: 'AUTH_REQUIRED' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check if user is an admin
        const { data: roleData, error: roleError } = await supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .single()

        if (roleError || !roleData) {
            console.error('Admin authorization check failed')
            return new Response(
                JSON.stringify({ error: 'Insufficient permissions', code: 'FORBIDDEN' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Admin Client for user management
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { action, email, password, userId, fullName } = await req.json()

        if (action === 'create') {
            // Validate email format
            if (!email || !isValidEmail(email)) {
                return new Response(
                    JSON.stringify({ error: 'Valid email address is required', code: 'INVALID_EMAIL' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Validate password strength
            if (!password || !isValidPassword(password)) {
                return new Response(
                    JSON.stringify({ 
                        error: 'Password must be at least 8 characters with letters and numbers', 
                        code: 'WEAK_PASSWORD' 
                    }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            const sanitizedFullName = sanitizeString(fullName, 100);

            const { data, error } = await supabaseAdmin.auth.admin.createUser({
                email: email.trim().toLowerCase(),
                password,
                email_confirm: true,
                user_metadata: { full_name: sanitizedFullName }
            })

            if (error) {
                console.error('User creation failed')
                return new Response(
                    JSON.stringify({ error: 'Failed to create user. Email may already be in use.', code: 'CREATE_FAILED' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Assign default staff role
            if (data.user) {
                const { error: roleInsertError } = await supabaseAdmin
                    .from('user_roles')
                    .insert({ user_id: data.user.id, role: 'staff' })

                if (roleInsertError) {
                    console.error('Role assignment failed')
                }
            }

            return new Response(
                JSON.stringify({ success: true, userId: data.user?.id }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (action === 'delete') {
            // Validate user ID format
            if (!userId || !isValidUUID(userId)) {
                return new Response(
                    JSON.stringify({ error: 'Invalid user reference', code: 'INVALID_USER_ID' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Prevent deleting yourself
            if (userId === user.id) {
                return new Response(
                    JSON.stringify({ error: 'Cannot delete your own account', code: 'SELF_DELETE' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

            if (error) {
                console.error('User deletion failed')
                return new Response(
                    JSON.stringify({ error: 'Failed to delete user', code: 'DELETE_FAILED' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            return new Response(
                JSON.stringify({ success: true }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ error: 'Invalid action', code: 'INVALID_ACTION' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('User management error')
        return new Response(
            JSON.stringify({ error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
