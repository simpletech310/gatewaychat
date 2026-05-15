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

  if (bot.enableBooking && bot.bookingLink) {
    tools.push({
      name: "share_booking_link",
      description:
        "Share the booking link with the visitor when they want to schedule an appointment, demo, or call. Do not invent times — just share the link and let them pick a slot.",
      input_schema: {
        type: "object" as const,
        properties: {
          reason: {
            type: "string",
            description: "What the visitor is trying to book.",
          },
        },
        required: ["reason"],
      },
    });
  }

  return tools;
}
