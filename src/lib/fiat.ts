import axios from "axios";
import { type Satoshi } from "./types/units";
import { satsToBtc } from "./units";

interface CurrencyCache {
	rate: number;
	timestamp: number;
}


const CACHE_DURATION = 5 * 60 * 1000;
const cache = new Map<string, CurrencyCache>();
const pendingPromises = new Map<string, Promise<number | null>>(); // promise per currency to control concurrency

async function getExchangeRate(currency: string, url: string): Promise<number | null> {
	const now = Date.now();
	const cached = cache.get(currency);

	if (cached && (now - cached.timestamp) < CACHE_DURATION) {
		return cached.rate;
	}

	if (pendingPromises.has(currency)) {
		return pendingPromises.get(currency)!;
	}

	const fetchPromise = (async () => {
		try {
			const rate = await fetchExchangeRates(url);
			cache.set(currency, { rate, timestamp: Date.now() });
			return rate;
		} catch (err) {
			console.error('Error fetching exchange rate:', err);
			return null;
		} finally {
			pendingPromises.delete(currency); // Always clean up
		}
	})();

	pendingPromises.set(currency, fetchPromise);
	return fetchPromise;
}

async function fetchExchangeRates(url: string): Promise<number> {
	const response = await axios.get(url);
	const { amount } = response.data.data;
	return parseFloat(amount);

}


export async function convertSatsToFiat(
	sats: Satoshi,
	currency: string,
	url: string
): Promise<number | null> {
	if (typeof sats !== 'number' || sats < 0) {
		return null;
	}

	const rate = await getExchangeRate(currency, url);
	if (!rate) return null;

	return satsToBtc(sats) * rate


}



