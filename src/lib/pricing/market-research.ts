export interface CompetitorListing {
  source: string;
  domain: string;
  title: string;
  price: number;
  currency: string;
  link: string;
  snippet?: string;
}

export interface MarketPriceResearchResult {
  productName: string;
  recommendedPrice: number;
  recommendedCompareAtPrice?: number;
  lowestPrice: number;
  averagePrice: number;
  highestPrice: number;
  currency: string;
  sampleCount: number;
  costFloorApplied: boolean;
  costFloorWarning?: string;
  estimatedMarginPercent?: number;
  competitors: CompetitorListing[];
}

export async function researchKenyanMarketPrice(
  productName: string,
  brand?: string,
  costPrice?: number
): Promise<MarketPriceResearchResult> {
  const cleanName = (productName || '').trim();
  if (!cleanName) {
    throw new Error('Product name is required for market price research.');
  }

  const serperApiKey = process.env.SERPER_API_KEY;
  if (!serperApiKey) {
    throw new Error('SERPER_API_KEY is not configured in environment variables.');
  }

  const queryTerms = [
    brand && brand !== 'Generic' ? brand : '',
    cleanName,
    'price KSh'
  ].filter(Boolean).join(' ');

  const searchPayload = {
    q: `site:jumia.co.ke OR site:kilimall.co.ke OR site:jiji.co.ke OR site:copia.co.ke ${queryTerms}`,
    gl: 'ke',
    hl: 'en',
    num: 10
  };

  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': serperApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(searchPayload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Serper search failed (${response.status}): ${errText}`);
  }

  const data: any = await response.json();
  const organicResults: any[] = data.organic || [];

  const competitors: CompetitorListing[] = [];
  const prices: number[] = [];

  // Regex to extract Kenyan Shilling prices like KSh 1,499, KSh. 2500, KES 3000, 2,500 KSh, ksh.2200*
  const priceRegex = /(?:KSh[\s.:*]*|KES[\s.:*]*|Bei:?[\s.:*]*|Price:?[\s.:*]*ksh[\s.:*]*)([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{2})?|[0-9]{3,7}(?:\.[0-9]{2})?)/gi;

  for (const item of organicResults) {
    const textToScan = `${item.title || ''} ${item.snippet || ''}`;
    const domain = (item.link ? new URL(item.link).hostname : '').replace(/^www\./, '');
    let sourceName = 'Kenyan Market';
    if (domain.includes('jumia')) sourceName = 'Jumia Kenya';
    else if (domain.includes('kilimall')) sourceName = 'Kilimall';
    else if (domain.includes('jiji')) sourceName = 'Jiji Kenya';
    else if (domain.includes('copia')) sourceName = 'Copia Kenya';

    let match;
    const itemPrices: number[] = [];
    while ((match = priceRegex.exec(textToScan)) !== null) {
      const rawPrice = match[1].replace(/,/g, '');
      const numPrice = parseFloat(rawPrice);
      // Filter realistic product prices (e.g., between KSh 100 and KSh 500,000)
      if (!isNaN(numPrice) && numPrice >= 100 && numPrice <= 500000) {
        itemPrices.push(numPrice);
      }
    }

    if (itemPrices.length > 0) {
      // Pick the most plausible price for this listing (usually the minimum active offer)
      const validPrice = Math.min(...itemPrices);
      prices.push(validPrice);
      competitors.push({
        source: sourceName,
        domain,
        title: item.title || cleanName,
        price: validPrice,
        currency: 'KES',
        link: item.link || '',
        snippet: item.snippet || '',
      });
    }
  }

  // Deduplicate competitor listings by link or price+source
  const uniqueCompetitors = competitors.filter(
    (c, idx, arr) => arr.findIndex((other) => other.link === c.link || (other.source === c.source && other.price === c.price)) === idx
  );

  const validPrices = uniqueCompetitors.map((c) => c.price);

  let lowestPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
  let highestPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
  let averagePrice = validPrices.length > 0 ? Math.round(validPrices.reduce((a, b) => a + b, 0) / validPrices.length) : 0;

  // Fallback if no specific price extracted: estimate based on costPrice if available
  if (validPrices.length === 0 && costPrice && costPrice > 0) {
    lowestPrice = Math.round(costPrice * 1.3);
    averagePrice = Math.round(costPrice * 1.5);
    highestPrice = Math.round(costPrice * 1.8);
  }

  // Pricing Strategy: Lowest Price Match
  let recommendedPrice = lowestPrice > 0 ? lowestPrice : (costPrice ? Math.round(costPrice * 1.3) : 0);
  let recommendedCompareAtPrice = averagePrice > recommendedPrice ? averagePrice : (highestPrice > recommendedPrice ? highestPrice : Math.round(recommendedPrice * 1.25));

  let costFloorApplied = false;
  let costFloorWarning: string | undefined = undefined;

  // Cost Floor Guardrail (Protect minimum 15% margin above supplier buying price)
  if (costPrice && costPrice > 0) {
    const minProfitableFloor = Math.ceil((costPrice * 1.15) / 10) * 10;
    if (recommendedPrice < minProfitableFloor) {
      costFloorApplied = true;
      costFloorWarning = `The lowest competitor market price (KSh ${recommendedPrice.toLocaleString()}) is below your minimum profitable margin (KSh ${minProfitableFloor.toLocaleString()} for cost KSh ${costPrice.toLocaleString()}). The recommended price has been protected at the cost floor.`;
      recommendedPrice = minProfitableFloor;
    }
  }

  const estimatedMarginPercent = (costPrice && costPrice > 0 && recommendedPrice > costPrice)
    ? Number((((recommendedPrice - costPrice) / recommendedPrice) * 100).toFixed(1))
    : undefined;

  return {
    productName: cleanName,
    recommendedPrice,
    recommendedCompareAtPrice,
    lowestPrice,
    averagePrice,
    highestPrice,
    currency: 'KES',
    sampleCount: uniqueCompetitors.length,
    costFloorApplied,
    costFloorWarning,
    estimatedMarginPercent,
    competitors: uniqueCompetitors,
  };
}
