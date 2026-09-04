import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { client } from "../session.js";
import { runTool } from "../toolHelper.js";

export function registerCuentaCertificaModifyTools(server: McpServer): void {
  server.registerTool(
    "notasnet_get_account_payment_status",
    {
      description: "Estado resumido de pagos de la familia (GET /cuenta/upag).",
      inputSchema: {},
    },
    async () => runTool(true, () => client.getAccountPaymentStatus()),
  );

  server.registerTool(
    "notasnet_get_account_installments",
    {
      description: "Cuotas/aranceles con montos y estado (GET /cuenta/cuotas).",
      inputSchema: {},
    },
    async () => runTool(true, () => client.getAccountInstallments()),
  );

  server.registerTool(
    "notasnet_get_account_payments",
    {
      description: "Historial de pagos y documentos tributarios (GET /cuenta/pagos).",
      inputSchema: {},
    },
    async () => runTool(true, () => client.getAccountPayments()),
  );

  server.registerTool(
    "notasnet_get_account_pay_now_status",
    {
      description: "Estado de disponibilidad de pago en línea (GET /cuenta/pagar).",
      inputSchema: {},
    },
    async () => runTool(true, () => client.getAccountPayNowStatus()),
  );

  server.registerTool(
    "notasnet_list_certificates",
    {
      description: "Certificados disponibles por alumno, con estado de firma (GET /certifica/list).",
      inputSchema: {},
    },
    async () => runTool(true, () => client.listCertificates()),
  );

  server.registerTool(
    "notasnet_get_modify_schema",
    {
      description: "Definición de campos editables de una ficha (formulario dinámico) (GET /modify/schema?tipo=).",
      inputSchema: { tipo: z.string() },
    },
    async ({ tipo }) => runTool(true, () => client.getModifySchema(tipo)),
  );

  server.registerTool(
    "notasnet_get_modify_info",
    {
      description: "Datos actuales de una ficha editable del alumno/apoderado (GET /modify/info?tipo=&id=).",
      inputSchema: { tipo: z.string(), id: z.number() },
    },
    async ({ tipo, id }) => runTool(true, () => client.getModifyInfo(tipo, id)),
  );

  server.registerTool(
    "notasnet_get_modify_reference",
    {
      description:
        'Catálogos de referencia para listas desplegables, ej. alergias/enfermedades (GET /modify/reference?table=). ' +
        'tables acepta pares "campoId:tabla", ej. ["idAlergia:_alergias", "idEnfermedad:_enfermedades"].',
      inputSchema: { tables: z.array(z.string()).min(1) },
    },
    async ({ tables }) => runTool(true, () => client.getModifyReference(tables)),
  );

  server.registerTool(
    "notasnet_get_modify_selector",
    {
      description: "Datos de contacto/dirección editables asociados a un id (GET /modify/selector?id=).",
      inputSchema: { id: z.number() },
    },
    async ({ id }) => runTool(true, () => client.getModifySelector(id)),
  );

  server.registerTool(
    "notasnet_get_modify_documents",
    {
      description: "Documentos adjuntos a una ficha editable (GET /modify/documentos?tipo=&id=).",
      inputSchema: { tipo: z.string(), id: z.number() },
    },
    async ({ tipo, id }) => runTool(true, () => client.getModifyDocuments(tipo, id)),
  );
}
