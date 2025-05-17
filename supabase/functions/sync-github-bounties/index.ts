
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const projectId = "PVT_kwDOCbEr484A0yNe";
    const openColumnName = "Open";
    const apiUrl = "https://api.github.com/graphql";

    let statusFieldId: string | null = null;
    let openStatusOptionId: string | null = null;
    let bountyFieldId: string | null = null;

    // Fetch all fields to get the relevant IDs
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
                      ... on ProjectV2TextField {
                        id
                        name
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

    // Identify Status and Bounty fields
    const statusField = fieldsNode?.find(
      (f: any) =>
        f.name?.toLowerCase() === "status" ||
        f.name?.toLowerCase() === "column"
    );
    statusFieldId = statusField?.id ?? null;
    openStatusOptionId =
      (statusField?.options ?? []).find(
        (o: any) => o.name?.toLowerCase() === openColumnName.toLowerCase()
      )?.id ?? null;
    const bountyField =
      fieldsNode?.find((f: any) => f.name?.toLowerCase() === "bounty");
    bountyFieldId = bountyField?.id ?? null;
    console.log("Detected statusFieldId:", statusFieldId);
    console.log("Detected openStatusOptionId:", openStatusOptionId);
    console.log("Detected bountyFieldId:", bountyFieldId);

    // Fetch all items from the project with fieldValues
    let items: any[] = [];
    let hasNextPage = true;
    let endCursor: string | null = null;
    const first = 50;

    while (hasNextPage) {
      const query = `
        query {
          node(id: "${projectId}") {
            ... on ProjectV2 {
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
      const pageItems = ghData?.data?.node?.items?.nodes ?? [];
      items = items.concat(pageItems);
      hasNextPage = ghData?.data?.node?.items?.pageInfo?.hasNextPage ?? false;
      endCursor = ghData?.data?.node?.items?.pageInfo?.endCursor ?? null;
    }

    console.log(`Fetched ${items.length} project items.`);

    // Filter items for status "Open"
    const openItems = items.filter((item: any) => {
      if (!statusFieldId || !openStatusOptionId) return false;
      const fv = item.fieldValues.nodes.find(
        (fv: any) =>
          fv?.field?.id === statusFieldId &&
          fv?.optionId === openStatusOptionId
      );
      return !!fv && item.content;
    });
    console.log(`Filtered ${openItems.length} open items.`);

    // Prepare upserts
    const inserts = openItems
      .map((item: any) => {
        const content = item.content;
        if (!content) return null;
        const labels =
          content.labels?.nodes?.map((l: any) => l.name)?.filter((n: string) => n !== "bounty" && !n.startsWith("$")) || [];

        // Find the bounty field value from fieldValues
        let bountyFieldValue: string | null = null;
        if (bountyFieldId && item.fieldValues && Array.isArray(item.fieldValues.nodes)) {
          // Check for ProjectV2ItemFieldTextValue (text)
          const bountyText = item.fieldValues.nodes.find(
            (fv: any) => fv?.field?.id === bountyFieldId && typeof fv.text === "string" && fv.text.length > 0
          )?.text;
          // Check for ProjectV2ItemFieldSingleSelectValue (option)
          const bountyOption = item.fieldValues.nodes.find(
            (fv: any) => fv?.field?.id === bountyFieldId && typeof fv.name === "string" && fv.name.length > 0
          )?.name;
          bountyFieldValue = bountyText || bountyOption || null;
        }
        console.log(`[${content.title}] Bounty field extracted:`, bountyFieldValue);

        // Fallback: First $ label
        let reward = bountyFieldValue;
        if (!reward) {
          reward = (
            content.labels?.nodes?.find((l: any) => l.name.startsWith("$"))?.name || null
          );
        }
        console.log(`[${content.title}] Final reward value:`, reward);

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

    console.log(`Inserts prepared: ${JSON.stringify(inserts, null, 2)}`);

    // Delete all rows in bounties first
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL/Service Role Key missing");
    }

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

    // Upsert into Supabase
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
