import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// Helper to generate a 6-digit PIN
const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  let targetOrgId: string | null = null;

  // Check if it's the automated Cron Secret
  if (token === process.env.CRON_SECRET) {
    // Run for ALL organizations (global cron)
    targetOrgId = null; 
  } else {
    // Check if it's a valid Admin session token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Invalid token.' }, { status: 401 });
    }

    // Get Admin's organization
    const { data: adminData } = await supabase
      .from('admins')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!adminData) {
      return NextResponse.json({ error: 'Admin organization not found.' }, { status: 403 });
    }
    targetOrgId = adminData.organization_id;
  }

  try {
    // 1. Fetch active staff (Filtered by org if manual trigger)
    let staffQuery = supabase
      .from('staff')
      .select('id, name, phone_number, is_active')
      .eq('is_active', true);
      
    if (targetOrgId) {
      staffQuery = staffQuery.eq('organization_id', targetOrgId);
    }

    const { data: staffList, error: staffError } = await staffQuery;

    if (staffError) throw staffError;
    if (!staffList || staffList.length === 0) {
      return NextResponse.json({ message: 'No active staff found for processing.' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Check for staff currently on leave today
    const { data: activeLeaves } = await supabase
      .from('leaves')
      .select('staff_id')
      .lte('start_date', today)
      .gte('end_date', today);

    const staffOnLeaveIds = new Set(activeLeaves?.map(l => l.staff_id) || []);

    // Filter out staff on leave
    const eligibleStaff = staffList.filter(staff => !staffOnLeaveIds.has(staff.id));

    if (eligibleStaff.length === 0) {
       return NextResponse.json({ message: 'All active staff are currently on leave. No PINs generated.' });
    }

    let generatedCount = 0;

    // 2. Generate a PIN for each eligible staff and save it
    for (const staff of eligibleStaff) {
      const pin = generatePin();
      
      const { error: insertError } = await supabase
        .from('daily_pins')
        .upsert({
          staff_id: staff.id,
          pin: pin,
          date: today
        }, {
          onConflict: 'staff_id,date'
        });
        
      if (insertError) {
        console.error(`Failed to generate PIN for ${staff.name}:`, insertError);
        continue;
      }
      generatedCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Generated ${generatedCount} PINs. Ready to send manually!`,
      date: today
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
