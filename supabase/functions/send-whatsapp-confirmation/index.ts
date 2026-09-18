// Supabase Edge Function: Envío Automático de WhatsApp al Registrar Siembra

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const WHATSAPP_API_URL = Deno.env.get("WHATSAPP_API_URL") || "https://api.ultramsg.com/YOUR_INSTANCE_ID/messages/chat";
const WHATSAPP_API_TOKEN = Deno.env.get("WHATSAPP_API_TOKEN") || "YOUR_API_TOKEN";

serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record; // Nuevo registro de la tabla 'trees'

    if (!record || !record.phone) {
      return new Response(JSON.stringify({ message: "No phone number provided" }), { status: 200 });
    }

    // Limpiar número de teléfono (remueve caracteres no numéricos)
    let cleanPhone = record.phone.replace(/\D/g, "");
    if (!cleanPhone.startsWith("507") && cleanPhone.length === 8) {
      cleanPhone = "507" + cleanPhone; // Agregar código de país Panamá
    }

    // Mensaje personalizado automático
    const messageText = 
      `🌱 *¡Hola ${record.planter_name}!*\n\n` +
      `¡Muchas gracias por contribuir al medio ambiente registrando tu siembra en *Forestando Juntos*!\n\n` +
      `📋 *Código de Registro:* ${record.code}\n` +
      `🌳 *Especie:* ${record.custom_species_name || 'Árbol sembrado'}\n` +
      `📍 *Provincia:* ${record.province || 'Panamá'}\n\n` +
      `Tu registro ha sido guardado con éxito en nuestro sistema y aparecerá en el mapa público tan pronto sea validado.\n\n` +
      `_De mano en mano, reforestando Panamá._ 🇵🇦`;

    // Enviar solicitud POST a la API de WhatsApp
    const response = await fetch(WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: WHATSAPP_API_TOKEN,
        to: cleanPhone,
        body: messageText,
      }),
    });

    const result = await response.json();

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
