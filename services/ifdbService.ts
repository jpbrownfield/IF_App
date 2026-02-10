import { Game } from "../types";
import { OFFLINE_GAMES_DB } from "./offlineGames";

const IFDB_SEARCH_URL = "https://ifdb.org/search?xml&searchfor=";

// Proxy 1: CorsProxy.io (Returns raw response)
// Often faster and handles XML content types transparently.
const PROXY_CORSPROXY = "https://corsproxy.io/?";

// Proxy 2: AllOrigins (Returns JSON object with 'contents' string)
// Good backup, wraps response in JSON.
const PROXY_ALLORIGINS = "https://api.allorigins.win/get?url=";

// Helper to parse the XML string from IFDB into Game objects
const parseIfdbXml = (xmlText: string): Game[] => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Check for parsing errors
    const parserError = xmlDoc.getElementsByTagName("parsererror");
    if (parserError.length > 0) {
        console.warn("IFDB XML Parsing Error");
        return [];
    }

    const games = Array.from(xmlDoc.getElementsByTagName("game"));

    return games.map((node, index) => {
      // Helper to safely extract text content from XML tags
      const getTag = (tag: string) => node.getElementsByTagName(tag)[0]?.textContent || "";
      
      const title = getTag("title") || "Unknown Title";
      const author = getTag("author") || "Unknown Author";
      // IFDB returns 'headline' for short description, 'description' for long
      let description = getTag("headline");
      if (!description || description.length < 10) {
          description = getTag("description");
      }
      if (!description) description = "No description available.";
      
      // Try to find cover art
      let coverUrl = node.getElementsByTagName("coverart")[0]?.getElementsByTagName("url")[0]?.textContent || "";
      if (!coverUrl) {
          coverUrl = "https://ifdb.org/IMG/20/0x/200x53gb5k48p7.jpg"; // Default placeholder
      }

      const ratingStr = getTag("averageRating");
      const rating = ratingStr ? parseFloat(ratingStr) : 0;
      // Handle NaN if parseFloat fails
      const safeRating = isNaN(rating) ? 0 : rating;

      const publishDate = getTag("published") || getTag("firstpublished");

      // Logic to find a playable file URL
      let fileUrl = "";
      const links = Array.from(node.getElementsByTagName("link"));
      const extensions = [".z5", ".z8", ".zblorb", ".gblorb", ".ulx", ".gam"];
      
      const playLink = links.find(link => {
        const url = link.getElementsByTagName("url")[0]?.textContent || "";
        return extensions.some(ext => url.toLowerCase().endsWith(ext));
      });

      if (playLink) {
        fileUrl = playLink.getElementsByTagName("url")[0]?.textContent || "";
        // Note: We rely on the CORS proxy in the interpreter to handle HTTP->HTTPS bridging
        // forcing HTTPS here can break links to legacy archives.
      } else {
        // If no playable link found, try to find a direct download link that matches extensions
        // Sometimes IFDB doesn't wrap them in specific link tags but they might be in other structures, 
        // but for now, if no playable link, we skip this game or mark it.
        // For the store, we only want playable games.
        return null;
      }

      return {
        id: `ifdb-${index}-${Date.now()}`,
        title,
        author,
        description: description.substring(0, 300) + (description.length > 300 ? "..." : ""),
        coverUrl,
        fileUrl,
        dateInstalled: "",
        lastPlayed: "",
        playtime: "0m",
        genre: "Interactive Fiction",
        rating: safeRating,
        publishDate
      };
    }).filter(g => g !== null) as Game[];
};

export const searchGamesOnWeb = async (query: string): Promise<Game[]> => {
  if (!query.trim()) return [];

  const targetUrl = `${IFDB_SEARCH_URL}${encodeURIComponent(query)}`;
  let xmlText = "";
  let errorLog: string[] = [];

  // Helper for racing fetches
  const fetchWithTimeout = async (url: string, timeout = 5000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(id);
          if (!response.ok) throw new Error(`Status ${response.status}`);
          return response;
      } catch (e) {
          clearTimeout(id);
          throw e;
      }
  };

  // Strategy: Try AllOrigins (reliable JSON) first, then CorsProxy (sometimes faster but flaky), then Direct (fail fast)
  try {
      // 1. AllOrigins (JSONP style - reliable)
      const allOriginsUrl = `${PROXY_ALLORIGINS}${encodeURIComponent(targetUrl)}`;
      console.log("Attempting Search via AllOrigins...");
      const response = await fetchWithTimeout(allOriginsUrl, 8000);
      const data = await response.json();
      if (data && data.contents) {
          xmlText = data.contents;
      } else {
          throw new Error("AllOrigins no content");
      }
  } catch (aoError) {
      console.warn("AllOrigins failed:", aoError);
      errorLog.push("AllOrigins failed");

      try {
          // 2. CorsProxy.io (Backup)
          const corsProxyUrl = `${PROXY_CORSPROXY}${encodeURIComponent(targetUrl)}`;
          console.log("Attempting Search via CorsProxy...");
          const response = await fetchWithTimeout(corsProxyUrl, 8000);
          xmlText = await response.text();
      } catch (cpError) {
          console.warn("CorsProxy failed:", cpError);
          errorLog.push("CorsProxy failed");

          try {
             // 3. Direct (Last resort)
             console.log("Attempting Search Direct...");
             const response = await fetchWithTimeout(targetUrl, 3000);
             xmlText = await response.text();
          } catch (dError) {
             errorLog.push("Direct failed");
          }
      }
  }

  // Parse online results if available
  let results: Game[] = [];
  if (xmlText) {
      try {
          results = parseIfdbXml(xmlText);
      } catch (parseError) {
          console.error("XML Parse Error:", parseError);
      }
  }

  // Fallback / Augment: Search Offline DB
  // If we have no results (or failed to fetch), check the local curated database.
  // This simulates the "SQL Database" fallback requested by the user.
  if (results.length === 0) {
      console.log("Using Offline Database Fallback");
      const lowerQuery = query.toLowerCase();
      
      // Special keyword 'top' or 'best' returns the top 10 from offline db
      if (lowerQuery === 'top' || lowerQuery === 'best') {
          const offlineResults = OFFLINE_GAMES_DB.slice(0, 20);
          results = offlineResults.map(g => ({...g, id: `offline-fallback-${g.id}-${Date.now()}`}));
      } else {
          const offlineResults = OFFLINE_GAMES_DB.filter(game => 
              game.title.toLowerCase().includes(lowerQuery) || 
              game.author.toLowerCase().includes(lowerQuery) ||
              game.description.toLowerCase().includes(lowerQuery)
          );
          // Generate unique IDs to avoid conflicts if mixed later
          results = offlineResults.map(g => ({...g, id: `offline-fallback-${g.id}-${Date.now()}`}));
      }
  }

  return results;
};