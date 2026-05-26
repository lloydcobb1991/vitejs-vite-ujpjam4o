// Vercel Serverless Function - /api/analyze.js
// This proxies requests to Claude API with your API key

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileData } = req.body;

    if (!fileData || !fileData.name || !fileData.base64) {
      return res.status(400).json({ error: 'Missing file data' });
    }

    // APL brands list (same as frontend)
    const APL_BRANDS = [
      { name: "Absolut", supplier: "PERNOD RICARD" },
      { name: "Absolut Citron", supplier: "PERNOD RICARD" },
      { name: "Jim Beam Bourbon", supplier: "BEAM SUNTORY" },
      { name: "Jack Daniel's Tennessee Whiskey", supplier: "BROWN FORMAN" },
      { name: "Ketel One", supplier: "DIAGEO" },
      { name: "Espolón Reposado Tequila", supplier: "CAMPARI" },
      { name: "Hennessy V.S Cognac", supplier: "MOET HENNESSY" },
      { name: "Grand Marnier Liqueur", supplier: "CAMPARI" },
      { name: "Aperol Aperitivo Liqueur", supplier: "CAMPARI" },
      { name: "New Amsterdam", supplier: "GALLO" },
      { name: "Tito's Handmade", supplier: "FIFTH GENERATION" },
      // Add all your other brands here...
    ];

    const brandList = APL_BRANDS
      .map(b => `- ${b.name} (${b.supplier})`)
      .join('\n');

    // Call Claude API with your API key (stored in environment variable)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY, // Your secret API key
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: fileData.base64
                }
              },
              {
                type: "text",
                text: `Analyze this cocktail menu for APL brand impressions.

**APL BRANDS:**
${brandList}

**TASK:**
1. Find every cocktail
2. Identify APL brands in each recipe
3. Count impressions (each mention = 1)
4. Flag compliance issues (incomplete names like "Jack" instead of "Jack Daniel's Tennessee Whiskey")

**RETURN JSON:**
\`\`\`json
{
  "cocktails": [
    {
      "name": "Cocktail Name",
      "brands_used": ["Full Brand Name"],
      "recipe_text": "ingredients"
    }
  ],
  "brand_impressions": {
    "Brand Name": {
      "count": 3,
      "supplier": "SUPPLIER",
      "cocktails": ["Cocktail 1", "Cocktail 2"]
    }
  },
  "compliance_issues": [
    {
      "type": "incomplete_name",
      "found_text": "Jack",
      "correct_name": "Jack Daniel's Tennessee Whiskey",
      "cocktail": "Name"
    }
  ]
}
\`\`\`

ONLY respond with JSON.`
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      return res.status(response.status).json({ 
        error: `API error: ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json();
    
    // Extract JSON from Claude's response
    const textContent = data.content
      .filter(item => item.type === "text")
      .map(item => item.text)
      .join("\n");
    
    const jsonText = textContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    
    const analysis = JSON.parse(jsonText);
    
    // Return the analysis results
    return res.status(200).json({
      success: true,
      filename: fileData.name,
      analysis
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
