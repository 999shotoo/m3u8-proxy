import cacheControl from "express-cache-controller";

export function cacheRoutes() {
  return cacheControl({
    maxAge: 3600,      // Cache for 1 hour
    public: true,      // Cache can be stored by public caches (e.g., CDNs, browsers)
    mustRevalidate: true // Must revalidate with the server when expired
  })
};