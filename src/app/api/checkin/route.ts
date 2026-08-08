import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { pin, photoBase64 } = await request.json();

    if (!pin || pin.length !== 6) {
      return NextResponse.json({ error: 'Invalid PIN format' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const today = new Date().toISOString().split('T')[0];

    // 1. Verify PIN and get staff details
    const { data: pinData, error: pinError } = await supabase
      .from('daily_pins')
      .select('staff_id, staff:staff_id (name)')
      .eq('pin', pin)
      .eq('date', today)
      .single();

    if (pinError || !pinData) {
      return NextResponse.json({ error: 'Invalid or expired PIN' }, { status: 401 });
    }

    const staffId = pinData.staff_id;
    const staffName = pinData.staff.name;

    let photoUrl = null;
    let storageErrorMsg = null;
    if (!photoBase64) {
       storageErrorMsg = "Camera was blocked or photoBase64 was null.";
    } else {
      try {
        const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const fileName = `checkin_${staffId}_${Date.now()}.jpg`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('checkin checkout photo')
          .upload(fileName, buffer, {
            contentType: 'image/jpeg'
          });

        if (uploadError) {
          storageErrorMsg = "Supabase API Error: " + uploadError.message;
        } else if (uploadData) {
           photoUrl = supabase.storage.from('checkin checkout photo').getPublicUrl(fileName).data.publicUrl;
        } else {
           storageErrorMsg = "Unknown error: No data and no error returned from upload.";
        }
      } catch (e: any) {
        storageErrorMsg = "Server Exception: " + e.message;
      }
    }

    // 2. Check if already checked in today
    const { data: logData, error: logError } = await supabase
      .from('time_logs')
      .select('id, check_in_time, check_out_time')
      .eq('staff_id', staffId)
      .eq('date', today)
      .order('check_in_time', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (logError) {
      console.error("Database error fetching time_logs:", logError);
      return NextResponse.json({ error: 'System error: Could not verify previous check-ins.' }, { status: 500 });
    }

    const formatTime = (isoString: string) => {
      return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    if (logData) {
      if (logData.check_out_time) {
        // They already completed a shift today (Check-in and Check-out are both done)
        return NextResponse.json({ error: 'You have already completed your shift for today.' }, { status: 400 });
      } else {
        // They are currently checked in, so this is a checkout attempt
        const checkInDate = new Date(logData.check_in_time);
        const now = new Date();
        const diffMinutes = (now.getTime() - checkInDate.getTime()) / 1000 / 60;
        
        // Minimum 5 minutes before you can check out (prevents accidental double taps)
        if (diffMinutes < 5) {
           return NextResponse.json({ error: `Please wait at least 5 minutes after checking in before checking out.` }, { status: 400 });
        }

        const nowIso = now.toISOString();
        const { error: updateError } = await supabase
          .from('time_logs')
          .update({ check_out_time: nowIso })
          .eq('id', logData.id);

        if (updateError) throw updateError;
        return NextResponse.json({ 
          success: true, 
          action: 'checkout', 
          message: `Goodbye, ${staffName}! Checked out at ${formatTime(nowIso)}`,
          photoError: storageErrorMsg
        });
      }
    }

    // 3. Otherwise, they have no logs today, so check in
    const now = new Date().toISOString();
    const { error: insertError } = await supabase
      .from('time_logs')
      .insert({
        staff_id: staffId,
        date: today,
        check_in_time: now,
        photo_url: photoUrl
      });

    if (insertError) throw insertError;
    return NextResponse.json({ 
      success: true, 
      action: 'checkin', 
      message: `Welcome, ${staffName}! Checked in at ${formatTime(now)}`,
        photoError: storageErrorMsg
    });

  } catch (error) {
    console.error('Checkin API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
