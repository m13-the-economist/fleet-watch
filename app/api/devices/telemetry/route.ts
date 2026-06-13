import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// ============================================
// OBD2 ERROR CODE MAPPING (Hardcoded - Common Codes)
// ============================================
const OBD2_ERRORS: Record<string, { severity: "critical" | "warning" | "info"; message: string; action: string }> = {
  // Critical - Stop Immediately
  "P0300": { severity: "critical", message: "Random/Multiple cylinder misfire", action: "Stop vehicle. Catalytic converter damage risk." },
  "P0301": { severity: "critical", message: "Cylinder 1 misfire detected", action: "Stop vehicle. Check spark plugs and ignition coils." },
  "P0302": { severity: "critical", message: "Cylinder 2 misfire detected", action: "Stop vehicle. Check spark plugs and ignition coils." },
  "P0303": { severity: "critical", message: "Cylinder 3 misfire detected", action: "Stop vehicle. Check spark plugs and ignition coils." },
  "P0304": { severity: "critical", message: "Cylinder 4 misfire detected", action: "Stop vehicle. Check spark plugs and ignition coils." },
  "P0305": { severity: "critical", message: "Cylinder 5 misfire detected", action: "Stop vehicle. Check spark plugs and ignition coils." },
  "P0306": { severity: "critical", message: "Cylinder 6 misfire detected", action: "Stop vehicle. Check spark plugs and ignition coils." },
  "P0325": { severity: "critical", message: "Knock sensor circuit malfunction", action: "Stop vehicle. Engine knocking can cause severe damage." },
  "P0335": { severity: "critical", message: "Crankshaft position sensor circuit", action: "Engine may stop unexpectedly. Get towed to mechanic." },
  "P0336": { severity: "critical", message: "Crankshaft position sensor range/performance", action: "Engine may stop unexpectedly. Get towed to mechanic." },
  "P0340": { severity: "critical", message: "Camshaft position sensor circuit", action: "Engine may not start or run poorly." },
  "P0350": { severity: "critical", message: "Ignition coil primary/secondary circuit", action: "Engine will run poorly. Get towed." },
  "P0351": { severity: "critical", message: "Ignition coil A primary/secondary circuit", action: "Engine will run poorly. Get towed." },
  "P0352": { severity: "critical", message: "Ignition coil B primary/secondary circuit", action: "Engine will run poorly. Get towed." },
  "P0353": { severity: "critical", message: "Ignition coil C primary/secondary circuit", action: "Engine will run poorly. Get towed." },
  "P0354": { severity: "critical", message: "Ignition coil D primary/secondary circuit", action: "Engine will run poorly. Get towed." },
  "P0420": { severity: "critical", message: "Catalyst system efficiency below threshold", action: "Catalytic converter failing. Expensive repair if ignored." },
  "P0430": { severity: "critical", message: "Catalyst system efficiency below threshold (Bank 2)", action: "Catalytic converter failing. Expensive repair if ignored." },
  "P0562": { severity: "critical", message: "System voltage low", action: "Battery critically low. May not restart." },
  "P0563": { severity: "critical", message: "System voltage high", action: "Alternator overcharging. Stop vehicle." },
  "P0600": { severity: "critical", message: "Serial communication link malfunction", action: "ECU communication error. Get towed to mechanic." },
  "P0601": { severity: "critical", message: "Internal control module memory error", action: "ECU failure. Vehicle may not run properly." },
  "P0606": { severity: "critical", message: "PCM/ECM processor fault", action: "ECU processor failure. Get towed immediately." },
  "P0620": { severity: "critical", message: "Generator control circuit malfunction", action: "Alternator control circuit issue. Check charging system." },
  "P0621": { severity: "critical", message: "Generator lamp 'L' terminal circuit", action: "Alternator warning light circuit issue." },
  "P0700": { severity: "critical", message: "Transmission control system malfunction", action: "Transmission problem. Stop vehicle." },
  "P0705": { severity: "critical", message: "Transmission range sensor circuit malfunction", action: "Gear position sensor failure." },
  "P0715": { severity: "critical", message: "Input/turbine speed sensor circuit", action: "Transmission speed sensor failure." },
  "P0720": { severity: "critical", message: "Output speed sensor circuit", action: "Transmission output speed sensor failure." },
  "P0730": { severity: "critical", message: "Incorrect gear ratio", action: "Transmission slipping. Stop vehicle immediately." },
  "P0740": { severity: "critical", message: "Torque converter clutch circuit", action: "Torque converter issue. Transmission may fail." },
  "P0750": { severity: "critical", message: "Shift solenoid A malfunction", action: "Transmission shifting issue. Get towed." },
  "P0755": { severity: "critical", message: "Shift solenoid B malfunction", action: "Transmission shifting issue. Get towed." },
  "P0760": { severity: "critical", message: "Shift solenoid C malfunction", action: "Transmission shifting issue. Get towed." },
  "P0770": { severity: "critical", message: "Shift solenoid E malfunction", action: "Transmission shifting issue. Get towed." },
  "P0800": { severity: "critical", message: "Transfer case control system malfunction", action: "4WD/AWD system issue." },
  "P0810": { severity: "critical", message: "Clutch position control error", action: "Clutch system failure. Stop vehicle." },

  // Warning - Schedule Repair
  "P0010": { severity: "warning", message: "Camshaft position actuator circuit (Bank 1)", action: "Schedule repair this week." },
  "P0011": { severity: "warning", message: "Camshaft position timing over-advanced", action: "Timing chain/belt may need replacement. Schedule repair." },
  "P0012": { severity: "warning", message: "Camshaft position timing over-retarded", action: "Timing chain/belt may need replacement. Schedule repair." },
  "P0100": { severity: "warning", message: "Mass air flow circuit malfunction", action: "MAF sensor failing. Affects fuel economy." },
  "P0101": { severity: "warning", message: "MAF circuit range/performance problem", action: "Dirty or failing MAF sensor. Schedule cleaning." },
  "P0102": { severity: "warning", message: "MAF circuit low input", action: "MAF sensor or wiring issue." },
  "P0103": { severity: "warning", message: "MAF circuit high input", action: "MAF sensor or wiring issue." },
  "P0111": { severity: "info", message: "Intake air temperature circuit range/performance", action: "IAT sensor issue. Monitor performance." },
  "P0115": { severity: "warning", message: "Engine coolant temperature circuit", action: "ECT sensor failure. Check engine temperature manually." },
  "P0116": { severity: "warning", message: "ECT circuit range/performance", action: "Coolant temperature sensor issue. Risk of overheating." },
  "P0118": { severity: "warning", message: "ECT circuit high input", action: "Coolant temperature sensor failure." },
  "P0120": { severity: "warning", message: "Throttle/pedal position sensor circuit", action: "TPS sensor issue. May affect acceleration." },
  "P0121": { severity: "warning", message: "TPS circuit range/performance", action: "Throttle position sensor failing." },
  "P0122": { severity: "warning", message: "TPS circuit low input", action: "Throttle position sensor wiring issue." },
  "P0123": { severity: "warning", message: "TPS circuit high input", action: "Throttle position sensor wiring issue." },
  "P0128": { severity: "warning", message: "Coolant thermostat stuck open", action: "Engine takes too long to warm up. Replace thermostat." },
  "P0130": { severity: "warning", message: "O2 sensor circuit malfunction (Bank 1 Sensor 1)", action: "Oxygen sensor failing. Affects fuel economy." },
  "P0131": { severity: "warning", message: "O2 sensor circuit low voltage (Bank 1 Sensor 1)", action: "Oxygen sensor failing." },
  "P0132": { severity: "warning", message: "O2 sensor circuit high voltage (Bank 1 Sensor 1)", action: "Oxygen sensor failing." },
  "P0133": { severity: "warning", message: "O2 sensor circuit slow response", action: "Oxygen sensor degrading." },
  "P0134": { severity: "warning", message: "O2 sensor circuit no activity", action: "Oxygen sensor dead." },
  "P0135": { severity: "warning", message: "O2 sensor heater circuit malfunction", action: "Heated O2 sensor heater circuit issue." },
  "P0136": { severity: "warning", message: "O2 sensor circuit malfunction (Bank 1 Sensor 2)", action: "Downstream O2 sensor issue." },
  "P0141": { severity: "warning", message: "O2 sensor heater circuit (Bank 1 Sensor 2)", action: "Downstream O2 sensor heater issue." },
  "P0171": { severity: "warning", message: "System too lean (Bank 1)", action: "Vacuum leak or fuel delivery issue. Check soon." },
  "P0172": { severity: "warning", message: "System too rich (Bank 1)", action: "Too much fuel. Check injectors or MAF sensor." },
  "P0174": { severity: "warning", message: "System too lean (Bank 2)", action: "Vacuum leak or fuel delivery issue." },
  "P0175": { severity: "warning", message: "System too rich (Bank 2)", action: "Too much fuel. Check injectors or MAF sensor." },
  "P0200": { severity: "warning", message: "Injector circuit malfunction", action: "Fuel injector circuit issue. Schedule diagnosis." },
  "P0201": { severity: "warning", message: "Injector circuit malfunction (Cylinder 1)", action: "Cylinder 1 injector circuit issue." },
  "P0202": { severity: "warning", message: "Injector circuit malfunction (Cylinder 2)", action: "Cylinder 2 injector circuit issue." },
  "P0203": { severity: "warning", message: "Injector circuit malfunction (Cylinder 3)", action: "Cylinder 3 injector circuit issue." },
  "P0204": { severity: "warning", message: "Injector circuit malfunction (Cylinder 4)", action: "Cylinder 4 injector circuit issue." },
  "P0400": { severity: "warning", message: "EGR flow malfunction", action: "EGR valve stuck or clogged. Schedule cleaning." },
  "P0401": { severity: "warning", message: "Insufficient EGR flow", action: "EGR system clogged. Schedule cleaning." },
  "P0402": { severity: "warning", message: "Excessive EGR flow", action: "EGR valve stuck open." },
  "P0440": { severity: "warning", message: "Evaporative emission system malfunction", action: "Check gas cap. May be loose or missing." },
  "P0441": { severity: "warning", message: "EVAP system incorrect purge flow", action: "EVAP purge valve issue." },
  "P0442": { severity: "warning", message: "EVAP system small leak detected", action: "Tighten gas cap. If light stays, schedule service." },
  "P0445": { severity: "warning", message: "EVAP system large leak detected", action: "Check gas cap first. May be larger leak in system." },
  "P0455": { severity: "warning", message: "EVAP system gross leak detected", action: "Large leak detected. Check gas cap and EVAP hoses." },
  "P0500": { severity: "warning", message: "Vehicle speed sensor malfunction", action: "Speed sensor failing. Speedometer may not work." },
  "P0505": { severity: "warning", message: "Idle control system malfunction", action: "Idle air control valve issue. May stall at idle." },
  "P0560": { severity: "warning", message: "System voltage malfunction", action: "Battery or alternator issue. Check charging system." },

  // Info - Monitor Only
  "P0501": { severity: "info", message: "Vehicle speed sensor range/performance", action: "Monitor speedometer. May need replacement." },
  "P0603": { severity: "info", message: "Control module keep alive memory error", action: "ECU memory issue. May need reprogramming." },
  "P0604": { severity: "info", message: "Control module RAM error", action: "ECU memory error. Monitor performance." },
  "P0605": { severity: "info", message: "Control module ROM error", action: "ECU memory error. Monitor performance." },
  "P0607": { severity: "info", message: "Control module performance", action: "ECU performance issue. May be intermittent." },
  "P0608": { severity: "info", message: "Control module VSS output error", action: "ECU speed output issue." },
  "P0609": { severity: "info", message: "Control module VSS output error", action: "ECU speed output issue." },
  "P0622": { severity: "info", message: "Generator field 'F' terminal circuit", action: "Alternator field control circuit issue." },

  // Bike/ESP32 Custom Codes
  "B001": { severity: "warning", message: "High chain vibration detected", action: "Check chain tension and lubrication." },
  "B002": { severity: "critical", message: "Extreme chain vibration - possible breakage", action: "Stop immediately. Chain may break." },
  "B003": { severity: "warning", message: "Excessive engine vibration", action: "Check engine mounts. Schedule inspection." },
  "B004": { severity: "critical", message: "Vehicle tipped over", action: "Check for damage. Vehicle may not start." },
  "B005": { severity: "critical", message: "Low oil pressure", action: "Stop engine immediately. Check oil level." },
  "B006": { severity: "critical", message: "High coolant temperature", action: "Stop engine. Risk of seizure." },
  "B007": { severity: "warning", message: "Side stand down while driving", action: "Pull over safely and retract side stand." },
};

// ============================================
// HELPER FUNCTIONS FOR GEOFENCE DETECTION
// ============================================

// PROVEN point-in-polygon algorithm
function isPointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const lati = polygon[i][0];
    const lngi = polygon[i][1];
    const latj = polygon[j][0];
    const lngj = polygon[j][1];
    
    const intersect = ((lati > lat) != (latj > lat)) &&
      (lng < (lngj - lngi) * (lat - lati) / (latj - lati) + lngi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Check if a point is inside a circle
function isPointInCircle(lat: number, lng: number, centerLat: number, centerLng: number, radiusMeters: number): boolean {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat - centerLat) * Math.PI / 180;
  const dLng = (lng - centerLng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(centerLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance <= radiusMeters;
}

// Send Telegram notification
async function sendTelegramAlert(botToken: string, chatId: string, vehiclePlate: string, alertMessage: string, alertAction: string, latitude?: number, longitude?: number) {
  const text = `⚠️ *GEOFENCE ALERT* ⚠️\n\n` +
    `*Vehicle:* ${vehiclePlate}\n` +
    `*Alert:* ${alertMessage}\n` +
    `*Action:* ${alertAction}\n` +
    `*Time:* ${new Date().toLocaleString()}\n` +
    (latitude && longitude ? `📍 *Location:* ${latitude}, ${longitude}\n` : '');
  
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    })
  }).catch(console.error);
}

// ============================================
// HYBRID OBD2 LOOKUP (Hardcoded + Database)
// ============================================
async function getOBD2ErrorDetails(supabase: any, code: string) {
  const normalizedCode = code.toUpperCase();
  
  // 1. Check hardcoded common codes first (fastest)
  if (OBD2_ERRORS[normalizedCode]) {
    return OBD2_ERRORS[normalizedCode];
  }
  
  // 2. Check database for codes added later (no redeploy needed)
  try {
    const { data: dbCode, error } = await supabase
      .from('obd2_codes')
      .select('severity, message, action')
      .eq('code', normalizedCode)
      .maybeSingle();
    
    if (dbCode) {
      return {
        severity: dbCode.severity,
        message: dbCode.message,
        action: dbCode.action
      };
    }
  } catch (err) {
    console.error('Database lookup failed:', err);
  }
  
  // 3. Generic P-code handler (for any unmapped P-code)
  if (normalizedCode.match(/^P[0-9]{4}$/)) {
    return {
      severity: "warning",
      message: `Diagnostic trouble code: ${normalizedCode}`,
      action: "Schedule diagnostic scan for details."
    };
  }
  
  // 4. Unknown code (C, B, U codes) - no alert
  return null;
}

// ============================================
// LIVE DATA THRESHOLDS (Speed removed from critical/warning)
// ============================================
function checkLiveDataThresholds(temperature: number, voltage: number, fuelLevel: number | null) {
  const alerts: { severity: "critical" | "warning" | "info"; type: string; message: string; action: string }[] = [];
  
  // Temperature checks
  if (temperature >= 105) {
    alerts.push({ severity: "critical", type: "temperature", message: `Engine overheating: ${temperature}°C`, action: "Pull over immediately. Risk of engine damage." });
  } else if (temperature >= 95) {
    alerts.push({ severity: "warning", type: "temperature", message: `Engine temperature high: ${temperature}°C`, action: "Monitor closely. Check coolant level." });
  }
  
  // Voltage checks
  if (voltage >= 15) {
    alerts.push({ severity: "critical", type: "voltage", message: `Alternator overcharging: ${voltage}V`, action: "Stop vehicle. Risk of electrical fire." });
  } else if (voltage < 11.8) {
    alerts.push({ severity: "critical", type: "voltage", message: `Battery critically low: ${voltage}V`, action: "Vehicle may not restart. Get battery tested." });
  } else if (voltage < 12.2) {
    alerts.push({ severity: "warning", type: "voltage", message: `Battery voltage low: ${voltage}V`, action: "Schedule battery check this week." });
  }
  
  // Fuel level checks
  if (fuelLevel !== null && fuelLevel !== undefined) {
    if (fuelLevel <= 5) {
      alerts.push({ severity: "critical", type: "fuel", message: `Fuel critically low: ${fuelLevel}%`, action: "Stop for fuel immediately. Risk of running out." });
    } else if (fuelLevel <= 15) {
      alerts.push({ severity: "warning", type: "fuel", message: `Fuel level low: ${fuelLevel}%`, action: "Refuel soon." });
    } else if (fuelLevel <= 25) {
      alerts.push({ severity: "info", type: "fuel", message: `Fuel level: ${fuelLevel}%`, action: "Monitor. No immediate action." });
    }
  }
  
  return alerts;
}

// ============================================
// TELEMETRY ENDPOINT
// ============================================
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, temperature, voltage, rpm, speed, fault_code, fuel_level, latitude, longitude } = body

    console.log(`\n========== TELEMETRY RECEIVED ==========`)
    console.log(`Device ID: ${device_id}`)
    console.log(`Location: lat=${latitude}, lng=${longitude}`)
    console.log(`Fault code: ${fault_code || 'none'}`)
    console.log(`Temperature: ${temperature}°C, Voltage: ${voltage}V, Speed: ${speed}km/h, Fuel: ${fuel_level}%`)

    if (!device_id) {
      return NextResponse.json({ error: 'device_id is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Find vehicle by device_id
    let { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, plate_number, profile_id')
      .eq('device_id', device_id)
      .maybeSingle()

    if (vehicleError || !vehicle) {
      console.log(`❌ Vehicle not found for device_id: ${device_id}`)
      return NextResponse.json({ error: 'Vehicle not found for this device' }, { status: 404 })
    }

    console.log(`✅ Vehicle found: ${vehicle.plate_number} (${vehicle.id})`)

    // Update vehicle with latest telemetry
    await supabase
      .from('vehicles')
      .update({
        last_temperature: temperature,
        last_voltage: voltage,
        last_rpm: rpm,
        last_speed: speed,
        last_fuel_level: fuel_level,
        last_location_lat: latitude,
        last_location_lng: longitude,
        last_seen: new Date().toISOString(),
        status: 'online'
      })
      .eq('id', vehicle.id)

    // Save reading
    await supabase
      .from('readings')
      .insert({
        vehicle_id: vehicle.id,
        device_id: device_id,
        temperature: temperature || null,
        voltage: voltage || null,
        rpm: rpm || null,
        speed: speed || null,
        fuel_level: fuel_level || null,
        latitude: latitude || null,
        longitude: longitude || null
      })

    // ============================================
    // CHECK GEOFENCE BREACH
    // ============================================
    let geofenceAlertCount = 0
    
    if (latitude && longitude && vehicle.id) {
      console.log(`\n----- GEOFENCE CHECK START -----`)
      console.log(`Checking geofences for vehicle ${vehicle.plate_number} at (${latitude}, ${longitude})`)
      
      try {
        // Fetch all active geofences for this vehicle
        const { data: vehicleGeofences, error: geofenceError } = await supabase
          .from('geofences')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .eq('is_active', true);
        
        console.log(`Found ${vehicleGeofences?.length || 0} active geofences`)
        
        if (vehicleGeofences && vehicleGeofences.length > 0) {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          
          for (const geofence of vehicleGeofences) {
            console.log(`\n--- Geofence: ${geofence.name} ---`)
            
            let isInside = false;
            
            // Check polygon geofence
            if (geofence.polygon && geofence.polygon.coordinates) {
              const polygonCoords = geofence.polygon.coordinates[0];
              console.log(`Polygon has ${polygonCoords.length} points`)
              console.log(`First point: ${polygonCoords[0]}`)
              console.log(`Last point: ${polygonCoords[polygonCoords.length-1]}`)
              
              isInside = isPointInPolygon(latitude, longitude, polygonCoords);
              console.log(`Point is ${isInside ? 'INSIDE ✅' : 'OUTSIDE ❌'} the polygon`)
            }
            // Check circle geofence
            else if (geofence.latitude && geofence.longitude && geofence.radius_meters) {
              console.log(`Circle center: (${geofence.latitude}, ${geofence.longitude}), radius: ${geofence.radius_meters}m`)
              isInside = isPointInCircle(latitude, longitude, geofence.latitude, geofence.longitude, geofence.radius_meters);
              console.log(`Point is ${isInside ? 'INSIDE ✅' : 'OUTSIDE ❌'} the circle`)
            }
            
            // If vehicle is OUTSIDE the geofence
            if (!isInside) {
              console.log(`🚨 VEHICLE IS OUTSIDE GEOFENCE: ${geofence.name}`)
              
              // Check if we already have an unresolved exit alert
              const { data: existingAlert } = await supabase
                .from('alerts')
                .select('id')
                .eq('vehicle_id', vehicle.id)
                .eq('alert_type', 'geofence_exit')
                .eq('is_resolved', false)
                .maybeSingle();
              
              if (!existingAlert) {
                const alertMessage = `Vehicle ${vehicle.plate_number} has LEFT geofence: ${geofence.name}`;
                const alertAction = `Vehicle is outside the designated area. Last known location: ${latitude}, ${longitude}`;
                
                const { data: insertedAlert, error: insertError } = await supabase
                  .from('alerts')
                  .insert({
                    vehicle_id: vehicle.id,
                    alert_type: 'geofence_exit',
                    severity: 'warning',
                    message: alertMessage,
                    action: alertAction,
                    is_resolved: false
                  })
                  .select();
                
                if (insertError) {
                  console.error(`❌ Failed to insert alert:`, insertError)
                } else {
                  geofenceAlertCount++
                  console.log(`✅ Geofence exit alert created (ID: ${insertedAlert?.[0]?.id})`)
                }
                
                // Send Telegram notification
                if (botToken && vehicle.profile_id) {
                  const { data: telegramSubs } = await supabase
                    .from('telegram_subscriptions')
                    .select('chat_id')
                    .eq('profile_id', vehicle.profile_id);
                  
                  if (telegramSubs && telegramSubs.length > 0) {
                    for (const sub of telegramSubs) {
                      await sendTelegramAlert(botToken, sub.chat_id, vehicle.plate_number, alertMessage, alertAction, latitude, longitude);
                      console.log(`📱 Telegram notification sent to ${sub.chat_id}`)
                    }
                  }
                }
              } else {
                console.log(`⚠️ Unresolved exit alert already exists, skipping duplicate`)
              }
            } 
            // If vehicle is INSIDE the geofence
            else {
              console.log(`✅ Vehicle is INSIDE geofence: ${geofence.name}`)
              // Resolve any existing exit alerts
              const { error: updateError } = await supabase
                .from('alerts')
                .update({ is_resolved: true, resolved_at: new Date().toISOString() })
                .eq('vehicle_id', vehicle.id)
                .eq('alert_type', 'geofence_exit')
                .eq('is_resolved', false);
              
              if (updateError) {
                console.error(`Failed to resolve alerts:`, updateError)
              } else {
                console.log(`✅ Resolved exit alerts for vehicle`)
              }
            }
          }
        } else {
          console.log(`No active geofences found for vehicle ${vehicle.plate_number}`)
        }
      } catch (geofenceError) {
        console.error('Geofence check error:', geofenceError)
      }
      console.log(`----- GEOFENCE CHECK END -----\n`)
    } else {
      console.log(`No location data - skipping geofence check. lat=${latitude}, lng=${longitude}`)
    }

    // ============================================
    // GENERATE OTHER ALERTS (Temperature, Voltage, Fuel, OBD2)
    // ============================================
    const alerts = []
    
    // 1. Check live data thresholds (speed removed)
    const liveDataAlerts = checkLiveDataThresholds(temperature, voltage, fuel_level)
    for (const alert of liveDataAlerts) {
      alerts.push({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        action: alert.action
      })
    }
    
    // Optional: Speed as INFO only (no critical/warning)
    if (speed >= 100) {
      alerts.push({
        type: 'speed',
        severity: 'info',
        message: `High speed detected: ${speed} km/h`,
        action: "Monitor driving behavior."
      })
    } else if (speed >= 80 && speed < 100) {
      alerts.push({
        type: 'speed',
        severity: 'info',
        message: `Speed: ${speed} km/h`,
        action: "Monitor driving behavior."
      })
    }
    
    // 2. Check OBD2 fault code (Hybrid lookup)
    if (fault_code) {
      console.log(`\n----- OBD2 CHECK -----`)
      console.log(`Checking fault code: ${fault_code}`)
      
      const errorDetails = await getOBD2ErrorDetails(supabase, fault_code)
      if (errorDetails) {
        console.log(`OBD2 code mapped: ${errorDetails.severity} - ${errorDetails.message}`)
        alerts.push({
          type: 'check_engine',
          severity: errorDetails.severity,
          message: errorDetails.message,
          action: errorDetails.action
        })
      } else {
        console.log(`No mapping found for code: ${fault_code}`)
        alerts.push({
          type: 'check_engine',
          severity: 'warning',
          message: `Check Engine: Code ${fault_code}`,
          action: "Schedule diagnostic scan."
        })
      }
      console.log(`----- OBD2 CHECK END -----\n`)
    }

    // Save alerts and send Telegram notifications
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    
    for (const alert of alerts) {
      const { data: savedAlert } = await supabase
        .from('alerts')
        .insert({
          vehicle_id: vehicle.id,
          alert_type: alert.type,
          severity: alert.severity,
          message: alert.message,
          action: alert.action,
          is_resolved: false
        })
        .select()
        .single()

      console.log(`Alert created: ${alert.type} (${alert.severity}) - ${alert.message}`)

      // Send Telegram notification for other alerts
      if (savedAlert && botToken && vehicle.profile_id) {
        const { data: telegramSubs } = await supabase
          .from('telegram_subscriptions')
          .select('chat_id')
          .eq('profile_id', vehicle.profile_id)

        if (telegramSubs && telegramSubs.length > 0) {
          const severityEmoji = alert.severity === 'critical' ? '🚨🔴' : (alert.severity === 'warning' ? '⚠️🟡' : 'ℹ️🔵')
          const text = `${severityEmoji} *FLEETWATCH ALERT* ${severityEmoji}\n\n` +
            `*Vehicle:* ${vehicle.plate_number}\n` +
            `*Alert:* ${alert.message}\n` +
            `*Action:* ${alert.action}\n` +
            `*Time:* ${new Date().toLocaleString()}\n\n` +
            `📱 *Dashboard:* ${process.env.NEXT_PUBLIC_APP_URL || 'https://fleet-watch-theta.vercel.app'}/dashboard`

          for (const sub of telegramSubs) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: sub.chat_id,
                text,
                parse_mode: 'Markdown'
              })
            }).catch(console.error)
            console.log(`📱 Telegram notification sent for ${alert.type} alert`)
          }
        }
      }
    }

    console.log(`\n========== TELEMETRY COMPLETE ==========`)
    console.log(`Total alerts generated: ${alerts.length + geofenceAlertCount}\n`)

    return NextResponse.json({ success: true, alerts_count: alerts.length + geofenceAlertCount })
  } catch (error) {
    console.error('Telemetry error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
