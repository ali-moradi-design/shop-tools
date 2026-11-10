import type { Shipment } from '../order.entity';

const TRACKING: Partial<Record<Shipment['carrier'], (n: string) => string>> = {
  DHL: (n) => `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${n}`,
  DPD: (n) => `https://tracking.dpd.de/status/en_US/parcel/${n}`,
  UPS: (n) => `https://www.ups.com/track?tracknum=${n}`,
  GLS: (n) => `https://gls-group.com/DE/en/parcel-tracking?match=${n}`,
};

/** The carrier's public tracking page, when we know it. */
export function trackingUrl(s: Pick<Shipment, 'carrier' | 'trackingNumber'>): string | undefined {
  return TRACKING[s.carrier]?.(encodeURIComponent(s.trackingNumber));
}
