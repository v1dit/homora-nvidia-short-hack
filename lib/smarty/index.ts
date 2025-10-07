import { createSmartyClient } from './client';
import { transformSmartyResponse } from './transformer';
import { Property } from '../types/property';

/**
 * High-level helper to fetch and normalize Smarty property data.
 */
export async function fetchSmartyProperties(address: string): Promise<Property | null> {
	const client = createSmartyClient();

	try {
		const { data } = await client.get('/properties', { params: { street: address } });
		return transformSmartyResponse(data);
	} catch (err) {
		console.error('⚠️ Smarty API call failed:', err);
		return null;
	}
}
