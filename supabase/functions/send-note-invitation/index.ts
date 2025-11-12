import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { noteId, invitedEmail, noteTitle } = await req.json();

    if (!noteId || !invitedEmail) {
      throw new Error('Missing required fields');
    }

    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('id, title, user_id')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (noteError || !note) {
      console.error('Note query error:', noteError);
      throw new Error('Note not found or unauthorized');
    }

    const { error: inviteError } = await supabase
      .from('note_invitations')
      .insert({
        note_id: noteId,
        invited_by: user.id,
        invited_email: invitedEmail,
      });

    if (inviteError) {
      console.error('Invitation insert error:', inviteError);
      throw new Error(`Failed to create invitation: ${inviteError.message}`);
    }

    const origin = req.headers.get('origin') || supabaseUrl.replace('//', '//app.');
    const noteUrl = `${origin}/note/${noteId}`;
    const title = noteTitle || note.title || 'Untitled Note';

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured - invitation created but email not sent');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Invitation created. Email service not configured.',
          needsEmailSetup: true,
          noteUrl,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #2563eb, #1d4ed8); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: linear-gradient(to right, #2563eb, #1d4ed8); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>NoteSync</h1>
            </div>
            <div class="content">
              <h2>You've been invited to view a note!</h2>
              <p><strong>${user.email}</strong> has shared the note <strong>"${title}"</strong> with you.</p>
              <p>Click the button below to view the note:</p>
              <div style="text-align: center;">
                <a href="${noteUrl}" class="button">View Note</a>
              </div>
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                Or copy and paste this link into your browser:<br>
                <a href="${noteUrl}" style="color: #2563eb;">${noteUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>This invitation was sent by ${user.email} via NoteSync</p>
            </div>
          </div>
        </body>
      </html>
    `;

    let emailSent = false;
    let emailError = null;

    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'NoteSync <onboarding@resend.dev>',
          to: invitedEmail,
          subject: `${user.email} shared a note with you`,
          html: emailHtml,
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error('Resend API error:', emailResponse.status, errorData);
        emailError = errorData.message || 'Email service error';
      } else {
        const emailResult = await emailResponse.json();
        console.log('Email sent successfully:', emailResult);
        emailSent = true;
      }
    } catch (error) {
      console.error('Email sending failed:', error);
      emailError = error.message;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: emailSent ? 'Invitation sent successfully' : 'Invitation created',
        emailSent,
        emailError,
        noteUrl,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error in send-note-invitation:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An error occurred',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});