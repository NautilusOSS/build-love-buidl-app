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

      // These will be initialized with the field/option info we discover
      fetchAllItems.fieldsMap = undefined;

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
                    ... on ProjectV2NumberField {
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
                    fieldValues(first: 20) {
                      nodes {
                        ... on ProjectV2ItemFieldSingleSelectValue {
                          field {
                            ... on ProjectV2SingleSelectField { id name }
                            name
                          }
                          name
                          optionId
                        }
                        ... on ProjectV2ItemFieldTextValue {
                          field {
                            ... on ProjectV2TextField { id name }
                            name
                          }
                          text
                        }
                        ... on ProjectV2ItemFieldNumberValue {
                          field {
                            ... on ProjectV2NumberField { id name }
                            name
                          }
                          number
                        }
                        ... on ProjectV2ItemFieldGenericValue {
                          field {
                            id
                            name
                          }
                          value
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
        // On first fetch, grab fields for lookup
        if (typeof fetchAllItems.fieldsMap === "undefined") {
          // Map field names to IDs for quick lookup
          fetchAllItems.fieldsMap = {};
          (project.fields?.nodes ?? []).forEach((f: any) => {
            if (f && f.name) {
              fetchAllItems.fieldsMap[f.name] = f.id;
            }
          });
          fetchAllItems.statusField = project.fields?.nodes?.find(
            (f: any) =>
              f.name?.toLowerCase() === "status" ||
              f.name?.toLowerCase() === "column"
          );
          fetchAllItems.openStatusOptions = fetchAllItems.statusField?.options?.find(
            (o: any) => o.name?.toLowerCase() === openColumnName.toLowerCase()
          )?.id;
          fetchAllItems.bountyFieldId =
            (project.fields?.nodes ?? []).find((f: any) => f.name && f.name.toLowerCase() === "bounty")?.id;
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
    const bountyFieldId = fetchAllItems.bountyFieldId;

    // Fetch status field info, fallback if necessary
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
                      ... on ProjectV2NumberField {
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
      // DEBUG: Log item fieldValues for investigation if empty
      if (!item.fieldValues || !item.fieldValues.nodes) {
        console.log("Item missing fieldValues or fieldValues.nodes", { item });
        return false;
      }
      const fieldValue = item.fieldValues.nodes.find(
        (fv: any) => fv?.optionId === openStatusOptions
      );
      return !!fieldValue && item.content;
    });

    // DEBUG: Log the Open items right before processing
    console.log(
      `Fetched ${allItems.length} items from GitHub, filtered Open items: ${openItems.length}`
    );
    if (openItems.length === 0 && allItems.length > 0) {
      // If no items are detected as Open, dump some diagnostic info for debugging
      for (let i = 0; i < Math.min(3, allItems.length); i++) {
        const item = allItems[i];
        console.log(
          `Item #${i + 1} fieldValues:`,
          JSON.stringify(item.fieldValues, null, 2)
        );
      }
      console.warn(
        "No items found in Open status! This will cause ALL bounties to be removed. Check fieldValues/optionId matching."
      );
    } else {
      openItems.forEach((item: any, idx: number) => {
        if (item.content) {
          console.log(
            `[Open #${idx + 1}] title: "${item.content.title}", github_id: ${item.content.id}`
          );
        }
      });
    }

    // Prepare upserts using "Bounty" field as reward if available
    const inserts = openItems
      .map((item: any) => {
        const content = item.content;
        if (!content) return null;
        // --- Get reward from "Bounty" field if present ---
        let bountyReward: string | null = null;
        if (bountyFieldId && Array.isArray(item.fieldValues?.nodes)) {
          const bountyFieldValue = item.fieldValues.nodes.find(
            (fv: any) =>
              fv?.field?.id === bountyFieldId &&
              (
                typeof fv.text === "string" ||
                typeof fv.number === "string" ||
                typeof fv.value === "string"
              )
          );
          if (bountyFieldValue) {
            // Prefer .text, then .number, then .value
            bountyReward =
              bountyFieldValue.text ??
              bountyFieldValue.number?.toString() ??
              bountyFieldValue.value ??
              null;
            if (
              typeof bountyReward === "string" &&
              bountyReward.trim() === ""
            ) {
              bountyReward = null;
            }
          }
        }
        // fallback: parse from label if Bounty field not present
        let reward = bountyReward;
        if (!reward) {
          reward =
            content.labels?.nodes?.find((l: any) =>
              l.name.startsWith("$")
            )?.name || null;
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

    // Collect all open github_ids to keep
    const openGithubIds = inserts.map((b: any) => b.github_id);

    // ---- Upsert via Supabase ----
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL/Service Role Key missing");
    }

    const upRes = await fetch(
      `${supabaseUrl}/rest/v1/bounties?on_conflict=github_id`,
      {
        method: "POST",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify(inserts),
      }
    );

    if (!upRes.ok) {
      const text = await upRes.text();
      console.error("Supabase upsert failed:", text);
      return new Response(JSON.stringify({ error: text }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    // ---- Remove bounties not in Open ----
    let deleteUrl;
    // DEFENSIVE: If we have any items from GitHub, but found "0 Open," do NOT bulk delete (unless there are truly no items at all).
    if (allItems.length > 0 && openItems.length === 0) {
      console.warn(
        "Refusing to delete all bounties: GitHub returned items, but none detected as Open. Possible parsing/filter bug! No delete will be issued this sync."
      );
      // Optionally return early
      return new Response(
        JSON.stringify({
          error:
            "No Open items detected in board, so no bounties were deleted this sync (possible field mapping issue).",
          diagnostic: { openGithubIds, allItems: allItems.length },
        }),
        { status: 200, headers: corsHeaders }
      );
    }
    if (openGithubIds.length > 0) {
      const notInIds = openGithubIds.join(",");
      deleteUrl = `${supabaseUrl}/rest/v1/bounties?github_id=not.in.(${notInIds})`;
    } else {
      deleteUrl = `${supabaseUrl}/rest/v1/bounties?github_id=not.is.null`;
    }
    // Add diagnostic logging for debugging!
    console.log("Open Github IDs for retention:", openGithubIds);
    console.log(
      "Supabase DELETE bounties api URL (will remove all not Open):",
      deleteUrl
    );

    const deleteRes = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    if (!deleteRes.ok) {
      const text = await deleteRes.text();
      console.error("Supabase cleanup (delete) failed:", text);
      // Don't fail all, just log
    } else {
      console.log("Supabase cleanup (delete) success!");
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
