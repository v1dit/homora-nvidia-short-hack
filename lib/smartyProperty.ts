// lib/smartyProperty.ts - Direct Smarty property fetching for address queries

export async function fetchSmartyProperty(address?: string, mock = false) {
  if (mock) {
    // Return mock data when mock=true
    return {
      success: true,
      smarty: true,
      data: {
        address: "1600 Amphitheatre Parkway, Mountain View, CA",
        price: 999999,
        sqft: 1450,
        beds: 3,
        baths: 2,
        hoa: 0,
        tax_rate: 1.2,
        est_rent: 4500,
        year_built: 1999
      },
      mode: "mock"
    };
  }

  if (!address) {
    throw new Error('Address is required for live Smarty API calls');
  }

  try {
    // Try Property API first, then fallback to US Street API
    let baseUrl = 'https://us-property.api.smarty.com/api/v1/properties';
    let params = new URLSearchParams({
      'auth-id': process.env.SMARTY_AUTH_ID || '',
      'auth-token': process.env.SMARTY_AUTH_TOKEN || '',
      'license': process.env.SMARTY_LICENSE || 'us-property-data-principal-cloud',
      'street': address
    });
    
    // If Property API fails, try US Street API
    try {
      const fullUrl = `${baseUrl}?${params}`;
      console.log('🔍 Trying Property API:', fullUrl.replace(/auth-token=[^&]+/, 'auth-token=***'));
      
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`Property API failed: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data.length > 0) {
        // Process Property API response
        const record = data[0];
        const property = record?.property || {};
        const address_info = record?.address || {};
        const valuation = record?.valuation || {};
        
        const propertyData = {
          address: address_info?.formatted || address,
          price: valuation?.market_value || valuation?.tax_assessed_value || 500000,
          sqft: property?.sq_ft || null,
          beds: property?.bedrooms || null,
          baths: property?.bathrooms || null,
          hoa: 0,
          tax_rate: 1.2,
          est_rent: Math.round((valuation?.market_value || 500000) * 0.0045),
          year_built: property?.year_built || null
        };

        return {
          success: true,
          smarty: true,
          data: propertyData,
          mode: "live"
        };
      }
    } catch (propertyApiError) {
      console.log('⚠️ Property API failed, trying US Street API:', propertyApiError);
    }
    
    // Fallback to US Street API
    baseUrl = 'https://us-street.api.smarty.com/street-address';
    params = new URLSearchParams({
      'auth-id': process.env.SMARTY_AUTH_ID || '',
      'auth-token': process.env.SMARTY_AUTH_TOKEN || '',
      'license': process.env.SMARTY_LICENSE || 'us-property-data-principal-cloud',
      'street': address,
      'candidates': '1',
      'match': 'invalid'
    });

    const fullUrl = `${baseUrl}?${params}`;
    console.log('🔍 Trying US Street API:', fullUrl.replace(/auth-token=[^&]+/, 'auth-token=***'));
    
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Smarty API Error Response:', errorText);
      throw new Error(`Smarty API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('No property data found for the given address');
    }

    const record = data[0];
    const components = record?.components || {};
    const metadata = record?.metadata || {};
    
    // Extract property information from US Street API response
    const propertyData = {
      address: record?.delivery_line_1 
        ? `${record.delivery_line_1}, ${components.city_name || ''}, ${components.state_abbreviation || ''} ${components.zipcode || ''}`.trim()
        : address,
      price: metadata.market_value_estimate || 500000,
      sqft: metadata.square_footage || null,
      beds: metadata.beds || null,
      baths: metadata.baths || null,
      hoa: 0, // Not available from US Street API
      tax_rate: 1.2, // Default fallback
      est_rent: metadata.estimated_rent || Math.round((metadata.market_value_estimate || 500000) * 0.0045), // ~0.45% rule
      year_built: metadata.year_built || null
    };

    return {
      success: true,
      smarty: true,
      data: propertyData,
      mode: "live"
    };

  } catch (error) {
    console.error('❌ Smarty Property API Error:', error);
    
    // Return fallback data if Smarty fails
    return {
      success: true,
      smarty: false,
      data: {
        address: address,
        price: 500000,
        sqft: null,
        beds: null,
        baths: null,
        hoa: 0,
        tax_rate: 1.2,
        est_rent: 2500,
        year_built: null
      },
      mode: "fallback",
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
