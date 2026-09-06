/**
 * Haversine formula utility for calculating great-circle distance between two points on Earth.
 * Used to enforce the 100m geo-fencing requirement for Legal Metrology Officers during field inspections.
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface GeoCheckResult {
  distanceMeters: number;
  withinFence: boolean;
  thresholdMeters: number;
  shopLocation: GeoPoint;
  inspectorLocation: GeoPoint;
  timestamp: string;
}

const EARTH_RADIUS_METERS = 6371000; // Earth mean radius in meters

/**
 * Calculates the Haversine distance in meters between two lat/lon coordinates.
 */
export function calculateHaversineDistance(point1: GeoPoint, point2: GeoPoint): number {
  const lat1Rad = (point1.latitude * Math.PI) / 180;
  const lat2Rad = (point2.latitude * Math.PI) / 180;
  const deltaLatRad = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const deltaLonRad = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLonRad / 2) * Math.sin(deltaLonRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_METERS * c;
  return Math.round(distance * 10) / 10; // rounded to 1 decimal place
}

/**
 * Validates if the inspector's location is within the allowed geofence distance (default 100m)
 * of the registered business address.
 */
export function validateGeoFence(
  shopLocation: GeoPoint,
  inspectorLocation: GeoPoint,
  thresholdMeters: number = 100
): GeoCheckResult {
  const distanceMeters = calculateHaversineDistance(shopLocation, inspectorLocation);
  const withinFence = distanceMeters <= thresholdMeters;

  return {
    distanceMeters,
    withinFence,
    thresholdMeters,
    shopLocation,
    inspectorLocation,
    timestamp: new Date().toISOString()
  };
}
