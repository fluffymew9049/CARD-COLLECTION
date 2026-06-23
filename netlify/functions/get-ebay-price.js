// netlify/functions/get-ebay-price.js

exports.handler = async (event, context) => {
  const searchQuery = event.queryStringParameters && event.queryStringParameters.q;
  
  if (!searchQuery) {
    return { 
      statusCode: 400, 
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: 'Missing query parameter q' }) 
    };
  }

  try {
    const authHeader = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope'
    });

    if (!tokenResponse.ok) {
      const txt = await tokenResponse.text();
      throw new Error(`eBay token request failed: ${tokenResponse.status} ${txt}`);
    }
    
    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error("Failed to retrieve access token from eBay.");
    }

    const ebayResponse = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(searchQuery)}&limit=5`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    });

    if (!ebayResponse.ok) {
      const txt = await ebayResponse.text();
      throw new Error(`eBay search request failed: ${ebayResponse.status} ${txt}`);
    }

    const ebayData = await ebayResponse.json();

    return {
      statusCode: 200,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify(ebayData.itemSummaries || [])
    };

  } catch (error) {
    // Ensure CORS header is always included so client-side fetch errors aren't blocked by CORS
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: error.message })
    };
  }
};
