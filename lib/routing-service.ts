import { LatLng, getHaversineDistance } from './geo-utils';
import { Waypoint } from './constants';

export interface RouteGeometryResult {
  fullPolyline: LatLng[];
  isRoadNetwork: boolean;
  totalDistanceMeters: number;
}

/**
 * Fetches actual walking road geometry connecting waypoints via OSRM (Open Source Routing Machine)
 */
export async function fetchWalkingRoute(waypoints: Waypoint[]): Promise<RouteGeometryResult> {
  // Construct straight fallback polyline
  const fallbackPolyline: LatLng[] = waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng }));

  let fallbackTotalDistance = 0;
  for (let i = 0; i < fallbackPolyline.length - 1; i++) {
    fallbackTotalDistance += getHaversineDistance(
      fallbackPolyline[i].lat,
      fallbackPolyline[i].lng,
      fallbackPolyline[i + 1].lat,
      fallbackPolyline[i + 1].lng
    );
  }

  try {
    // OSRM format: lng,lat;lng,lat;lng,lat
    const coordinatesString = waypoints
      .map((wp) => `${wp.lng},${wp.lat}`)
      .join(';');

    const url = `https://router.project-osrm.org/route/v1/foot/${coordinatesString}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OSRM HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (
      data &&
      data.code === 'Ok' &&
      data.routes &&
      data.routes.length > 0 &&
      data.routes[0].geometry &&
      data.routes[0].geometry.coordinates
    ) {
      const osrmCoords: [number, number][] = data.routes[0].geometry.coordinates;
      const roadPolyline: LatLng[] = osrmCoords.map(([lng, lat]) => ({ lat, lng }));
      const totalDistanceMeters = data.routes[0].distance || fallbackTotalDistance;

      return {
        fullPolyline: roadPolyline,
        isRoadNetwork: true,
        totalDistanceMeters,
      };
    }
  } catch (error) {
    console.warn('OSRM route fetch failed or timed out. Falling back to direct waypoint polyline.', error);
  }

  return {
    fullPolyline: fallbackPolyline,
    isRoadNetwork: false,
    totalDistanceMeters: fallbackTotalDistance,
  };
}
