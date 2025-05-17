import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const projectId = "PVT_kwDOCbEr484A0yNe"; // NautilusOSS/Board 2 (correct ProjectV2 ID)
    const openColumnName = "Open";
    const bountyFieldName = "Bounty";
    const apiUrl = "https://api.github.com/graphql";

    // Helper to find a field ID by name
    const getFieldIdByName = (fields, name) => {
      const field = fields?.find((f: any) => f.name?.toLowerCase() === name.toLowerCase());
      return field?.id;
    };

    // GraphQL query with pagination
    const fetchAllItems = async () => {
      let items: any[] = [];
      let hasNextPage = true;
      let endCursor: string | null = null;
      const first = 50;
      let statusFieldId: string | null = null;
      let openStatusOptionId: string | null = null;
      let bountyFieldId: string | null = null;

      while (hasNextPage) {
        const query = `
          query {
            node(id: "${projectId}") {
              ... on ProjectV2 {
                id
                title
                fields(first: 30) {
                  nodes {
                    ... on ProjectV2Field {
                      id
                      name
                    }
                    ... on ProjectV2SingleSelectField {
                      id
                      name
                      options {
                        id
                        name
                      }
                    }
                  }
                }
                items(first: ${first}${endCursor ? `, after: "${endCursor}"` : ""}) {
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                  nodes {
                    id
                    content {
                      ... on Issue {
                        id
                        title
                        url
                        body
                        state
                        labels(first: 10) {
                          nodes {
                            name
                          }
                        }
                      }
                      ... on PullRequest {
                        id
                        title
                        url
                        body
                        state
                        labels(first: 10) {
                          nodes {
                            name
                          }
                        }
                      }
                    }
                    fieldValues(first: 20) {
                      nodes {
                        ... on ProjectV2ItemFieldSingleSelectValue {
                          field {
                            id
                            name
                          }
                          name
                          optionId
                        }
                        ... on ProjectV2ItemFieldTextValue {
                          field {
                            id
                            name
                          }
                          text
                        }
                        ... on ProjectV2ItemFieldNumberValue {
                          field {
                            id
                            name
                          }
                          number
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `;

        const ghRes = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });

        if (!ghRes.ok) {
          const text = await ghRes.text();
          console.error("GitHub API error:", text);
          throw new Error(text);
        }
        const ghData = await ghRes.json();

        const node = ghData?.data?.node;
        if (!node) break;
        const project = node;
        if (items.length === 0 && project.fields && !project.items) {
          break;
        }
        // On first fetch, extract field IDs
        if (!statusFieldId || !openStatusOptionId || !bountyFieldId) {
          const fields = project.fields?.nodes;
          statusFieldId = getFieldIdByName(fields, "Status") || getFieldIdByName(fields, "Column");
          const statusField = fields?.find((f: any) => f.id === statusFieldId && f.options);
          openStatusOptionId = statusField?.options?.find(
            (o: any) => o.name?.toLowerCase() === openColumnName.toLowerCase()
          )?.id;
          bountyFieldId = getFieldIdByName(fields, bountyFieldName);
          // DEBUG LOGS:
          console.log("StatusField:", statusFieldId, "OpenStatusOption:", openStatusOptionId, "BountyField:", bountyFieldId);
        }

        const pageItems = project.items?.nodes ?? [];
        items = items.concat(pageItems);

        hasNextPage = project.items?.pageInfo?.hasNextPage ?? false;
        endCursor = project.items?.pageInfo?.endCursor ?? null;

        // Attach field IDs for use outside loop
        fetchAllItems.statusFieldId = statusFieldId;
        fetchAllItems.openStatusOptionId = openStatusOptionId;
        fetchAllItems.bountyFieldId = bountyFieldId;
      }
      return items;
    };

    // Fetch all items
    const allItems = await fetchAllItems();
    const statusFieldId = fetchAllItems.statusFieldId;
    const openStatusOptionId = fetchAllItems.openStatusOptionId;
    const bountyFieldId = fetchAllItems.bountyFieldId;

    // Filter "Open" status cards
    const openItems = allItems.filter((item: any) => {
      if (!item.fieldValues || !statusFieldId || !openStatusOptionId) return false;
      const statusValue = item.fieldValues.nodes.find(
        (fv: any) => fv?.field?.id === statusFieldId && fv?.optionId === openStatusOptionId
      );
      return !!statusValue && item.content;
    });

    // Prepare upserts using the "Bounty" field value
    const inserts = openItems
      .map((item: any) => {
        const content = item.content;
        if (!content) return null;
        // FIND THE BOUNTY FIELD VALUE (text/number)
        let bountyValue: string | null = null;
        if (bountyFieldId) {
          // Try text field (most likely)
          const textBountyValue = item.fieldValues.nodes.find(
            (fv: any) =>
              fv?.field?.id === bountyFieldId &&
              fv.text !== undefined
          )?.text;
          // Try number field
          const numberBountyValue = item.fieldValues.nodes.find(
            (fv: any) =>
              fv?.field?.id === bountyFieldId &&
              fv.number !== undefined
          )?.number?.toString();
          // Try single select
          const selectBountyValue = item.fieldValues.nodes.find(
            (fv: any) =>
              fv?.field?.id === bountyFieldId &&
              fv.name !== undefined
          )?.name;

          bountyValue = textBountyValue || numberBountyValue || selectBountyValue || null;
        }

        // Fallback to label-based reward if no bounty value
        let reward = bountyValue;
        if (!reward) {
          reward =
            content.labels?.nodes
              ?.find((l: any) => l.name.startsWith("$"))?.name || null;
        }

        const labels =
          content.labels?.nodes
            ?.map((l: any) => l.name)
            ?.filter((n: string) => n !== "bounty" && !n.startsWith("$")) || [];

        return {
          github_id: content.id,
          title: content.title,
          description: content.body,
          tags: labels,
          reward,
          status: "open",
          url: content.url,
        };
      })
      .filter(Boolean);

    // For debugging
    console.log("Inserts prepared:", JSON.stringify(inserts));

    // Delete all rows in bounties first
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL/Service Role Key missing");
    }

    // Delete all rows in bounties first
    const deleteRes = await fetch(`${supabaseUrl}/rest/v1/bounties?id=not.is.null`, {
      method: "DELETE",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }
    });

    if (!deleteRes.ok) {
      const text = await deleteRes.text();
      console.error("Supabase delete failed:", text);
      return new Response(JSON.stringify({ error: text }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // Upsert via Supabase
    const upRes = await fetch(`${supabaseUrl}/rest/v1/bounties?on_conflict=github_id`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(inserts),
    });

    if (!upRes.ok) {
      const text = await upRes.text();
      console.error("Supabase upsert failed:", text);
      return new Response(JSON.stringify({ error: text }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    return new Response(
      JSON.stringify({ success: true, inserted: inserts.length }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("sync-github-bounties error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
