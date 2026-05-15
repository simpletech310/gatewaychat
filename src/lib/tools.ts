import type Anthropic from "@anthropic-ai/sdk";
import type { Chatbot } from "./db/schema";

export type ToolDef = Anthropic.Tool;

export function buildTools(bot: Chatbot): ToolDef[] {
  const tools: ToolDef[] = [];

  if (bot.enableEmailHandoff && bot.handoffEmail) {
    tools.push({
      name: "send_email_to_human",
      description:
        "Notify a human team member by email when the visitor explicitly wants to talk to a person, asks something you cannot answer from the knowledge base, or expresses urgency/frustration. Always confirm with the visitor before invoking this tool, and ask for their name, email, and what they need help with first.",
      input_schema: {
        type: "object" as const,
        properties: {
          visitor_name: { type: "string", description: "Visitor's name." },
          visitor_email: {
            type: "string",
            description: "Visitor's email address so the team can reply.",
          },
          summary: {
            type: "string",
            description:
              "A concise summary of what the visitor needs and any relevant context from the conversation.",
          },
          urgency: {
            type: "string",
            enum: ["low", "normal", "high"],
            description: "How urgent the request is.",
          },
        },
        required: ["visitor_name", "visitor_email", "summary"],
      },
    });
  }

  if (bot.enableLeadForm) {
    const fieldDescriptions =
      bot.leadFormFields.length > 0
        ? bot.leadFormFields
            .map((f) => `${f.name} (${f.type}${f.required ? ", required" : ""}): ${f.label}`)
            .join("; ")
        : "name, email, phone (optional), message";

    tools.push({
      name: "submit_lead_form",
      description: `Record a new lead in the CRM. Use this when the visitor wants to be contacted, request a quote, schedule a callback, or otherwise share their contact info. Capture the following fields: ${fieldDescriptions}. Ask for each required field before calling the tool.`,
      input_schema: {
        type: "object" as const,
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          message: { type: "string", description: "What the visitor is interested in." },
          extra: {
            type: "object",
            description: "Any additional custom fields configured for this bot.",
            additionalProperties: true,
          },
        },
        required: ["name", "email"],
      },
    });
  }

  if (bot.enableBooking) {
    // Built-in slot-based booking takes priority over an external link.
    tools.push({
      name: "list_available_appointment_slots",
      description:
        "List the upcoming appointment time slots that are still available. Use this when the visitor wants to schedule a call/appointment, so you can offer them concrete time options. Always call this BEFORE asking the visitor to pick a time.",
      input_schema: {
        type: "object" as const,
        properties: {},
      },
    });

    tools.push({
      name: "book_appointment",
      description:
        "Book a specific time slot for the visitor. Only call this after the visitor has chosen one of the slots returned by list_available_appointment_slots AND has provided their name and email. The slot will become unavailable immediately. If the slot is already taken, this returns an error and you should re-list available slots.",
      input_schema: {
        type: "object" as const,
        properties: {
          slot_id: {
            type: "string",
            description: "The id of the slot the visitor chose (from list_available_appointment_slots).",
          },
          name: { type: "string", description: "Visitor's full name." },
          email: { type: "string", description: "Visitor's email address." },
          phone: { type: "string", description: "Visitor's phone number (optional)." },
          notes: {
            type: "string",
            description: "Anything the team should know before the call (optional).",
          },
        },
        required: ["slot_id", "name", "email"],
      },
    });

    if (bot.bookingLink) {
      tools.push({
        name: "share_booking_link",
        description:
          "Share an external booking link with the visitor as a fallback ONLY if no internal time slots are available. Prefer list_available_appointment_slots + book_appointment first.",
        input_schema: {
          type: "object" as const,
          properties: {
            reason: { type: "string", description: "What the visitor is trying to book." },
          },
          required: ["reason"],
        },
      });
    }
  }

  return tools;
}
