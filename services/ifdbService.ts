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
      const description = getTag("headline"); 
      
      // Try to find cover art
      let coverUrl = node.getElementsByTagName("coverart")[0]?.getElementsByTagName("url")[0]?.textContent || "";
      if (!coverUrl) {
          coverUrl = "https://ifdb.org/IMG/20/0x/200x53gb5k48p7.jpg"; // Default placeholder
      } else if (coverUrl.startsWith("http:")) {
          // Upgrade HTTP images to HTTPS to prevent mixed content warnings
          coverUrl = coverUrl.replace("http:", "https:");
      }

      const ratingStr = getTag("averageRating");
      const rating = ratingStr ? parseFloat(ratingStr) : 0;
      const publishDate = getTag("published");

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
        // Force HTTPS for the game file to avoid mixed content blocks in the interpreter
        if (fileUrl.startsWith("http:")) {
            fileUrl = fileUrl.replace("http:", "https:");
        }
      }

      return {
        id: `ifdb-${index}-${Date.now()}`,
        title,
        author,
        description,
        coverUrl,
        fileUrl,
        dateInstalled: "",
        lastPlayed: "",
        playtime: "0m",
        genre: "Interactive Fiction",
        rating,
        publishDate
      };
    });
};

export const searchGamesOnWeb = async (query: string): Promise<Game[]> => {
  if (!query.trim()) return [];

  const targetUrl = `${IFDB_SEARCH_URL}${encodeURIComponent(query)}`;
  let xmlText = "";
  let errorLog: string[] = [];

  // Strategy 1: Direct Fetch (Best for Native/Server)
  try {
      const response = await fetch(targetUrl);
      if (response.ok) {
          xmlText = await response.text();
      } else {
          errorLog.push("Direct fetch status: " + response.status);
          throw new Error("Direct fetch status: " + response.status);
      }
  } catch (directError) {
      errorLog.push("Direct fetch failed");
      console.warn("Direct fetch failed, attempting Proxy 1 (CorsProxy.io)...");

      // Strategy 2: CorsProxy.io
      try {
        const proxyUrl = `${PROXY_CORSPROXY}${encodeURIComponent(targetUrl)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("CorsProxy status: " + response.status);
        
        xmlText = await response.text();
      } catch (proxy1Error) {
          errorLog.push("CorsProxy failed");
          console.warn("CorsProxy failed, attempting Proxy 2 (AllOrigins)...");

          // Strategy 3: AllOrigins Proxy
          try {
              // Encode target URL for the proxy query param
              const proxyUrl = `${PROXY_ALLORIGINS}${encodeURIComponent(targetUrl)}`;
              const response = await fetch(proxyUrl);
              if (!response.ok) throw new Error("AllOrigins status: " + response.status);
              
              const data = await response.json();
              if (data && data.contents) {
                  xmlText = data.contents;
              } else {
                  throw new Error("AllOrigins no content");
              }
          } catch (proxy2Error) {
             errorLog.push("AllOrigins failed");
             console.error("All online search strategies failed.", errorLog);
             // Fall through to offline DB
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