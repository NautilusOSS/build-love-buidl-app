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
    const apiUrl = "https://api.github.com/graphql";

    // GraphQL query with pagination
    const fetchAllItems = async () => {
      let items: any[] = [];
      let hasNextPage = true;
      let endCursor: string | null = null;
      const first = 50;
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
                    ... on ProjectV2TextField {
                      id
                      name
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
                    fieldValues(first: 30) {
                      nodes {
                        ... on ProjectV2ItemFieldSingleSelectValue {
                          field {
                            ... on ProjectV2SingleSelectField {
                              id
                              name
                            }
                          }
                          name
                          optionId
                        }
                        ... on ProjectV2ItemFieldTextValue {
                          field {
                            ... on ProjectV2TextField {
                              id
                              name
                            }
                          }
                          text
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
          // project empty!
          break;
        }

        // On first fetch, grab fields for later use
        if (typeof fetchAllItems.statusField === "undefined") {
          fetchAllItems.statusField = project.fields?.nodes?.find(
            (f: any) => f.name?.toLowerCase() === "status" ||
                        f.name?.toLowerCase() === "column"
          );
          fetchAllItems.openStatusOptions = fetchAllItems.statusField?.options?.find(
            (o: any) => o.name?.toLowerCase() === openColumnName.toLowerCase()
          )?.id;
          // Find custom "Bounty" field ID (can be a SingleSelect or Text field)
          const bountyField = project.fields?.nodes?.find(
            (f: any) => f.name?.toLowerCase() === "bounty"
          );
          bountyFieldId = bountyField?.id ?? null;
          fetchAllItems.bountyFieldId = bountyFieldId;
        }

        const pageItems = project.items?.nodes ?? [];
        items = items.concat(pageItems);

        hasNextPage = project.items?.pageInfo?.hasNextPage ?? false;
        endCursor = project.items?.pageInfo?.endCursor ?? null;
      }
      return items;
    };

    // Fetch all items in all pages
    const allItems = await fetchAllItems();

    // Get field info for status
    const fieldsRes = await fetch(
      apiUrl,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            query {
              node(id: "${projectId}") {
                ... on ProjectV2 {
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
                }
              }
            }
          `
        }),
      }
    );
    const fieldsData = await fieldsRes.json();
    const fieldsNode = fieldsData?.data?.node?.fields?.nodes;
    const statusField = fieldsNode?.find(
      (f: any) =>
        f.name?.toLowerCase() === "status" ||
        f.name?.toLowerCase() === "column"
    );
    const openStatusOptions =
      statusField?.options?.find(
        (o: any) => o.name?.toLowerCase() === openColumnName.toLowerCase()
      )?.id;

    // Filter "Open" status cards
    const openItems = allItems.filter((item: any) => {
      if (!item.fieldValues) return false;
      const fieldValue = item.fieldValues.nodes.find(
        (fv: any) => fv?.optionId === openStatusOptions
      );
      return !!fieldValue && item.content;
    });

    // Prepare upserts
    const inserts = openItems
      .map((item: any) => {
        const content = item.content;
        if (!content) return null;
        const labels =
          content.labels?.nodes
            ?.map((l: any) => l.name)
            ?.filter((n: string) => n !== "bounty" && !n.startsWith("$")) || [];
        // Find Bounty value in project card (single-select or text)
        let bountyFieldValue: string | null = null;

        if (item.fieldValues && Array.isArray(item.fieldValues.nodes)) {
          const bountyFieldId = fetchAllItems.bountyFieldId;
          // Look for Bounty as a text value
          const bountyTextValue = item.fieldValues.nodes.find(
            (fv: any) => fv?.field?.id === bountyFieldId && fv.text
          );
          if (bountyTextValue && bountyTextValue.text) {
            bountyFieldValue = bountyTextValue.text;
          }
          // If not found, look for Bounty as a single select value
          if (!bountyFieldValue) {
            const bountySelectValue = item.fieldValues.nodes.find(
              (fv: any) => fv?.field?.id === bountyFieldId && fv.name
            );
            if (bountySelectValue && bountySelectValue.name) {
              bountyFieldValue = bountySelectValue.name;
            }
          }
        }

        // If no bounty field, fallback to $label
        const reward =
          bountyFieldValue ||
          (
            content.labels?.nodes
              ?.find((l: any) => l.name.startsWith("$"))?.name || null
          );

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
