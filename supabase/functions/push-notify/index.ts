import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from "npm:web-push"

// VAPID keys should be stored in Supabase Edge Function Secrets
// You can generate them using `npx web-push generate-vapid-keys`
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || ''

webpush.setVapidDetails(
  'mailto:support@fittrack.example',
  vapidPublicKey,
  vapidPrivateKey
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { subscription, title, body } = await req.json()

    if (!subscription) {
      throw new Error('No subscription object provided')
    }

    const payload = JSON.stringify({ title, body })

    await webpush.sendNotification(subscription, payload)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
